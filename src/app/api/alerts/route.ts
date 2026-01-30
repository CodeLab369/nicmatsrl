import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Forzar que esta ruta sea dinámica y no se cachee
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Umbral de stock bajo (productos con menos de esta cantidad se consideran bajos)
const STOCK_BAJO_UMBRAL = 5;

// GET - Obtener alertas del sistema
export async function GET() {
  try {
    // Obtener productos con stock bajo
    const { data: stockBajo, error } = await supabase
      .from('inventory')
      .select('id, marca, amperaje, cantidad')
      .lt('cantidad', STOCK_BAJO_UMBRAL)
      .order('cantidad', { ascending: true });

    if (error) throw error;

    // Obtener productos sin stock (agotados)
    const agotados = stockBajo?.filter(p => p.cantidad === 0) || [];
    const bajos = stockBajo?.filter(p => p.cantidad > 0) || [];

    return NextResponse.json({
      stockBajo: {
        total: stockBajo?.length || 0,
        agotados: agotados.length,
        bajos: bajos.length,
        productos: stockBajo || [],
        umbral: STOCK_BAJO_UMBRAL
      }
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json({ error: 'Error al obtener alertas' }, { status: 500 });
  }
}
