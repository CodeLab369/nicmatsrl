import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Exportar envío a Excel
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const envioId = searchParams.get('envioId');

    if (!envioId) {
      return NextResponse.json({ error: 'envioId es requerido' }, { status: 400 });
    }

    // Obtener el envío
    const { data: envio, error: envioError } = await supabase
      .from('tienda_envios')
      .select('*, tiendas(nombre)')
      .eq('id', envioId)
      .single();

    if (envioError || !envio) {
      return NextResponse.json({ error: 'Envío no encontrado' }, { status: 404 });
    }

    // Obtener los items del envío
    const { data: items, error: itemsError } = await supabase
      .from('tienda_envio_items')
      .select('*')
      .eq('envio_id', envioId)
      .order('marca', { ascending: true });

    if (itemsError) throw itemsError;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'No hay items en este envío' }, { status: 400 });
    }

    // Preparar datos para Excel
    // Incluimos el ID oculto para poder importar después
    const excelData = items.map(item => ({
      'ID': item.id, // ID para identificar al importar
      'Marca': item.marca,
      'Amperaje': item.amperaje,
      'Cantidad': item.cantidad,
      'Precio Cliente Final': item.precio_tienda || '' // Vacío para que lo llenen
    }));

    // Crear workbook y worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Ajustar anchos de columna
    ws['!cols'] = [
      { wch: 40, hidden: true }, // ID (oculto)
      { wch: 25 }, // Marca
      { wch: 15 }, // Amperaje
      { wch: 12 }, // Cantidad
      { wch: 20 }, // Precio Cliente Final
    ];

    // Ocultar la columna ID (primera columna)
    if (!ws['!cols']) ws['!cols'] = [];
    ws['!cols'][0] = { hidden: true, wch: 40 };

    const tiendaNombre = (envio.tiendas as { nombre: string })?.nombre || 'Tienda';
    XLSX.utils.book_append_sheet(wb, ws, 'Envio');

    // Generar el archivo
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Crear nombre de archivo
    const fecha = new Date().toISOString().split('T')[0];
    const fileName = `Envio_${tiendaNombre.replace(/\s+/g, '_')}_${fecha}.xlsx`;

    // Devolver como descarga
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Error al exportar' }, { status: 500 });
  }
}

// POST - Importar Excel con precios
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const envioId = formData.get('envioId') as string;

    if (!file || !envioId) {
      return NextResponse.json({ error: 'Archivo y envioId son requeridos' }, { status: 400 });
    }

    // Verificar que el envío existe y no está completado
    const { data: envio, error: envioError } = await supabase
      .from('tienda_envios')
      .select('estado')
      .eq('id', envioId)
      .single();

    if (envioError || !envio) {
      return NextResponse.json({ error: 'Envío no encontrado' }, { status: 404 });
    }

    if (envio.estado === 'completado') {
      return NextResponse.json({ error: 'No se puede modificar un envío completado' }, { status: 400 });
    }

    // Leer el archivo Excel
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet) as Array<{
      ID?: string;
      Marca?: string;
      Amperaje?: string;
      Cantidad?: number;
      'Precio Cliente Final'?: number | string;
    }>;

    if (jsonData.length === 0) {
      return NextResponse.json({ error: 'El archivo está vacío' }, { status: 400 });
    }

    // Obtener los items actuales del envío para validar
    const { data: itemsActuales } = await supabase
      .from('tienda_envio_items')
      .select('id, marca, amperaje')
      .eq('envio_id', envioId);

    const itemsMap = new Map(itemsActuales?.map(i => [i.id, i]) || []);

    // Procesar los datos y actualizar precios
    const actualizados: string[] = [];
    const errores: string[] = [];
    let sinPrecio = 0;

    for (const row of jsonData) {
      const itemId = row['ID'];
      const precioStr = row['Precio Cliente Final'];
      
      // Validar que el item existe en el envío
      if (!itemId || !itemsMap.has(itemId)) {
        // Intentar buscar por Marca + Amperaje si no hay ID
        if (row['Marca'] && row['Amperaje']) {
          const itemPorDatos = itemsActuales?.find(
            i => i.marca === row['Marca'] && i.amperaje === row['Amperaje']
          );
          if (itemPorDatos) {
            const precio = typeof precioStr === 'number' ? precioStr : parseFloat(String(precioStr));
            if (!isNaN(precio) && precio > 0) {
              await supabase
                .from('tienda_envio_items')
                .update({ precio_tienda: precio })
                .eq('id', itemPorDatos.id);
              actualizados.push(`${row['Marca']} ${row['Amperaje']}`);
            } else {
              sinPrecio++;
            }
            continue;
          }
        }
        continue;
      }

      // Convertir precio
      const precio = typeof precioStr === 'number' ? precioStr : parseFloat(String(precioStr));
      
      if (isNaN(precio) || precio <= 0) {
        sinPrecio++;
        continue;
      }

      // Actualizar el precio
      const { error } = await supabase
        .from('tienda_envio_items')
        .update({ precio_tienda: precio })
        .eq('id', itemId);

      if (error) {
        errores.push(`Error actualizando ${row['Marca']} ${row['Amperaje']}`);
      } else {
        actualizados.push(`${row['Marca']} ${row['Amperaje']}`);
      }
    }

    // Verificar si todos tienen precio y actualizar estado
    const { data: todosItems } = await supabase
      .from('tienda_envio_items')
      .select('precio_tienda')
      .eq('envio_id', envioId);

    const todosConPrecio = todosItems?.every(i => i.precio_tienda !== null);
    const itemsSinPrecio = todosItems?.filter(i => i.precio_tienda === null).length || 0;

    if (todosConPrecio) {
      await supabase
        .from('tienda_envios')
        .update({ estado: 'precios_asignados' })
        .eq('id', envioId);
    }

    return NextResponse.json({
      success: true,
      message: `${actualizados.length} precios actualizados`,
      actualizados: actualizados.length,
      sinPrecio: itemsSinPrecio,
      errores: errores.length,
      todosConPrecio
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Error al importar archivo' }, { status: 500 });
  }
}
