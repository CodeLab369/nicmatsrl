'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Store, Plus, Search, Package, ChevronLeft, ChevronRight,
  Eye, Pencil, Trash2, RefreshCw, Building2, MapPin, User,
  Send, ArrowRight, CheckCircle, X, Filter, ChevronDown, Undo2, Download,
  Upload, FileSpreadsheet, Clock, Check, AlertCircle, Printer, Settings,
  Copy, Save
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

interface TiendaEnvio {
  id: string;
  tienda_id: string;
  estado: 'pendiente' | 'precios_asignados' | 'completado' | 'cancelado';
  total_productos: number;
  total_unidades: number;
  created_at: string;
  updated_at: string;
  completado_at: string | null;
}

interface EnvioItem {
  id: string;
  envio_id: string;
  inventory_id: string;
  marca: string;
  amperaje: string;
  cantidad: number;
  costo_original: number;
  precio_venta_original: number;
  precio_tienda: number | null;
}

interface EmpresaConfig {
  id?: string;
  nombre: string;
  nit: string;
  direccion: string;
  ciudad: string;
  telefono_principal: string;
  telefono_secundario: string;
  telefono_adicional: string;
  email: string;
  logo: string | null;
  color_principal: string;
  pie_empresa: string;
  pie_agradecimiento: string;
  pie_contacto: string;
}

const defaultEmpresaConfig: EmpresaConfig = {
  nombre: 'NICMAT S.R.L.',
  nit: '',
  direccion: '',
  ciudad: 'Bolivia',
  telefono_principal: '',
  telefono_secundario: '',
  telefono_adicional: '',
  email: '',
  logo: null,
  color_principal: '#1a5f7a',
  pie_empresa: 'NICMAT S.R.L.',
  pie_agradecimiento: '',
  pie_contacto: ''
};

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
  const [tiendaFilterAmperaje, setTiendaFilterAmperaje] = useState('_all');
  const [tiendaMarcas, setTiendaMarcas] = useState<string[]>([]);
  const [tiendaAmperajes, setTiendaAmperajes] = useState<string[]>([]);
  const [loadingTiendaInv, setLoadingTiendaInv] = useState(false);
  const [filterCiudad, setFilterCiudad] = useState('_all');
  const [ciudades, setCiudades] = useState<string[]>([]);
  
  // Dialog ver tienda
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingTienda, setViewingTienda] = useState<Tienda | null>(null);
  
  // Dialog devolver inventario
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  
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
  const [transferPage, setTransferPage] = useState(1);
  const TRANSFER_PAGE_SIZE = 50; // Mostrar 50 items por página en el diálogo de transferencia
  
  // Envíos pendientes
  const [enviosPendientes, setEnviosPendientes] = useState<TiendaEnvio[]>([]);
  const [loadingEnvios, setLoadingEnvios] = useState(false);
  const [envioDetailOpen, setEnvioDetailOpen] = useState(false);
  const [selectedEnvio, setSelectedEnvio] = useState<TiendaEnvio | null>(null);
  const [envioItems, setEnvioItems] = useState<EnvioItem[]>([]);
  const [loadingEnvioItems, setLoadingEnvioItems] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [deleteEnvioDialogOpen, setDeleteEnvioDialogOpen] = useState(false);
  const [envioToDelete, setEnvioToDelete] = useState<TiendaEnvio | null>(null);
  const [editedPrices, setEditedPrices] = useState<Record<string, number>>({});
  const [isSavingPrices, setIsSavingPrices] = useState(false);
  
  // Saldos anteriores
  const [saldosDialogOpen, setSaldosDialogOpen] = useState(false);
  const [saldosAnalysis, setSaldosAnalysis] = useState<any>(null);
  const [isAnalyzingSaldos, setIsAnalyzingSaldos] = useState(false);
  const [isImportingSaldos, setIsImportingSaldos] = useState(false);
  const [saldosFile, setSaldosFile] = useState<File | null>(null);
  const [saldosMode, setSaldosMode] = useState<'import' | 'manual'>('import');
  const [manualSaldoItems, setManualSaldoItems] = useState<Array<{
    marca: string;
    amperaje: string;
    cantidad: number;
    precio_venta: number;
  }>>([]);
  const [newSaldoItem, setNewSaldoItem] = useState({ marca: '', amperaje: '', cantidad: 1, precio_venta: 0 });
  
  // Configuración de empresa para PDF
  const [empresaConfig, setEmpresaConfig] = useState<EmpresaConfig>(defaultEmpresaConfig);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [configForm, setConfigForm] = useState<EmpresaConfig>(defaultEmpresaConfig);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  
  // PDF después de confirmar envío
  const [printConfirmDialogOpen, setPrintConfirmDialogOpen] = useState(false);
  const [lastConfirmedEnvio, setLastConfirmedEnvio] = useState<{
    envio: TiendaEnvio;
    items: EnvioItem[];
    tienda: Tienda;
    saldoAnterior: TiendaInventoryItem[];
  } | null>(null);
  
  const { toast } = useToast();

  // Fetch tiendas (showLoading=false para actualizaciones silenciosas de Realtime)
  const fetchTiendas = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        tipo: filterTipo,
        ciudad: filterCiudad
      });
      
      const response = await fetch(`/api/tiendas?${params}`);
      const data = await response.json();
      
      setTiendas(data.tiendas || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      if (data.stats) setStats(data.stats);
      if (data.ciudades) setCiudades(data.ciudades);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [page, limit, filterTipo, filterCiudad]);

  // Fetch inventario de tienda seleccionada (showLoading=false para actualizaciones silenciosas)
  const fetchTiendaInventory = useCallback(async (showLoading = true) => {
    if (!selectedTienda) return;
    
    try {
      if (showLoading) setLoadingTiendaInv(true);
      const params = new URLSearchParams({
        tiendaId: selectedTienda.id,
        page: tiendaPage.toString(),
        limit: tiendaLimit.toString(),
        marca: tiendaFilterMarca,
        amperaje: tiendaFilterAmperaje
      });
      
      const response = await fetch(`/api/tienda-inventario?${params}`);
      const data = await response.json();
      
      setTiendaInventory(data.items || []);
      setTiendaTotal(data.total || 0);
      setTiendaTotalPages(data.totalPages || 1);
      if (data.stats) setTiendaStats(data.stats);
      if (data.marcas) setTiendaMarcas(data.marcas);
      if (data.amperajes) setTiendaAmperajes(data.amperajes);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      if (showLoading) setLoadingTiendaInv(false);
    }
  }, [selectedTienda, tiendaPage, tiendaLimit, tiendaFilterMarca, tiendaFilterAmperaje]);

  // Fetch inventario central para transferencia (optimizado: sin paginación, todos los productos con stock)
  const fetchInventarioCentral = useCallback(async () => {
    try {
      setLoadingTransfer(true);
      // Endpoint optimizado: trae todos los productos con stock >= 1 sin paginación
      const response = await fetch('/api/inventory?noPagination=true&minStock=1');
      const data = await response.json();
      
      const items = data.items || [];
      setInventarioCentral(items);
      
      // Inicializar items de transferencia
      setTransferItems(items.map((item: InventoryItem) => ({
        ...item,
        cantidadEnviar: 0,
        selected: false
      })));
      
      // Usar marcas del servidor (ya viene calculado)
      setTransferMarcas(data.marcas || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoadingTransfer(false);
    }
  }, []);

  // Fetch envíos pendientes de la tienda seleccionada
  const fetchEnviosPendientes = useCallback(async () => {
    if (!selectedTienda) return;
    
    try {
      setLoadingEnvios(true);
      const response = await fetch(`/api/tienda-envios?tiendaId=${selectedTienda.id}`);
      const data = await response.json();
      setEnviosPendientes(data.envios || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoadingEnvios(false);
    }
  }, [selectedTienda]);

  // Fetch detalle de un envío
  const fetchEnvioDetail = useCallback(async (envioId: string) => {
    try {
      setLoadingEnvioItems(true);
      const response = await fetch(`/api/tienda-envios?envioId=${envioId}`);
      const data = await response.json();
      setEnvioItems(data.items || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoadingEnvioItems(false);
    }
  }, []);

  // Fetch configuración de empresa para PDF
  const fetchEmpresaConfig = useCallback(async () => {
    try {
      const response = await fetch('/api/empresa-config');
      const data = await response.json();
      if (data.config) {
        setEmpresaConfig(data.config);
        setConfigForm(data.config);
      }
    } catch (error) {
      console.error('Error fetching empresa config:', error);
    }
  }, []);

  // Effects
  useEffect(() => {
    fetchTiendas();
    fetchEmpresaConfig();
  }, [fetchTiendas, fetchEmpresaConfig]);

  useEffect(() => {
    if (selectedTienda) {
      fetchTiendaInventory();
      fetchEnviosPendientes();
    }
  }, [selectedTienda, fetchTiendaInventory, fetchEnviosPendientes]);

  useEffect(() => {
    setPage(1);
  }, [filterTipo, filterCiudad, limit]);

  useEffect(() => {
    setTiendaPage(1);
    setTiendaFilterAmperaje('_all'); // Reset amperaje al cambiar marca
  }, [tiendaFilterMarca, tiendaLimit]);

  useEffect(() => {
    setTiendaPage(1);
  }, [tiendaFilterAmperaje]);

  // Suscripción Realtime - actualizaciones silenciosas sin spinner
  useTableSubscription('tiendas', () => fetchTiendas(false));
  useTableSubscription('tienda_inventario', () => {
    if (selectedTienda) fetchTiendaInventory(false);
  });
  useTableSubscription('inventory', () => {
    if (transferDialogOpen) fetchInventarioCentral();
  });
  useTableSubscription('tienda_envios', () => {
    if (selectedTienda) fetchEnviosPendientes();
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
      // No llamamos fetchTiendas() - Realtime lo actualizará automáticamente
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
      // No llamamos fetchTiendas() - Realtime lo actualizará automáticamente
    } catch {
      toast({ title: 'Error', description: 'No se pudo eliminar', variant: 'destructive' });
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingTienda(null);
    setFormData({ nombre: '', tipo: 'sucursal', encargado: '', ciudad: '', direccion: '' });
  };

  const handleViewTienda = (tienda: Tienda) => {
    setViewingTienda(tienda);
    setViewDialogOpen(true);
  };

  const handleOpenTransfer = async () => {
    if (!selectedTienda) return;
    setTransferDialogOpen(true);
    setTransferSearch('');
    setTransferFilterMarca('_all');
    await fetchInventarioCentral();
  };

  // Devolver todo el inventario de la tienda al inventario principal
  const handleReturnAllInventory = async () => {
    if (!selectedTienda) return;
    
    try {
      setIsReturning(true);
      const response = await fetch('/api/tienda-inventario', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tiendaId: selectedTienda.id,
          returnAll: true
        })
      });

      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error);

      toast({ 
        title: 'Inventario devuelto', 
        description: data.message, 
        variant: 'success' 
      });

      setReturnDialogOpen(false);
      fetchTiendaInventory();
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Error al devolver inventario', 
        variant: 'destructive' 
      });
    } finally {
      setIsReturning(false);
    }
  };

  // Exportar inventario de tienda a Excel (lazy load XLSX)
  const handleExportTiendaInventory = async () => {
    if (!selectedTienda) return;

    try {
      // Importar XLSX dinámicamente solo cuando se necesita
      const XLSX = await import('xlsx');
      
      // Obtener TODOS los items de la tienda (sin paginación)
      const response = await fetch(`/api/tienda-inventario?tiendaId=${selectedTienda.id}&limit=10000`);
      const data = await response.json();
      
      if (!data.items || data.items.length === 0) {
        toast({ title: 'Sin datos', description: 'No hay productos para exportar', variant: 'destructive' });
        return;
      }

      // Ordenar por marca A-Z antes de exportar
      const sortedItems = [...data.items].sort((a: TiendaInventoryItem, b: TiendaInventoryItem) => {
        const marcaCompare = a.marca.localeCompare(b.marca);
        return marcaCompare !== 0 ? marcaCompare : a.amperaje.localeCompare(b.amperaje);
      });
      
      // Preparar datos para Excel
      const excelData = sortedItems.map((item: TiendaInventoryItem) => ({
        'Marca': item.marca,
        'Amperaje': item.amperaje,
        'Cantidad': item.cantidad,
        'Precio de Venta': item.precio_venta
      }));

      // Crear workbook y worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Ajustar anchos de columna
      ws['!cols'] = [
        { wch: 20 }, // Marca
        { wch: 15 }, // Amperaje
        { wch: 12 }, // Cantidad
        { wch: 15 }, // Precio de Venta
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Inventario');

      // Generar nombre de archivo
      const fileName = `Inventario_${selectedTienda.nombre.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Descargar
      XLSX.writeFile(wb, fileName);

      toast({ title: 'Exportado', description: `Se exportaron ${data.items.length} productos`, variant: 'success' });
    } catch (error) {
      toast({ title: 'Error', description: 'Error al exportar', variant: 'destructive' });
    }
  };

  // Imprimir inventario de tienda como PDF
  const handlePrintTiendaInventory = async () => {
    if (!selectedTienda) return;

    try {
      // Obtener TODOS los items de la tienda
      const response = await fetch(`/api/tienda-inventario?tiendaId=${selectedTienda.id}&noPagination=true`);
      const data = await response.json();
      
      if (!data.items || data.items.length === 0) {
        toast({ title: 'Sin datos', description: 'No hay productos para imprimir', variant: 'destructive' });
        return;
      }

      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const html = generateTiendaInventoryPDFHTML(selectedTienda, data.items);
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    } catch (error) {
      toast({ title: 'Error', description: 'Error al generar PDF', variant: 'destructive' });
    }
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
      // Crear envío pendiente en lugar de transferir directamente
      const response = await fetch('/api/tienda-envios', {
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
        title: 'Envío creado', 
        description: `${data.message}. Ahora exporta el Excel para asignar precios.`, 
        variant: 'success' 
      });

      setTransferDialogOpen(false);
      // No llamamos fetchEnviosPendientes() - Realtime lo actualizará automáticamente
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Error al crear envío', 
        variant: 'destructive' 
      });
    } finally {
      setIsTransferring(false);
    }
  };

  // Abrir detalle del envío
  const handleViewEnvio = async (envio: TiendaEnvio) => {
    setSelectedEnvio(envio);
    setEnvioDetailOpen(true);
    await fetchEnvioDetail(envio.id);
  };

  // Exportar Excel del envío
  const handleExportEnvio = async (envioId: string) => {
    try {
      const response = await fetch(`/api/tienda-envios/excel?envioId=${envioId}`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'envio.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({ title: 'Exportado', description: 'Archivo Excel descargado', variant: 'success' });
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Error al exportar', 
        variant: 'destructive' 
      });
    }
  };

  // Importar Excel con precios
  const handleImportEnvio = async (envioId: string, file: File) => {
    try {
      setIsImporting(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('envioId', envioId);

      const response = await fetch('/api/tienda-envios/excel', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      toast({ 
        title: 'Precios importados', 
        description: `${data.actualizados} precios actualizados. ${data.sinPrecio > 0 ? `${data.sinPrecio} sin precio.` : ''}`, 
        variant: data.todosConPrecio ? 'success' : 'default' 
      });

      // Actualizar el detalle si está abierto - Realtime actualizará la lista
      if (selectedEnvio?.id === envioId) {
        fetchEnvioDetail(envioId);
      }
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Error al importar', 
        variant: 'destructive' 
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Guardar precios editados manualmente
  const handleSavePrices = async () => {
    if (!selectedEnvio) return;
    
    const itemsToUpdate = Object.entries(editedPrices).map(([id, precio]) => ({
      id,
      precio_tienda: precio
    }));

    if (itemsToUpdate.length === 0) {
      toast({ title: 'Sin cambios', description: 'No hay precios modificados', variant: 'default' });
      return;
    }

    try {
      setIsSavingPrices(true);
      const response = await fetch('/api/tienda-envios', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          envioId: selectedEnvio.id, 
          action: 'importar_precios',
          items: itemsToUpdate
        })
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      toast({ 
        title: 'Precios guardados', 
        description: `${itemsToUpdate.length} precios actualizados`, 
        variant: 'success' 
      });

      // Limpiar ediciones - Realtime actualizará la lista
      setEditedPrices({});
      fetchEnvioDetail(selectedEnvio.id);
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Error al guardar precios', 
        variant: 'destructive' 
      });
    } finally {
      setIsSavingPrices(false);
    }
  };

  // Manejar cambio de precio en la tabla
  const handlePriceChange = (itemId: string, value: string) => {
    const precio = parseFloat(value);
    if (!isNaN(precio) && precio >= 0) {
      setEditedPrices(prev => ({ ...prev, [itemId]: precio }));
    } else if (value === '') {
      // Permitir borrar para escribir nuevo valor
      setEditedPrices(prev => {
        const newPrices = { ...prev };
        delete newPrices[itemId];
        return newPrices;
      });
    }
  };

  // Aplicar precio original a todos los que no tienen precio
  const handleApplyOriginalPrices = () => {
    const newPrices: Record<string, number> = { ...editedPrices };
    envioItems.forEach(item => {
      if (item.precio_tienda === null && !newPrices[item.id]) {
        newPrices[item.id] = item.precio_venta_original;
      }
    });
    setEditedPrices(newPrices);
    toast({ title: 'Precios aplicados', description: 'Se aplicaron los precios originales a los productos sin precio', variant: 'success' });
  };

  // Confirmar envío (mover a inventario de tienda)
  const handleConfirmEnvio = async (envioId: string) => {
    if (!selectedTienda) return;
    
    try {
      setIsConfirming(true);
      
      // Guardar el saldo anterior antes de confirmar
      const saldoAnteriorResponse = await fetch(`/api/tienda-inventario?tiendaId=${selectedTienda.id}&noPagination=true`);
      const saldoAnteriorData = await saldoAnteriorResponse.json();
      const saldoAnterior: TiendaInventoryItem[] = saldoAnteriorData.items || [];
      
      // Confirmar el envío
      const response = await fetch('/api/tienda-envios', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ envioId, action: 'confirmar' })
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      toast({ 
        title: 'Envío completado', 
        description: data.message, 
        variant: 'success' 
      });

      // Guardar datos para el PDF y mostrar diálogo
      if (selectedEnvio && selectedTienda) {
        setLastConfirmedEnvio({
          envio: selectedEnvio,
          items: envioItems,
          tienda: selectedTienda,
          saldoAnterior
        });
        setPrintConfirmDialogOpen(true);
      }

      setEnvioDetailOpen(false);
      setSelectedEnvio(null);
      // No llamamos fetchEnviosPendientes()/fetchTiendaInventory() - Realtime lo actualizará automáticamente
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Error al confirmar envío', 
        variant: 'destructive' 
      });
    } finally {
      setIsConfirming(false);
    }
  };

  // Eliminar/cancelar envío
  const handleDeleteEnvio = async () => {
    if (!envioToDelete) return;

    try {
      const response = await fetch(`/api/tienda-envios?envioId=${envioToDelete.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      toast({ 
        title: 'Envío cancelado', 
        description: data.message, 
        variant: 'success' 
      });

      setDeleteEnvioDialogOpen(false);
      setEnvioToDelete(null);
      if (envioDetailOpen && selectedEnvio?.id === envioToDelete.id) {
        setEnvioDetailOpen(false);
        setSelectedEnvio(null);
      }
      // No llamamos fetchEnviosPendientes() - Realtime lo actualizará automáticamente
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Error al cancelar envío', 
        variant: 'destructive' 
      });
    }
  };

  // Guardar configuración de empresa
  const handleSaveConfig = async () => {
    try {
      setIsSavingConfig(true);
      const response = await fetch('/api/empresa-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configForm)
      });

      if (!response.ok) throw new Error();

      setEmpresaConfig(configForm);
      setConfigDialogOpen(false);
      toast({ title: 'Configuración guardada', variant: 'success' });
    } catch {
      toast({ title: 'Error', description: 'No se pudo guardar la configuración', variant: 'destructive' });
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Imprimir/PDF de envío
  const handlePrintEnvio = (envio: TiendaEnvio, items: EnvioItem[], tienda: Tienda) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = generateEnvioPDFHTML(envio, items, tienda);
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  // Generar HTML para PDF de envío
  const generateEnvioPDFHTML = (envio: TiendaEnvio, items: EnvioItem[], tienda: Tienda) => {
    const fechaFormat = new Date(envio.created_at).toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' });
    
    const cfg = empresaConfig;
    const colorPrincipal = cfg.color_principal || '#1a5f7a';
    
    function adjustColor(color: string, amount: number): string {
      const hex = color.replace('#', '');
      const r = Math.min(255, parseInt(hex.substring(0, 2), 16) + amount);
      const g = Math.min(255, parseInt(hex.substring(2, 4), 16) + amount);
      const b = Math.min(255, parseInt(hex.substring(4, 6), 16) + amount);
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
    
    const gradiente = `linear-gradient(135deg, ${colorPrincipal} 0%, ${adjustColor(colorPrincipal, 40)} 100%)`;
    
    const logoHTML = cfg.logo 
      ? `<img src="${cfg.logo}" alt="Logo" style="width: 70px; height: 70px; object-fit: contain; border-radius: 8px;">`
      : `<div class="company-logo-placeholder">${cfg.nombre.substring(0, 2).toUpperCase()}</div>`;
    
    const telefonos = [cfg.telefono_principal, cfg.telefono_secundario, cfg.telefono_adicional].filter(Boolean).join(' | ');

    // Calcular totales
    const totalCosto = items.reduce((sum, p) => sum + (p.costo_original * p.cantidad), 0);
    const totalVenta = items.reduce((sum, p) => sum + ((p.precio_tienda || p.precio_venta_original) * p.cantidad), 0);
    
    const productosHTML = items.map((p, i) => `
      <tr style="background-color: ${i % 2 === 0 ? '#ffffff' : '#f8f9fa'};">
        <td style="padding: 12px; border-bottom: 1px solid #e9ecef; text-align: center;">${i + 1}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e9ecef; font-weight: 500;">${p.marca}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e9ecef;">${p.amperaje}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e9ecef; text-align: center;">${p.cantidad}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e9ecef; text-align: right;">Bs. ${(p.precio_tienda || p.precio_venta_original).toLocaleString('es-BO', { minimumFractionDigits: 2 })}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e9ecef; text-align: right; font-weight: 600;">Bs. ${((p.precio_tienda || p.precio_venta_original) * p.cantidad).toLocaleString('es-BO', { minimumFractionDigits: 2 })}</td>
      </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Envío ${tienda.nombre} - ${fechaFormat}</title>
  <style>
    :root {
      --color-principal: ${colorPrincipal};
      --gradiente: ${gradiente};
    }
    @page {
      size: letter;
      margin: 10mm;
    }
    @media print {
      html, body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 11pt;
      color: #333;
      line-height: 1.5;
      background: white;
    }
    .container {
      max-width: 100%;
      padding: 0;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 25px;
      padding-bottom: 20px;
      border-bottom: 3px solid var(--color-principal);
    }
    .company-info {
      display: flex;
      align-items: center;
      gap: 15px;
      flex: 1;
    }
    .company-logo-placeholder {
      width: 70px;
      height: 70px;
      background: var(--gradiente);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 28px;
      font-weight: bold;
      flex-shrink: 0;
    }
    .company-text {
      flex: 1;
    }
    .company-name {
      font-size: 24pt;
      font-weight: 700;
      color: var(--color-principal);
      margin-bottom: 5px;
    }
    .company-details {
      font-size: 9pt;
      color: #666;
      line-height: 1.6;
    }
    .doc-info {
      text-align: right;
    }
    .doc-title {
      background: var(--gradiente);
      color: white;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 14pt;
      font-weight: 700;
      margin-bottom: 10px;
      display: inline-block;
    }
    .doc-date {
      font-size: 10pt;
      color: #666;
    }
    .title {
      text-align: center;
      font-size: 20pt;
      font-weight: 700;
      color: var(--color-principal);
      margin: 25px 0;
      letter-spacing: 3px;
    }
    .tienda-box {
      background: #f8f9fa;
      border-left: 4px solid var(--color-principal);
      padding: 15px 20px;
      margin-bottom: 25px;
      border-radius: 0 8px 8px 0;
    }
    .tienda-title {
      font-size: 10pt;
      font-weight: 600;
      color: var(--color-principal);
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .tienda-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 30px;
    }
    .tienda-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 10pt;
    }
    .tienda-item label {
      font-weight: 600;
      color: var(--color-principal);
      white-space: nowrap;
    }
    .tienda-item label::after {
      content: ':';
    }
    .tienda-item span {
      color: #333;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th {
      background: var(--gradiente);
      color: white;
      padding: 12px;
      text-align: left;
      font-size: 9pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    th:first-child { border-radius: 8px 0 0 0; }
    th:last-child { border-radius: 0 8px 0 0; text-align: right; }
    th:nth-child(4), th:nth-child(5) { text-align: center; }
    td {
      font-size: 10pt;
    }
    .totals-container {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 20px;
    }
    .totals-box {
      width: 280px;
      background: #f8f9fa;
      border-radius: 8px;
      overflow: hidden;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 15px;
      border-bottom: 1px solid #e9ecef;
    }
    .total-row:last-child {
      border-bottom: none;
    }
    .total-row.highlight {
      background: var(--gradiente);
      color: white;
    }
    .total-label {
      font-size: 10pt;
      color: #666;
    }
    .total-value {
      font-size: 10pt;
      font-weight: 600;
    }
    .total-row.highlight .total-label,
    .total-row.highlight .total-value {
      color: white;
      font-size: 12pt;
    }
    .signature-section {
      margin-top: 50px;
      display: flex;
      justify-content: space-between;
      gap: 30px;
    }
    .signature-box {
      flex: 1;
      text-align: center;
    }
    .signature-line {
      border-top: 1px solid #333;
      padding-top: 8px;
      margin-top: 50px;
    }
    .signature-label {
      font-size: 10pt;
      color: #666;
    }
    .footer {
      text-align: center;
      padding-top: 20px;
      border-top: 2px solid #e9ecef;
      margin-top: 30px;
    }
    .footer-company {
      font-size: 12pt;
      font-weight: 600;
      color: var(--color-principal);
    }
    .footer-thanks {
      font-size: 10pt;
      color: #666;
      margin: 5px 0;
    }
    .footer-contact {
      font-size: 9pt;
      color: #888;
    }
    .page-break {
      page-break-inside: avoid;
    }
    table {
      page-break-inside: auto;
    }
    thead {
      display: table-header-group;
    }
    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
    tbody {
      page-break-inside: auto;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="company-info">
        ${logoHTML}
        <div class="company-text">
          <div class="company-name">${cfg.nombre}</div>
          <div class="company-details">
            ${cfg.nit ? `NIT: ${cfg.nit}<br>` : ''}
            ${cfg.direccion ? `${cfg.direccion}<br>` : ''}
            ${cfg.ciudad ? `${cfg.ciudad}<br>` : ''}
            ${telefonos ? `Tel: ${telefonos}<br>` : ''}
            ${cfg.email || ''}
          </div>
        </div>
      </div>
      <div class="doc-info">
        <div class="doc-title">ENVÍO DE PRODUCTOS</div>
        <div class="doc-date">
          <strong>Fecha:</strong> ${fechaFormat}
        </div>
      </div>
    </div>

    <!-- Título -->
    <div class="title">NOTA DE ENVÍO</div>

    <!-- Datos de la tienda -->
    <div class="tienda-box page-break">
      <div class="tienda-title">Datos del Destino</div>
      <div class="tienda-grid">
        <div class="tienda-item">
          <label>Tienda</label>
          <span>${tienda.nombre}</span>
        </div>
        <div class="tienda-item">
          <label>Tipo</label>
          <span>${tienda.tipo === 'sucursal' ? 'Sucursal' : 'Distribuidor'}</span>
        </div>
        <div class="tienda-item">
          <label>Encargado</label>
          <span>${tienda.encargado || '-'}</span>
        </div>
        <div class="tienda-item">
          <label>Ciudad</label>
          <span>${tienda.ciudad || '-'}</span>
        </div>
        <div class="tienda-item" style="grid-column: span 2;">
          <label>Dirección</label>
          <span>${tienda.direccion || '-'}</span>
        </div>
      </div>
    </div>

    <!-- Tabla de productos -->
    <table>
      <thead>
        <tr>
          <th style="width: 40px; text-align: center;">N°</th>
          <th style="width: 25%;">Marca</th>
          <th style="width: 20%;">Amperaje</th>
          <th style="width: 12%; text-align: center;">Cant.</th>
          <th style="width: 18%; text-align: right;">P. Unit.</th>
          <th style="width: 18%; text-align: right;">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${productosHTML}
      </tbody>
    </table>

    <!-- Totales -->
    <div class="totals-container page-break">
      <div class="totals-box">
        <div class="total-row">
          <span class="total-label">Total Productos</span>
          <span class="total-value">${envio.total_productos} tipos</span>
        </div>
        <div class="total-row">
          <span class="total-label">Total Unidades</span>
          <span class="total-value">${envio.total_unidades} baterías</span>
        </div>
        <div class="total-row highlight">
          <span class="total-label">VALOR TOTAL</span>
          <span class="total-value">Bs. ${totalVenta.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
    </div>

    <!-- Firmas -->
    <div class="signature-section page-break">
      <div class="signature-box">
        <div class="signature-line">
          <div class="signature-label">Entregado por</div>
        </div>
      </div>
      <div class="signature-box">
        <div class="signature-line">
          <div class="signature-label">Recibido por</div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer page-break">
      <div class="footer-company">${cfg.pie_empresa || cfg.nombre}</div>
      <div class="footer-thanks">${cfg.pie_agradecimiento || '¡Gracias por su confianza!'}</div>
      <div class="footer-contact">${cfg.pie_contacto || (telefonos ? `Para consultas: ${telefonos}${cfg.email ? ' | ' + cfg.email : ''}` : '')}</div>
    </div>
  </div>
</body>
</html>
    `;
  };

  // Generar HTML para PDF de resumen de envío (saldo anterior + nuevos productos)
  const generateResumenEnvioPDFHTML = (
    envio: TiendaEnvio, 
    items: EnvioItem[], 
    tienda: Tienda, 
    saldoAnterior: TiendaInventoryItem[]
  ) => {
    const fechaFormat = new Date(envio.created_at).toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' });
    
    const cfg = empresaConfig;
    const colorPrincipal = cfg.color_principal || '#1a5f7a';
    
    function adjustColor(color: string, amount: number): string {
      const hex = color.replace('#', '');
      const r = Math.min(255, parseInt(hex.substring(0, 2), 16) + amount);
      const g = Math.min(255, parseInt(hex.substring(2, 4), 16) + amount);
      const b = Math.min(255, parseInt(hex.substring(4, 6), 16) + amount);
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
    
    const gradiente = `linear-gradient(135deg, ${colorPrincipal} 0%, ${adjustColor(colorPrincipal, 40)} 100%)`;
    
    const logoHTML = cfg.logo 
      ? `<img src="${cfg.logo}" alt="Logo" style="width: 70px; height: 70px; object-fit: contain; border-radius: 8px;">`
      : `<div class="company-logo-placeholder">${cfg.nombre.substring(0, 2).toUpperCase()}</div>`;
    
    const telefonos = [cfg.telefono_principal, cfg.telefono_secundario, cfg.telefono_adicional].filter(Boolean).join(' | ');

    // Calcular totales del saldo anterior
    const totalSaldoAnteriorUnidades = saldoAnterior.reduce((sum, p) => sum + p.cantidad, 0);
    const totalSaldoAnteriorValor = saldoAnterior.reduce((sum, p) => sum + (p.precio_venta * p.cantidad), 0);
    
    // Calcular totales de nuevos productos
    const totalNuevosUnidades = items.reduce((sum, p) => sum + p.cantidad, 0);
    const totalNuevosValor = items.reduce((sum, p) => sum + ((p.precio_tienda || p.precio_venta_original) * p.cantidad), 0);
    
    // Calcular nuevo saldo (combinando anterior + nuevos)
    const nuevoSaldoMap = new Map<string, { marca: string; amperaje: string; cantidad: number; precio: number }>();
    
    // Agregar saldo anterior
    saldoAnterior.forEach(p => {
      const key = `${p.marca}-${p.amperaje}`;
      nuevoSaldoMap.set(key, {
        marca: p.marca,
        amperaje: p.amperaje,
        cantidad: p.cantidad,
        precio: p.precio_venta
      });
    });
    
    // Agregar nuevos productos (sumar cantidades si ya existen)
    items.forEach(p => {
      const key = `${p.marca}-${p.amperaje}`;
      const precioTienda = p.precio_tienda || p.precio_venta_original;
      if (nuevoSaldoMap.has(key)) {
        const existing = nuevoSaldoMap.get(key)!;
        nuevoSaldoMap.set(key, {
          ...existing,
          cantidad: existing.cantidad + p.cantidad,
          precio: precioTienda // Usar el nuevo precio
        });
      } else {
        nuevoSaldoMap.set(key, {
          marca: p.marca,
          amperaje: p.amperaje,
          cantidad: p.cantidad,
          precio: precioTienda
        });
      }
    });
    
    const nuevoSaldo = Array.from(nuevoSaldoMap.values()).sort((a, b) => a.marca.localeCompare(b.marca));
    const totalNuevoSaldoUnidades = nuevoSaldo.reduce((sum, p) => sum + p.cantidad, 0);
    const totalNuevoSaldoValor = nuevoSaldo.reduce((sum, p) => sum + (p.precio * p.cantidad), 0);
    
    // Generar HTML de tablas
    const saldoAnteriorHTML = saldoAnterior.length > 0 
      ? saldoAnterior.map((p, i) => `
        <tr style="background-color: ${i % 2 === 0 ? '#ffffff' : '#f8f9fa'};">
          <td style="padding: 10px; border-bottom: 1px solid #e9ecef; text-align: center;">${i + 1}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e9ecef; font-weight: 500;">${p.marca}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e9ecef;">${p.amperaje}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e9ecef; text-align: center;">${p.cantidad}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e9ecef; text-align: right;">Bs. ${p.precio_venta.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e9ecef; text-align: right; font-weight: 600;">Bs. ${(p.precio_venta * p.cantidad).toLocaleString('es-BO', { minimumFractionDigits: 2 })}</td>
        </tr>
      `).join('')
      : `<tr><td colspan="6" style="padding: 20px; text-align: center; color: #666;">Sin saldo anterior</td></tr>`;
    
    const nuevosProductosHTML = items.map((p, i) => `
      <tr style="background-color: ${i % 2 === 0 ? '#ffffff' : '#f8f9fa'};">
        <td style="padding: 10px; border-bottom: 1px solid #e9ecef; text-align: center;">${i + 1}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e9ecef; font-weight: 500;">${p.marca}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e9ecef;">${p.amperaje}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e9ecef; text-align: center;">${p.cantidad}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e9ecef; text-align: right;">Bs. ${(p.precio_tienda || p.precio_venta_original).toLocaleString('es-BO', { minimumFractionDigits: 2 })}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e9ecef; text-align: right; font-weight: 600;">Bs. ${((p.precio_tienda || p.precio_venta_original) * p.cantidad).toLocaleString('es-BO', { minimumFractionDigits: 2 })}</td>
      </tr>
    `).join('');
    
    const nuevoSaldoHTML = nuevoSaldo.map((p, i) => `
      <tr style="background-color: ${i % 2 === 0 ? '#ffffff' : '#e8f5e9'};">
        <td style="padding: 10px; border-bottom: 1px solid #e9ecef; text-align: center;">${i + 1}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e9ecef; font-weight: 500;">${p.marca}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e9ecef;">${p.amperaje}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e9ecef; text-align: center; font-weight: 600;">${p.cantidad}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e9ecef; text-align: right;">Bs. ${p.precio.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e9ecef; text-align: right; font-weight: 600;">Bs. ${(p.precio * p.cantidad).toLocaleString('es-BO', { minimumFractionDigits: 2 })}</td>
      </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Resumen Envío ${tienda.nombre} - ${fechaFormat}</title>
  <style>
    :root {
      --color-principal: ${colorPrincipal};
      --gradiente: ${gradiente};
    }
    @page {
      size: letter;
      margin: 10mm;
    }
    @media print {
      html, body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .page-break-before {
        page-break-before: always;
      }
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 10pt;
      color: #333;
      line-height: 1.4;
      background: white;
    }
    .container {
      max-width: 100%;
      padding: 0;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 3px solid var(--color-principal);
    }
    .company-info {
      display: flex;
      align-items: center;
      gap: 15px;
      flex: 1;
    }
    .company-logo-placeholder {
      width: 60px;
      height: 60px;
      background: var(--gradiente);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 24px;
      font-weight: bold;
      flex-shrink: 0;
    }
    .company-text {
      flex: 1;
    }
    .company-name {
      font-size: 20pt;
      font-weight: 700;
      color: var(--color-principal);
      margin-bottom: 3px;
    }
    .company-details {
      font-size: 8pt;
      color: #666;
      line-height: 1.5;
    }
    .doc-info {
      text-align: right;
    }
    .doc-title {
      background: var(--gradiente);
      color: white;
      padding: 8px 15px;
      border-radius: 6px;
      font-size: 12pt;
      font-weight: 700;
      margin-bottom: 8px;
      display: inline-block;
    }
    .doc-date {
      font-size: 9pt;
      color: #666;
    }
    .tienda-box {
      background: #f8f9fa;
      border-left: 4px solid var(--color-principal);
      padding: 12px 15px;
      margin-bottom: 20px;
      border-radius: 0 6px 6px 0;
    }
    .tienda-title {
      font-size: 9pt;
      font-weight: 600;
      color: var(--color-principal);
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .tienda-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 5px 20px;
    }
    .tienda-item {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 9pt;
    }
    .tienda-item label {
      font-weight: 600;
      color: var(--color-principal);
      white-space: nowrap;
    }
    .tienda-item label::after {
      content: ':';
    }
    .section-title {
      font-size: 11pt;
      font-weight: 700;
      color: var(--color-principal);
      margin: 15px 0 10px 0;
      padding-bottom: 5px;
      border-bottom: 2px solid var(--color-principal);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .section-title .icon {
      font-size: 14pt;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      font-size: 9pt;
    }
    th {
      background: var(--gradiente);
      color: white;
      padding: 10px;
      text-align: left;
      font-size: 8pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    th:first-child { border-radius: 6px 0 0 0; }
    th:last-child { border-radius: 0 6px 0 0; text-align: right; }
    th:nth-child(4) { text-align: center; }
    th:nth-child(5) { text-align: right; }
    td {
      font-size: 9pt;
    }
    .subtotal-row {
      background: #e3f2fd !important;
    }
    .subtotal-row td {
      font-weight: 600;
      padding: 10px;
      border-top: 2px solid var(--color-principal);
    }
    .grand-total-section {
      margin-top: 20px;
      background: #f8f9fa;
      border-radius: 8px;
      padding: 15px;
    }
    .grand-total-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 15px;
    }
    .grand-total-box {
      text-align: center;
      padding: 10px;
      border-radius: 6px;
    }
    .grand-total-box.anterior {
      background: #fff3e0;
      border: 1px solid #ffb74d;
    }
    .grand-total-box.nuevos {
      background: #e3f2fd;
      border: 1px solid #64b5f6;
    }
    .grand-total-box.total {
      background: var(--gradiente);
      color: white;
    }
    .grand-total-label {
      font-size: 8pt;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    .grand-total-value {
      font-size: 14pt;
      font-weight: 700;
    }
    .grand-total-units {
      font-size: 9pt;
      margin-top: 3px;
    }
    .signature-section {
      margin-top: 40px;
      display: flex;
      justify-content: space-between;
      gap: 30px;
    }
    .signature-box {
      flex: 1;
      text-align: center;
    }
    .signature-line {
      border-top: 1px solid #333;
      padding-top: 8px;
      margin-top: 40px;
    }
    .signature-label {
      font-size: 9pt;
      color: #666;
    }
    .footer {
      text-align: center;
      padding-top: 15px;
      border-top: 2px solid #e9ecef;
      margin-top: 20px;
    }
    .footer-company {
      font-size: 10pt;
      font-weight: 600;
      color: var(--color-principal);
    }
    .footer-thanks {
      font-size: 9pt;
      color: #666;
      margin: 3px 0;
    }
    .footer-contact {
      font-size: 8pt;
      color: #888;
    }
    .page-break {
      page-break-inside: avoid;
    }
    table {
      page-break-inside: auto;
    }
    thead {
      display: table-header-group;
    }
    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="company-info">
        ${logoHTML}
        <div class="company-text">
          <div class="company-name">${cfg.nombre}</div>
          <div class="company-details">
            ${cfg.nit ? `NIT: ${cfg.nit}<br>` : ''}
            ${cfg.direccion ? `${cfg.direccion}` : ''}${cfg.ciudad ? ` - ${cfg.ciudad}` : ''}<br>
            ${telefonos ? `Tel: ${telefonos}` : ''}${cfg.email ? ` | ${cfg.email}` : ''}
          </div>
        </div>
      </div>
      <div class="doc-info">
        <div class="doc-title">RESUMEN DE ENVÍO</div>
        <div class="doc-date">
          <strong>Fecha:</strong> ${fechaFormat}
        </div>
      </div>
    </div>

    <!-- Datos de la tienda -->
    <div class="tienda-box">
      <div class="tienda-title">Datos de la Tienda</div>
      <div class="tienda-grid">
        <div class="tienda-item">
          <label>Tienda</label>
          <span>${tienda.nombre}</span>
        </div>
        <div class="tienda-item">
          <label>Encargado</label>
          <span>${tienda.encargado || '-'}</span>
        </div>
        <div class="tienda-item">
          <label>Ciudad</label>
          <span>${tienda.ciudad || '-'}</span>
        </div>
      </div>
    </div>

    <!-- Saldo Anterior -->
    <div class="section-title">
      <span class="icon">📦</span>
      SALDO ANTERIOR (${totalSaldoAnteriorUnidades} unidades)
    </div>
    <table>
      <thead>
        <tr>
          <th style="width: 35px; text-align: center;">N°</th>
          <th style="width: 25%;">Marca</th>
          <th style="width: 18%;">Amperaje</th>
          <th style="width: 12%; text-align: center;">Cant.</th>
          <th style="width: 18%; text-align: right;">P. Unit.</th>
          <th style="width: 18%; text-align: right;">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${saldoAnteriorHTML}
        <tr class="subtotal-row">
          <td colspan="3" style="text-align: right;">SUBTOTAL SALDO ANTERIOR:</td>
          <td style="text-align: center;">${totalSaldoAnteriorUnidades}</td>
          <td></td>
          <td style="text-align: right;">Bs. ${totalSaldoAnteriorValor.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</td>
        </tr>
      </tbody>
    </table>

    <!-- Nuevos Productos -->
    <div class="section-title">
      <span class="icon">🚚</span>
      PRODUCTOS ENTREGADOS (${totalNuevosUnidades} unidades)
    </div>
    <table>
      <thead>
        <tr>
          <th style="width: 35px; text-align: center;">N°</th>
          <th style="width: 25%;">Marca</th>
          <th style="width: 18%;">Amperaje</th>
          <th style="width: 12%; text-align: center;">Cant.</th>
          <th style="width: 18%; text-align: right;">P. Unit.</th>
          <th style="width: 18%; text-align: right;">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${nuevosProductosHTML}
        <tr class="subtotal-row">
          <td colspan="3" style="text-align: right;">SUBTOTAL PRODUCTOS ENTREGADOS:</td>
          <td style="text-align: center;">${totalNuevosUnidades}</td>
          <td></td>
          <td style="text-align: right;">Bs. ${totalNuevosValor.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</td>
        </tr>
      </tbody>
    </table>

    <!-- Nuevo Saldo Total -->
    <div class="section-title page-break-before">
      <span class="icon">✅</span>
      NUEVO SALDO TOTAL (${totalNuevoSaldoUnidades} unidades)
    </div>
    <table>
      <thead>
        <tr>
          <th style="width: 35px; text-align: center;">N°</th>
          <th style="width: 25%;">Marca</th>
          <th style="width: 18%;">Amperaje</th>
          <th style="width: 12%; text-align: center;">Cant.</th>
          <th style="width: 18%; text-align: right;">P. Unit.</th>
          <th style="width: 18%; text-align: right;">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${nuevoSaldoHTML}
        <tr class="subtotal-row" style="background: #c8e6c9 !important;">
          <td colspan="3" style="text-align: right; font-size: 10pt;">TOTAL NUEVO SALDO:</td>
          <td style="text-align: center; font-size: 11pt;">${totalNuevoSaldoUnidades}</td>
          <td></td>
          <td style="text-align: right; font-size: 11pt;">Bs. ${totalNuevoSaldoValor.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</td>
        </tr>
      </tbody>
    </table>

    <!-- Resumen de Totales -->
    <div class="grand-total-section page-break">
      <div class="grand-total-grid">
        <div class="grand-total-box anterior">
          <div class="grand-total-label">Saldo Anterior</div>
          <div class="grand-total-value">Bs. ${totalSaldoAnteriorValor.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</div>
          <div class="grand-total-units">${totalSaldoAnteriorUnidades} unidades</div>
        </div>
        <div class="grand-total-box nuevos">
          <div class="grand-total-label">+ Productos Entregados</div>
          <div class="grand-total-value">Bs. ${totalNuevosValor.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</div>
          <div class="grand-total-units">${totalNuevosUnidades} unidades</div>
        </div>
        <div class="grand-total-box total">
          <div class="grand-total-label">= Nuevo Saldo Total</div>
          <div class="grand-total-value">Bs. ${totalNuevoSaldoValor.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</div>
          <div class="grand-total-units">${totalNuevoSaldoUnidades} unidades</div>
        </div>
      </div>
    </div>

    <!-- Firmas -->
    <div class="signature-section page-break">
      <div class="signature-box">
        <div class="signature-line">
          <div class="signature-label">Entregado por</div>
        </div>
      </div>
      <div class="signature-box">
        <div class="signature-line">
          <div class="signature-label">Recibido por: ${tienda.encargado || ''}</div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="footer-company">${cfg.pie_empresa || cfg.nombre}</div>
      <div class="footer-thanks">${cfg.pie_agradecimiento || '¡Gracias por su confianza!'}</div>
      <div class="footer-contact">${cfg.pie_contacto || (telefonos ? `Para consultas: ${telefonos}${cfg.email ? ' | ' + cfg.email : ''}` : '')}</div>
    </div>
  </div>
</body>
</html>
    `;
  };

  // Imprimir resumen de envío después de confirmar
  const handlePrintResumenEnvio = () => {
    if (!lastConfirmedEnvio) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = generateResumenEnvioPDFHTML(
      lastConfirmedEnvio.envio,
      lastConfirmedEnvio.items,
      lastConfirmedEnvio.tienda,
      lastConfirmedEnvio.saldoAnterior
    );
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
    
    setPrintConfirmDialogOpen(false);
    setLastConfirmedEnvio(null);
  };

  // Generar HTML para PDF de inventario de tienda
  const generateTiendaInventoryPDFHTML = (tienda: Tienda, items: TiendaInventoryItem[]) => {
    const fechaFormat = new Date().toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' });
    
    const cfg = empresaConfig;
    const colorPrincipal = cfg.color_principal || '#1a5f7a';
    
    function adjustColor(color: string, amount: number): string {
      const hex = color.replace('#', '');
      const r = Math.min(255, parseInt(hex.substring(0, 2), 16) + amount);
      const g = Math.min(255, parseInt(hex.substring(2, 4), 16) + amount);
      const b = Math.min(255, parseInt(hex.substring(4, 6), 16) + amount);
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
    
    const gradiente = `linear-gradient(135deg, ${colorPrincipal} 0%, ${adjustColor(colorPrincipal, 40)} 100%)`;
    
    const logoHTML = cfg.logo 
      ? `<img src="${cfg.logo}" alt="Logo" style="width: 60px; height: 60px; object-fit: contain; border-radius: 8px;">`
      : `<div class="company-logo-placeholder">${cfg.nombre.substring(0, 2).toUpperCase()}</div>`;
    
    const telefonos = [cfg.telefono_principal, cfg.telefono_secundario, cfg.telefono_adicional].filter(Boolean).join(' | ');

    // Ordenar por marca
    const sortedItems = [...items].sort((a, b) => {
      const marcaCompare = a.marca.localeCompare(b.marca);
      return marcaCompare !== 0 ? marcaCompare : a.amperaje.localeCompare(b.amperaje);
    });

    // Calcular totales
    const totalUnidades = sortedItems.reduce((sum, p) => sum + p.cantidad, 0);
    const totalValor = sortedItems.reduce((sum, p) => sum + (p.precio_venta * p.cantidad), 0);
    
    const productosHTML = sortedItems.map((p, i) => `
      <tr style="background-color: ${i % 2 === 0 ? '#ffffff' : '#f8f9fa'};">
        <td style="padding: 10px; border-bottom: 1px solid #e9ecef; text-align: center;">${i + 1}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e9ecef; font-weight: 500;">${p.marca}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e9ecef;">${p.amperaje}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e9ecef; text-align: center; font-weight: 600;">${p.cantidad}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e9ecef; text-align: right;">Bs. ${p.precio_venta.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e9ecef; text-align: right; font-weight: 600;">Bs. ${(p.precio_venta * p.cantidad).toLocaleString('es-BO', { minimumFractionDigits: 2 })}</td>
      </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Inventario ${tienda.nombre} - ${fechaFormat}</title>
  <style>
    :root {
      --color-principal: ${colorPrincipal};
      --gradiente: ${gradiente};
    }
    @page {
      size: letter;
      margin: 10mm;
    }
    @media print {
      html, body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 10pt;
      color: #333;
      line-height: 1.4;
      background: white;
    }
    .container {
      max-width: 100%;
      padding: 0;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 3px solid var(--color-principal);
    }
    .company-info {
      display: flex;
      align-items: center;
      gap: 15px;
      flex: 1;
    }
    .company-logo-placeholder {
      width: 60px;
      height: 60px;
      background: var(--gradiente);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 22px;
      font-weight: bold;
      flex-shrink: 0;
    }
    .company-text {
      flex: 1;
    }
    .company-name {
      font-size: 18pt;
      font-weight: 700;
      color: var(--color-principal);
      margin-bottom: 3px;
    }
    .company-details {
      font-size: 8pt;
      color: #666;
      line-height: 1.5;
    }
    .doc-info {
      text-align: right;
    }
    .doc-title {
      background: var(--gradiente);
      color: white;
      padding: 8px 15px;
      border-radius: 6px;
      font-size: 12pt;
      font-weight: 700;
      margin-bottom: 8px;
      display: inline-block;
    }
    .doc-date {
      font-size: 9pt;
      color: #666;
    }
    .tienda-box {
      background: #f8f9fa;
      border-left: 4px solid var(--color-principal);
      padding: 12px 15px;
      margin-bottom: 20px;
      border-radius: 0 6px 6px 0;
    }
    .tienda-title {
      font-size: 9pt;
      font-weight: 600;
      color: var(--color-principal);
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .tienda-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 5px 20px;
    }
    .tienda-item {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 9pt;
    }
    .tienda-item label {
      font-weight: 600;
      color: var(--color-principal);
      white-space: nowrap;
    }
    .tienda-item label::after {
      content: ':';
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
      font-size: 9pt;
    }
    th {
      background: var(--gradiente);
      color: white;
      padding: 10px;
      text-align: left;
      font-size: 8pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    th:first-child { border-radius: 6px 0 0 0; }
    th:last-child { border-radius: 0 6px 0 0; text-align: right; }
    th:nth-child(4) { text-align: center; }
    th:nth-child(5) { text-align: right; }
    td {
      font-size: 9pt;
    }
    .total-row {
      background: #e8f5e9 !important;
    }
    .total-row td {
      font-weight: 700;
      padding: 12px 10px;
      border-top: 2px solid var(--color-principal);
      font-size: 10pt;
    }
    .summary-box {
      margin-top: 15px;
      background: var(--gradiente);
      color: white;
      border-radius: 8px;
      padding: 15px 20px;
      display: flex;
      justify-content: space-around;
      align-items: center;
    }
    .summary-item {
      text-align: center;
    }
    .summary-label {
      font-size: 9pt;
      opacity: 0.9;
      margin-bottom: 3px;
    }
    .summary-value {
      font-size: 16pt;
      font-weight: 700;
    }
    .footer {
      text-align: center;
      padding-top: 15px;
      border-top: 2px solid #e9ecef;
      margin-top: 20px;
    }
    .footer-company {
      font-size: 10pt;
      font-weight: 600;
      color: var(--color-principal);
    }
    .footer-thanks {
      font-size: 9pt;
      color: #666;
      margin: 3px 0;
    }
    .footer-contact {
      font-size: 8pt;
      color: #888;
    }
    table {
      page-break-inside: auto;
    }
    thead {
      display: table-header-group;
    }
    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="company-info">
        ${logoHTML}
        <div class="company-text">
          <div class="company-name">${cfg.nombre}</div>
          <div class="company-details">
            ${cfg.nit ? `NIT: ${cfg.nit}<br>` : ''}
            ${cfg.direccion ? `${cfg.direccion}` : ''}${cfg.ciudad ? ` - ${cfg.ciudad}` : ''}<br>
            ${telefonos ? `Tel: ${telefonos}` : ''}${cfg.email ? ` | ${cfg.email}` : ''}
          </div>
        </div>
      </div>
      <div class="doc-info">
        <div class="doc-title">INVENTARIO</div>
        <div class="doc-date">
          <strong>Fecha:</strong> ${fechaFormat}
        </div>
      </div>
    </div>

    <!-- Datos de la tienda -->
    <div class="tienda-box">
      <div class="tienda-title">Datos de la Tienda</div>
      <div class="tienda-grid">
        <div class="tienda-item">
          <label>Tienda</label>
          <span>${tienda.nombre}</span>
        </div>
        <div class="tienda-item">
          <label>Encargado</label>
          <span>${tienda.encargado || '-'}</span>
        </div>
        <div class="tienda-item">
          <label>Ciudad</label>
          <span>${tienda.ciudad || '-'}</span>
        </div>
      </div>
    </div>

    <!-- Tabla de productos -->
    <table>
      <thead>
        <tr>
          <th style="width: 35px; text-align: center;">N°</th>
          <th style="width: 25%;">Marca</th>
          <th style="width: 18%;">Amperaje</th>
          <th style="width: 12%; text-align: center;">Cantidad</th>
          <th style="width: 18%; text-align: right;">P. Unit.</th>
          <th style="width: 18%; text-align: right;">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${productosHTML}
        <tr class="total-row">
          <td colspan="3" style="text-align: right;">TOTAL:</td>
          <td style="text-align: center;">${totalUnidades}</td>
          <td></td>
          <td style="text-align: right;">Bs. ${totalValor.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</td>
        </tr>
      </tbody>
    </table>

    <!-- Resumen -->
    <div class="summary-box">
      <div class="summary-item">
        <div class="summary-label">Total Productos</div>
        <div class="summary-value">${sortedItems.length}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Total Unidades</div>
        <div class="summary-value">${totalUnidades}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Valor Total</div>
        <div class="summary-value">Bs. ${totalValor.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="footer-company">${cfg.pie_empresa || cfg.nombre}</div>
      <div class="footer-thanks">${cfg.pie_agradecimiento || '¡Gracias por su confianza!'}</div>
      <div class="footer-contact">${cfg.pie_contacto || (telefonos ? `Para consultas: ${telefonos}${cfg.email ? ' | ' + cfg.email : ''}` : '')}</div>
    </div>
  </div>
</body>
</html>
    `;
  };

  // Analizar archivo de saldos anteriores
  const handleAnalyzeSaldos = async (file: File) => {
    if (!selectedTienda) return;

    try {
      setIsAnalyzingSaldos(true);
      setSaldosFile(file);

      const XLSX = await import('xlsx');
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(ws);

      // Normalizar datos del Excel
      const productos = jsonData.map((row: any) => ({
        marca: row['Marca'] || row['marca'] || '',
        amperaje: String(row['Amperaje'] || row['amperaje'] || ''),
        cantidad: parseInt(row['Cantidad'] || row['cantidad'] || 0),
        precio_venta: parseFloat(row['Precio de Venta'] || row['Precio'] || row['precio_venta'] || row['precio'] || 0),
      })).filter((p: any) => p.marca && p.amperaje && p.cantidad > 0 && p.precio_venta > 0);

      if (productos.length === 0) {
        toast({ 
          title: 'Error', 
          description: 'No se encontraron productos válidos en el archivo', 
          variant: 'destructive' 
        });
        setSaldosFile(null);
        setIsAnalyzingSaldos(false);
        return;
      }

      // Analizar contra el inventario existente de la tienda
      const response = await fetch('/api/tienda-inventario/saldos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tiendaId: selectedTienda.id,
          productos,
          mode: 'analyze'
        })
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error);

      setSaldosAnalysis(result.analysis);
      setSaldosDialogOpen(true);
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Error al analizar archivo', 
        variant: 'destructive' 
      });
      setSaldosFile(null);
    } finally {
      setIsAnalyzingSaldos(false);
    }
  };

  // Importar saldos anteriores
  const handleImportSaldos = async () => {
    if (!selectedTienda || !saldosFile) return;

    try {
      setIsImportingSaldos(true);

      const XLSX = await import('xlsx');
      const data = await saldosFile.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(ws);

      const productos = jsonData.map((row: any) => ({
        marca: row['Marca'] || row['marca'] || '',
        amperaje: String(row['Amperaje'] || row['amperaje'] || ''),
        cantidad: parseInt(row['Cantidad'] || row['cantidad'] || 0),
        precio_venta: parseFloat(row['Precio de Venta'] || row['Precio'] || row['precio_venta'] || row['precio'] || 0),
      })).filter((p: any) => p.marca && p.amperaje && p.cantidad > 0 && p.precio_venta > 0);

      const response = await fetch('/api/tienda-inventario/saldos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tiendaId: selectedTienda.id,
          productos,
          mode: 'import'
        })
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error);

      toast({ 
        title: 'Saldos importados', 
        description: result.message, 
        variant: 'success' 
      });

      setSaldosDialogOpen(false);
      setSaldosAnalysis(null);
      setSaldosFile(null);
      // No llamamos fetchTiendaInventory() - Realtime lo actualizará automáticamente
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Error al importar saldos', 
        variant: 'destructive' 
      });
    } finally {
      setIsImportingSaldos(false);
    }
  };

  // Agregar item manualmente al saldo
  const handleAddManualSaldoItem = () => {
    if (!newSaldoItem.marca.trim() || !newSaldoItem.amperaje.trim() || newSaldoItem.cantidad <= 0 || newSaldoItem.precio_venta <= 0) {
      toast({ title: 'Error', description: 'Completa todos los campos correctamente', variant: 'destructive' });
      return;
    }
    
    // Verificar si ya existe
    const existingIndex = manualSaldoItems.findIndex(
      item => item.marca.toLowerCase() === newSaldoItem.marca.toLowerCase() && 
              item.amperaje.toLowerCase() === newSaldoItem.amperaje.toLowerCase()
    );
    
    if (existingIndex >= 0) {
      // Actualizar existente
      setManualSaldoItems(prev => prev.map((item, i) => 
        i === existingIndex 
          ? { ...item, cantidad: item.cantidad + newSaldoItem.cantidad, precio_venta: newSaldoItem.precio_venta }
          : item
      ));
    } else {
      // Agregar nuevo
      setManualSaldoItems(prev => [...prev, { ...newSaldoItem }]);
    }
    
    setNewSaldoItem({ marca: '', amperaje: '', cantidad: 1, precio_venta: 0 });
  };

  // Eliminar item del saldo manual
  const handleRemoveManualSaldoItem = (index: number) => {
    setManualSaldoItems(prev => prev.filter((_, i) => i !== index));
  };

  // Guardar saldos manuales
  const handleSaveManualSaldos = async () => {
    if (!selectedTienda || manualSaldoItems.length === 0) return;

    try {
      setIsImportingSaldos(true);

      const response = await fetch('/api/tienda-inventario/saldos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tiendaId: selectedTienda.id,
          productos: manualSaldoItems,
          mode: 'import'
        })
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error);

      toast({ 
        title: 'Saldos guardados', 
        description: result.message, 
        variant: 'success' 
      });

      setSaldosDialogOpen(false);
      setManualSaldoItems([]);
      setSaldosMode('import');
      // No llamamos fetchTiendaInventory() - Realtime lo actualizará automáticamente
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Error al guardar saldos', 
        variant: 'destructive' 
      });
    } finally {
      setIsImportingSaldos(false);
    }
  };

  // Descargar formato de saldos
  const handleDownloadSaldosFormat = async () => {
    const XLSX = await import('xlsx');
    const headers = [['Marca', 'Amperaje', 'Cantidad', 'Precio de Venta']];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    ws['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 15 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Saldos');
    XLSX.writeFile(wb, 'formato_saldos_anteriores.xlsx');
  };

  // Helper para estado del envío
  const getEnvioEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 border gap-1"><Clock className="h-3 w-3" /> Pendiente</Badge>;
      case 'precios_asignados':
        return <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 border gap-1"><Check className="h-3 w-3" /> Listo</Badge>;
      case 'completado':
        return <Badge className="bg-green-500/15 text-green-600 border-green-500/30 border gap-1"><CheckCircle className="h-3 w-3" /> Completado</Badge>;
      case 'cancelado':
        return <Badge className="bg-red-500/15 text-red-600 border-red-500/30 border gap-1"><X className="h-3 w-3" /> Cancelado</Badge>;
      default:
        return <Badge variant="secondary">{estado}</Badge>;
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

  // Paginación de items filtrados para renderizado eficiente
  const paginatedTransferItems = useMemo(() => {
    const start = (transferPage - 1) * TRANSFER_PAGE_SIZE;
    return filteredTransferItems.slice(start, start + TRANSFER_PAGE_SIZE);
  }, [filteredTransferItems, transferPage]);

  const transferTotalPages = useMemo(() => 
    Math.ceil(filteredTransferItems.length / TRANSFER_PAGE_SIZE)
  , [filteredTransferItems.length]);

  // Reset página cuando cambian filtros
  useEffect(() => {
    setTransferPage(1);
  }, [transferSearch, transferFilterMarca]);

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
          <Button variant="outline" onClick={() => { setConfigForm(empresaConfig); setConfigDialogOpen(true); }}>
            <Settings className="mr-2 h-4 w-4" />
            Configurar PDF
          </Button>
          <Button onClick={() => { setShowForm(!showForm); if (showForm) handleCancelForm(); }}>
            {showForm ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
            {showForm ? 'Cancelar' : 'Nueva Tienda'}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="shadow-soft border-l-4 border-l-primary">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <Store className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              <div>
                <p className="text-xl sm:text-2xl font-bold">{stats.total}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Tiendas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft border-l-4 border-l-blue-500">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
              <div>
                <p className="text-xl sm:text-2xl font-bold">{stats.casaMatriz}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Casa Matriz</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft border-l-4 border-l-green-500">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <Store className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
              <div>
                <p className="text-xl sm:text-2xl font-bold">{stats.sucursales}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Sucursales</p>
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
                <Select value={filterCiudad} onValueChange={setFilterCiudad}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Ciudad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">Todas las ciudades</SelectItem>
                    {ciudades.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleViewTienda(tienda); }}>
                            <Eye className="h-4 w-4" />
                          </Button>
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
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
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
                  <Button onClick={handleOpenTransfer} size="sm" className="gap-1.5 shrink-0">
                    <Send className="h-4 w-4" />
                    <span className="hidden sm:inline">Enviar Productos</span>
                    <span className="sm:hidden">Enviar</span>
                  </Button>
                )}
              </div>
              {selectedTienda && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => handlePrintTiendaInventory()} className="gap-1.5" disabled={tiendaStats.totalProductos === 0} title="Imprimir inventario">
                    <Printer className="h-4 w-4" />
                    <span className="hidden sm:inline">Imprimir</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setSaldosDialogOpen(true)} className="gap-1.5" title="Agregar saldo anterior">
                    <Plus className="h-4 w-4" />
                    <span className="hidden xs:inline">Saldo Anterior</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportTiendaInventory} className="gap-1.5" disabled={tiendaStats.totalProductos === 0}>
                    <Download className="h-4 w-4" />
                    <span className="hidden xs:inline">Exportar</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setReturnDialogOpen(true)} className="gap-1.5" disabled={tiendaStats.totalUnidades === 0}>
                    <Undo2 className="h-4 w-4" />
                    <span className="hidden xs:inline">Devolver Todo</span>
                  </Button>
                </div>
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
                  <div className="bg-muted p-2 sm:p-3 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">Productos</p>
                    <p className="text-base sm:text-lg font-bold">{tiendaStats.totalProductos}</p>
                  </div>
                  <div className="bg-muted p-2 sm:p-3 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">Unidades</p>
                    <p className="text-base sm:text-lg font-bold">{tiendaStats.totalUnidades}</p>
                  </div>
                  <div className="bg-muted p-2 sm:p-3 rounded-lg text-center min-w-0">
                    <p className="text-xs text-muted-foreground">Valor Costo</p>
                    <p className="text-xs sm:text-sm lg:text-base font-bold truncate">{formatCurrency(tiendaStats.valorCosto)}</p>
                  </div>
                  <div className="bg-primary/10 p-2 sm:p-3 rounded-lg text-center min-w-0">
                    <p className="text-xs text-muted-foreground">Valor Venta</p>
                    <p className="text-xs sm:text-sm lg:text-base font-bold text-primary truncate">{formatCurrency(tiendaStats.valorVenta)}</p>
                  </div>
                </div>

                {/* Filtros */}
                <div className="flex items-center gap-2 mb-4">
                  <Select value={tiendaFilterMarca} onValueChange={setTiendaFilterMarca}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="Marca" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_all">Todas las marcas</SelectItem>
                      {tiendaMarcas.map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={tiendaFilterAmperaje} onValueChange={setTiendaFilterAmperaje}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="Amperaje" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_all">Todos los amperajes</SelectItem>
                      {tiendaAmperajes.map(a => (
                        <SelectItem key={a} value={a}>{a}</SelectItem>
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
                          <SelectItem value="500">500</SelectItem>
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

                {/* Sección Envíos Pendientes */}
                {selectedTienda && (
                  <div className="mt-6 pt-6 border-t">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4" />
                        Envíos Pendientes
                        {enviosPendientes.filter(e => e.estado !== 'completado').length > 0 && (
                          <Badge variant="secondary" className="ml-2">
                            {enviosPendientes.filter(e => e.estado !== 'completado').length}
                          </Badge>
                        )}
                      </h3>
                    </div>

                    {loadingEnvios ? (
                      <div className="text-center py-4">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      </div>
                    ) : enviosPendientes.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p>No hay envíos pendientes</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {enviosPendientes.filter(e => e.estado !== 'completado').map((envio) => (
                          <div key={envio.id} className="p-3 border rounded-lg hover:bg-muted/50">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  {getEnvioEstadoBadge(envio.estado)}
                                  <span className="text-sm text-muted-foreground">
                                    {new Date(envio.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="text-sm">
                                  {envio.total_productos} productos • {envio.total_unidades} unidades
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewEnvio(envio)} title="Ver detalle">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleExportEnvio(envio.id)} title="Exportar Excel">
                                  <Download className="h-4 w-4" />
                                </Button>
                                <label className="cursor-pointer">
                                  <input
                                    type="file"
                                    accept=".xlsx,.xls"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleImportEnvio(envio.id, file);
                                      e.target.value = '';
                                    }}
                                    disabled={isImporting || envio.estado === 'completado'}
                                  />
                                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild disabled={isImporting}>
                                    <span title="Importar precios">
                                      <Upload className="h-4 w-4" />
                                    </span>
                                  </Button>
                                </label>
                                {envio.estado === 'precios_asignados' && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-green-600" 
                                    onClick={() => handleConfirmEnvio(envio.id)}
                                    disabled={isConfirming}
                                    title="Confirmar y enviar a tienda"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-destructive" 
                                  onClick={() => { setEnvioToDelete(envio); setDeleteEnvioDialogOpen(true); }}
                                  title="Cancelar envío"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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
                    {paginatedTransferItems.map((item) => (
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
            
            {/* Paginación de transferencia */}
            {filteredTransferItems.length > TRANSFER_PAGE_SIZE && (
              <div className="flex items-center justify-between py-2 px-1 border-t">
                <span className="text-sm text-muted-foreground">
                  Mostrando {((transferPage - 1) * TRANSFER_PAGE_SIZE) + 1}-{Math.min(transferPage * TRANSFER_PAGE_SIZE, filteredTransferItems.length)} de {filteredTransferItems.length} productos
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setTransferPage(1)}
                    disabled={transferPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <ChevronLeft className="h-4 w-4 -ml-2" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setTransferPage(p => Math.max(1, p - 1))}
                    disabled={transferPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm px-2">{transferPage} / {transferTotalPages}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setTransferPage(p => Math.min(transferTotalPages, p + 1))}
                    disabled={transferPage >= transferTotalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setTransferPage(transferTotalPages)}
                    disabled={transferPage >= transferTotalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                    <ChevronRight className="h-4 w-4 -ml-2" />
                  </Button>
                </div>
              </div>
            )}
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

      {/* Dialog Ver Tienda */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Información de Tienda
            </DialogTitle>
          </DialogHeader>
          {viewingTienda && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-lg">{viewingTienda.nombre}</span>
                {getTipoBadge(viewingTienda.tipo)}
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Encargado</p>
                    <p className="font-medium">{viewingTienda.encargado || 'Sin asignar'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Ciudad</p>
                    <p className="font-medium">{viewingTienda.ciudad || 'No especificada'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Dirección</p>
                    <p className="font-medium">{viewingTienda.direccion || 'No especificada'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Devolver Inventario */}
      <AlertDialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Undo2 className="h-5 w-5" />
              ¿Devolver todo el inventario?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Se devolverán <strong>{tiendaStats.totalUnidades} unidades</strong> de <strong>{tiendaStats.totalProductos} productos</strong> al inventario principal.
              <br /><br />
              Esta acción sumará las cantidades al inventario central y vaciará el inventario de la tienda "{selectedTienda?.nombre}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isReturning}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReturnAllInventory} disabled={isReturning}>
              {isReturning ? 'Devolviendo...' : 'Confirmar Devolución'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Detalle de Envío */}
      <Dialog open={envioDetailOpen} onOpenChange={(open) => {
        setEnvioDetailOpen(open);
        if (!open) setEditedPrices({});
      }}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Detalle del Envío
            </DialogTitle>
            <DialogDescription>
              {selectedEnvio && (
                <span className="flex items-center gap-2 mt-1">
                  {getEnvioEstadoBadge(selectedEnvio.estado)}
                  <span className="text-muted-foreground">
                    {selectedEnvio.total_productos} productos • {selectedEnvio.total_unidades} unidades
                  </span>
                  {selectedEnvio.estado !== 'completado' && (
                    <span className="text-xs text-muted-foreground ml-2">
                      (Edita los precios directamente en la tabla)
                    </span>
                  )}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Barra de acciones para precios */}
          {selectedEnvio?.estado !== 'completado' && (
            <div className="flex flex-wrap items-center gap-2 py-2 px-2 bg-muted/50 rounded-lg">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleApplyOriginalPrices}
                className="gap-1.5 text-xs sm:text-sm"
              >
                <Copy className="h-4 w-4" />
                <span className="hidden xs:inline">Aplicar</span> Precios Originales
              </Button>
              <div className="flex-1 min-w-0" />
              {Object.keys(editedPrices).length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {Object.keys(editedPrices).length} precio(s) modificado(s)
                </Badge>
              )}
              <Button 
                size="sm" 
                onClick={handleSavePrices}
                disabled={isSavingPrices || Object.keys(editedPrices).length === 0}
                className="gap-1.5 min-w-fit"
              >
                {isSavingPrices ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">{isSavingPrices ? 'Guardando...' : 'Guardar'}</span>
              </Button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {loadingEnvioItems ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium">Marca</th>
                    <th className="text-left py-3 px-4 font-medium">Amperaje</th>
                    <th className="text-center py-3 px-4 font-medium">Cantidad</th>
                    <th className="text-right py-3 px-4 font-medium">Precio Original</th>
                    <th className="text-right py-3 px-4 font-medium w-40">Precio Tienda</th>
                  </tr>
                </thead>
                <tbody>
                  {envioItems.map((item) => {
                    const editedPrice = editedPrices[item.id];
                    const currentPrice = editedPrice !== undefined ? editedPrice : item.precio_tienda;
                    const hasChange = editedPrice !== undefined;
                    
                    return (
                      <tr key={item.id} className={`border-b hover:bg-muted/50 ${hasChange ? 'bg-amber-50 dark:bg-amber-900/10' : ''}`}>
                        <td className="py-3 px-4 font-medium">{item.marca}</td>
                        <td className="py-3 px-4">{item.amperaje}</td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant="secondary">{item.cantidad}</Badge>
                        </td>
                        <td className="py-3 px-4 text-right text-muted-foreground">
                          {formatCurrency(item.precio_venta_original)}
                        </td>
                        <td className="py-2 px-4">
                          {selectedEnvio?.estado === 'completado' ? (
                            <span className="font-medium text-green-600 text-right block">
                              {formatCurrency(item.precio_tienda || 0)}
                            </span>
                          ) : (
                            <div className="flex items-center gap-1 justify-end">
                              <span className="text-muted-foreground text-xs">Bs.</span>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                className={`w-24 h-8 text-right text-sm ${
                                  hasChange 
                                    ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20' 
                                    : currentPrice !== null 
                                      ? 'border-green-400' 
                                      : 'border-amber-400'
                                }`}
                                value={currentPrice ?? ''}
                                onChange={(e) => handlePriceChange(item.id, e.target.value)}
                                placeholder="0.00"
                              />
                              {currentPrice !== null && !hasChange && (
                                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                              )}
                              {hasChange && (
                                <span className="text-amber-500 text-xs">*</span>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <DialogFooter className="mt-4 border-t pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2 w-full">
              <Button variant="ghost" size="sm" onClick={() => { setEnvioDetailOpen(false); setEditedPrices({}); }}>
                Cerrar
              </Button>
              <div className="flex flex-wrap items-center gap-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && selectedEnvio) {
                        handleImportEnvio(selectedEnvio.id, file);
                        setEditedPrices({});
                      }
                      e.target.value = '';
                    }}
                    disabled={isImporting || selectedEnvio?.estado === 'completado'}
                  />
                  <Button variant="outline" size="sm" className="gap-1.5" asChild disabled={isImporting || selectedEnvio?.estado === 'completado'}>
                    <span>
                      <Upload className="h-4 w-4" />
                      Importar Precios
                    </span>
                  </Button>
                </label>
                <Button variant="outline" size="sm" onClick={() => selectedEnvio && handleExportEnvio(selectedEnvio.id)} className="gap-1.5">
                  <Download className="h-4 w-4" />
                  Exportar Excel
                </Button>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => selectedEnvio && selectedTienda && handlePrintEnvio(selectedEnvio, envioItems, selectedTienda)} 
                  className="gap-1.5"
                  disabled={loadingEnvioItems || envioItems.length === 0}
                >
                <Printer className="h-4 w-4" />
                Imprimir PDF
              </Button>
              {(selectedEnvio?.estado === 'precios_asignados' || 
                (selectedEnvio?.estado === 'pendiente' && envioItems.every(i => (editedPrices[i.id] !== undefined) || i.precio_tienda !== null))) && (
                <Button 
                  size="sm"
                  onClick={() => selectedEnvio && handleConfirmEnvio(selectedEnvio.id)} 
                  disabled={isConfirming || Object.keys(editedPrices).length > 0}
                  className="gap-1.5"
                  title={Object.keys(editedPrices).length > 0 ? 'Guarda los precios primero' : ''}
                >
                  {isConfirming ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Confirmando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Confirmar Envío
                    </>
                  )}
                </Button>
              )}
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Eliminar Envío */}
      <AlertDialog open={deleteEnvioDialogOpen} onOpenChange={setDeleteEnvioDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              ¿Cancelar envío?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Se cancelará el envío de <strong>{envioToDelete?.total_unidades} unidades</strong> de <strong>{envioToDelete?.total_productos} productos</strong>.
              <br /><br />
              Las cantidades serán devueltas al inventario principal. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEnvio} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirmar Cancelación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Imprimir Resumen de Envío */}
      <AlertDialog open={printConfirmDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setPrintConfirmDialogOpen(false);
          setLastConfirmedEnvio(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5 text-primary" />
              ¡Envío Confirmado!
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>Los productos han sido agregados exitosamente al inventario de <strong>{lastConfirmedEnvio?.tienda.nombre}</strong>.</p>
              
              <div className="bg-muted rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Saldo anterior:</span>
                  <span className="font-medium">{lastConfirmedEnvio?.saldoAnterior.reduce((s, p) => s + p.cantidad, 0) || 0} unidades</span>
                </div>
                <div className="flex justify-between text-sm text-green-600">
                  <span>+ Productos entregados:</span>
                  <span className="font-medium">{lastConfirmedEnvio?.items.reduce((s, p) => s + p.cantidad, 0) || 0} unidades</span>
                </div>
                <div className="border-t pt-2 flex justify-between text-sm font-bold">
                  <span>= Nuevo saldo total:</span>
                  <span>
                    {(lastConfirmedEnvio?.saldoAnterior.reduce((s, p) => s + p.cantidad, 0) || 0) + 
                     (lastConfirmedEnvio?.items.reduce((s, p) => s + p.cantidad, 0) || 0)} unidades
                  </span>
                </div>
              </div>
              
              <p className="text-muted-foreground">¿Desea imprimir el resumen del envío con el saldo anterior y los nuevos productos?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setPrintConfirmDialogOpen(false); setLastConfirmedEnvio(null); }}>
              No, gracias
            </AlertDialogCancel>
            <AlertDialogAction onClick={handlePrintResumenEnvio} className="gap-2">
              <Printer className="h-4 w-4" />
              Imprimir Resumen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Saldos Anteriores */}
      <Dialog open={saldosDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setSaldosDialogOpen(false);
          setSaldosAnalysis(null);
          setSaldosFile(null);
          setManualSaldoItems([]);
          setSaldosMode('import');
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Saldo Anterior - {selectedTienda?.nombre}
            </DialogTitle>
            <DialogDescription>
              Ingresa el inventario existente de la tienda antes de agregar nuevos productos
            </DialogDescription>
          </DialogHeader>

          {/* Tabs para elegir modo */}
          <div className="flex gap-2 border-b pb-2">
            <Button 
              variant={saldosMode === 'import' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setSaldosMode('import')}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Importar Excel
            </Button>
            <Button 
              variant={saldosMode === 'manual' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setSaldosMode('manual')}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Ingreso Manual
            </Button>
          </div>

          {/* Contenido según modo */}
          <div className="flex-1 overflow-y-auto">
            {saldosMode === 'import' ? (
              /* Modo Importar Excel */
              <div className="space-y-4 py-2">
                {!saldosAnalysis ? (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">Selecciona un archivo Excel con los saldos</p>
                    <div className="flex justify-center gap-2">
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept=".xlsx,.xls"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleAnalyzeSaldos(file);
                            e.target.value = '';
                          }}
                          disabled={isAnalyzingSaldos}
                        />
                        <Button variant="default" asChild disabled={isAnalyzingSaldos}>
                          <span>
                            {isAnalyzingSaldos ? (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Analizando...
                              </>
                            ) : (
                              <>
                                <Upload className="h-4 w-4 mr-2" />
                                Seleccionar Archivo
                              </>
                            )}
                          </span>
                        </Button>
                      </label>
                      <Button variant="outline" onClick={handleDownloadSaldosFormat}>
                        <Download className="h-4 w-4 mr-2" />
                        Descargar Formato
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <p className="text-2xl font-bold">{saldosAnalysis.total}</p>
                        <p className="text-xs text-muted-foreground">Total en archivo</p>
                      </div>
                      <div className="text-center p-3 bg-green-500/10 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">{saldosAnalysis.new}</p>
                        <p className="text-xs text-muted-foreground">Nuevos</p>
                      </div>
                      <div className="text-center p-3 bg-blue-500/10 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">{saldosAnalysis.existing}</p>
                        <p className="text-xs text-muted-foreground">Actualizar</p>
                      </div>
                    </div>

                    {saldosAnalysis.newItems.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Productos nuevos:</p>
                        <div className="text-xs space-y-1 max-h-32 overflow-y-auto bg-muted/50 p-2 rounded">
                          {saldosAnalysis.newItems.map((item: any, i: number) => (
                            <div key={i} className="flex justify-between">
                              <span>{item.marca} {item.amperaje}</span>
                              <span className="text-muted-foreground">{item.cantidad} u. - Bs. {item.precio_venta}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {saldosAnalysis.updateItems.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Productos a actualizar:</p>
                        <div className="text-xs space-y-1 max-h-32 overflow-y-auto bg-muted/50 p-2 rounded">
                          {saldosAnalysis.updateItems.map((item: any, i: number) => (
                            <div key={i} className="flex justify-between">
                              <span>{item.marca} {item.amperaje}</span>
                              <span className="text-muted-foreground">+{item.cantidad} u.</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setSaldosAnalysis(null); setSaldosFile(null); }}>
                        <X className="h-4 w-4 mr-1" />
                        Cambiar archivo
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Modo Ingreso Manual */
              <div className="space-y-4 py-2">
                {/* Formulario para agregar */}
                <div className="grid grid-cols-12 gap-2 items-end p-3 bg-muted/50 rounded-lg">
                  <div className="col-span-3">
                    <Label className="text-xs">Marca</Label>
                    <Input
                      placeholder="Ingrese marca"
                      value={newSaldoItem.marca}
                      onChange={(e) => setNewSaldoItem(prev => ({ ...prev, marca: e.target.value.toUpperCase() }))}
                      className="h-9"
                    />
                  </div>
                  <div className="col-span-3">
                    <Label className="text-xs">Amperaje</Label>
                    <Input
                      placeholder="Ingrese amperaje"
                      value={newSaldoItem.amperaje}
                      onChange={(e) => setNewSaldoItem(prev => ({ ...prev, amperaje: e.target.value.toUpperCase() }))}
                      className="h-9"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Cantidad</Label>
                    <Input
                      type="number"
                      min="1"
                      value={newSaldoItem.cantidad}
                      onChange={(e) => setNewSaldoItem(prev => ({ ...prev, cantidad: parseInt(e.target.value) || 0 }))}
                      className="h-9"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Precio Venta</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={newSaldoItem.precio_venta || ''}
                      onChange={(e) => setNewSaldoItem(prev => ({ ...prev, precio_venta: parseFloat(e.target.value) || 0 }))}
                      className="h-9"
                    />
                  </div>
                  <div className="col-span-2">
                    <Button onClick={handleAddManualSaldoItem} size="sm" className="w-full h-9">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Lista de productos agregados */}
                {manualSaldoItems.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left py-2 px-3 font-medium">Marca</th>
                          <th className="text-left py-2 px-3 font-medium">Amperaje</th>
                          <th className="text-center py-2 px-3 font-medium">Cantidad</th>
                          <th className="text-right py-2 px-3 font-medium">Precio</th>
                          <th className="text-right py-2 px-3 font-medium">Subtotal</th>
                          <th className="w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {manualSaldoItems.map((item, index) => (
                          <tr key={index} className="border-t hover:bg-muted/50">
                            <td className="py-2 px-3 font-medium">{item.marca}</td>
                            <td className="py-2 px-3">{item.amperaje}</td>
                            <td className="py-2 px-3 text-center">{item.cantidad}</td>
                            <td className="py-2 px-3 text-right">{formatCurrency(item.precio_venta)}</td>
                            <td className="py-2 px-3 text-right font-medium">{formatCurrency(item.precio_venta * item.cantidad)}</td>
                            <td className="py-2 px-1">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleRemoveManualSaldoItem(index)}
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-muted/50">
                        <tr className="border-t-2">
                          <td colSpan={2} className="py-2 px-3 font-bold">Total</td>
                          <td className="py-2 px-3 text-center font-bold">
                            {manualSaldoItems.reduce((sum, i) => sum + i.cantidad, 0)}
                          </td>
                          <td></td>
                          <td className="py-2 px-3 text-right font-bold">
                            {formatCurrency(manualSaldoItems.reduce((sum, i) => sum + (i.precio_venta * i.cantidad), 0))}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Agrega productos usando el formulario de arriba</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => { setSaldosDialogOpen(false); setManualSaldoItems([]); setSaldosMode('import'); }}>
              Cancelar
            </Button>
            {saldosMode === 'import' ? (
              <Button onClick={handleImportSaldos} disabled={isImportingSaldos || !saldosAnalysis}>
                {isImportingSaldos ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirmar Importación
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={handleSaveManualSaldos} disabled={isImportingSaldos || manualSaldoItems.length === 0}>
                {isImportingSaldos ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Saldos ({manualSaldoItems.length} productos)
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Configuración de Empresa para PDF */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuración del PDF
            </DialogTitle>
            <DialogDescription>
              Personaliza la información que aparece en los PDFs de envío
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Datos de la empresa */}
            <div className="space-y-4">
              <h4 className="font-medium">Datos de la Empresa</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre de la Empresa *</Label>
                  <Input
                    value={configForm.nombre}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, nombre: e.target.value }))}
                    placeholder="NICMAT S.R.L."
                  />
                </div>
                <div className="space-y-2">
                  <Label>NIT</Label>
                  <Input
                    value={configForm.nit || ''}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, nit: e.target.value }))}
                    placeholder="1234567890"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dirección</Label>
                  <Input
                    value={configForm.direccion || ''}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, direccion: e.target.value }))}
                    placeholder="Av. Principal #123"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ciudad</Label>
                  <Input
                    value={configForm.ciudad || ''}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, ciudad: e.target.value }))}
                    placeholder="La Paz, Bolivia"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={configForm.email || ''}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="info@empresa.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Color Principal</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={configForm.color_principal || '#1a5f7a'}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, color_principal: e.target.value }))}
                      className="w-14 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={configForm.color_principal || '#1a5f7a'}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, color_principal: e.target.value }))}
                      placeholder="#1a5f7a"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Teléfonos */}
            <div className="space-y-4">
              <h4 className="font-medium">Teléfonos de Contacto</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Teléfono Principal</Label>
                  <Input
                    value={configForm.telefono_principal || ''}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, telefono_principal: e.target.value }))}
                    placeholder="77012345"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono Secundario</Label>
                  <Input
                    value={configForm.telefono_secundario || ''}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, telefono_secundario: e.target.value }))}
                    placeholder="77567890"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono Adicional</Label>
                  <Input
                    value={configForm.telefono_adicional || ''}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, telefono_adicional: e.target.value }))}
                    placeholder="2-2123456"
                  />
                </div>
              </div>
            </div>

            {/* Logo */}
            <div className="space-y-4">
              <h4 className="font-medium">Logo de la Empresa</h4>
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 border rounded-lg flex items-center justify-center overflow-hidden bg-muted">
                  {configForm.logo ? (
                    <img src={configForm.logo} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <Store className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <Label>URL del Logo o Base64</Label>
                  <Input
                    value={configForm.logo || ''}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, logo: e.target.value }))}
                    placeholder="https://... o data:image/png;base64,..."
                  />
                  <p className="text-xs text-muted-foreground">Pega una URL de imagen o el código base64 de tu logo</p>
                </div>
              </div>
            </div>

            {/* Pie de página */}
            <div className="space-y-4">
              <h4 className="font-medium">Pie de Página del PDF</h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre en Pie de Página</Label>
                  <Input
                    value={configForm.pie_empresa || ''}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, pie_empresa: e.target.value }))}
                    placeholder="NICMAT S.R.L. - Tu mejor opción en baterías"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mensaje de Agradecimiento</Label>
                  <Input
                    value={configForm.pie_agradecimiento || ''}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, pie_agradecimiento: e.target.value }))}
                    placeholder="¡Gracias por su confianza!"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Información de Contacto</Label>
                  <Input
                    value={configForm.pie_contacto || ''}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, pie_contacto: e.target.value }))}
                    placeholder="Para consultas: 77012345 | info@empresa.com"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveConfig} disabled={isSavingConfig || !configForm.nombre.trim()}>
              {isSavingConfig ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar Configuración'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
