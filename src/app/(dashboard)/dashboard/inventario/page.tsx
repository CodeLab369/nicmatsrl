'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Search, Upload, Download, FileSpreadsheet, Trash2,
  Eye, Edit2, Package, Boxes, DollarSign, TrendingUp,
  ChevronLeft, ChevronRight, X
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
} from '@/components/ui';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface InventoryItem {
  id: string;
  marca: string;
  amperaje: string;
  cantidad: number;
  costo: number;
  precio_venta: number;
  created_at: string;
  updated_at: string;
}

interface Stats {
  productos: number;
  unidadesTotales: number;
  costoTotal: number;
  valorVenta: number;
}

export default function InventarioPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState<Stats>({ productos: 0, unidadesTotales: 0, costoTotal: 0, valorVenta: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  // Filtros
  const [search, setSearch] = useState('');
  const [filterMarca, setFilterMarca] = useState('');
  const [filterAmperaje, setFilterAmperaje] = useState('');
  const [cantidadOp, setCantidadOp] = useState('');
  const [cantidadVal, setCantidadVal] = useState('');
  
  // Modales
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  
  // Form
  const [formData, setFormData] = useState({
    marca: '', amperaje: '', cantidad: '', costo: '', precioVenta: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();

  // Cargar inventario
  const fetchInventory = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search) params.set('search', search);
      if (filterMarca) params.set('marca', filterMarca);
      if (filterAmperaje) params.set('amperaje', filterAmperaje);
      if (cantidadOp && cantidadVal) {
        params.set('cantidadOp', cantidadOp);
        params.set('cantidadVal', cantidadVal);
      }

      const response = await fetch(`/api/inventory?${params}`);
      const data = await response.json();

      if (data.items) {
        setItems(data.items);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error:', error);
      toast({ title: 'Error', description: 'No se pudo cargar el inventario', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, filterMarca, filterAmperaje, cantidadOp, cantidadVal, toast]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Resetear página al cambiar filtros
  useEffect(() => {
    setPage(1);
  }, [search, filterMarca, filterAmperaje, cantidadOp, cantidadVal, limit]);

  // Agregar producto
  const handleAdd = async () => {
    try {
      setIsSubmitting(true);
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error();
      
      toast({ title: 'Éxito', description: 'Producto agregado correctamente', variant: 'success' });
      setAddDialogOpen(false);
      setFormData({ marca: '', amperaje: '', cantidad: '', costo: '', precioVenta: '' });
      fetchInventory();
    } catch {
      toast({ title: 'Error', description: 'No se pudo agregar el producto', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Editar producto
  const handleEdit = async () => {
    if (!selectedItem) return;
    try {
      setIsSubmitting(true);
      const response = await fetch('/api/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedItem.id, ...formData }),
      });

      if (!response.ok) throw new Error();
      
      toast({ title: 'Éxito', description: 'Producto actualizado correctamente', variant: 'success' });
      setEditDialogOpen(false);
      fetchInventory();
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar el producto', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Eliminar producto
  const handleDelete = async () => {
    if (!selectedItem) return;
    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/inventory?id=${selectedItem.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error();
      
      toast({ title: 'Éxito', description: 'Producto eliminado correctamente', variant: 'success' });
      setDeleteDialogOpen(false);
      fetchInventory();
    } catch {
      toast({ title: 'Error', description: 'No se pudo eliminar el producto', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Vaciar inventario
  const handleClearAll = async () => {
    try {
      setIsSubmitting(true);
      const response = await fetch('/api/inventory?all=true', { method: 'DELETE' });
      if (!response.ok) throw new Error();
      
      toast({ title: 'Éxito', description: 'Inventario vaciado correctamente', variant: 'success' });
      setClearDialogOpen(false);
      fetchInventory();
    } catch {
      toast({ title: 'Error', description: 'No se pudo vaciar el inventario', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Exportar a Excel
  const handleExport = () => {
    const exportData = items.map(item => ({
      'Marca': item.marca,
      'Amperaje': item.amperaje,
      'Cantidad': item.cantidad,
      'Costo': item.costo,
      'Precio de Venta': item.precio_venta,
      'Costo Total': item.cantidad * item.costo,
      'Costo Venta': item.cantidad * item.precio_venta,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `inventario_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast({ title: 'Éxito', description: 'Inventario exportado correctamente', variant: 'success' });
  };

  // Descargar formato
  const handleDownloadFormat = () => {
    const headers = ['Marca', 'Amperaje', 'Cantidad', 'Costo', 'Precio de Venta'];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Formato');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, 'formato_inventario.xlsx');
    toast({ title: 'Éxito', description: 'Formato descargado', variant: 'success' });
  };

  // Importar desde Excel
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          toast({ title: 'Error', description: 'El archivo está vacío', variant: 'destructive' });
          return;
        }

        const response = await fetch('/api/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) throw new Error();
        const result = await response.json();
        
        toast({ title: 'Éxito', description: `Se importaron ${result.count} productos`, variant: 'success' });
        fetchInventory();
      } catch {
        toast({ title: 'Error', description: 'Error al importar el archivo', variant: 'destructive' });
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const openEditDialog = (item: InventoryItem) => {
    setSelectedItem(item);
    setFormData({
      marca: item.marca,
      amperaje: item.amperaje,
      cantidad: item.cantidad.toString(),
      costo: item.costo.toString(),
      precioVenta: item.precio_venta.toString(),
    });
    setEditDialogOpen(true);
  };

  const clearFilters = () => {
    setSearch('');
    setFilterMarca('');
    setFilterAmperaje('');
    setCantidadOp('');
    setCantidadVal('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Inventario</h1>
          <p className="text-muted-foreground">Gestiona el inventario de baterías</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => { setFormData({ marca: '', amperaje: '', cantidad: '', costo: '', precioVenta: '' }); setAddDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Agregar
          </Button>
          <label className="cursor-pointer">
            <Button variant="outline" asChild>
              <span><Upload className="mr-2 h-4 w-4" /> Importar</span>
            </Button>
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
          </label>
          <Button variant="outline" onClick={handleExport} disabled={items.length === 0}>
            <Download className="mr-2 h-4 w-4" /> Exportar
          </Button>
          <Button variant="outline" onClick={handleDownloadFormat}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Formato
          </Button>
          <Button variant="destructive" onClick={() => setClearDialogOpen(true)} disabled={items.length === 0}>
            <Trash2 className="mr-2 h-4 w-4" /> Eliminar Todo
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.productos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unidades Totales</CardTitle>
            <Boxes className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.unidadesTotales}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Costo Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.costoTotal)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor de Venta</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.valorVenta)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por marca o amperaje..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Input
              placeholder="Filtrar por marca"
              value={filterMarca}
              onChange={(e) => setFilterMarca(e.target.value)}
            />
            <Input
              placeholder="Filtrar por amperaje"
              value={filterAmperaje}
              onChange={(e) => setFilterAmperaje(e.target.value)}
            />
            <Select value={cantidadOp} onValueChange={setCantidadOp}>
              <SelectTrigger>
                <SelectValue placeholder="Cantidad..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="eq">Igual a</SelectItem>
                <SelectItem value="gt">Mayor que</SelectItem>
                <SelectItem value="lt">Menor que</SelectItem>
                <SelectItem value="gte">Mayor o igual</SelectItem>
                <SelectItem value="lte">Menor o igual</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Valor"
                value={cantidadVal}
                onChange={(e) => setCantidadVal(e.target.value)}
                disabled={!cantidadOp}
              />
              {(search || filterMarca || filterAmperaje || cantidadOp) && (
                <Button variant="ghost" size="icon" onClick={clearFilters}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Lista de Productos</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Mostrar:</span>
            <Select value={limit.toString()} onValueChange={(v) => setLimit(parseInt(v))}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="500">500</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay productos en el inventario
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Marca</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Amperaje</th>
                      <th className="text-right py-3 px-2 font-medium text-muted-foreground">Cantidad</th>
                      <th className="text-right py-3 px-2 font-medium text-muted-foreground hidden md:table-cell">Costo</th>
                      <th className="text-right py-3 px-2 font-medium text-muted-foreground hidden md:table-cell">Precio Venta</th>
                      <th className="text-right py-3 px-2 font-medium text-muted-foreground hidden lg:table-cell">Costo Total</th>
                      <th className="text-right py-3 px-2 font-medium text-muted-foreground hidden lg:table-cell">Costo Venta</th>
                      <th className="text-right py-3 px-2 font-medium text-muted-foreground">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-3 px-2 font-medium">{item.marca}</td>
                        <td className="py-3 px-2">{item.amperaje}</td>
                        <td className="py-3 px-2 text-right">
                          <Badge variant={item.cantidad > 0 ? 'success' : 'destructive'}>
                            {item.cantidad}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 text-right hidden md:table-cell">{formatCurrency(item.costo)}</td>
                        <td className="py-3 px-2 text-right hidden md:table-cell">{formatCurrency(item.precio_venta)}</td>
                        <td className="py-3 px-2 text-right hidden lg:table-cell">{formatCurrency(item.cantidad * item.costo)}</td>
                        <td className="py-3 px-2 text-right hidden lg:table-cell">{formatCurrency(item.cantidad * item.precio_venta)}</td>
                        <td className="py-3 px-2">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => { setSelectedItem(item); setViewDialogOpen(true); }}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => { setSelectedItem(item); setDeleteDialogOpen(true); }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Mostrando {((page - 1) * limit) + 1} - {Math.min(page * limit, total)} de {total}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">Página {page} de {totalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog Agregar */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Producto</DialogTitle>
            <DialogDescription>Ingresa los datos del nuevo producto</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Marca</Label>
                <Input placeholder="Ingresar Marca" value={formData.marca} onChange={(e) => setFormData({ ...formData, marca: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Amperaje</Label>
                <Input placeholder="Ingresar Amperaje" value={formData.amperaje} onChange={(e) => setFormData({ ...formData, amperaje: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Cantidad</Label>
                <Input type="number" placeholder="0" value={formData.cantidad} onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Costo (Bs.)</Label>
                <Input type="number" step="0.01" placeholder="0.00" value={formData.costo} onChange={(e) => setFormData({ ...formData, costo: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Precio Venta (Bs.)</Label>
                <Input type="number" step="0.01" placeholder="0.00" value={formData.precioVenta} onChange={(e) => setFormData({ ...formData, precioVenta: e.target.value })} />
              </div>
            </div>
            {formData.cantidad && formData.costo && (
              <div className="grid grid-cols-2 gap-4 p-3 bg-muted rounded-lg">
                <div>
                  <span className="text-sm text-muted-foreground">Costo Total:</span>
                  <p className="font-bold">{formatCurrency(parseFloat(formData.cantidad || '0') * parseFloat(formData.costo || '0'))}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Costo Venta:</span>
                  <p className="font-bold">{formatCurrency(parseFloat(formData.cantidad || '0') * parseFloat(formData.precioVenta || '0'))}</p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleAdd} disabled={isSubmitting || !formData.marca || !formData.amperaje}>
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Ver */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalle del Producto</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-muted-foreground">Marca:</span><p className="font-medium">{selectedItem.marca}</p></div>
                <div><span className="text-muted-foreground">Amperaje:</span><p className="font-medium">{selectedItem.amperaje}</p></div>
                <div><span className="text-muted-foreground">Cantidad:</span><p className="font-medium">{selectedItem.cantidad}</p></div>
                <div><span className="text-muted-foreground">Costo:</span><p className="font-medium">{formatCurrency(selectedItem.costo)}</p></div>
                <div><span className="text-muted-foreground">Precio Venta:</span><p className="font-medium">{formatCurrency(selectedItem.precio_venta)}</p></div>
                <div><span className="text-muted-foreground">Costo Total:</span><p className="font-medium">{formatCurrency(selectedItem.cantidad * selectedItem.costo)}</p></div>
                <div><span className="text-muted-foreground">Costo Venta:</span><p className="font-medium">{formatCurrency(selectedItem.cantidad * selectedItem.precio_venta)}</p></div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setViewDialogOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Producto</DialogTitle>
            <DialogDescription>Modifica los datos del producto</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Marca</Label>
                <Input placeholder="Ingresar Marca" value={formData.marca} onChange={(e) => setFormData({ ...formData, marca: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Amperaje</Label>
                <Input placeholder="Ingresar Amperaje" value={formData.amperaje} onChange={(e) => setFormData({ ...formData, amperaje: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Cantidad</Label>
                <Input type="number" placeholder="0" value={formData.cantidad} onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Costo (Bs.)</Label>
                <Input type="number" step="0.01" placeholder="0.00" value={formData.costo} onChange={(e) => setFormData({ ...formData, costo: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Precio Venta (Bs.)</Label>
                <Input type="number" step="0.01" placeholder="0.00" value={formData.precioVenta} onChange={(e) => setFormData({ ...formData, precioVenta: e.target.value })} />
              </div>
            </div>
            {formData.cantidad && formData.costo && (
              <div className="grid grid-cols-2 gap-4 p-3 bg-muted rounded-lg">
                <div>
                  <span className="text-sm text-muted-foreground">Costo Total:</span>
                  <p className="font-bold">{formatCurrency(parseFloat(formData.cantidad || '0') * parseFloat(formData.costo || '0'))}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Costo Venta:</span>
                  <p className="font-bold">{formatCurrency(parseFloat(formData.cantidad || '0') * parseFloat(formData.precioVenta || '0'))}</p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleEdit} disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Eliminar */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará <strong>{selectedItem?.marca} {selectedItem?.amperaje}</strong> del inventario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isSubmitting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Vaciar Todo */}
      <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Vaciar todo el inventario?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará <strong>TODOS</strong> los productos del inventario. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isSubmitting ? 'Eliminando...' : 'Sí, vaciar todo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
