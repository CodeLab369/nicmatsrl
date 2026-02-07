'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Banknote, Plus, Search, Pencil, Trash2, RefreshCw, ChevronLeft, ChevronRight,
  Store, ArrowUpCircle, ArrowDownCircle, DollarSign, ShoppingCart, Save, Fuel, MoreHorizontal, TrendingUp
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTableSubscription } from '@/contexts';
import { formatCurrency } from '@/lib/utils';
import {
  Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Badge,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui';

interface DineroOperacion {
  id: string;
  tipo: 'ingreso_tienda' | 'salida_efectivo';
  detalle: string;
  tienda_id: string | null;
  tienda_nombre: string;
  importe: number;
  created_at: string;
}

interface Tienda {
  id: string;
  nombre: string;
}

interface DineroData {
  ventas_directas: number;
  count_ventas: number;
  balance: number;
  stats: {
    total_ingresos_tiendas: number;
    total_salidas: number;
    count_ingresos: number;
    count_salidas: number;
  };
  operaciones: DineroOperacion[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const CATEGORIAS_SALIDA = ['Compra de chatarra', 'Combustible', 'Otros Gastos'];

export default function DineroPage() {
  const { toast } = useToast();
  const [data, setData] = useState<DineroData | null>(null);
  const [tiendas, setTiendas] = useState<Tienda[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [search, setSearch] = useState('');

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTipo, setDialogTipo] = useState<'ingreso_tienda' | 'salida_efectivo'>('ingreso_tienda');
  const [formData, setFormData] = useState({ detalle: '', tienda_id: '', importe: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit
  const [editingOp, setEditingOp] = useState<DineroOperacion | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchRef = useRef<() => void>();

  // Cargar tiendas
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/tiendas');
        const result = await res.json();
        if (result.tiendas) setTiendas(result.tiendas);
      } catch { /* ignore */ }
    })();
  }, []);

  const fetchData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
      if (filtroTipo !== 'todos') params.set('tipo', filtroTipo);
      if (search) params.set('search', search);

      const res = await fetch(`/api/dinero?${params}&_t=${Date.now()}`);
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setData(result);
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Error al cargar datos', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [page, limit, filtroTipo, search, toast]);

  useEffect(() => { fetchRef.current = () => fetchData(false); }, [fetchData]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const realtimeCb = useCallback(() => { fetchRef.current?.(); }, []);
  useTableSubscription('dinero_operaciones', realtimeCb);
  useTableSubscription('cotizaciones', realtimeCb);

  // Crear operación
  const handleCreate = async () => {
    try {
      setIsSubmitting(true);
      const tienda = tiendas.find(t => t.id === formData.tienda_id);

      const payload = {
        tipo: dialogTipo,
        detalle: formData.detalle,
        tienda_id: dialogTipo === 'ingreso_tienda' ? formData.tienda_id : null,
        tienda_nombre: dialogTipo === 'ingreso_tienda' ? (tienda?.nombre || '') : '',
        importe: formData.importe,
      };

      const res = await fetch('/api/dinero', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Error al crear');
      toast({ title: 'Operación registrada' });
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch {
      toast({ title: 'Error', description: 'No se pudo registrar', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Editar
  const handleEdit = async () => {
    if (!editingOp) return;
    try {
      setIsSubmitting(true);
      const tienda = tiendas.find(t => t.id === formData.tienda_id);

      const payload = {
        id: editingOp.id,
        detalle: formData.detalle,
        tienda_id: editingOp.tipo === 'ingreso_tienda' ? formData.tienda_id : null,
        tienda_nombre: editingOp.tipo === 'ingreso_tienda' ? (tienda?.nombre || '') : '',
        importe: formData.importe,
      };

      const res = await fetch('/api/dinero', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Error al editar');
      toast({ title: 'Operación actualizada' });
      setEditDialogOpen(false);
      setEditingOp(null);
      resetForm();
      fetchData();
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Eliminar
  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/dinero?id=${deleteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      toast({ title: 'Operación eliminada' });
      setDeleteId(null);
      fetchData();
    } catch {
      toast({ title: 'Error', description: 'No se pudo eliminar', variant: 'destructive' });
    }
  };

  const resetForm = () => setFormData({ detalle: '', tienda_id: '', importe: '' });

  const openCreateDialog = (tipo: 'ingreso_tienda' | 'salida_efectivo') => {
    setDialogTipo(tipo);
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (op: DineroOperacion) => {
    setEditingOp(op);
    setFormData({
      detalle: op.detalle,
      tienda_id: op.tienda_id || '',
      importe: op.importe.toString(),
    });
    setEditDialogOpen(true);
  };

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case 'ingreso_tienda': return <Badge className="bg-green-500/10 text-green-600 border-green-500/30"><Store className="h-3 w-3 mr-1" />Ingreso Tienda</Badge>;
      case 'salida_efectivo': return <Badge className="bg-red-500/10 text-red-600 border-red-500/30"><ArrowDownCircle className="h-3 w-3 mr-1" />Salida</Badge>;
      default: return <Badge>{tipo}</Badge>;
    }
  };

  const getSigno = (tipo: string) => tipo === 'ingreso_tienda' ? '+' : '-';
  const getColor = (tipo: string) => tipo === 'ingreso_tienda' ? 'text-green-600' : 'text-red-600';

  const formatDate = (d: string) => new Date(d).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Dinero</h1>
          <p className="text-muted-foreground">Control de ingresos por ventas, tiendas y salidas de efectivo</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="text-green-600 border-green-300" onClick={() => openCreateDialog('ingreso_tienda')}>
            <Store className="h-4 w-4 mr-1" /> Ingreso de Tienda
          </Button>
          <Button size="sm" variant="outline" className="text-red-600 border-red-300" onClick={() => openCreateDialog('salida_efectivo')}>
            <ArrowDownCircle className="h-4 w-4 mr-1" /> Salida de Efectivo
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-blue-500/30">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Ventas Directas</p>
              <ShoppingCart className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-xl font-bold text-blue-600">{formatCurrency(data?.ventas_directas || 0)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {data?.count_ventas || 0} cotizaciones • <span className="text-blue-500">Automático</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Ingresos Tiendas</p>
              <Store className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-xl font-bold text-green-600">{formatCurrency(data?.stats.total_ingresos_tiendas || 0)}</p>
            <p className="text-xs text-muted-foreground mt-1">{data?.stats.count_ingresos || 0} registros</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Salidas de Efectivo</p>
              <ArrowDownCircle className="h-4 w-4 text-red-500" />
            </div>
            <p className="text-xl font-bold text-red-600">{formatCurrency(data?.stats.total_salidas || 0)}</p>
            <p className="text-xs text-muted-foreground mt-1">{data?.stats.count_salidas || 0} registros</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/30">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Balance</p>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
            <p className={`text-xl font-bold ${(data?.balance || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatCurrency(data?.balance || 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Ventas + Ingresos - Salidas</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por detalle..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={filtroTipo} onValueChange={(v) => { setFiltroTipo(v); setPage(1); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los tipos</SelectItem>
                <SelectItem value="ingreso_tienda">Ingresos Tiendas</SelectItem>
                <SelectItem value="salida_efectivo">Salidas de Efectivo</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => fetchData()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Actualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Listado */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Registro de Operaciones</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Mostrar:</span>
              <Select value={limit.toString()} onValueChange={(v) => { setLimit(parseInt(v)); setPage(1); }}>
                <SelectTrigger className="w-[70px] h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[5, 10, 50, 100, 500].map(n => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : !data?.operaciones.length ? (
            <p className="text-center text-muted-foreground py-8">No hay operaciones registradas</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium">Fecha</th>
                      <th className="text-left py-2 font-medium">Tipo</th>
                      <th className="text-left py-2 font-medium">Detalle</th>
                      <th className="text-left py-2 font-medium">Tienda</th>
                      <th className="text-right py-2 font-medium">Importe</th>
                      <th className="text-center py-2 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.operaciones.map((op) => (
                      <tr key={op.id} className="border-b hover:bg-muted/50">
                        <td className="py-2 text-xs text-muted-foreground whitespace-nowrap">{formatDate(op.created_at)}</td>
                        <td className="py-2">{getTipoBadge(op.tipo)}</td>
                        <td className="py-2 max-w-[200px] truncate">{op.detalle || '-'}</td>
                        <td className="py-2 text-xs">
                          {op.tienda_nombre ? (
                            <Badge variant="outline"><Store className="h-3 w-3 mr-1" />{op.tienda_nombre}</Badge>
                          ) : '-'}
                        </td>
                        <td className={`py-2 text-right font-medium ${getColor(op.tipo)}`}>
                          {getSigno(op.tipo)} {formatCurrency(op.importe)}
                        </td>
                        <td className="py-2 text-center">
                          <div className="flex justify-center gap-1">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditDialog(op)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => setDeleteId(op.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              {data.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    {(page - 1) * limit + 1}-{Math.min(page * limit, data.total)} de {data.total}
                  </p>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" disabled={page >= data.totalPages} onClick={() => setPage(p => p + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog Crear */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {dialogTipo === 'ingreso_tienda' ? 'Registrar Ingreso de Tienda' : 'Registrar Salida de Efectivo'}
            </DialogTitle>
            <DialogDescription>
              {dialogTipo === 'ingreso_tienda' ? 'Registrar un ingreso proveniente de una tienda (suma al balance)' : 'Registrar una salida de efectivo (resta del balance)'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {dialogTipo === 'ingreso_tienda' && (
              <div>
                <Label>Tienda</Label>
                <Select value={formData.tienda_id} onValueChange={(v) => setFormData({ ...formData, tienda_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar tienda" /></SelectTrigger>
                  <SelectContent>
                    {tiendas.map(t => <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Detalle</Label>
              {dialogTipo === 'salida_efectivo' ? (
                <Select value={formData.detalle} onValueChange={(v) => setFormData({ ...formData, detalle: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar categoría" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS_SALIDA.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={formData.detalle} onChange={(e) => setFormData({ ...formData, detalle: e.target.value })} placeholder="Descripción del ingreso" />
              )}
            </div>

            <div>
              <Label>Importe (Bs.)</Label>
              <Input type="number" step="0.01" value={formData.importe} onChange={(e) => setFormData({ ...formData, importe: e.target.value })} placeholder="0.00" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting ? <RefreshCw className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar {editingOp?.tipo === 'ingreso_tienda' ? 'Ingreso de Tienda' : 'Salida de Efectivo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {editingOp?.tipo === 'ingreso_tienda' && (
              <div>
                <Label>Tienda</Label>
                <Select value={formData.tienda_id} onValueChange={(v) => setFormData({ ...formData, tienda_id: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {tiendas.map(t => <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Detalle</Label>
              {editingOp?.tipo === 'salida_efectivo' ? (
                <Select value={formData.detalle} onValueChange={(v) => setFormData({ ...formData, detalle: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS_SALIDA.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={formData.detalle} onChange={(e) => setFormData({ ...formData, detalle: e.target.value })} />
              )}
            </div>

            <div>
              <Label>Importe (Bs.)</Label>
              <Input type="number" step="0.01" value={formData.importe} onChange={(e) => setFormData({ ...formData, importe: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleEdit} disabled={isSubmitting}>
              {isSubmitting ? <RefreshCw className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar eliminar */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar operación?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
