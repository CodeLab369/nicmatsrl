import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Forzar que esta ruta sea dinámica y no se cachee
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET - Obtener ventas de tienda con filtros
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tiendaId = searchParams.get('tiendaId');
    const ventaId = searchParams.get('ventaId');
    const fechaDesde = searchParams.get('fechaDesde');
    const fechaHasta = searchParams.get('fechaHasta');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Obtener detalle de una venta específica
    if (ventaId) {
      const { data: venta } = await supabase
        .from('tienda_ventas')
        .select('*')
        .eq('id', ventaId)
        .single();

      const { data: items } = await supabase
        .from('tienda_venta_items')
        .select('*')
        .eq('venta_id', ventaId)
        .order('marca');

      return NextResponse.json({ venta, items });
    }

    if (!tiendaId) {
      return NextResponse.json({ error: 'tiendaId requerido' }, { status: 400 });
    }

    const offset = (page - 1) * limit;

    let query = supabase
      .from('tienda_ventas')
      .select('*', { count: 'exact' })
      .eq('tienda_id', tiendaId);

    if (fechaDesde) query = query.gte('fecha', fechaDesde);
    if (fechaHasta) query = query.lte('fecha', fechaHasta);

    const { data: ventas, count, error } = await query
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Calcular totales del período
    let totalsQuery = supabase
      .from('tienda_ventas')
      .select('total_venta, total_costo, ganancia')
      .eq('tienda_id', tiendaId);

    if (fechaDesde) totalsQuery = totalsQuery.gte('fecha', fechaDesde);
    if (fechaHasta) totalsQuery = totalsQuery.lte('fecha', fechaHasta);

    const { data: totalsData } = await totalsQuery;

    const totals = {
      totalVentas: totalsData?.reduce((sum, v) => sum + (v.total_venta || 0), 0) || 0,
      totalCosto: totalsData?.reduce((sum, v) => sum + (v.total_costo || 0), 0) || 0,
      totalGanancia: totalsData?.reduce((sum, v) => sum + (v.ganancia || 0), 0) || 0,
    };

    // Obtener items de cada venta para mostrar detalle
    const ventaIds = ventas?.map(v => v.id) || [];
    const { data: allItems } = await supabase
      .from('tienda_venta_items')
      .select('id, venta_id, marca, amperaje, cantidad, precio_venta, subtotal')
      .in('venta_id', ventaIds)
      .order('marca');

    // Agrupar items por venta
    const itemsByVenta = new Map<string, typeof allItems>();
    allItems?.forEach(item => {
      const existing = itemsByVenta.get(item.venta_id) || [];
      existing.push(item);
      itemsByVenta.set(item.venta_id, existing);
    });

    // Agregar items a cada venta
    const ventasConItems = ventas?.map(venta => ({
      ...venta,
      items: itemsByVenta.get(venta.id) || []
    })) || [];

    return NextResponse.json({
      ventas: ventasConItems,
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
      totals
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Error al obtener ventas' }, { status: 500 });
  }
}

// POST - Registrar venta de tienda (descuenta del inventario de la tienda)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tiendaId, productos, notas, fecha } = body;
    // productos: [{ inventarioId, marca, amperaje, cantidad, precio_venta, costo }]

    if (!tiendaId || !productos || productos.length === 0) {
      return NextResponse.json({ error: 'tiendaId y productos son requeridos' }, { status: 400 });
    }

    // Verificar stock disponible en la tienda
    const inventarioIds = productos.map((p: any) => p.inventarioId);
    const { data: inventarioItems } = await supabase
      .from('tienda_inventario')
      .select('*')
      .in('id', inventarioIds);

    const inventarioMap = new Map(inventarioItems?.map(i => [i.id, i]) || []);

    // Validar cantidades
    for (const producto of productos) {
      const item = inventarioMap.get(producto.inventarioId);
      if (!item || item.cantidad < producto.cantidad) {
        return NextResponse.json({ 
          error: `Stock insuficiente para ${producto.marca} ${producto.amperaje}` 
        }, { status: 400 });
      }
    }

    // Calcular totales
    let totalVenta = 0;
    let totalCosto = 0;
    let totalUnidades = 0;

    const ventaItems = productos.map((p: any) => {
      const subtotal = p.cantidad * p.precio_venta;
      const costoTotal = p.cantidad * p.costo;
      totalVenta += subtotal;
      totalCosto += costoTotal;
      totalUnidades += p.cantidad;
      return {
        inventario_id: p.inventarioId,
        marca: p.marca,
        amperaje: p.amperaje,
        cantidad: p.cantidad,
        precio_venta: p.precio_venta,
        costo: p.costo,
        subtotal,
        ganancia_item: subtotal - costoTotal
      };
    });

    const ganancia = totalVenta - totalCosto;

    // Crear la venta
    const { data: venta, error: ventaError } = await supabase
      .from('tienda_ventas')
      .insert({
        tienda_id: tiendaId,
        fecha: fecha || new Date().toISOString().split('T')[0],
        total_venta: totalVenta,
        total_costo: totalCosto,
        total_unidades: totalUnidades,
        ganancia,
        notas
      })
      .select()
      .single();

    if (ventaError) throw ventaError;

    // Insertar items de la venta
    const itemsConVentaId = ventaItems.map((item: any) => ({
      ...item,
      venta_id: venta.id
    }));

    const { error: itemsError } = await supabase
      .from('tienda_venta_items')
      .insert(itemsConVentaId);

    if (itemsError) throw itemsError;

    // Descontar del inventario de la tienda
    for (const producto of productos) {
      const item = inventarioMap.get(producto.inventarioId);
      if (item) {
        const newCantidad = item.cantidad - producto.cantidad;
        
        if (newCantidad <= 0) {
          // Eliminar producto si cantidad llega a 0
          await supabase
            .from('tienda_inventario')
            .delete()
            .eq('id', producto.inventarioId);
        } else {
          await supabase
            .from('tienda_inventario')
            .update({ cantidad: newCantidad, updated_at: new Date().toISOString() })
            .eq('id', producto.inventarioId);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Venta registrada: ${productos.length} productos, Total: ${totalVenta.toFixed(2)} Bs`,
      venta
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Error al registrar venta' }, { status: 500 });
  }
}

// DELETE - Eliminar venta (revierte el inventario)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ventaId = searchParams.get('ventaId');

    if (!ventaId) {
      return NextResponse.json({ error: 'ventaId requerido' }, { status: 400 });
    }

    // Obtener la venta y sus items
    const { data: venta } = await supabase
      .from('tienda_ventas')
      .select('*')
      .eq('id', ventaId)
      .single();

    if (!venta) {
      return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });
    }

    const { data: items } = await supabase
      .from('tienda_venta_items')
      .select('*')
      .eq('venta_id', ventaId);

    // Revertir inventario
    for (const item of items || []) {
      // Buscar si el producto aún existe en el inventario de la tienda
      const { data: existingItem } = await supabase
        .from('tienda_inventario')
        .select('*')
        .eq('tienda_id', venta.tienda_id)
        .ilike('marca', item.marca)
        .ilike('amperaje', item.amperaje)
        .single();

      if (existingItem) {
        // Sumar la cantidad de vuelta
        await supabase
          .from('tienda_inventario')
          .update({ 
            cantidad: existingItem.cantidad + item.cantidad,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingItem.id);
      } else {
        // Recrear el producto en el inventario
        await supabase
          .from('tienda_inventario')
          .insert({
            tienda_id: venta.tienda_id,
            marca: item.marca,
            amperaje: item.amperaje,
            cantidad: item.cantidad,
            costo: item.costo,
            precio_venta: item.precio_venta
          });
      }
    }

    // Eliminar la venta (cascade eliminará los items)
    await supabase
      .from('tienda_ventas')
      .delete()
      .eq('id', ventaId);

    return NextResponse.json({
      success: true,
      message: 'Venta eliminada y stock restaurado'
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Error al eliminar venta' }, { status: 500 });
  }
}
