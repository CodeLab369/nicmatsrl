import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Importar saldos anteriores a tienda (sin afectar inventario principal)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tiendaId, productos, mode = 'import' } = body;
    // productos: [{ marca, amperaje, cantidad, precio_venta }]

    if (!tiendaId || !productos || !Array.isArray(productos) || productos.length === 0) {
      return NextResponse.json({ error: 'tiendaId y productos son requeridos' }, { status: 400 });
    }

    // Obtener items existentes en la tienda
    const { data: existingItems } = await supabase
      .from('tienda_inventario')
      .select('*')
      .eq('tienda_id', tiendaId);

    const existingMap = new Map(
      existingItems?.map(i => [`${i.marca.toLowerCase()}-${i.amperaje.toLowerCase()}`, i]) || []
    );

    // Clasificar productos
    const newItems: any[] = [];
    const updateItems: any[] = [];

    for (const producto of productos) {
      if (!producto.marca || !producto.amperaje || producto.cantidad === undefined || producto.precio_venta === undefined) {
        continue; // Saltar productos con datos incompletos
      }

      const key = `${producto.marca.toLowerCase()}-${producto.amperaje.toLowerCase()}`;
      const existing = existingMap.get(key);

      if (existing) {
        updateItems.push({
          ...producto,
          existingId: existing.id,
          existingCantidad: existing.cantidad,
          existingPrecio: existing.precio_venta,
        });
      } else {
        newItems.push(producto);
      }
    }

    // Modo análisis: solo devolver información
    if (mode === 'analyze') {
      return NextResponse.json({
        success: true,
        analysis: {
          total: productos.length,
          new: newItems.length,
          existing: updateItems.length,
          newItems: newItems.slice(0, 10),
          updateItems: updateItems.slice(0, 10),
        }
      });
    }

    // Modo importación: ejecutar cambios
    let insertedCount = 0;
    let updatedCount = 0;

    // Insertar nuevos productos
    if (newItems.length > 0) {
      const insertData = newItems.map(p => ({
        tienda_id: tiendaId,
        marca: p.marca,
        amperaje: p.amperaje,
        cantidad: p.cantidad,
        costo: p.precio_venta * 0.7, // Estimación de costo si no se proporciona
        precio_venta: p.precio_venta,
      }));

      const { data, error } = await supabase
        .from('tienda_inventario')
        .insert(insertData)
        .select();

      if (error) throw error;
      insertedCount = data?.length || 0;
    }

    // Actualizar productos existentes (sumar cantidades)
    for (const item of updateItems) {
      const newCantidad = item.existingCantidad + item.cantidad;

      const { error } = await supabase
        .from('tienda_inventario')
        .update({
          cantidad: newCantidad,
          precio_venta: item.precio_venta, // Actualizar precio
          updated_at: new Date().toISOString()
        })
        .eq('id', item.existingId);

      if (error) throw error;
      updatedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Saldo importado: ${insertedCount} nuevos, ${updatedCount} actualizados`,
      inserted: insertedCount,
      updated: updatedCount
    });

  } catch (error) {
    console.error('Error importando saldos:', error);
    return NextResponse.json({ error: 'Error al importar saldos' }, { status: 500 });
  }
}
