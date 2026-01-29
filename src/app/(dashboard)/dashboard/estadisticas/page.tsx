'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  BarChart3, TrendingUp, Package, Store, ShoppingCart, DollarSign,
  Calendar, RefreshCw, ChevronUp, ChevronDown, Minus, Award, Target, Filter
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTableSubscription } from '@/contexts';
import { formatCurrency } from '@/lib/utils';
import {
  Button, Card, CardContent, CardHeader, CardTitle,
  Badge, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Input, Label
} from '@/components/ui';

interface ProductoStats {
  marca: string;
  amperaje: string;
  cantidad_vendida: number;
  costo_total?: number;
  valor_venta: number;
  ganancia?: number;
  stock_actual: number;
  ventas_count: number;
}

interface MarcaStats {
  marca: string;
  cantidad_vendida: number;
  valor_venta: number;
  productos_distintos: number;
}

interface TiendaRanking {
  id: string;
  nombre: string;
  tipo: string;
  ciudad: string;
  total_ventas: number;
  total_unidades: number;
  total_valor: number;
  total_ganancia: number;
  stock_actual: number;
  valor_inventario: number;
}

interface EstadisticasData {
  tipo: string;
  periodo: { desde: string | null; hasta: string | null };
  totales: {
    total_ventas: number;
    total_unidades: number;
    total_costo?: number;
    total_valor: number;
    total_ganancia: number;
    tiendas_activas?: number;
  };
  productos: ProductoStats[];
  marcas: MarcaStats[];
  ranking?: TiendaRanking[];
}

type TipoEstadistica = 'ventas' | 'tiendas';
type Periodo = 'semana' | 'mes' | 'trimestre' | 'anio' | 'todo' | 'custom';

export default function EstadisticasPage() {
  const { toast } = useToast();
  
  // Estado
  const [tipoEstadistica, setTipoEstadistica] = useState<TipoEstadistica>('ventas');
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<EstadisticasData | null>(null);

  // Cargar estadísticas
  const fetchEstadisticas = useCallback(async () => {
    try {
      setLoading(true);
      
      let url = `/api/estadisticas?tipo=${tipoEstadistica}&periodo=${periodo}`;
      if (periodo === 'custom' && fechaDesde && fechaHasta) {
        url = `/api/estadisticas?tipo=${tipoEstadistica}&fechaDesde=${fechaDesde}&fechaHasta=${fechaHasta}`;
      }
      
      const response = await fetch(url);
      const result = await response.json();
      
      if (!response.ok) throw new Error(result.error);
      
      setData(result);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al cargar estadísticas',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [tipoEstadistica, periodo, fechaDesde, fechaHasta, toast]);

  useEffect(() => {
    if (periodo !== 'custom' || (fechaDesde && fechaHasta)) {
      fetchEstadisticas();
    }
  }, [tipoEstadistica, periodo, fetchEstadisticas]);

  // Realtime: actualizar cuando cambien ventas o tiendas
  useTableSubscription('tienda_ventas', fetchEstadisticas);
  useTableSubscription('tienda_inventario', fetchEstadisticas);
  useTableSubscription('tiendas', fetchEstadisticas);

  // Obtener etiqueta del período
  const getPeriodoLabel = () => {
    switch (periodo) {
      case 'semana': return 'Última semana';
      case 'mes': return 'Último mes';
      case 'trimestre': return 'Últimos 3 meses';
      case 'anio': return 'Último año';
      case 'todo': return 'Todo el tiempo';
      case 'custom': return `${fechaDesde || '?'} - ${fechaHasta || '?'}`;
    }
  };

  // Renderizar medalla según posición
  const getMedalla = (index: number) => {
    if (index === 0) return <Award className="h-5 w-5 text-yellow-500" />;
    if (index === 1) return <Award className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Award className="h-5 w-5 text-amber-700" />;
    return <span className="text-muted-foreground font-medium w-5 text-center">{index + 1}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Estadísticas</h1>
          <p className="text-muted-foreground">Análisis de ventas y rendimiento del negocio</p>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-3 items-end">
              {/* Tipo de estadística */}
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo</Label>
                <Select value={tipoEstadistica} onValueChange={(v) => setTipoEstadistica(v as TipoEstadistica)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ventas">
                      <span className="flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4" />
                        Ventas Directas
                      </span>
                    </SelectItem>
                    <SelectItem value="tiendas">
                      <span className="flex items-center gap-2">
                        <Store className="h-4 w-4" />
                        Tiendas
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Período */}
              <div className="space-y-1.5">
                <Label className="text-xs">Período</Label>
                <Select value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semana">Última semana</SelectItem>
                    <SelectItem value="mes">Último mes</SelectItem>
                    <SelectItem value="trimestre">Últimos 3 meses</SelectItem>
                    <SelectItem value="anio">Último año</SelectItem>
                    <SelectItem value="todo">Todo el tiempo</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Fechas personalizadas */}
              {periodo === 'custom' && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Desde</Label>
                    <Input
                      type="date"
                      value={fechaDesde}
                      onChange={(e) => setFechaDesde(e.target.value)}
                      className="w-[150px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Hasta</Label>
                    <Input
                      type="date"
                      value={fechaHasta}
                      onChange={(e) => setFechaHasta(e.target.value)}
                      className="w-[150px]"
                    />
                  </div>
                  <Button 
                    onClick={fetchEstadisticas} 
                    disabled={!fechaDesde || !fechaHasta || loading}
                    size="sm"
                  >
                    <Filter className="h-4 w-4 mr-1" />
                    Filtrar
                  </Button>
                </>
              )}

              <div className="flex-1" />

              <Button variant="outline" size="sm" onClick={fetchEstadisticas} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : data ? (
        <>
          {/* Cards de resumen */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Ventas Totales</p>
                    <p className="text-xl sm:text-2xl font-bold">{data.totales.total_ventas}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <ShoppingCart className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Unidades Vendidas</p>
                    <p className="text-xl sm:text-2xl font-bold">{data.totales.total_unidades}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Package className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Valor Total</p>
                    <p className="text-lg sm:text-xl font-bold">{formatCurrency(data.totales.total_valor)}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Ganancia Total</p>
                    <p className="text-lg sm:text-xl font-bold text-green-600">{formatCurrency(data.totales.total_ganancia)}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contenido principal en grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Ranking de Marcas */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-500" />
                  Top Marcas Vendidas
                </CardTitle>
                <p className="text-xs text-muted-foreground">{getPeriodoLabel()}</p>
              </CardHeader>
              <CardContent>
                {data.marcas.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>Sin datos para este período</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.marcas.slice(0, 10).map((marca, index) => (
                      <div key={marca.marca} className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-6 flex justify-center">
                          {getMedalla(index)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-medium truncate">{marca.marca}</span>
                            <span className="text-sm text-muted-foreground ml-2">
                              {marca.cantidad_vendida} u.
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full mt-1 overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ 
                                width: `${(marca.cantidad_vendida / data.marcas[0].cantidad_vendida) * 100}%` 
                              }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>{marca.productos_distintos} productos</span>
                            <span>{formatCurrency(marca.valor_venta)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Productos más vendidos */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-500" />
                  Top Productos Vendidos
                </CardTitle>
                <p className="text-xs text-muted-foreground">{getPeriodoLabel()}</p>
              </CardHeader>
              <CardContent>
                {data.productos.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>Sin datos para este período</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 font-medium">#</th>
                          <th className="text-left py-2 font-medium">Producto</th>
                          <th className="text-center py-2 font-medium">Vendido</th>
                          <th className="text-center py-2 font-medium">Stock</th>
                          <th className="text-right py-2 font-medium">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.productos.slice(0, 15).map((prod, index) => (
                          <tr key={`${prod.marca}-${prod.amperaje}`} className="border-b hover:bg-muted/50">
                            <td className="py-2">
                              <span className="text-muted-foreground">{index + 1}</span>
                            </td>
                            <td className="py-2">
                              <div>
                                <span className="font-medium">{prod.marca}</span>
                                <Badge variant="secondary" className="ml-2 text-xs">{prod.amperaje}</Badge>
                              </div>
                            </td>
                            <td className="py-2 text-center">
                              <Badge variant="default">{prod.cantidad_vendida}</Badge>
                            </td>
                            <td className="py-2 text-center">
                              <Badge variant={prod.stock_actual > 0 ? 'outline' : 'destructive'}>
                                {prod.stock_actual}
                              </Badge>
                            </td>
                            <td className="py-2 text-right font-medium">
                              {formatCurrency(prod.valor_venta)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Ranking de Tiendas (solo si es tipo tiendas) */}
          {tipoEstadistica === 'tiendas' && data.ranking && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Store className="h-5 w-5 text-purple-500" />
                  Ranking de Tiendas
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {getPeriodoLabel()} • {data.totales.tiendas_activas} tiendas con ventas
                </p>
              </CardHeader>
              <CardContent>
                {data.ranking.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Store className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>Sin tiendas registradas</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 font-medium">#</th>
                          <th className="text-left py-2 font-medium">Tienda</th>
                          <th className="text-center py-2 font-medium">Ventas</th>
                          <th className="text-center py-2 font-medium">Unidades</th>
                          <th className="text-right py-2 font-medium">Valor</th>
                          <th className="text-right py-2 font-medium">Ganancia</th>
                          <th className="text-center py-2 font-medium">Stock</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.ranking.map((tienda, index) => (
                          <tr key={tienda.id} className={`border-b hover:bg-muted/50 ${tienda.total_ventas === 0 ? 'opacity-50' : ''}`}>
                            <td className="py-3">
                              <div className="flex justify-center">{getMedalla(index)}</div>
                            </td>
                            <td className="py-3">
                              <div>
                                <span className="font-medium">{tienda.nombre}</span>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <Badge variant={tienda.tipo === 'casa_matriz' ? 'default' : 'secondary'} className="text-xs">
                                    {tienda.tipo === 'casa_matriz' ? 'Matriz' : 'Sucursal'}
                                  </Badge>
                                  {tienda.ciudad && (
                                    <span className="text-xs text-muted-foreground">{tienda.ciudad}</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 text-center">
                              <Badge variant="outline">{tienda.total_ventas}</Badge>
                            </td>
                            <td className="py-3 text-center">
                              <span className="font-medium">{tienda.total_unidades}</span>
                            </td>
                            <td className="py-3 text-right font-medium">
                              {formatCurrency(tienda.total_valor)}
                            </td>
                            <td className="py-3 text-right">
                              <span className={tienda.total_ganancia >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {formatCurrency(tienda.total_ganancia)}
                              </span>
                            </td>
                            <td className="py-3 text-center">
                              <div>
                                <Badge variant={tienda.stock_actual > 0 ? 'secondary' : 'outline'}>
                                  {tienda.stock_actual} u.
                                </Badge>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {formatCurrency(tienda.valor_inventario)}
                                </p>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Detalle de costo/ganancia para ventas directas */}
          {tipoEstadistica === 'ventas' && data.totales.total_costo !== undefined && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-500" />
                  Resumen Financiero - {getPeriodoLabel()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Costo Total</p>
                    <p className="text-xl font-bold">{formatCurrency(data.totales.total_costo)}</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Valor de Ventas</p>
                    <p className="text-xl font-bold">{formatCurrency(data.totales.total_valor)}</p>
                  </div>
                  <div className="p-4 bg-green-500/10 rounded-lg">
                    <p className="text-sm text-muted-foreground">Ganancia Bruta</p>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(data.totales.total_ganancia)}</p>
                  </div>
                  <div className="p-4 bg-blue-500/10 rounded-lg">
                    <p className="text-sm text-muted-foreground">Margen de Ganancia</p>
                    <p className="text-xl font-bold text-blue-600">
                      {data.totales.total_valor > 0 
                        ? ((data.totales.total_ganancia / data.totales.total_valor) * 100).toFixed(1) 
                        : 0}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>No hay datos disponibles</p>
        </div>
      )}
    </div>
  );
}
