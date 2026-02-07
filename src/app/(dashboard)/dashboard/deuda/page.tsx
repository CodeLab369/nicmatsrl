'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Landmark, Plus, Search, Pencil, Trash2, RefreshCw, ChevronLeft, ChevronRight,
  ArrowDownCircle, Truck, ShoppingCart, DollarSign, Building2, Save, X
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

interface DeudaOperacion {
  id: string;
  tipo: 'deposito' | 'camion' | 'compra';
  detalle: string;
  entidad_financiera: string;
  metodo_pago: string;
  kilos: number;
  precio_unitario: number;
  importe: number;
  created_at: string;
}

interface DeudaData {
  saldo_inicial: number;
  saldo_actual: number;
  stats: {
    total_depositos: number;
    total_camiones: number;
    total_compras: number;
    count_depositos: number;
    count_camiones: number;
    count_compras: number;
  };
  operaciones: DeudaOperacion[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const ENTIDADES = ['Mercantil', 'Unión', 'BNB'];
const METODOS_PAGO = ['Transferencia', 'QR'];

export default function DeudaPage() {
  const { toast } = useToast();
  const [data, setData] = useState<DeudaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [search, setSearch] = useState('');

  // Saldo
  const [editingSaldo, setEditingSaldo] = useState(false);
  const [saldoInput, setSaldoInput] = useState('');

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTipo, setDialogTipo] = useState<'deposito' | 'camion' | 'compra'>('deposito');
  const [formData, setFormData] = useState({ detalle: '', entidad_financiera: '', metodo_pago: '', kilos: '', precio_unitario: '', importe: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit
  const [editingOp, setEditingOp] = useState<DeudaOperacion | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchRef = useRef<() => void>();

  const fetchData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
      if (filtroTipo !== 'todos') params.set('tipo', filtroTipo);
      if (search) params.set('search', search);

      const res = await fetch(`/api/deuda?${params}&_t=${Date.now()}`);
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
  useTableSubscription('deuda_operaciones', realtimeCb);
  useTableSubscription('deuda_config', realtimeCb);

  // Guardar saldo
  const handleSaveSaldo = async () => {
    try {
      const res = await fetch('/api/deuda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setSaldo', saldo: parseFloat(saldoInput) || 0 }),
      });
      if (!res.ok) throw new Error('Error al guardar');
      toast({ title: 'Saldo actualizado' });
      setEditingSaldo(false);
      fetchData();
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar el saldo', variant: 'destructive' });
    }
  };

  // Crear operación
  const handleCreate = async () => {
    try {
      setIsSubmitting(true);
      const payload: Record<string, unknown> = {
        tipo: dialogTipo,
        detalle: formData.detalle,
      };

      if (dialogTipo === 'deposito') {
        payload.entidad_financiera = formData.entidad_financiera;
        payload.metodo_pago = formData.metodo_pago;
        payload.importe = formData.importe;
      } else if (dialogTipo === 'camion') {
        payload.kilos = formData.kilos;
        payload.precio_unitario = formData.precio_unitario;
      } else {
        payload.importe = formData.importe;
      }

      const res = await fetch('/api/deuda', {
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
      toast({ title: 'Error', description: 'No se pudo registrar la operación', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Editar
  const handleEdit = async () => {
    if (!editingOp) return;
    try {
      setIsSubmitting(true);
      const payload: Record<string, unknown> = {
        id: editingOp.id,
        tipo: editingOp.tipo,
        detalle: formData.detalle,
      };

      if (editingOp.tipo === 'deposito') {
        payload.entidad_financiera = formData.entidad_financiera;
        payload.metodo_pago = formData.metodo_pago;
        payload.importe = formData.importe;
      } else if (editingOp.tipo === 'camion') {
        payload.kilos = formData.kilos;
        payload.precio_unitario = formData.precio_unitario;
      } else {
        payload.importe = formData.importe;
      }

      const res = await fetch('/api/deuda', {
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
      const res = await fetch(`/api/deuda?id=${deleteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      toast({ title: 'Operación eliminada' });
      setDeleteId(null);
      fetchData();
    } catch {
      toast({ title: 'Error', description: 'No se pudo eliminar', variant: 'destructive' });
    }
  };

  const resetForm = () => setFormData({ detalle: '', entidad_financiera: '', metodo_pago: '', kilos: '', precio_unitario: '', importe: '' });

  const openCreateDialog = (tipo: 'deposito' | 'camion' | 'compra') => {
    setDialogTipo(tipo);
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (op: DeudaOperacion) => {
    setEditingOp(op);
    setFormData({
      detalle: op.detalle,
      entidad_financiera: op.entidad_financiera,
      metodo_pago: op.metodo_pago || '',
      kilos: op.kilos.toString(),
      precio_unitario: op.precio_unitario.toString(),
      importe: op.importe.toString(),
    });
    setEditDialogOpen(true);
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'deposito': return 'Depósito';
      case 'camion': return 'Camión Enviado';
      case 'compra': return 'Compra';
      default: return tipo;
    }
  };

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case 'deposito': return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30"><ArrowDownCircle className="h-3 w-3 mr-1" />Depósito</Badge>;
      case 'camion': return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/30"><Truck className="h-3 w-3 mr-1" />Camión</Badge>;
      case 'compra': return <Badge className="bg-red-500/10 text-red-600 border-red-500/30"><ShoppingCart className="h-3 w-3 mr-1" />Compra</Badge>;
      default: return <Badge>{tipo}</Badge>;
    }
  };

  const getSigno = (tipo: string) => tipo === 'compra' ? '+' : '-';
  const getColor = (tipo: string) => tipo === 'compra' ? 'text-red-600' : 'text-green-600';

  const formatDate = (d: string) => new Date(d).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Deuda</h1>
          <p className="text-muted-foreground">Control de deuda, depósitos, camiones y compras</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="text-blue-600 border-blue-300" onClick={() => openCreateDialog('deposito')}>
            <ArrowDownCircle className="h-4 w-4 mr-1" /> Depósito
          </Button>
          <Button size="sm" variant="outline" className="text-orange-600 border-orange-300" onClick={() => openCreateDialog('camion')}>
            <Truck className="h-4 w-4 mr-1" /> Camión Enviado
          </Button>
          <Button size="sm" variant="outline" className="text-red-600 border-red-300" onClick={() => openCreateDialog('compra')}>
            <ShoppingCart className="h-4 w-4 mr-1" /> Compra
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Saldo Actual */}
        <Card className="border-indigo-500/30">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Saldo Actual</p>
              <Landmark className="h-4 w-4 text-indigo-500" />
            </div>
            <p className={`text-xl font-bold ${(data?.saldo_actual || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(data?.saldo_actual || 0)}
            </p>
            {/* Saldo Inicial editable */}
            <div className="mt-2 pt-2 border-t">
              {editingSaldo ? (
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    step="0.01"
                    value={saldoInput}
                    onChange={(e) => setSaldoInput(e.target.value)}
                    className="h-7 text-xs"
                    placeholder="Saldo inicial"
                  />
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleSaveSaldo}>
                    <Save className="h-3 w-3 text-green-600" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingSaldo(false)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <button
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  onClick={() => { setSaldoInput((data?.saldo_inicial || 0).toString()); setEditingSaldo(true); }}
                >
                  Saldo Inicial: {formatCurrency(data?.saldo_inicial || 0)} ✏️
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Depósitos</p>
              <ArrowDownCircle className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-xl font-bold text-blue-600">{formatCurrency(data?.stats.total_depositos || 0)}</p>
            <p className="text-xs text-muted-foreground mt-1">{data?.stats.count_depositos || 0} registros</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Camiones Enviados</p>
              <Truck className="h-4 w-4 text-orange-500" />
            </div>
            <p className="text-xl font-bold text-orange-600">{formatCurrency(data?.stats.total_camiones || 0)}</p>
            <p className="text-xs text-muted-foreground mt-1">{data?.stats.count_camiones || 0} registros</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Compras</p>
              <ShoppingCart className="h-4 w-4 text-red-500" />
            </div>
            <p className="text-xl font-bold text-red-600">{formatCurrency(data?.stats.total_compras || 0)}</p>
            <p className="text-xs text-muted-foreground mt-1">{data?.stats.count_compras || 0} registros</p>
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
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los tipos</SelectItem>
                <SelectItem value="deposito">Depósitos</SelectItem>
                <SelectItem value="camion">Camiones</SelectItem>
                <SelectItem value="compra">Compras</SelectItem>
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
                      <th className="text-left py-2 font-medium">Info</th>
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
                        <td className="py-2 text-xs text-muted-foreground">
                          {op.tipo === 'deposito' && op.entidad_financiera && (
                            <Badge variant="outline"><Building2 className="h-3 w-3 mr-1" />{op.entidad_financiera}</Badge>
                          )}
                          {op.tipo === 'deposito' && op.metodo_pago && (
                            <Badge variant="outline" className="ml-1">{op.metodo_pago}</Badge>
                          )}
                          {op.tipo === 'camion' && (
                            <span>{op.kilos} kg × {formatCurrency(op.precio_unitario)}</span>
                          )}
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
            <DialogTitle>Registrar {getTipoLabel(dialogTipo)}</DialogTitle>
            <DialogDescription>
              {dialogTipo === 'deposito' && 'Registrar un depósito bancario (resta de la deuda)'}
              {dialogTipo === 'camion' && 'Registrar un camión enviado (resta de la deuda)'}
              {dialogTipo === 'compra' && 'Registrar una compra (suma a la deuda)'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Detalle</Label>
              <Input value={formData.detalle} onChange={(e) => setFormData({ ...formData, detalle: e.target.value })} placeholder="Descripción de la operación" />
            </div>

            {dialogTipo === 'deposito' && (
              <>
                <div>
                  <Label>Entidad Financiera</Label>
                  <Select value={formData.entidad_financiera} onValueChange={(v) => setFormData({ ...formData, entidad_financiera: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar banco" /></SelectTrigger>
                    <SelectContent>
                      {ENTIDADES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Método de Pago</Label>
                  <Select value={formData.metodo_pago} onValueChange={(v) => setFormData({ ...formData, metodo_pago: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar método" /></SelectTrigger>
                    <SelectContent>
                      {METODOS_PAGO.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Importe (Bs.)</Label>
                  <Input type="number" step="0.01" value={formData.importe} onChange={(e) => setFormData({ ...formData, importe: e.target.value })} placeholder="0.00" />
                </div>
              </>
            )}

            {dialogTipo === 'camion' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Kilos</Label>
                    <Input type="number" step="0.01" value={formData.kilos} onChange={(e) => setFormData({ ...formData, kilos: e.target.value })} placeholder="0.00" />
                  </div>
                  <div>
                    <Label>Precio/Kilo (Bs.)</Label>
                    <Input type="number" step="0.01" value={formData.precio_unitario} onChange={(e) => setFormData({ ...formData, precio_unitario: e.target.value })} placeholder="0.00" />
                  </div>
                </div>
                {formData.kilos && formData.precio_unitario && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Total: <span className="font-bold text-foreground">{formatCurrency((parseFloat(formData.kilos) || 0) * (parseFloat(formData.precio_unitario) || 0))}</span></p>
                  </div>
                )}
              </>
            )}

            {dialogTipo === 'compra' && (
              <div>
                <Label>Importe (Bs.)</Label>
                <Input type="number" step="0.01" value={formData.importe} onChange={(e) => setFormData({ ...formData, importe: e.target.value })} placeholder="0.00" />
              </div>
            )}
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
            <DialogTitle>Editar {editingOp ? getTipoLabel(editingOp.tipo) : ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Detalle</Label>
              <Input value={formData.detalle} onChange={(e) => setFormData({ ...formData, detalle: e.target.value })} />
            </div>

            {editingOp?.tipo === 'deposito' && (
              <>
                <div>
                  <Label>Entidad Financiera</Label>
                  <Select value={formData.entidad_financiera} onValueChange={(v) => setFormData({ ...formData, entidad_financiera: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ENTIDADES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Método de Pago</Label>
                  <Select value={formData.metodo_pago} onValueChange={(v) => setFormData({ ...formData, metodo_pago: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {METODOS_PAGO.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Importe (Bs.)</Label>
                  <Input type="number" step="0.01" value={formData.importe} onChange={(e) => setFormData({ ...formData, importe: e.target.value })} />
                </div>
              </>
            )}

            {editingOp?.tipo === 'camion' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Kilos</Label>
                    <Input type="number" step="0.01" value={formData.kilos} onChange={(e) => setFormData({ ...formData, kilos: e.target.value })} />
                  </div>
                  <div>
                    <Label>Precio/Kilo (Bs.)</Label>
                    <Input type="number" step="0.01" value={formData.precio_unitario} onChange={(e) => setFormData({ ...formData, precio_unitario: e.target.value })} />
                  </div>
                </div>
                {formData.kilos && formData.precio_unitario && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Total: <span className="font-bold text-foreground">{formatCurrency((parseFloat(formData.kilos) || 0) * (parseFloat(formData.precio_unitario) || 0))}</span></p>
                  </div>
                )}
              </>
            )}

            {editingOp?.tipo === 'compra' && (
              <div>
                <Label>Importe (Bs.)</Label>
                <Input type="number" step="0.01" value={formData.importe} onChange={(e) => setFormData({ ...formData, importe: e.target.value })} />
              </div>
            )}
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
