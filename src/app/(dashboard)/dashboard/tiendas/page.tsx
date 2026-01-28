'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Store, Plus, Search, Package, ChevronLeft, ChevronRight,
  Eye, Pencil, Trash2, RefreshCw, Building2, MapPin, User,
  Send, ArrowRight, CheckCircle, X, Filter, ChevronDown
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTableSubscription } from '@/contexts';
import { formatCurrency } from '@/lib/utils';
import {
  Button, Card, CardContent, CardHeader, CardTitle,
  Input, Badge, Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, Label,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  Checkbox
} from '@/components/ui';

interface Tienda {
  id: string;
  nombre: string;
  tipo: 'casa_matriz' | 'sucursal';
  encargado: string | null;
  ciudad: string | null;
  direccion: string | null;
  created_at: string;
}

interface InventoryItem {
  id: string;
  marca: string;
  amperaje: string;
  cantidad: number;
  costo: number;
  precio_venta: number;
}

interface TiendaInventoryItem {
  id: string;
  tienda_id: string;
  marca: string;
  amperaje: string;
  cantidad: number;
  costo: number;
  precio_venta: number;
}

interface Stats {
  total: number;
  casaMatriz: number;
  sucursales: number;
}

interface TiendaStats {
  totalProductos: number;
  totalUnidades: number;
  valorCosto: number;
  valorVenta: number;
}

interface TransferItem extends InventoryItem {
  cantidadEnviar: number;
  selected: boolean;
}

export default function TiendasPage() {
  // Estados principales
  const [tiendas, setTiendas] = useState<Tienda[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, casaMatriz: 0, sucursales: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('_all');
  
  // Tienda seleccionada para ver inventario
  const [selectedTienda, setSelectedTienda] = useState<Tienda | null>(null);
  const [tiendaInventory, setTiendaInventory] = useState<TiendaInventoryItem[]>([]);
  const [tiendaStats, setTiendaStats] = useState<TiendaStats>({ totalProductos: 0, totalUnidades: 0, valorCosto: 0, valorVenta: 0 });
  const [tiendaPage, setTiendaPage] = useState(1);
  const [tiendaLimit, setTiendaLimit] = useState(10);
  const [tiendaTotal, setTiendaTotal] = useState(0);
  const [tiendaTotalPages, setTiendaTotalPages] = useState(1);
  const [tiendaSearch, setTiendaSearch] = useState('');
  const [tiendaFilterMarca, setTiendaFilterMarca] = useState('_all');
  const [tiendaMarcas, setTiendaMarcas] = useState<string[]>([]);
  const [loadingTiendaInv, setLoadingTiendaInv] = useState(false);
  
  // Formulario crear/editar tienda
  const [showForm, setShowForm] = useState(false);
  const [editingTienda, setEditingTienda] = useState<Tienda | null>(null);
  const [formData, setFormData] = useState({
    nombre: '', tipo: 'sucursal', encargado: '', ciudad: '', direccion: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Dialogs
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tiendaToDelete, setTiendaToDelete] = useState<Tienda | null>(null);
  
  // Transferencia de inventario
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [inventarioCentral, setInventarioCentral] = useState<InventoryItem[]>([]);
  const [transferItems, setTransferItems] = useState<TransferItem[]>([]);
  const [transferSearch, setTransferSearch] = useState('');
  const [transferFilterMarca, setTransferFilterMarca] = useState('_all');
  const [transferMarcas, setTransferMarcas] = useState<string[]>([]);
  const [loadingTransfer, setLoadingTransfer] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  
  const { toast } = useToast();

  // Fetch tiendas
  const fetchTiendas = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search,
        tipo: filterTipo
      });
      
      const response = await fetch(`/api/tiendas?${params}`);
      const data = await response.json();
      
      setTiendas(data.tiendas || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      if (data.stats) setStats(data.stats);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, filterTipo]);

  // Fetch inventario de tienda seleccionada
  const fetchTiendaInventory = useCallback(async () => {
    if (!selectedTienda) return;
    
    try {
      setLoadingTiendaInv(true);
      const params = new URLSearchParams({
        tiendaId: selectedTienda.id,
        page: tiendaPage.toString(),
        limit: tiendaLimit.toString(),
        search: tiendaSearch,
        marca: tiendaFilterMarca
      });
      
      const response = await fetch(`/api/tienda-inventario?${params}`);
      const data = await response.json();
      
      setTiendaInventory(data.items || []);
      setTiendaTotal(data.total || 0);
      setTiendaTotalPages(data.totalPages || 1);
      if (data.stats) setTiendaStats(data.stats);
      if (data.marcas) setTiendaMarcas(data.marcas);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoadingTiendaInv(false);
    }
  }, [selectedTienda, tiendaPage, tiendaLimit, tiendaSearch, tiendaFilterMarca]);

  // Fetch inventario central para transferencia
  const fetchInventarioCentral = useCallback(async () => {
    try {
      setLoadingTransfer(true);
      const response = await fetch('/api/inventory?limit=1000');
      const data = await response.json();
      
      const items = (data.items || []).filter((i: InventoryItem) => i.cantidad > 0);
      setInventarioCentral(items);
      
      // Inicializar items de transferencia
      setTransferItems(items.map((item: InventoryItem) => ({
        ...item,
        cantidadEnviar: 0,
        selected: false
      })));
      
      // Obtener marcas únicas
      const marcas = Array.from(new Set(items.map((i: InventoryItem) => i.marca))).sort() as string[];
      setTransferMarcas(marcas);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoadingTransfer(false);
    }
  }, []);

  // Effects
  useEffect(() => {
    fetchTiendas();
  }, [fetchTiendas]);

  useEffect(() => {
    if (selectedTienda) {
      fetchTiendaInventory();
    }
  }, [selectedTienda, fetchTiendaInventory]);

  useEffect(() => {
    setPage(1);
  }, [search, filterTipo, limit]);

  useEffect(() => {
    setTiendaPage(1);
  }, [tiendaSearch, tiendaFilterMarca, tiendaLimit]);

  // Suscripción Realtime
  const isConnected = useTableSubscription('tiendas', fetchTiendas);
  useTableSubscription('tienda_inventario', () => {
    if (selectedTienda) fetchTiendaInventory();
  });
  useTableSubscription('inventory', () => {
    if (transferDialogOpen) fetchInventarioCentral();
  });

  // Handlers
  const handleSubmit = async () => {
    if (!formData.nombre.trim()) {
      toast({ title: 'Error', description: 'El nombre es requerido', variant: 'destructive' });
      return;
    }

    try {
      setIsSubmitting(true);
      const url = '/api/tiendas';
      const method = editingTienda ? 'PATCH' : 'POST';
      const body = editingTienda 
        ? { id: editingTienda.id, ...formData }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) throw new Error();

      toast({ 
        title: 'Éxito', 
        description: editingTienda ? 'Tienda actualizada' : 'Tienda creada', 
        variant: 'success' 
      });
      
      handleCancelForm();
      fetchTiendas();
    } catch {
      toast({ title: 'Error', description: 'No se pudo guardar', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (tienda: Tienda) => {
    setEditingTienda(tienda);
    setFormData({
      nombre: tienda.nombre,
      tipo: tienda.tipo,
      encargado: tienda.encargado || '',
      ciudad: tienda.ciudad || '',
      direccion: tienda.direccion || ''
    });
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!tiendaToDelete) return;
    
    try {
      const response = await fetch(`/api/tiendas?id=${tiendaToDelete.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error();
      
      toast({ title: 'Éxito', description: 'Tienda eliminada', variant: 'success' });
      setDeleteDialogOpen(false);
      setTiendaToDelete(null);
      if (selectedTienda?.id === tiendaToDelete.id) {
        setSelectedTienda(null);
      }
      fetchTiendas();
    } catch {
      toast({ title: 'Error', description: 'No se pudo eliminar', variant: 'destructive' });
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingTienda(null);
    setFormData({ nombre: '', tipo: 'sucursal', encargado: '', ciudad: '', direccion: '' });
  };

  const handleOpenTransfer = async () => {
    if (!selectedTienda) return;
    setTransferDialogOpen(true);
    setTransferSearch('');
    setTransferFilterMarca('_all');
    await fetchInventarioCentral();
  };

  const handleTransferItemChange = (id: string, field: 'selected' | 'cantidadEnviar', value: boolean | number) => {
    setTransferItems(prev => prev.map(item => {
      if (item.id === id) {
        if (field === 'selected') {
          return { ...item, selected: value as boolean, cantidadEnviar: value ? (item.cantidadEnviar || 1) : 0 };
        }
        return { ...item, cantidadEnviar: Math.min(Math.max(0, value as number), item.cantidad) };
      }
      return item;
    }));
  };

  const handleSelectAll = (selected: boolean) => {
    setTransferItems(prev => prev.map(item => ({
      ...item,
      selected,
      cantidadEnviar: selected ? item.cantidad : 0
    })));
  };

  const handleTransfer = async () => {
    if (!selectedTienda) return;
    
    const productosAEnviar = transferItems
      .filter(item => item.selected && item.cantidadEnviar > 0)
      .map(item => ({
        inventoryId: item.id,
        marca: item.marca,
        amperaje: item.amperaje,
        cantidad: item.cantidadEnviar,
        costo: item.costo,
        precio_venta: item.precio_venta
      }));

    if (productosAEnviar.length === 0) {
      toast({ title: 'Error', description: 'Selecciona productos para enviar', variant: 'destructive' });
      return;
    }

    try {
      setIsTransferring(true);
      const response = await fetch('/api/tienda-inventario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tiendaId: selectedTienda.id,
          productos: productosAEnviar
        })
      });

      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error);

      toast({ 
        title: 'Transferencia completada', 
        description: data.message, 
        variant: 'success' 
      });

      if (data.resultados?.errores?.length > 0) {
        console.warn('Errores en transferencia:', data.resultados.errores);
      }

      setTransferDialogOpen(false);
      fetchTiendaInventory();
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Error en la transferencia', 
        variant: 'destructive' 
      });
    } finally {
      setIsTransferring(false);
    }
  };

  // Filtrar items de transferencia con useMemo para evitar recálculos innecesarios
  const filteredTransferItems = useMemo(() => {
    return transferItems.filter(item => {
      const searchLower = transferSearch.toLowerCase();
      const matchSearch = !transferSearch || 
        item.marca.toLowerCase().includes(searchLower) ||
        item.amperaje.toLowerCase().includes(searchLower);
      const matchMarca = transferFilterMarca === '_all' || item.marca === transferFilterMarca;
      return matchSearch && matchMarca;
    });
  }, [transferItems, transferSearch, transferFilterMarca]);

  const totalSeleccionados = useMemo(() => 
    transferItems.filter(i => i.selected && i.cantidadEnviar > 0).length
  , [transferItems]);
  
  const totalUnidadesAEnviar = useMemo(() => 
    transferItems.reduce((sum, i) => sum + (i.selected ? i.cantidadEnviar : 0), 0)
  , [transferItems]);

  // Badge tipo tienda
  const getTipoBadge = (tipo: string) => {
    if (tipo === 'casa_matriz') {
      return <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 border">Casa Matriz</Badge>;
    }
    return <Badge className="bg-green-500/15 text-green-600 border-green-500/30 border">Sucursal</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Tiendas</h1>
          <p className="text-muted-foreground">Gestiona tus tiendas y su inventario</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 text-xs ${isConnected ? 'text-green-500' : 'text-muted-foreground'}`}>
            <RefreshCw className="h-3 w-3" />
            {isConnected ? 'Conectado' : 'Sin conexión'}
          </div>
          <Button onClick={() => { setShowForm(!showForm); if (showForm) handleCancelForm(); }}>
            {showForm ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
            {showForm ? 'Cancelar' : 'Nueva Tienda'}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="shadow-soft border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Store className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Tiendas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.casaMatriz}</p>
                <p className="text-sm text-muted-foreground">Casa Matriz</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Store className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.sucursales}</p>
                <p className="text-sm text-muted-foreground">Sucursales</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Formulario */}
      {showForm && (
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>{editingTienda ? 'Editar Tienda' : 'Nueva Tienda'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Nombre de la Tienda *</Label>
                <Input
                  placeholder="Ingrese nombre de la tienda"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Tienda *</Label>
                <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="casa_matriz">Casa Matriz</SelectItem>
                    <SelectItem value="sucursal">Sucursal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Encargado</Label>
                <Input
                  placeholder="Ingrese nombre del encargado"
                  value={formData.encargado}
                  onChange={(e) => setFormData({ ...formData, encargado: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Ciudad</Label>
                <Input
                  placeholder="Ingrese ciudad"
                  value={formData.ciudad}
                  onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Dirección</Label>
                <Input
                  placeholder="Ingrese dirección"
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={handleCancelForm}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : (editingTienda ? 'Guardar Cambios' : 'Crear Tienda')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Layout principal: Lista de tiendas + Detalle */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Lista de Tiendas */}
        <Card className="shadow-soft">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-lg">Lista de Tiendas</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
                    className="pl-9 w-40"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select value={filterTipo} onValueChange={setFilterTipo}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">Todos</SelectItem>
                    <SelectItem value="casa_matriz">Casa Matriz</SelectItem>
                    <SelectItem value="sucursal">Sucursal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : tiendas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Store className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>No hay tiendas</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {tiendas.map((tienda) => (
                    <div
                      key={tienda.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedTienda?.id === tienda.id 
                          ? 'bg-primary/10 border-primary' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedTienda(tienda)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">{tienda.nombre}</span>
                            {getTipoBadge(tienda.tipo)}
                          </div>
                          <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                            {tienda.encargado && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" /> {tienda.encargado}
                              </span>
                            )}
                            {tienda.ciudad && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> {tienda.ciudad}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleEdit(tienda); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); setTiendaToDelete(tienda); setDeleteDialogOpen(true); }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Paginación */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    {total} tienda{total !== 1 ? 's' : ''}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">{page} / {totalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Detalle de Tienda Seleccionada */}
        <Card className="shadow-soft">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-lg">
                  {selectedTienda ? `Inventario: ${selectedTienda.nombre}` : 'Selecciona una tienda'}
                </CardTitle>
                {selectedTienda && (
                  <p className="text-sm text-muted-foreground">
                    {tiendaStats.totalProductos} productos • {tiendaStats.totalUnidades} unidades
                  </p>
                )}
              </div>
              {selectedTienda && (
                <Button onClick={handleOpenTransfer} className="gap-2">
                  <Send className="h-4 w-4" />
                  Enviar Productos
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedTienda ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>Selecciona una tienda para ver su inventario</p>
              </div>
            ) : loadingTiendaInv ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Stats de la tienda */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-muted p-3 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">Valor Costo</p>
                    <p className="text-lg font-bold">{formatCurrency(tiendaStats.valorCosto)}</p>
                  </div>
                  <div className="bg-primary/10 p-3 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">Valor Venta</p>
                    <p className="text-lg font-bold text-primary">{formatCurrency(tiendaStats.valorVenta)}</p>
                  </div>
                </div>

                {/* Filtros */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar producto..."
                      className="pl-9"
                      value={tiendaSearch}
                      onChange={(e) => setTiendaSearch(e.target.value)}
                    />
                  </div>
                  <Select value={tiendaFilterMarca} onValueChange={setTiendaFilterMarca}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Marca" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_all">Todas</SelectItem>
                      {tiendaMarcas.map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tabla de inventario */}
                {tiendaInventory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>Sin productos en esta tienda</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 font-medium">Marca</th>
                            <th className="text-left py-2 font-medium">Amperaje</th>
                            <th className="text-center py-2 font-medium">Cant.</th>
                            <th className="text-right py-2 font-medium">P. Venta</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tiendaInventory.map((item) => (
                            <tr key={item.id} className="border-b hover:bg-muted/50">
                              <td className="py-2 font-medium">{item.marca}</td>
                              <td className="py-2">{item.amperaje}</td>
                              <td className="py-2 text-center">
                                <Badge variant={item.cantidad <= 5 ? 'destructive' : 'secondary'}>
                                  {item.cantidad}
                                </Badge>
                              </td>
                              <td className="py-2 text-right">{formatCurrency(item.precio_venta)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Paginación tienda */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <Select value={tiendaLimit.toString()} onValueChange={(v) => setTiendaLimit(parseInt(v))}>
                        <SelectTrigger className="w-20 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setTiendaPage(p => p - 1)} disabled={tiendaPage === 1}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm">{tiendaPage} / {tiendaTotalPages}</span>
                        <Button variant="outline" size="sm" onClick={() => setTiendaPage(p => p + 1)} disabled={tiendaPage >= tiendaTotalPages}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog Transferencia */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Enviar Productos a {selectedTienda?.nombre}
            </DialogTitle>
            <DialogDescription>
              Selecciona los productos y cantidades a enviar desde el inventario central
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col pt-2 px-1">
            {/* Filtros */}
            <div className="flex items-center gap-2 mb-4 mt-1">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar producto..."
                  className="pl-9"
                  value={transferSearch}
                  onChange={(e) => setTransferSearch(e.target.value)}
                />
              </div>
              <Select value={transferFilterMarca} onValueChange={setTransferFilterMarca}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filtrar marca" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Todas las marcas</SelectItem>
                  {transferMarcas.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => handleSelectAll(true)}>
                Seleccionar Todo
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleSelectAll(false)}>
                Deseleccionar
              </Button>
            </div>

            {/* Resumen */}
            <div className="bg-primary/10 p-3 rounded-lg mb-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm">
                  <strong>{totalSeleccionados}</strong> productos seleccionados
                </span>
                <span className="text-sm">
                  <strong>{totalUnidadesAEnviar}</strong> unidades a enviar
                </span>
              </div>
              <ArrowRight className="h-5 w-5 text-primary" />
            </div>

            {/* Tabla */}
            <div className="flex-1 overflow-y-auto border rounded-lg">
              {loadingTransfer ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mt-2">Cargando inventario central...</p>
                </div>
              ) : filteredTransferItems.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">
                    {transferItems.length === 0 
                      ? 'No hay productos con stock en el inventario central' 
                      : 'No se encontraron productos con los filtros aplicados'
                    }
                  </p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium w-10">
                        <Checkbox 
                          checked={filteredTransferItems.length > 0 && filteredTransferItems.every(i => i.selected)}
                          onCheckedChange={(checked: boolean) => {
                            const ids = new Set(filteredTransferItems.map(i => i.id));
                            setTransferItems(prev => prev.map(item => 
                              ids.has(item.id) ? { ...item, selected: !!checked, cantidadEnviar: checked ? item.cantidad : 0 } : item
                            ));
                          }}
                        />
                      </th>
                      <th className="text-left py-3 px-4 font-medium">Marca</th>
                      <th className="text-left py-3 px-4 font-medium">Amperaje</th>
                      <th className="text-center py-3 px-4 font-medium">Stock Central</th>
                      <th className="text-center py-3 px-4 font-medium">Cantidad a Enviar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransferItems.map((item) => (
                      <tr key={item.id} className={`border-b hover:bg-muted/50 ${item.selected ? 'bg-primary/5' : ''}`}>
                        <td className="py-3 px-4">
                          <Checkbox
                            checked={item.selected}
                            onCheckedChange={(checked: boolean) => handleTransferItemChange(item.id, 'selected', !!checked)}
                          />
                        </td>
                        <td className="py-3 px-4 font-medium">{item.marca}</td>
                        <td className="py-3 px-4">{item.amperaje}</td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant="secondary">{item.cantidad}</Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center border rounded-md overflow-hidden">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-none"
                              onClick={() => handleTransferItemChange(item.id, 'cantidadEnviar', item.cantidadEnviar - 1)}
                              disabled={!item.selected || item.cantidadEnviar <= 0}
                            >
                              -
                            </Button>
                            <input
                              type="number"
                              className="w-12 text-center h-7 border-x bg-transparent text-sm focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              value={item.cantidadEnviar}
                              onChange={(e) => handleTransferItemChange(item.id, 'cantidadEnviar', parseInt(e.target.value) || 0)}
                              disabled={!item.selected}
                              min={0}
                              max={item.cantidad}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-none"
                              onClick={() => handleTransferItemChange(item.id, 'cantidadEnviar', item.cantidadEnviar + 1)}
                              disabled={!item.selected || item.cantidadEnviar >= item.cantidad}
                            >
                              +
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs h-7 px-2 rounded-none border-l"
                              onClick={() => handleTransferItemChange(item.id, 'cantidadEnviar', item.cantidad)}
                              disabled={!item.selected}
                            >
                              Max
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleTransfer} 
              disabled={isTransferring || totalSeleccionados === 0}
              className="gap-2"
            >
              {isTransferring ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Enviar {totalUnidadesAEnviar} unidades
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Eliminar */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tienda?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la tienda "{tiendaToDelete?.nombre}" y todo su inventario. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
