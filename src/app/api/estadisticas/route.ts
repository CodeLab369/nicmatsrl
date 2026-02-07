import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Obtener estadísticas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo'); // 'ventas' | 'tiendas'
    const periodo = searchParams.get('periodo') || 'mes'; // 'semana' | 'mes' | 'trimestre' | 'anio' | 'todo'
    const fechaDesde = searchParams.get('fechaDesde');
    const fechaHasta = searchParams.get('fechaHasta');

    // Calcular fechas según el período
    const now = new Date();
    let startDate: string | null = null;
    let endDate: string | null = null;

    if (fechaDesde && fechaHasta) {
      startDate = fechaDesde;
      endDate = fechaHasta;
    } else {
      endDate = now.toISOString().split('T')[0];
      
      switch (periodo) {
        case 'semana':
          const weekAgo = new Date(now);
          weekAgo.setDate(weekAgo.getDate() - 7);
          startDate = weekAgo.toISOString().split('T')[0];
          break;
        case 'mes':
          const monthAgo = new Date(now);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          startDate = monthAgo.toISOString().split('T')[0];
          break;
        case 'trimestre':
          const quarterAgo = new Date(now);
          quarterAgo.setMonth(quarterAgo.getMonth() - 3);
          startDate = quarterAgo.toISOString().split('T')[0];
          break;
        case 'anio':
          const yearAgo = new Date(now);
          yearAgo.setFullYear(yearAgo.getFullYear() - 1);
          startDate = yearAgo.toISOString().split('T')[0];
          break;
        case 'todo':
          startDate = null;
          endDate = null;
          break;
      }
    }

    if (tipo === 'ventas') {
      return await getEstadisticasVentas(startDate, endDate);
    } else if (tipo === 'tiendas') {
      return await getEstadisticasTiendas(startDate, endDate);
    } else if (tipo === 'inventario') {
      return await getEstadisticasInventario();
    } else {
      return NextResponse.json({ error: 'Tipo de estadística no válido' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error en estadísticas:', error);
    return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 });
  }
}

// Estadísticas de ventas (cotizaciones convertidas)
async function getEstadisticasVentas(startDate: string | null, endDate: string | null) {
  // Obtener cotizaciones convertidas
  let query = supabase
    .from('cotizaciones')
    .select('*')
    .eq('estado', 'convertida');

  if (startDate) query = query.gte('created_at', startDate);
  if (endDate) query = query.lte('created_at', endDate + 'T23:59:59');

  const { data: cotizaciones, error } = await query;

  if (error) throw error;

  // Procesar productos vendidos
  const productosMap = new Map<string, {
    marca: string;
    amperaje: string;
    cantidad_vendida: number;
    costo_total: number;
    valor_venta: number;
    ganancia: number;
    ventas_count: number;
  }>();

  // Acumular descuento total de todas las cotizaciones
  let totalDescuento = 0;

  cotizaciones?.forEach(cot => {
    totalDescuento += parseFloat(cot.descuento) || 0;
    const productos = cot.productos || [];
    productos.forEach((prod: any) => {
      const key = `${prod.marca}-${prod.amperaje}`;
      const existing = productosMap.get(key) || {
        marca: prod.marca,
        amperaje: prod.amperaje,
        cantidad_vendida: 0,
        costo_total: 0,
        valor_venta: 0,
        ganancia: 0,
        ventas_count: 0
      };
      
      existing.cantidad_vendida += prod.cantidad;
      existing.valor_venta += prod.total;
      existing.ventas_count += 1;
      
      productosMap.set(key, existing);
    });
  });

  // Obtener costos del inventario
  const { data: inventario } = await supabase
    .from('inventory')
    .select('marca, amperaje, cantidad, costo, precio_venta');

  // Calcular costos y agregar stock
  const productosArray = Array.from(productosMap.values()).map(prod => {
    const invItem = inventario?.find(i => i.marca === prod.marca && i.amperaje === prod.amperaje);
    const costo_unitario = invItem?.costo || 0;
    const stock_actual = invItem?.cantidad || 0;
    
    return {
      ...prod,
      costo_total: costo_unitario * prod.cantidad_vendida,
      ganancia: prod.valor_venta - (costo_unitario * prod.cantidad_vendida),
      stock_actual
    };
  });

  // Ordenar por cantidad vendida
  productosArray.sort((a, b) => b.cantidad_vendida - a.cantidad_vendida);

  // Estadísticas por marca
  const marcasMap = new Map<string, {
    marca: string;
    cantidad_vendida: number;
    valor_venta: number;
    productos_distintos: number;
  }>();

  productosArray.forEach(prod => {
    const existing = marcasMap.get(prod.marca) || {
      marca: prod.marca,
      cantidad_vendida: 0,
      valor_venta: 0,
      productos_distintos: 0
    };
    
    existing.cantidad_vendida += prod.cantidad_vendida;
    existing.valor_venta += prod.valor_venta;
    existing.productos_distintos += 1;
    
    marcasMap.set(prod.marca, existing);
  });

  const marcasArray = Array.from(marcasMap.values()).sort((a, b) => b.cantidad_vendida - a.cantidad_vendida);

  // Totales generales (restar descuentos del valor y ganancia)
  const subtotalValor = productosArray.reduce((sum, p) => sum + p.valor_venta, 0);
  const totalCosto = productosArray.reduce((sum, p) => sum + p.costo_total, 0);
  const totales = {
    total_ventas: cotizaciones?.length || 0,
    total_unidades: productosArray.reduce((sum, p) => sum + p.cantidad_vendida, 0),
    total_costo: totalCosto,
    total_valor: subtotalValor - totalDescuento,
    total_ganancia: (subtotalValor - totalDescuento) - totalCosto,
    total_descuento: totalDescuento,
  };

  return NextResponse.json({
    tipo: 'ventas',
    periodo: { desde: startDate, hasta: endDate },
    totales,
    productos: productosArray.slice(0, 50), // Top 50 productos
    marcas: marcasArray,
  });
}

// Estadísticas de tiendas
async function getEstadisticasTiendas(startDate: string | null, endDate: string | null) {
  // Obtener todas las tiendas
  const { data: tiendas } = await supabase
    .from('tiendas')
    .select('id, nombre, tipo, ciudad');

  // Obtener ventas de tiendas
  let ventasQuery = supabase
    .from('tienda_ventas')
    .select('id, tienda_id, total_venta, total_costo, ganancia, total_unidades, fecha');

  if (startDate) ventasQuery = ventasQuery.gte('fecha', startDate);
  if (endDate) ventasQuery = ventasQuery.lte('fecha', endDate);

  const { data: ventas } = await ventasQuery;

  // Obtener items de ventas
  const ventaIds = ventas?.map(v => v.id) || [];
  const { data: ventaItems } = await supabase
    .from('tienda_venta_items')
    .select('venta_id, marca, amperaje, cantidad, precio_venta, subtotal')
    .in('venta_id', ventaIds);

  // Procesar productos vendidos por tienda
  const productosMap = new Map<string, {
    marca: string;
    amperaje: string;
    cantidad_vendida: number;
    valor_venta: number;
    ventas_count: number;
  }>();

  ventaItems?.forEach(item => {
    const key = `${item.marca}-${item.amperaje}`;
    const existing = productosMap.get(key) || {
      marca: item.marca,
      amperaje: item.amperaje,
      cantidad_vendida: 0,
      valor_venta: 0,
      ventas_count: 0
    };
    
    existing.cantidad_vendida += item.cantidad;
    existing.valor_venta += item.subtotal;
    existing.ventas_count += 1;
    
    productosMap.set(key, existing);
  });

  // Obtener stock de todas las tiendas
  const { data: inventarioTiendas } = await supabase
    .from('tienda_inventario')
    .select('tienda_id, marca, amperaje, cantidad, precio_venta');

  // Agregar stock a productos
  const productosArray = Array.from(productosMap.values()).map(prod => {
    const stockTotal = inventarioTiendas
      ?.filter(i => i.marca === prod.marca && i.amperaje === prod.amperaje)
      .reduce((sum, i) => sum + i.cantidad, 0) || 0;
    
    return {
      ...prod,
      stock_actual: stockTotal
    };
  });

  productosArray.sort((a, b) => b.cantidad_vendida - a.cantidad_vendida);

  // Estadísticas por marca
  const marcasMap = new Map<string, {
    marca: string;
    cantidad_vendida: number;
    valor_venta: number;
    productos_distintos: number;
  }>();

  productosArray.forEach(prod => {
    const existing = marcasMap.get(prod.marca) || {
      marca: prod.marca,
      cantidad_vendida: 0,
      valor_venta: 0,
      productos_distintos: 0
    };
    
    existing.cantidad_vendida += prod.cantidad_vendida;
    existing.valor_venta += prod.valor_venta;
    existing.productos_distintos += 1;
    
    marcasMap.set(prod.marca, existing);
  });

  const marcasArray = Array.from(marcasMap.values()).sort((a, b) => b.cantidad_vendida - a.cantidad_vendida);

  // Ranking de tiendas
  const tiendasRanking = tiendas?.map(tienda => {
    const ventasTienda = ventas?.filter(v => v.tienda_id === tienda.id) || [];
    const inventarioTienda = inventarioTiendas?.filter(i => i.tienda_id === tienda.id) || [];
    
    return {
      id: tienda.id,
      nombre: tienda.nombre,
      tipo: tienda.tipo,
      ciudad: tienda.ciudad,
      total_ventas: ventasTienda.length,
      total_unidades: ventasTienda.reduce((sum, v) => sum + (v.total_unidades || 0), 0),
      total_valor: ventasTienda.reduce((sum, v) => sum + (v.total_venta || 0), 0),
      total_ganancia: ventasTienda.reduce((sum, v) => sum + (v.ganancia || 0), 0),
      stock_actual: inventarioTienda.reduce((sum, i) => sum + i.cantidad, 0),
      valor_inventario: inventarioTienda.reduce((sum, i) => sum + (i.cantidad * i.precio_venta), 0),
    };
  }).sort((a, b) => b.total_unidades - a.total_unidades) || [];

  // Totales generales
  const totales = {
    total_ventas: ventas?.length || 0,
    total_unidades: ventas?.reduce((sum, v) => sum + (v.total_unidades || 0), 0) || 0,
    total_valor: ventas?.reduce((sum, v) => sum + (v.total_venta || 0), 0) || 0,
    total_costo: ventas?.reduce((sum, v) => sum + (v.total_costo || 0), 0) || 0,
    total_ganancia: ventas?.reduce((sum, v) => sum + (v.ganancia || 0), 0) || 0,
    tiendas_activas: tiendasRanking.filter(t => t.total_ventas > 0).length,
  };

  return NextResponse.json({
    tipo: 'tiendas',
    periodo: { desde: startDate, hasta: endDate },
    totales,
    productos: productosArray.slice(0, 50),
    marcas: marcasArray,
    ranking: tiendasRanking,
  });
}

// Estadísticas de inventario general
async function getEstadisticasInventario() {
  // Obtener inventario central
  const { data: inventario } = await supabase
    .from('inventory')
    .select('marca, amperaje, cantidad, costo, precio_venta');

  // Obtener inventario de tiendas
  const { data: invTiendas } = await supabase
    .from('tienda_inventario')
    .select('tienda_id, marca, amperaje, cantidad, precio_venta');

  // Obtener tiendas
  const { data: tiendas } = await supabase
    .from('tiendas')
    .select('id, nombre, tipo');

  // Estadísticas por marca (inventario central)
  const marcasMap = new Map<string, {
    marca: string;
    cantidad_central: number;
    cantidad_tiendas: number;
    cantidad_total: number;
    valor_costo: number;
    valor_venta: number;
    productos_distintos: number;
  }>();

  inventario?.forEach(item => {
    const existing = marcasMap.get(item.marca) || {
      marca: item.marca,
      cantidad_central: 0,
      cantidad_tiendas: 0,
      cantidad_total: 0,
      valor_costo: 0,
      valor_venta: 0,
      productos_distintos: 0
    };
    
    existing.cantidad_central += item.cantidad;
    existing.cantidad_total += item.cantidad;
    existing.valor_costo += item.cantidad * (item.costo || 0);
    existing.valor_venta += item.cantidad * (item.precio_venta || 0);
    existing.productos_distintos += 1;
    
    marcasMap.set(item.marca, existing);
  });

  // Agregar cantidades de tiendas
  invTiendas?.forEach(item => {
    const existing = marcasMap.get(item.marca);
    if (existing) {
      existing.cantidad_tiendas += item.cantidad;
      existing.cantidad_total += item.cantidad;
    }
  });

  const marcasArray = Array.from(marcasMap.values())
    .sort((a, b) => b.cantidad_total - a.cantidad_total);

  // Productos con bajo stock
  const stockBajo = inventario?.filter(item => item.cantidad <= 5)
    .sort((a, b) => a.cantidad - b.cantidad)
    .slice(0, 20) || [];

  // Productos sin stock
  const sinStock = inventario?.filter(item => item.cantidad === 0) || [];

  // Distribución por tienda
  const distribucionTiendas = tiendas?.map(tienda => {
    const items = invTiendas?.filter(i => i.tienda_id === tienda.id) || [];
    return {
      id: tienda.id,
      nombre: tienda.nombre,
      tipo: tienda.tipo,
      total_productos: items.length,
      total_unidades: items.reduce((sum, i) => sum + i.cantidad, 0),
      valor_inventario: items.reduce((sum, i) => sum + (i.cantidad * i.precio_venta), 0),
    };
  }).sort((a, b) => b.total_unidades - a.total_unidades) || [];

  // Totales (incluir valor de tiendas en el total)
  const valorVentaCentral = inventario?.reduce((sum, i) => sum + (i.cantidad * (i.precio_venta || 0)), 0) || 0;
  const valorVentaTiendas = invTiendas?.reduce((sum, i) => sum + (i.cantidad * (i.precio_venta || 0)), 0) || 0;
  const totales = {
    total_productos_central: inventario?.length || 0,
    total_unidades_central: inventario?.reduce((sum, i) => sum + i.cantidad, 0) || 0,
    total_unidades_tiendas: invTiendas?.reduce((sum, i) => sum + i.cantidad, 0) || 0,
    valor_costo_total: inventario?.reduce((sum, i) => sum + (i.cantidad * (i.costo || 0)), 0) || 0,
    valor_venta_total: valorVentaCentral + valorVentaTiendas,
    valor_venta_central: valorVentaCentral,
    valor_venta_tiendas: valorVentaTiendas,
    productos_sin_stock: sinStock.length,
    productos_stock_bajo: stockBajo.length,
  };

  return NextResponse.json({
    tipo: 'inventario',
    totales,
    marcas: marcasArray,
    stockBajo,
    sinStock,
    distribucionTiendas,
  });
}
