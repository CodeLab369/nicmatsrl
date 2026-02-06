'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Plus, Search, Upload, Download, FileSpreadsheet, Trash2,
  Eye, Edit2, Users, Phone, Mail, MapPin,
  ChevronLeft, ChevronRight, X, UserPlus
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTableSubscription } from '@/contexts';
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

interface Cliente {
  id: string;
  nombre: string;
  telefono: string;
  email: string;
  direccion: string;
  created_at: string;
  updated_at: string;
}

interface Stats {
  totalClientes: number;
  conEmail: number;
  conTelefono: number;
  conDireccion: number;
}

export default function ClientesPage() {
  const [items, setItems] = useState<Cliente[]>([]);
  const [stats, setStats] = useState<Stats>({ totalClientes: 0, conEmail: 0, conTelefono: 0, conDireccion: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  // Filtros
  const [search, setSearch] = useState('');
  const [filterNombre, setFilterNombre] = useState('');
  const [filterTelefono, setFilterTelefono] = useState('');
  const [filterDireccion, setFilterDireccion] = useState('');
  
  // Opciones de filtros dinámicos
  const [nombresOptions, setNombresOptions] = useState<string[]>([]);
  const [telefonosOptions, setTelefonosOptions] = useState<string[]>([]);
  const [direccionesOptions, setDireccionesOptions] = useState<string[]>([]);
  
  // Modales
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Cliente | null>(null);
  
  // Import state
  const [importData, setImportData] = useState<any[]>([]);
  const [importAnalysis, setImportAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Form
  const [formData, setFormData] = useState({
    nombre: '', telefono: '', email: '', direccion: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();

  // Cargar nombres disponibles para filtro
  const fetchNombres = useCallback(async () => {
    try {
      const response = await fetch('/api/clientes?getNombres=true');
      const data = await response.json();
      if (data.nombres) setNombresOptions(data.nombres);
    } catch (error) {
      console.error('Error fetching nombres:', error);
    }
  }, []);

  // Cargar teléfonos disponibles para filtro
  const fetchTelefonos = useCallback(async () => {
    try {
      const response = await fetch('/api/clientes?getTelefonos=true');
      const data = await response.json();
      if (data.telefonos) setTelefonosOptions(data.telefonos);
    } catch (error) {
      console.error('Error fetching telefonos:', error);
    }
  }, []);

  // Cargar direcciones disponibles para filtro
  const fetchDirecciones = useCallback(async () => {
    try {
      const response = await fetch('/api/clientes?getDirecciones=true');
      const data = await response.json();
      if (data.direcciones) setDireccionesOptions(data.direcciones);
    } catch (error) {
      console.error('Error fetching direcciones:', error);
    }
  }, []);

  useEffect(() => {
    fetchNombres();
    fetchTelefonos();
    fetchDirecciones();
  }, [fetchNombres, fetchTelefonos, fetchDirecciones]);

  // Cargar clientes
  const fetchClientes = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        _t: Date.now().toString(),
      });
      if (search) params.set('search', search);
      if (filterNombre && filterNombre !== '_all') params.set('nombre', filterNombre);
      if (filterTelefono && filterTelefono !== '_all') params.set('telefono', filterTelefono);
      if (filterDireccion && filterDireccion !== '_all') params.set('direccion', filterDireccion);

      const response = await fetch(`/api/clientes?${params}`);
      const data = await response.json();

      if (data.items) {
        setItems(data.items);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error:', error);
      toast({ title: 'Error', description: 'No se pudo cargar los clientes', variant: 'destructive' });
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [page, limit, search, filterNombre, filterTelefono, filterDireccion, toast]);

  // Refs para Realtime
  const fetchClientesRef = useRef(fetchClientes);
  const fetchNombresRef = useRef(fetchNombres);
  useEffect(() => { fetchClientesRef.current = fetchClientes; }, [fetchClientes]);
  useEffect(() => { fetchNombresRef.current = fetchNombres; }, [fetchNombres]);

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  // Suscripción Realtime - actualización silenciosa
  useTableSubscription('clientes', () => {
    fetchClientesRef.current(false);
    fetchNombresRef.current();
  });

  // Resetear página al cambiar filtros
  useEffect(() => {
    setPage(1);
  }, [search, filterNombre, filterTelefono, filterDireccion, limit]);

  // Limpiar filtros
  const clearFilters = () => {
    setSearch('');
    setFilterNombre('');
    setFilterTelefono('');
    setFilterDireccion('');
  };

  // Agregar cliente
  const handleAdd = async () => {
    if (!formData.nombre.trim()) {
      toast({ title: 'Error', description: 'El nombre es requerido', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: 'Éxito', description: 'Cliente agregado correctamente' });
        setAddDialogOpen(false);
        setFormData({ nombre: '', telefono: '', email: '', direccion: '' });
        fetchClientes();
        fetchNombres();
        fetchTelefonos();
        fetchDirecciones();
      } else {
        toast({ title: 'Error', description: data.error || 'Error al agregar', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Error de conexión', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Editar cliente
  const handleEdit = async () => {
    if (!selectedItem || !formData.nombre.trim()) return;
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/clientes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedItem.id, ...formData }),
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: 'Éxito', description: 'Cliente actualizado correctamente' });
        setEditDialogOpen(false);
        setSelectedItem(null);
        fetchClientes();
        fetchNombres();
        fetchTelefonos();
        fetchDirecciones();
      } else {
        toast({ title: 'Error', description: data.error || 'Error al actualizar', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Error de conexión', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Eliminar cliente
  const handleDelete = async () => {
    if (!selectedItem) return;
    try {
      const response = await fetch(`/api/clientes?id=${selectedItem.id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        toast({ title: 'Éxito', description: 'Cliente eliminado' });
        setDeleteDialogOpen(false);
        setSelectedItem(null);
        fetchClientes();
        fetchNombres();
        fetchTelefonos();
        fetchDirecciones();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Error al eliminar', variant: 'destructive' });
    }
  };

  // Eliminar todo
  const handleClearAll = async () => {
    try {
      const response = await fetch('/api/clientes?all=true', { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        toast({ title: 'Éxito', description: 'Todos los clientes eliminados' });
        setClearDialogOpen(false);
        fetchClientes();
        fetchNombres();
        fetchTelefonos();
        fetchDirecciones();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Error al eliminar', variant: 'destructive' });
    }
  };

  // Abrir dialog de edición
  const openEditDialog = (item: Cliente) => {
    setSelectedItem(item);
    setFormData({
      nombre: item.nombre,
      telefono: item.telefono,
      email: item.email,
      direccion: item.direccion,
    });
    setEditDialogOpen(true);
  };

  // Exportar Excel
  const handleExport = async () => {
    try {
      const response = await fetch('/api/clientes?noPagination=true');
      const data = await response.json();
      
      const exportData = (data.items || []).map((item: Cliente) => ({
        Nombre: item.nombre,
        'Teléfono': item.telefono,
        Email: item.email,
        'Dirección': item.direccion,
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
      const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      saveAs(new Blob([buf]), `Clientes_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast({ title: 'Éxito', description: `${exportData.length} clientes exportados` });
    } catch (error) {
      toast({ title: 'Error', description: 'Error al exportar', variant: 'destructive' });
    }
  };

  // Descargar formato
  const handleDownloadFormat = () => {
    const formatData = [
      { Nombre: 'Juan Pérez', 'Teléfono': '70012345', Email: 'juan@email.com', 'Dirección': 'Av. Principal #123' },
      { Nombre: 'María López', 'Teléfono': '71098765', Email: 'maria@email.com', 'Dirección': 'Calle Sucre #456' },
    ];
    const ws = XLSX.utils.json_to_sheet(formatData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Formato');
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    saveAs(new Blob([buf]), 'Formato_Clientes.xlsx');
    toast({ title: 'Formato descargado', description: 'Llena el archivo y usa Importar para cargarlo' });
  };

  // Importar Excel
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet);
        
        setImportData(jsonData);
        setImportDialogOpen(true);

        // Análisis
        setIsAnalyzing(true);
        const response = await fetch('/api/clientes?mode=analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(jsonData),
        });
        const analysis = await response.json();
        setImportAnalysis(analysis.analysis);
      } catch (error) {
        toast({ title: 'Error', description: 'Error al leer el archivo', variant: 'destructive' });
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // Confirmar importación
  const confirmImport = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/clientes?mode=import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importData),
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: 'Éxito', description: `${data.inserted} clientes importados` });
        setImportDialogOpen(false);
        setImportData([]);
        setImportAnalysis(null);
        fetchClientes();
        fetchNombres();
        fetchTelefonos();
        fetchDirecciones();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Error al importar', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">Gestión de clientes del sistema</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => { setFormData({ nombre: '', telefono: '', email: '', direccion: '' }); setAddDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Agregar
          </Button>
          <label>
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
            <Button variant="outline" asChild>
              <span><Upload className="h-4 w-4 mr-2" />Importar</span>
            </Button>
          </label>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button variant="outline" onClick={handleDownloadFormat}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Formato
          </Button>
          <Button variant="destructive" onClick={() => setClearDialogOpen(true)} disabled={total === 0}>
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar Todo
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-lg sm:text-2xl font-bold">{stats.totalClientes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Con Teléfono</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-lg sm:text-2xl font-bold">{stats.conTelefono}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Con Email</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-lg sm:text-2xl font-bold">{stats.conEmail}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Con Dirección</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-lg sm:text-2xl font-bold">{stats.conDireccion}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, teléfono, email o dirección..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterNombre} onValueChange={setFilterNombre}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los nombres" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Todos los nombres</SelectItem>
                {nombresOptions.map((n) => (
                  <SelectItem key={n} value={n}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterTelefono} onValueChange={setFilterTelefono}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los teléfonos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Todos los teléfonos</SelectItem>
                {telefonosOptions.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Select value={filterDireccion} onValueChange={setFilterDireccion}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las direcciones" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Todas las direcciones</SelectItem>
                  {direccionesOptions.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(search || (filterNombre && filterNombre !== '_all') || (filterTelefono && filterTelefono !== '_all') || (filterDireccion && filterDireccion !== '_all')) && (
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
          <CardTitle>Lista de Clientes</CardTitle>
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
              No hay clientes registrados
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Nombre</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Teléfono</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground hidden md:table-cell">Email</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground hidden lg:table-cell">Dirección</th>
                      <th className="text-right py-3 px-2 font-medium text-muted-foreground">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-3 px-2 font-medium">{item.nombre}</td>
                        <td className="py-3 px-2">{item.telefono || <span className="text-muted-foreground">—</span>}</td>
                        <td className="py-3 px-2 hidden md:table-cell">{item.email || <span className="text-muted-foreground">—</span>}</td>
                        <td className="py-3 px-2 hidden lg:table-cell max-w-[200px] truncate">{item.direccion || <span className="text-muted-foreground">—</span>}</td>
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Agregar Cliente
            </DialogTitle>
            <DialogDescription>Ingresa los datos del nuevo cliente</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label>Nombre *</Label>
              <Input placeholder="Nombre completo" value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} />
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input placeholder="Número de teléfono" value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" placeholder="correo@ejemplo.com" value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            </div>
            <div>
              <Label>Dirección</Label>
              <Input placeholder="Dirección del cliente" value={formData.direccion}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleAdd} disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Agregar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Ver */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalles del Cliente</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nombre</p>
                  <p className="font-medium">{selectedItem.nombre}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Teléfono</p>
                  <p className="font-medium">{selectedItem.telefono || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedItem.email || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Dirección</p>
                  <p className="font-medium">{selectedItem.direccion || '—'}</p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground pt-2 border-t">
                Registrado: {new Date(selectedItem.created_at).toLocaleDateString('es-BO', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Editar */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-primary" />
              Editar Cliente
            </DialogTitle>
            <DialogDescription>Modifica los datos del cliente</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label>Nombre *</Label>
              <Input placeholder="Nombre completo" value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} />
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input placeholder="Número de teléfono" value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" placeholder="correo@ejemplo.com" value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            </div>
            <div>
              <Label>Dirección</Label>
              <Input placeholder="Dirección del cliente" value={formData.direccion}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleEdit} disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Eliminar */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Cliente</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de eliminar a <strong>{selectedItem?.nombre}</strong>? Esta acción no se puede deshacer.
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

      {/* Dialog Eliminar Todo */}
      <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Todos los Clientes</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de eliminar <strong>TODOS</strong> los clientes ({total})? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sí, Eliminar Todo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Importar */}
      <Dialog open={importDialogOpen} onOpenChange={(open) => { setImportDialogOpen(open); if (!open) { setImportData([]); setImportAnalysis(null); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Importar Clientes
            </DialogTitle>
            <DialogDescription>Revisión de los datos a importar</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {isAnalyzing ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
                <span>Analizando archivo...</span>
              </div>
            ) : importAnalysis ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span>Total de clientes encontrados:</span>
                  <Badge>{importAnalysis.total}</Badge>
                </div>
                {importAnalysis.preview && importAnalysis.preview.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Vista previa (primeros {Math.min(importAnalysis.preview.length, 5)}):</p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {importAnalysis.preview.slice(0, 5).map((item: any, i: number) => (
                        <div key={i} className="text-xs p-2 bg-muted/50 rounded flex justify-between">
                          <span className="font-medium">{item.nombre}</span>
                          <span className="text-muted-foreground">{item.telefono || item.email || '—'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Cancelar</Button>
            <Button onClick={confirmImport} disabled={isSubmitting || !importAnalysis}>
              {isSubmitting ? 'Importando...' : `Importar ${importAnalysis?.total || 0} clientes`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
