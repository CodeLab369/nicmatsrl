'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, Store, FileText, Calendar,
  ChevronLeft, ChevronRight, Plus, Trash2, Eye, Package, RefreshCw,
  Receipt, Wallet, PiggyBank, BarChart3, Filter, Search, X, ShoppingCart
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import {
  Button, Card, CardContent, CardHeader, CardTitle,
  Input, Badge, Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, Label,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  Checkbox, Tabs, TabsContent, TabsList, TabsTrigger
} from '@/components/ui';

interface Tienda {
  id: string;
  nombre: string;
  tipo: string;
}

interface TiendaResumen {
  id: string;
  nombre: string;
  tipo: string;
  ventas: {
    cantidad: number;
    total: number;
    costo: number;
    ganancia: number;
  };
  gastos: {
    total: number;
    porCategoria: Record<string, number>;
  };
  balanceNeto: number;
}

interface Resumen {
  cotizaciones: {
    cantidad: number;
    total: number;
    ganancia: number;
  };
  tiendas: {
    cantidad: number;
    totalVentas: number;
    totalGanancia: number;
    totalGastos: number;
    balanceNeto: number;
  };
  general: {
    ingresosTotales: number;
    gananciaBruta: number;
    gastosTotales: number;
    gananciaNeta: number;
  };
  tiendasDetalle: TiendaResumen[];
}

interface TiendaInventarioItem {
  id: string;
  marca: string;
  amperaje: string;
  cantidad: number;
  costo: number;
  precio_venta: number;
}

interface Venta {
  id: string;
  tienda_id: string;
  fecha: string;
  total_venta: number;
  total_costo: number;
  ganancia: number;
  notas: string | null;
  created_at: string;
}

interface VentaItem {
  id: string;
  marca: string;
  amperaje: string;
  cantidad: number;
  precio_venta: number;
  costo: number;
  subtotal: number;
  ganancia_item: number;
}

interface Gasto {
  id: string;
  tienda_id: string;
  categoria: string;
  descripcion: string | null;
  monto: number;
  fecha: string;
  created_at: string;
}

interface ProductoVenta {
  inventarioId: string;
  marca: string;
  amperaje: string;
  cantidad: number;
  cantidadDisponible: number;
  precio_venta: number;
  costo: number;
  selected: boolean;
  cantidadVender: number;
}

export default function MovimientosPage() {
  // Estados principales
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [fechaDesde, setFechaDesde] = useState(() => {
    const date = new Date();
    date.setDate(1); // Primer día del mes
    return date.toISOString().split('T')[0];
  });
  const [fechaHasta, setFechaHasta] = useState(() => new Date().toISOString().split('T')[0]);

  // Tienda seleccionada para operaciones
  const [selectedTienda, setSelectedTienda] = useState<TiendaResumen | null>(null);
  const [activeTab, setActiveTab] = useState('resumen');

  // Ventas de tienda
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loadingVentas, setLoadingVentas] = useState(false);
  const [ventasPage, setVentasPage] = useState(1);
  const [ventasTotalPages, setVentasTotalPages] = useState(1);

  // Detalle de venta
  const [ventaDetailOpen, setVentaDetailOpen] = useState(false);
  const [selectedVenta, setSelectedVenta] = useState<Venta | null>(null);
  const [ventaItems, setVentaItems] = useState<VentaItem[]>([]);
  const [loadingVentaDetail, setLoadingVentaDetail] = useState(false);

  // Registrar venta
  const [registrarVentaOpen, setRegistrarVentaOpen] = useState(false);
  const [inventarioTienda, setInventarioTienda] = useState<TiendaInventarioItem[]>([]);
  const [productosVenta, setProductosVenta] = useState<ProductoVenta[]>([]);
  const [loadingInventario, setLoadingInventario] = useState(false);
  const [isRegistrandoVenta, setIsRegistrandoVenta] = useState(false);
  const [ventaSearch, setVentaSearch] = useState('');
  const [ventaNotas, setVentaNotas] = useState('');

  // Gastos de tienda
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loadingGastos, setLoadingGastos] = useState(false);
  const [gastosPage, setGastosPage] = useState(1);
  const [gastosTotalPages, setGastosTotalPages] = useState(1);
  const [totalGastosPeriodo, setTotalGastosPeriodo] = useState(0);

  // Agregar gasto
  const [agregarGastoOpen, setAgregarGastoOpen] = useState(false);
  const [gastoForm, setGastoForm] = useState({ categoria: '', descripcion: '', monto: '', fecha: '' });
  const [categoriasSugeridas, setCategoriasSugeridas] = useState<string[]>([]);
  const [isSubmittingGasto, setIsSubmittingGasto] = useState(false);

  // Eliminar
  const [deleteVentaDialogOpen, setDeleteVentaDialogOpen] = useState(false);
  const [ventaToDelete, setVentaToDelete] = useState<Venta | null>(null);
  const [deleteGastoDialogOpen, setDeleteGastoDialogOpen] = useState(false);
  const [gastoToDelete, setGastoToDelete] = useState<Gasto | null>(null);

  const { toast } = useToast();

  // Fetch resumen general
  const fetchResumen = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        fechaDesde,
        fechaHasta
      });

      const response = await fetch(`/api/movimientos?${params}`);
      const data = await response.json();
      setResumen(data);
    } catch (error) {
      toast({ title: 'Error', description: 'Error al cargar resumen', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [fechaDesde, fechaHasta, toast]);

  // Fetch ventas de tienda
  const fetchVentas = useCallback(async () => {
    if (!selectedTienda) return;

    try {
      setLoadingVentas(true);
      const params = new URLSearchParams({
        tiendaId: selectedTienda.id,
        fechaDesde,
        fechaHasta,
        page: ventasPage.toString(),
        limit: '10'
      });

      const response = await fetch(`/api/tienda-ventas?${params}`);
      const data = await response.json();
      setVentas(data.ventas || []);
      setVentasTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoadingVentas(false);
    }
  }, [selectedTienda, fechaDesde, fechaHasta, ventasPage]);

  // Fetch gastos de tienda
  const fetchGastos = useCallback(async () => {
    if (!selectedTienda) return;

    try {
      setLoadingGastos(true);
      const params = new URLSearchParams({
        tiendaId: selectedTienda.id,
        fechaDesde,
        fechaHasta,
        page: gastosPage.toString(),
        limit: '10'
      });

      const response = await fetch(`/api/tienda-gastos?${params}`);
      const data = await response.json();
      setGastos(data.gastos || []);
      setGastosTotalPages(data.totalPages || 1);
      setTotalGastosPeriodo(data.totalGastos || 0);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoadingGastos(false);
    }
  }, [selectedTienda, fechaDesde, fechaHasta, gastosPage]);

  // Fetch categorías de gastos
  const fetchCategorias = async () => {
    try {
      const response = await fetch('/api/tienda-gastos?getCategorias=true');
      const data = await response.json();
      setCategoriasSugeridas(data.categorias || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Fetch inventario para registrar venta
  const fetchInventarioParaVenta = async () => {
    if (!selectedTienda) return;

    try {
      setLoadingInventario(true);
      const response = await fetch(`/api/tienda-inventario?tiendaId=${selectedTienda.id}&limit=5000`);
      const data = await response.json();

      const items = data.items || [];
      setInventarioTienda(items);
      setProductosVenta(items.map((item: TiendaInventarioItem) => ({
        inventarioId: item.id,
        marca: item.marca,
        amperaje: item.amperaje,
        cantidad: item.cantidad,
        cantidadDisponible: item.cantidad,
        precio_venta: item.precio_venta,
        costo: item.costo,
        selected: false,
        cantidadVender: 0
      })));
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoadingInventario(false);
    }
  };

  // Fetch detalle de venta
  const fetchVentaDetail = async (ventaId: string) => {
    try {
      setLoadingVentaDetail(true);
      const response = await fetch(`/api/tienda-ventas?ventaId=${ventaId}`);
      const data = await response.json();
      setSelectedVenta(data.venta);
      setVentaItems(data.items || []);
      setVentaDetailOpen(true);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoadingVentaDetail(false);
    }
  };

  useEffect(() => {
    fetchResumen();
  }, [fetchResumen]);

  useEffect(() => {
    if (selectedTienda) {
      fetchVentas();
      fetchGastos();
    }
  }, [selectedTienda, fetchVentas, fetchGastos]);

  useEffect(() => {
    fetchCategorias();
  }, []);

  // Handlers
  const handleSelectTienda = (tienda: TiendaResumen) => {
    setSelectedTienda(tienda);
    setActiveTab('ventas');
    setVentasPage(1);
    setGastosPage(1);
  };

  const handleOpenRegistrarVenta = () => {
    fetchInventarioParaVenta();
    setRegistrarVentaOpen(true);
    setVentaSearch('');
    setVentaNotas('');
  };

  const handleProductoVentaChange = (inventarioId: string, field: 'selected' | 'cantidadVender', value: boolean | number) => {
    setProductosVenta(prev => prev.map(p => {
      if (p.inventarioId === inventarioId) {
        if (field === 'selected') {
          return { ...p, selected: value as boolean, cantidadVender: value ? 1 : 0 };
        }
        return { ...p, cantidadVender: Math.min(Math.max(0, value as number), p.cantidadDisponible) };
      }
      return p;
    }));
  };

  const handleRegistrarVenta = async () => {
    if (!selectedTienda) return;

    const productosAVender = productosVenta
      .filter(p => p.selected && p.cantidadVender > 0)
      .map(p => ({
        inventarioId: p.inventarioId,
        marca: p.marca,
        amperaje: p.amperaje,
        cantidad: p.cantidadVender,
        precio_venta: p.precio_venta,
        costo: p.costo
      }));

    if (productosAVender.length === 0) {
      toast({ title: 'Error', description: 'Selecciona productos para vender', variant: 'destructive' });
      return;
    }

    try {
      setIsRegistrandoVenta(true);

      const response = await fetch('/api/tienda-ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tiendaId: selectedTienda.id,
          productos: productosAVender,
          notas: ventaNotas || null
        })
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      toast({ title: 'Venta registrada', description: data.message, variant: 'success' });
      setRegistrarVentaOpen(false);
      fetchVentas();
      fetchResumen();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al registrar venta',
        variant: 'destructive'
      });
    } finally {
      setIsRegistrandoVenta(false);
    }
  };

  const handleDeleteVenta = async () => {
    if (!ventaToDelete) return;

    try {
      const response = await fetch(`/api/tienda-ventas?ventaId=${ventaToDelete.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      toast({ title: 'Venta eliminada', description: data.message, variant: 'success' });
      setDeleteVentaDialogOpen(false);
      setVentaToDelete(null);
      fetchVentas();
      fetchResumen();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al eliminar venta',
        variant: 'destructive'
      });
    }
  };

  const handleOpenAgregarGasto = () => {
    setGastoForm({
      categoria: '',
      descripcion: '',
      monto: '',
      fecha: new Date().toISOString().split('T')[0]
    });
    setAgregarGastoOpen(true);
  };

  const handleSubmitGasto = async () => {
    if (!selectedTienda || !gastoForm.categoria || !gastoForm.monto) {
      toast({ title: 'Error', description: 'Categoría y monto son requeridos', variant: 'destructive' });
      return;
    }

    try {
      setIsSubmittingGasto(true);

      const response = await fetch('/api/tienda-gastos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tiendaId: selectedTienda.id,
          ...gastoForm,
          monto: parseFloat(gastoForm.monto)
        })
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      toast({ title: 'Gasto registrado', description: data.message, variant: 'success' });
      setAgregarGastoOpen(false);
      fetchGastos();
      fetchResumen();
      fetchCategorias();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al registrar gasto',
        variant: 'destructive'
      });
    } finally {
      setIsSubmittingGasto(false);
    }
  };

  const handleDeleteGasto = async () => {
    if (!gastoToDelete) return;

    try {
      const response = await fetch(`/api/tienda-gastos?id=${gastoToDelete.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      toast({ title: 'Gasto eliminado', description: data.message, variant: 'success' });
      setDeleteGastoDialogOpen(false);
      setGastoToDelete(null);
      fetchGastos();
      fetchResumen();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al eliminar gasto',
        variant: 'destructive'
      });
    }
  };

  // Filtrar productos para venta
  const filteredProductosVenta = productosVenta.filter(p => {
    const search = ventaSearch.toLowerCase();
    return !ventaSearch ||
      p.marca.toLowerCase().includes(search) ||
      p.amperaje.toLowerCase().includes(search);
  });

  const totalVentaActual = productosVenta
    .filter(p => p.selected && p.cantidadVender > 0)
    .reduce((sum, p) => sum + (p.cantidadVender * p.precio_venta), 0);

  const totalGananciaVentaActual = productosVenta
    .filter(p => p.selected && p.cantidadVender > 0)
    .reduce((sum, p) => sum + (p.cantidadVender * (p.precio_venta - p.costo)), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Movimientos</h1>
          <p className="text-muted-foreground">Control financiero de ventas y gastos</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">Desde:</Label>
            <Input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-36"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">Hasta:</Label>
            <Input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-36"
            />
          </div>
          <Button variant="outline" size="icon" onClick={fetchResumen}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {loading && !resumen ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Resumen General */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Ingresos Totales</p>
                    <p className="text-2xl font-bold">{formatCurrency(resumen?.general.ingresosTotales || 0)}</p>
                  </div>
                  <div className="h-12 w-12 bg-green-500/10 rounded-full flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Ganancia Bruta</p>
                    <p className="text-2xl font-bold">{formatCurrency(resumen?.general.gananciaBruta || 0)}</p>
                  </div>
                  <div className="h-12 w-12 bg-blue-500/10 rounded-full flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Gastos Totales</p>
                    <p className="text-2xl font-bold">{formatCurrency(resumen?.general.gastosTotales || 0)}</p>
                  </div>
                  <div className="h-12 w-12 bg-red-500/10 rounded-full flex items-center justify-center">
                    <TrendingDown className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Ganancia Neta</p>
                    <p className={`text-2xl font-bold ${(resumen?.general.gananciaNeta || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(resumen?.general.gananciaNeta || 0)}
                    </p>
                  </div>
                  <div className={`h-12 w-12 ${(resumen?.general.gananciaNeta || 0) >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'} rounded-full flex items-center justify-center`}>
                    <PiggyBank className={`h-6 w-6 ${(resumen?.general.gananciaNeta || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Resumen por origen */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Cotizaciones */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Cotizaciones (Ventas Directas)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">{resumen?.cotizaciones.cantidad || 0}</p>
                    <p className="text-xs text-muted-foreground">Ventas</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(resumen?.cotizaciones.total || 0)}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(resumen?.cotizaciones.ganancia || 0)}</p>
                    <p className="text-xs text-muted-foreground">Ganancia</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tiendas (resumen) */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  Tiendas ({resumen?.tiendas.cantidad || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold">{formatCurrency(resumen?.tiendas.totalVentas || 0)}</p>
                    <p className="text-xs text-muted-foreground">Ventas</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(resumen?.tiendas.totalGanancia || 0)}</p>
                    <p className="text-xs text-muted-foreground">Ganancia</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-red-600">{formatCurrency(resumen?.tiendas.totalGastos || 0)}</p>
                    <p className="text-xs text-muted-foreground">Gastos</p>
                  </div>
                  <div>
                    <p className={`text-lg font-bold ${(resumen?.tiendas.balanceNeto || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(resumen?.tiendas.balanceNeto || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">Balance</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detalle por Tienda */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Detalle por Tienda
                </span>
                {selectedTienda && (
                  <Button variant="ghost" size="sm" onClick={() => setSelectedTienda(null)}>
                    <X className="h-4 w-4 mr-1" />
                    Cerrar detalle
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedTienda ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {resumen?.tiendasDetalle.map((tienda) => (
                    <div
                      key={tienda.id}
                      className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleSelectTienda(tienda)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold">{tienda.nombre}</h3>
                        <Badge variant={tienda.tipo === 'casa_matriz' ? 'default' : 'secondary'}>
                          {tienda.tipo === 'casa_matriz' ? 'Matriz' : 'Sucursal'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Ventas</p>
                          <p className="font-medium">{formatCurrency(tienda.ventas.total)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Ganancia</p>
                          <p className="font-medium text-green-600">{formatCurrency(tienda.ventas.ganancia)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Gastos</p>
                          <p className="font-medium text-red-600">{formatCurrency(tienda.gastos.total)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Balance</p>
                          <p className={`font-medium ${tienda.balanceNeto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(tienda.balanceNeto)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!resumen?.tiendasDetalle || resumen.tiendasDetalle.length === 0) && (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                      <Store className="h-12 w-12 mx-auto mb-2 opacity-30" />
                      <p>No hay tiendas registradas</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Header de tienda seleccionada */}
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Store className="h-5 w-5" />
                        {selectedTienda.nombre}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Balance del período: <span className={selectedTienda.balanceNeto >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatCurrency(selectedTienda.balanceNeto)}
                        </span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleOpenRegistrarVenta} className="gap-2">
                        <ShoppingCart className="h-4 w-4" />
                        Registrar Venta
                      </Button>
                      <Button variant="outline" onClick={handleOpenAgregarGasto} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Agregar Gasto
                      </Button>
                    </div>
                  </div>

                  {/* Tabs de ventas y gastos */}
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList>
                      <TabsTrigger value="ventas" className="gap-2">
                        <Receipt className="h-4 w-4" />
                        Ventas ({selectedTienda.ventas.cantidad})
                      </TabsTrigger>
                      <TabsTrigger value="gastos" className="gap-2">
                        <Wallet className="h-4 w-4" />
                        Gastos
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="ventas" className="mt-4">
                      {loadingVentas ? (
                        <div className="text-center py-8">
                          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                        </div>
                      ) : ventas.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Receipt className="h-12 w-12 mx-auto mb-2 opacity-30" />
                          <p>No hay ventas registradas en este período</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {ventas.map((venta) => (
                            <div key={venta.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                              <div className="flex items-center gap-4">
                                <div className="text-center min-w-[60px]">
                                  <p className="text-sm font-medium">{new Date(venta.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</p>
                                </div>
                                <div>
                                  <p className="font-medium">{formatCurrency(venta.total_venta)}</p>
                                  <p className="text-sm text-green-600">+{formatCurrency(venta.ganancia)}</p>
                                </div>
                                {venta.notas && (
                                  <p className="text-sm text-muted-foreground truncate max-w-[200px]">{venta.notas}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => fetchVentaDetail(venta.id)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => { setVentaToDelete(venta); setDeleteVentaDialogOpen(true); }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}

                          {/* Paginación */}
                          {ventasTotalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 pt-4">
                              <Button variant="outline" size="sm" onClick={() => setVentasPage(p => p - 1)} disabled={ventasPage === 1}>
                                <ChevronLeft className="h-4 w-4" />
                              </Button>
                              <span className="text-sm">{ventasPage} / {ventasTotalPages}</span>
                              <Button variant="outline" size="sm" onClick={() => setVentasPage(p => p + 1)} disabled={ventasPage >= ventasTotalPages}>
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="gastos" className="mt-4">
                      {loadingGastos ? (
                        <div className="text-center py-8">
                          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                        </div>
                      ) : gastos.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Wallet className="h-12 w-12 mx-auto mb-2 opacity-30" />
                          <p>No hay gastos registrados en este período</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg mb-4">
                            <p className="text-sm text-muted-foreground">Total gastos del período:</p>
                            <p className="text-xl font-bold text-red-600">{formatCurrency(totalGastosPeriodo)}</p>
                          </div>

                          {gastos.map((gasto) => (
                            <div key={gasto.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                              <div className="flex items-center gap-4">
                                <div className="text-center min-w-[60px]">
                                  <p className="text-sm font-medium">{new Date(gasto.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</p>
                                </div>
                                <div>
                                  <p className="font-medium">{gasto.categoria}</p>
                                  {gasto.descripcion && (
                                    <p className="text-sm text-muted-foreground truncate max-w-[250px]">{gasto.descripcion}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <p className="font-medium text-red-600">{formatCurrency(gasto.monto)}</p>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => { setGastoToDelete(gasto); setDeleteGastoDialogOpen(true); }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}

                          {/* Paginación */}
                          {gastosTotalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 pt-4">
                              <Button variant="outline" size="sm" onClick={() => setGastosPage(p => p - 1)} disabled={gastosPage === 1}>
                                <ChevronLeft className="h-4 w-4" />
                              </Button>
                              <span className="text-sm">{gastosPage} / {gastosTotalPages}</span>
                              <Button variant="outline" size="sm" onClick={() => setGastosPage(p => p + 1)} disabled={gastosPage >= gastosTotalPages}>
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Dialog Registrar Venta */}
      <Dialog open={registrarVentaOpen} onOpenChange={setRegistrarVentaOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Registrar Venta - {selectedTienda?.nombre}
            </DialogTitle>
            <DialogDescription>
              Selecciona los productos vendidos del inventario de la tienda
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col gap-4 px-1 pt-1">
            {/* Búsqueda y resumen */}
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar producto..."
                  className="pl-9 focus-visible:ring-offset-0"
                  value={ventaSearch}
                  onChange={(e) => setVentaSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total: </span>
                  <span className="font-bold">{formatCurrency(totalVentaActual)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Ganancia: </span>
                  <span className="font-bold text-green-600">{formatCurrency(totalGananciaVentaActual)}</span>
                </div>
              </div>
            </div>

            {/* Lista de productos */}
            <div className="flex-1 overflow-y-auto border rounded-lg">
              {loadingInventario ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                </div>
              ) : filteredProductosVenta.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>No hay productos en el inventario de la tienda</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="w-10 py-3 px-4"></th>
                      <th className="text-left py-3 px-4 font-medium">Producto</th>
                      <th className="text-center py-3 px-4 font-medium">Disponible</th>
                      <th className="text-center py-3 px-4 font-medium">Precio</th>
                      <th className="text-center py-3 px-4 font-medium">Cantidad</th>
                      <th className="text-right py-3 px-4 font-medium">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProductosVenta.map((p) => (
                      <tr key={p.inventarioId} className={`border-b hover:bg-muted/50 ${p.selected ? 'bg-primary/5' : ''}`}>
                        <td className="py-3 px-4">
                          <Checkbox
                            checked={p.selected}
                            onCheckedChange={(checked) => handleProductoVentaChange(p.inventarioId, 'selected', !!checked)}
                          />
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium">{p.marca}</span> {p.amperaje}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant="secondary">{p.cantidadDisponible}</Badge>
                        </td>
                        <td className="py-3 px-4 text-center">{formatCurrency(p.precio_venta)}</td>
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center border rounded-md">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-none"
                              onClick={() => handleProductoVentaChange(p.inventarioId, 'cantidadVender', p.cantidadVender - 1)}
                              disabled={!p.selected || p.cantidadVender <= 0}
                            >
                              -
                            </Button>
                            <input
                              type="number"
                              className="w-12 text-center h-7 border-x bg-transparent text-sm focus:outline-none"
                              value={p.cantidadVender}
                              onChange={(e) => handleProductoVentaChange(p.inventarioId, 'cantidadVender', parseInt(e.target.value) || 0)}
                              disabled={!p.selected}
                              min={0}
                              max={p.cantidadDisponible}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-none"
                              onClick={() => handleProductoVentaChange(p.inventarioId, 'cantidadVender', p.cantidadVender + 1)}
                              disabled={!p.selected || p.cantidadVender >= p.cantidadDisponible}
                            >
                              +
                            </Button>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-medium">
                          {p.selected && p.cantidadVender > 0 ? formatCurrency(p.cantidadVender * p.precio_venta) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Notas */}
            <div className="pb-1">
              <Label>Notas (opcional)</Label>
              <Input
                placeholder="Notas de la venta..."
                className="focus-visible:ring-offset-0"
                value={ventaNotas}
                onChange={(e) => setVentaNotas(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setRegistrarVentaOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRegistrarVenta} disabled={isRegistrandoVenta || totalVentaActual === 0}>
              {isRegistrandoVenta ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <Receipt className="h-4 w-4 mr-2" />
                  Registrar Venta ({formatCurrency(totalVentaActual)})
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Detalle de Venta */}
      <Dialog open={ventaDetailOpen} onOpenChange={setVentaDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Detalle de Venta
            </DialogTitle>
            <DialogDescription>
              {selectedVenta && new Date(selectedVenta.fecha).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </DialogDescription>
          </DialogHeader>

          {loadingVentaDetail ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Total Venta</p>
                  <p className="text-xl font-bold">{formatCurrency(selectedVenta?.total_venta || 0)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Costo</p>
                  <p className="text-xl font-bold text-muted-foreground">{formatCurrency(selectedVenta?.total_costo || 0)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Ganancia</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(selectedVenta?.ganancia || 0)}</p>
                </div>
              </div>

              <div className="border rounded-lg max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left py-2 px-3 font-medium">Producto</th>
                      <th className="text-center py-2 px-3 font-medium">Cant.</th>
                      <th className="text-right py-2 px-3 font-medium">Precio</th>
                      <th className="text-right py-2 px-3 font-medium">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventaItems.map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="py-2 px-3">
                          <span className="font-medium">{item.marca}</span> {item.amperaje}
                        </td>
                        <td className="py-2 px-3 text-center">{item.cantidad}</td>
                        <td className="py-2 px-3 text-right">{formatCurrency(item.precio_venta)}</td>
                        <td className="py-2 px-3 text-right font-medium">{formatCurrency(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedVenta?.notas && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Notas:</p>
                  <p className="text-sm">{selectedVenta.notas}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setVentaDetailOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Agregar Gasto */}
      <Dialog open={agregarGastoOpen} onOpenChange={setAgregarGastoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Agregar Gasto - {selectedTienda?.nombre}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Categoría *</Label>
              <Input
                placeholder="Ej: Servicios Básicos, Material de Escritorio..."
                value={gastoForm.categoria}
                onChange={(e) => setGastoForm(prev => ({ ...prev, categoria: e.target.value }))}
                list="categorias-sugeridas"
              />
              <datalist id="categorias-sugeridas">
                {categoriasSugeridas.map((cat, i) => (
                  <option key={i} value={cat} />
                ))}
              </datalist>
            </div>

            <div>
              <Label>Descripción (opcional)</Label>
              <Input
                placeholder="Detalle del gasto..."
                value={gastoForm.descripcion}
                onChange={(e) => setGastoForm(prev => ({ ...prev, descripcion: e.target.value }))}
              />
            </div>

            <div>
              <Label>Monto (Bs) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={gastoForm.monto}
                onChange={(e) => setGastoForm(prev => ({ ...prev, monto: e.target.value }))}
              />
            </div>

            <div>
              <Label>Fecha</Label>
              <Input
                type="date"
                value={gastoForm.fecha}
                onChange={(e) => setGastoForm(prev => ({ ...prev, fecha: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAgregarGastoOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitGasto} disabled={isSubmittingGasto}>
              {isSubmittingGasto ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar Gasto'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog Eliminar Venta */}
      <AlertDialog open={deleteVentaDialogOpen} onOpenChange={setDeleteVentaDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar venta?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la venta de <strong>{formatCurrency(ventaToDelete?.total_venta || 0)}</strong> y los productos serán devueltos al inventario de la tienda.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteVenta} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog Eliminar Gasto */}
      <AlertDialog open={deleteGastoDialogOpen} onOpenChange={setDeleteGastoDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar gasto?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el gasto de <strong>{gastoToDelete?.categoria}</strong> por <strong>{formatCurrency(gastoToDelete?.monto || 0)}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGasto} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
