import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Obtener resumen financiero general
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fechaDesde = searchParams.get('fechaDesde');
    const fechaHasta = searchParams.get('fechaHasta');
    const tiendaId = searchParams.get('tiendaId'); // Opcional, para filtrar por tienda específica

    // 1. Obtener ventas de cotizaciones (estado = 'convertida')
    let cotizacionesQuery = supabase
      .from('cotizaciones')
      .select('id, total, productos, fecha, created_at')
      .eq('estado', 'convertida');

    if (fechaDesde) cotizacionesQuery = cotizacionesQuery.gte('fecha', fechaDesde);
    if (fechaHasta) cotizacionesQuery = cotizacionesQuery.lte('fecha', fechaHasta);

    const { data: cotizaciones, error: cotError } = await cotizacionesQuery;
    
    if (cotError) {
      console.error('Error fetching cotizaciones:', cotError);
    }

    // Calcular ganancia desde productos (precio_venta - costo) * cantidad
    let cotizacionesGanancia = 0;
    cotizaciones?.forEach(cot => {
      const productos = cot.productos || [];
      productos.forEach((p: { cantidad: number; precio_venta: number; costo?: number }) => {
        const gananciaProducto = ((p.precio_venta || 0) - (p.costo || 0)) * (p.cantidad || 0);
        cotizacionesGanancia += gananciaProducto;
      });
    });

    const cotizacionesTotal = cotizaciones?.reduce((sum, c) => sum + (c.total || 0), 0) || 0;
    const cotizacionesCount = cotizaciones?.length || 0;

    // 2. Obtener todas las tiendas para el resumen
    const { data: tiendas } = await supabase
      .from('tiendas')
      .select('id, nombre, tipo')
      .order('nombre');

    // 3. Obtener ventas de tiendas
    let ventasTiendasQuery = supabase
      .from('tienda_ventas')
      .select('tienda_id, total_venta, total_costo, ganancia, fecha');

    if (fechaDesde) ventasTiendasQuery = ventasTiendasQuery.gte('fecha', fechaDesde);
    if (fechaHasta) ventasTiendasQuery = ventasTiendasQuery.lte('fecha', fechaHasta);
    if (tiendaId) ventasTiendasQuery = ventasTiendasQuery.eq('tienda_id', tiendaId);

    const { data: ventasTiendas } = await ventasTiendasQuery;

    // 4. Obtener gastos de tiendas
    let gastosTiendasQuery = supabase
      .from('tienda_gastos')
      .select('tienda_id, categoria, monto, fecha');

    if (fechaDesde) gastosTiendasQuery = gastosTiendasQuery.gte('fecha', fechaDesde);
    if (fechaHasta) gastosTiendasQuery = gastosTiendasQuery.lte('fecha', fechaHasta);
    if (tiendaId) gastosTiendasQuery = gastosTiendasQuery.eq('tienda_id', tiendaId);

    const { data: gastosTiendas } = await gastosTiendasQuery;

    // 5. Calcular totales por tienda
    const tiendasResumen = tiendas?.map(tienda => {
      const ventasTienda = ventasTiendas?.filter(v => v.tienda_id === tienda.id) || [];
      const gastosTienda = gastosTiendas?.filter(g => g.tienda_id === tienda.id) || [];

      const totalVentas = ventasTienda.reduce((sum, v) => sum + (v.total_venta || 0), 0);
      const totalCosto = ventasTienda.reduce((sum, v) => sum + (v.total_costo || 0), 0);
      const gananciaVentas = ventasTienda.reduce((sum, v) => sum + (v.ganancia || 0), 0);
      const totalGastos = gastosTienda.reduce((sum, g) => sum + (g.monto || 0), 0);
      const balanceNeto = gananciaVentas - totalGastos;

      // Gastos por categoría
      const gastosPorCategoria: Record<string, number> = {};
      gastosTienda.forEach(g => {
        gastosPorCategoria[g.categoria] = (gastosPorCategoria[g.categoria] || 0) + g.monto;
      });

      return {
        id: tienda.id,
        nombre: tienda.nombre,
        tipo: tienda.tipo,
        ventas: {
          cantidad: ventasTienda.length,
          total: totalVentas,
          costo: totalCosto,
          ganancia: gananciaVentas
        },
        gastos: {
          total: totalGastos,
          porCategoria: gastosPorCategoria
        },
        balanceNeto
      };
    }) || [];

    // 6. Totales generales de tiendas
    const tiendasTotalVentas = ventasTiendas?.reduce((sum, v) => sum + (v.total_venta || 0), 0) || 0;
    const tiendasTotalGanancia = ventasTiendas?.reduce((sum, v) => sum + (v.ganancia || 0), 0) || 0;
    const tiendasTotalGastos = gastosTiendas?.reduce((sum, g) => sum + (g.monto || 0), 0) || 0;

    // 7. Resumen general
    const resumen = {
      // Cotizaciones (ventas directas)
      cotizaciones: {
        cantidad: cotizacionesCount,
        total: cotizacionesTotal,
        ganancia: cotizacionesGanancia
      },
      // Tiendas
      tiendas: {
        cantidad: tiendas?.length || 0,
        totalVentas: tiendasTotalVentas,
        totalGanancia: tiendasTotalGanancia,
        totalGastos: tiendasTotalGastos,
        balanceNeto: tiendasTotalGanancia - tiendasTotalGastos
      },
      // Total general
      general: {
        ingresosTotales: cotizacionesTotal + tiendasTotalVentas,
        gananciaBruta: cotizacionesGanancia + tiendasTotalGanancia,
        gastosTotales: tiendasTotalGastos,
        gananciaNeta: cotizacionesGanancia + tiendasTotalGanancia - tiendasTotalGastos
      },
      // Detalle por tienda
      tiendasDetalle: tiendasResumen
    };

    return NextResponse.json(resumen);

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Error al obtener resumen' }, { status: 500 });
  }
}
