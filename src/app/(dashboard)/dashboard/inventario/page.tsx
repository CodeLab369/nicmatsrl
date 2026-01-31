'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Plus, Search, Upload, Download, FileSpreadsheet, Trash2,
  Eye, Edit2, Package, Boxes, DollarSign, TrendingUp,
  ChevronLeft, ChevronRight, X, RefreshCw, AlertCircle, ArrowRight,
  FileText, Settings
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTableSubscription } from '@/contexts';
import { formatCurrency } from '@/lib/utils';
import { readExcelFast, exportToExcelFast, createExcelTemplate } from '@/lib/excel-utils';
import {
  Button, Card, CardContent, CardHeader, CardTitle,
  Input, Badge, Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, Label,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  Switch, Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui';

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
  const [isLoading, setIsLoading] = useState(false); // Iniciar en false para carga instantánea
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
  
  // Opciones de filtros dinámicos
  const [marcasOptions, setMarcasOptions] = useState<string[]>([]);
  const [amperajesOptions, setAmperajesOptions] = useState<string[]>([]);
  
  // Modales
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  
  // PDF state
  const [pdfConfigOpen, setPdfConfigOpen] = useState(false);
  const [pdfConfigLoading, setPdfConfigLoading] = useState(false);
  const [pdfConfig, setPdfConfig] = useState({
    titulo: 'INVENTARIO DE BATERÍAS',
    subtitulo: 'Listado completo de productos en stock',
    empresa: 'NICMAT S.R.L.',
    colorPrincipal: '#1a5f7a',
    mostrarCosto: true,
    mostrarPrecioVenta: true,
    mostrarTotales: true,
    mostrarFecha: true,
    mostrarLogo: true,
    itemsPorPagina: 25,
  });
  
  // Import state
  const [importData, setImportData] = useState<any[]>([]);
  const [importAnalysis, setImportAnalysis] = useState<any>(null);
  const [importUpdateMode, setImportUpdateMode] = useState('sum');
  const [importUpdatePrices, setImportUpdatePrices] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Form
  const [formData, setFormData] = useState({
    marca: '', amperaje: '', cantidad: '', costo: '', precioVenta: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Detección de producto existente al agregar
  const [existingProduct, setExistingProduct] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [addMode, setAddMode] = useState<'new' | 'restock'>('new');
  
  const { toast } = useToast();
  
  // Cargar configuración PDF desde la nube
  const loadPdfConfig = useCallback(async () => {
    try {
      const response = await fetch('/api/pdf-config?modulo=inventario');
      const data = await response.json();
      if (data.config) {
        setPdfConfig(prev => ({ ...prev, ...data.config }));
      }
    } catch (error) {
      console.error('Error cargando config PDF:', error);
    }
  }, []);
  
  // Cargar config al inicio
  useEffect(() => {
    loadPdfConfig();
  }, [loadPdfConfig]);
  
  // Guardar configuración PDF en la nube
  const savePdfConfig = async () => {
    setPdfConfigLoading(true);
    try {
      const response = await fetch('/api/pdf-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modulo: 'inventario', config: pdfConfig }),
      });
      if (!response.ok) throw new Error();
      toast({ title: 'Configuración guardada', description: 'La configuración se ha guardado en la nube' });
      setPdfConfigOpen(false);
    } catch {
      toast({ title: 'Error', description: 'No se pudo guardar la configuración', variant: 'destructive' });
    } finally {
      setPdfConfigLoading(false);
    }
  };

  // Cargar marcas disponibles
  const fetchMarcas = useCallback(async () => {
    try {
      const response = await fetch('/api/inventory?getMarcas=true');
      const data = await response.json();
      if (data.marcas) {
        setMarcasOptions(data.marcas);
      }
    } catch (error) {
      console.error('Error fetching marcas:', error);
    }
  }, []);

  // Cargar amperajes por marca
  const fetchAmperajes = useCallback(async (marca: string) => {
    if (!marca || marca === '_all') {
      setAmperajesOptions([]);
      return;
    }
    try {
      const response = await fetch(`/api/inventory?getAmperajes=true&marca=${encodeURIComponent(marca)}`);
      const data = await response.json();
      if (data.amperajes) {
        setAmperajesOptions(data.amperajes);
      }
    } catch (error) {
      console.error('Error fetching amperajes:', error);
    }
  }, []);

  // Cargar marcas al inicio
  useEffect(() => {
    fetchMarcas();
  }, [fetchMarcas]);

  // Cargar amperajes cuando cambia la marca
  useEffect(() => {
    fetchAmperajes(filterMarca);
    setFilterAmperaje('_all'); // Reset amperaje cuando cambia la marca
  }, [filterMarca, fetchAmperajes]);

  // Cargar inventario - siempre silencioso para máxima fluidez
  const fetchInventory = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        // Timestamp para evitar caché
        _t: Date.now().toString(),
      });
      if (search) params.set('search', search);
      if (filterMarca && filterMarca !== '_all') params.set('marca', filterMarca);
      if (filterAmperaje && filterAmperaje !== '_all') params.set('amperaje', filterAmperaje);
      if (cantidadOp && cantidadOp !== '_none' && cantidadVal) {
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
    }
  }, [page, limit, search, filterMarca, filterAmperaje, cantidadOp, cantidadVal, toast]);

  // Ref para mantener la función actualizada
  const fetchInventoryRef = useRef(fetchInventory);
  const fetchMarcasRef = useRef(fetchMarcas);
  
  useEffect(() => {
    fetchInventoryRef.current = fetchInventory;
  }, [fetchInventory]);
  
  useEffect(() => {
    fetchMarcasRef.current = fetchMarcas;
  }, [fetchMarcas]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Suscripción a Realtime - el hook ya tiene debounce integrado (500ms para inventory)
  useTableSubscription('inventory', () => {
    fetchInventoryRef.current();
    fetchMarcasRef.current();
  }, 500);
  
  // Suscripción Realtime para configuración de PDF
  useTableSubscription('pdf_config', () => {
    console.log('[Inventario] Cambio detectado en pdf_config, recargando...');
    loadPdfConfig();
  });

  // Resetear página al cambiar filtros
  useEffect(() => {
    setPage(1);
  }, [search, filterMarca, filterAmperaje, cantidadOp, cantidadVal, limit]);

  // Buscar producto existente por marca y amperaje
  const searchExistingProduct = useCallback(async (marca: string, amperaje: string) => {
    if (!marca.trim() || !amperaje.trim()) {
      setExistingProduct(null);
      setAddMode('new');
      return;
    }
    
    setIsSearching(true);
    try {
      const response = await fetch(
        `/api/inventory?searchExact=true&marca=${encodeURIComponent(marca.trim())}&amperaje=${encodeURIComponent(amperaje.trim())}`
      );
      const data = await response.json();
      
      if (data.product) {
        setExistingProduct(data.product);
        setAddMode('restock');
        // Auto-rellenar costo y precio de venta del producto existente
        setFormData(prev => ({
          ...prev,
          costo: data.product.costo.toString(),
          precioVenta: data.product.precio_venta.toString()
        }));
      } else {
        setExistingProduct(null);
        setAddMode('new');
      }
    } catch (error) {
      console.error('Error searching product:', error);
      setExistingProduct(null);
      setAddMode('new');
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Efecto para buscar producto cuando cambia marca o amperaje en el formulario de agregar
  useEffect(() => {
    if (addDialogOpen) {
      const timer = setTimeout(() => {
        searchExistingProduct(formData.marca, formData.amperaje);
      }, 500); // Debounce de 500ms
      return () => clearTimeout(timer);
    }
  }, [formData.marca, formData.amperaje, addDialogOpen, searchExistingProduct]);

  // Agregar producto o reabastecer
  const handleAdd = async () => {
    try {
      setIsSubmitting(true);
      
      if (addMode === 'restock' && existingProduct) {
        // Reabastecer producto existente
        const response = await fetch('/api/inventory', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: existingProduct.id,
            marca: formData.marca,
            amperaje: formData.amperaje,
            cantidad: existingProduct.cantidad + parseInt(formData.cantidad || '0'), // Sumar cantidad
            costo: formData.costo,
            precioVenta: formData.precioVenta
          }),
        });

        if (!response.ok) throw new Error();
        
        toast({ 
          title: 'Éxito', 
          description: `Stock actualizado: +${formData.cantidad} unidades (Total: ${existingProduct.cantidad + parseInt(formData.cantidad || '0')})`, 
          variant: 'success' 
        });
      } else {
        // Crear nuevo producto
        const response = await fetch('/api/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        if (!response.ok) throw new Error();
        
        toast({ title: 'Éxito', description: 'Producto agregado correctamente', variant: 'success' });
      }
      
      setAddDialogOpen(false);
      setFormData({ marca: '', amperaje: '', cantidad: '', costo: '', precioVenta: '' });
      setExistingProduct(null);
      setAddMode('new');
      // No llamamos fetchInventory() - Realtime lo actualizará automáticamente
      fetchMarcas();
    } catch {
      toast({ title: 'Error', description: 'No se pudo procesar la operación', variant: 'destructive' });
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
      // No llamamos fetchInventory() - Realtime lo actualizará automáticamente
      fetchMarcas();
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
      // No llamamos fetchInventory() - Realtime lo actualizará automáticamente
      fetchMarcas();
    } catch {
      toast({ title: 'Error', description: 'No se pudo eliminar el producto', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setFilterMarca('_all');
    setFilterAmperaje('_all');
    setCantidadOp('_none');
    setCantidadVal('');
  };

  // Vaciar inventario
  const handleClearAll = async () => {
    try {
      setIsSubmitting(true);
      const response = await fetch('/api/inventory?all=true', { method: 'DELETE' });
      if (!response.ok) throw new Error();
      
      toast({ title: 'Éxito', description: 'Inventario vaciado correctamente', variant: 'success' });
      setClearDialogOpen(false);
      clearFilters();
      // No llamamos fetchInventory() - Realtime lo actualizará automáticamente
      fetchMarcas();
    } catch {
      toast({ title: 'Error', description: 'No se pudo vaciar el inventario', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Exportar a Excel (ordenado por marca A-Z) - OPTIMIZADO
  // Exporta TODOS los productos, no solo la página actual
  const handleExport = async () => {
    try {
      setIsLoading(true);
      
      // Obtener TODOS los productos sin paginación
      const params = new URLSearchParams({
        noPagination: 'true',
        _t: Date.now().toString(),
      });
      // Mantener filtros actuales si los hay
      if (search) params.set('search', search);
      if (filterMarca && filterMarca !== '_all') params.set('marca', filterMarca);
      if (filterAmperaje && filterAmperaje !== '_all') params.set('amperaje', filterAmperaje);
      if (cantidadOp && cantidadOp !== '_none' && cantidadVal) {
        params.set('cantidadOp', cantidadOp);
        params.set('cantidadVal', cantidadVal);
      }

      const response = await fetch(`/api/inventory?${params}`);
      const data = await response.json();

      if (!data.items || data.items.length === 0) {
        toast({ title: 'Error', description: 'No hay productos para exportar', variant: 'destructive' });
        return;
      }

      // Ordenar por marca alfabéticamente antes de exportar
      const sortedItems = [...data.items].sort((a: InventoryItem, b: InventoryItem) => {
        const marcaCompare = a.marca.localeCompare(b.marca);
        return marcaCompare !== 0 ? marcaCompare : a.amperaje.localeCompare(b.amperaje);
      });
      
      const exportData = sortedItems.map((item: InventoryItem) => ({
        Marca: item.marca,
        Amperaje: item.amperaje,
        Cantidad: item.cantidad,
        Costo: item.costo,
        'Precio de Venta': item.precio_venta,
        'Costo Total': item.cantidad * item.costo,
        'Costo Venta': item.cantidad * item.precio_venta,
      }));

      exportToExcelFast(exportData, `inventario_${new Date().toISOString().split('T')[0]}`, 'Inventario');
      toast({ title: 'Éxito', description: `${sortedItems.length} productos exportados correctamente`, variant: 'success' });
    } catch (error) {
      console.error('Error al exportar:', error);
      toast({ title: 'Error', description: 'No se pudo exportar el inventario', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // Descargar formato - OPTIMIZADO
  const handleDownloadFormat = () => {
    createExcelTemplate(
      ['Marca', 'Amperaje', 'Cantidad', 'Costo', 'Precio de Venta'],
      'formato_inventario',
      'Formato'
    );
    toast({ title: 'Éxito', description: 'Formato descargado', variant: 'success' });
  };

  // Importar desde Excel - OPTIMIZADO
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsAnalyzing(true);
      
      // Validar tipo de archivo - Solo Excel y Google Sheets (exportado como Excel)
      const validTypes = ['.xlsx', '.xls'];
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      if (!validTypes.includes(fileExtension)) {
        toast({ 
          title: 'Archivo no válido', 
          description: 'Solo se permiten archivos Excel (.xlsx, .xls). Si usas Google Sheets, descárgalo como Excel.', 
          variant: 'destructive' 
        });
        setIsAnalyzing(false);
        e.target.value = '';
        return;
      }
      
      // Usar lectura optimizada con mejor compatibilidad para tablets
      const data = await readExcelFast(file);

      if (data.length === 0) {
        toast({ title: 'Error', description: 'El archivo está vacío', variant: 'destructive' });
        setIsAnalyzing(false);
        e.target.value = '';
        return;
      }

      // Analizar datos antes de importar
      const response = await fetch('/api/inventory?mode=analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Error en la API');
      const result = await response.json();
      
      setImportData(data);
      setImportAnalysis(result.analysis);
      setImportDialogOpen(true);
    } catch (error) {
      console.error('Error importando:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al analizar el archivo';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsAnalyzing(false);
      e.target.value = '';
    }
  };

  // Ejecutar importación
  const executeImport = async () => {
    try {
      setIsSubmitting(true);
      const params = new URLSearchParams({
        mode: 'import',
        updateMode: importUpdateMode,
        updatePrices: importUpdatePrices.toString(),
      });

      const response = await fetch(`/api/inventory?${params}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importData),
      });

      if (!response.ok) throw new Error();
      const result = await response.json();
      
      toast({ 
        title: 'Importación Exitosa', 
        description: `${result.inserted} nuevos, ${result.updated} actualizados`,
        variant: 'success' 
      });
      setImportDialogOpen(false);
      setImportAnalysis(null);
      setImportData([]);
      // No llamamos fetchInventory() - Realtime lo actualizará automáticamente
      fetchMarcas();
    } catch {
      toast({ title: 'Error', description: 'Error al importar productos', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
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

  // Generar PDF del inventario con paginación propia
  const generatePDF = async () => {
    try {
      // Obtener TODOS los productos (sin paginación)
      const response = await fetch('/api/inventory?noPagination=true');
      const data = await response.json();
      const allItems: InventoryItem[] = data.items || [];
      
      if (allItems.length === 0) {
        toast({ title: 'Sin datos', description: 'No hay productos para generar el PDF', variant: 'destructive' });
        return;
      }

      const cfg = pdfConfig;
      const fecha = new Date().toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' });
      
      // Calcular totales
      const totalProductos = allItems.length;
      const totalUnidades = allItems.reduce((acc, item) => acc + item.cantidad, 0);
      const totalCosto = allItems.reduce((acc, item) => acc + (item.cantidad * item.costo), 0);
      const totalVenta = allItems.reduce((acc, item) => acc + (item.cantidad * item.precio_venta), 0);
      
      // Función para ajustar color
      const adjustColor = (color: string, amount: number): string => {
        const hex = color.replace('#', '');
        const r = Math.min(255, Math.max(0, parseInt(hex.substring(0, 2), 16) + amount));
        const g = Math.min(255, Math.max(0, parseInt(hex.substring(2, 4), 16) + amount));
        const b = Math.min(255, Math.max(0, parseInt(hex.substring(4, 6), 16) + amount));
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      };
      
      // Columnas dinámicas
      let columnas = '<th style="padding: 10px 8px; text-align: left; font-size: 9pt;">Marca</th><th style="padding: 10px 8px; text-align: left; font-size: 9pt;">Amperaje</th><th style="padding: 10px 8px; text-align: center; font-size: 9pt;">Cant.</th>';
      if (cfg.mostrarCosto) columnas += '<th style="padding: 10px 8px; text-align: right; font-size: 9pt;">Costo Unit.</th>';
      if (cfg.mostrarPrecioVenta) columnas += '<th style="padding: 10px 8px; text-align: right; font-size: 9pt;">Precio</th>';
      if (cfg.mostrarTotales && cfg.mostrarCosto) columnas += '<th style="padding: 10px 8px; text-align: right; font-size: 9pt;">Costo Total</th>';
      if (cfg.mostrarTotales && cfg.mostrarPrecioVenta) columnas += '<th style="padding: 10px 8px; text-align: right; font-size: 9pt;">Venta Total</th>';
      
      // Generar filas
      const filas = allItems.map((item, i) => `
        <tr style="background-color: ${i % 2 === 0 ? '#ffffff' : '#f8f9fa'};">
          <td style="padding: 6px 8px; border-bottom: 1px solid #e9ecef; font-size: 9pt;">${item.marca}</td>
          <td style="padding: 6px 8px; border-bottom: 1px solid #e9ecef; font-size: 9pt;">${item.amperaje}</td>
          <td style="padding: 6px 8px; border-bottom: 1px solid #e9ecef; text-align: center; font-size: 9pt;">
            <span style="background: ${item.cantidad > 0 ? '#dcfce7' : '#fee2e2'}; color: ${item.cantidad > 0 ? '#166534' : '#991b1b'}; padding: 2px 6px; border-radius: 3px; font-weight: 600;">
              ${item.cantidad}
            </span>
          </td>
          ${cfg.mostrarCosto ? `<td style="padding: 6px 8px; border-bottom: 1px solid #e9ecef; text-align: right; font-size: 9pt;">Bs. ${item.costo.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</td>` : ''}
          ${cfg.mostrarPrecioVenta ? `<td style="padding: 6px 8px; border-bottom: 1px solid #e9ecef; text-align: right; font-size: 9pt;">Bs. ${item.precio_venta.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</td>` : ''}
          ${cfg.mostrarTotales && cfg.mostrarCosto ? `<td style="padding: 6px 8px; border-bottom: 1px solid #e9ecef; text-align: right; font-size: 9pt; font-weight: 500;">Bs. ${(item.cantidad * item.costo).toLocaleString('es-BO', { minimumFractionDigits: 2 })}</td>` : ''}
          ${cfg.mostrarTotales && cfg.mostrarPrecioVenta ? `<td style="padding: 6px 8px; border-bottom: 1px solid #e9ecef; text-align: right; font-size: 9pt; font-weight: 500;">Bs. ${(item.cantidad * item.precio_venta).toLocaleString('es-BO', { minimumFractionDigits: 2 })}</td>` : ''}
        </tr>
      `).join('');
      
      const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${cfg.titulo}</title>
  <style>
    @page { size: letter; margin: 15mm; }
    @media print { html, body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, sans-serif; font-size: 9pt; color: #333; line-height: 1.3; }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 10px;
      border-bottom: 2px solid ${cfg.colorPrincipal};
      margin-bottom: 15px;
    }
    .header-left { display: flex; align-items: center; gap: 10px; }
    .logo-placeholder {
      width: 40px; height: 40px;
      background: linear-gradient(135deg, ${cfg.colorPrincipal} 0%, ${adjustColor(cfg.colorPrincipal, 40)} 100%);
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      color: white; font-size: 16px; font-weight: bold;
    }
    .company-name { font-size: 14pt; font-weight: 700; color: ${cfg.colorPrincipal}; }
    .doc-title { font-size: 9pt; color: #666; }
    .header-right { text-align: right; }
    .fecha { font-size: 9pt; color: #666; }
    
    .stats-row {
      display: flex;
      justify-content: space-around;
      margin-bottom: 15px;
      padding: 10px;
      background: linear-gradient(135deg, ${adjustColor(cfg.colorPrincipal, 80)} 0%, ${adjustColor(cfg.colorPrincipal, 100)} 100%);
      border-radius: 6px;
      border-left: 4px solid ${cfg.colorPrincipal};
    }
    .stat-item { text-align: center; }
    .stat-value { font-size: 12pt; font-weight: 700; color: ${cfg.colorPrincipal}; }
    .stat-label { font-size: 8pt; color: #666; }
    
    table { width: 100%; border-collapse: collapse; }
    thead { 
      background: linear-gradient(135deg, ${cfg.colorPrincipal} 0%, ${adjustColor(cfg.colorPrincipal, 30)} 100%); 
      color: white;
    }
    thead th { font-weight: 600; }
    tbody tr:hover { background-color: #f0f9ff !important; }
    
    .footer {
      margin-top: 15px;
      padding-top: 8px;
      border-top: 1px solid #e9ecef;
      text-align: center;
      font-size: 8pt;
      color: #666;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div class="header-left">
      ${cfg.mostrarLogo ? `<div class="logo-placeholder">${cfg.empresa.substring(0, 2).toUpperCase()}</div>` : ''}
      <div>
        <div class="company-name">${cfg.empresa}</div>
        <div class="doc-title">${cfg.titulo}</div>
      </div>
    </div>
    <div class="header-right">
      ${cfg.mostrarFecha ? `<div class="fecha">${fecha}</div>` : ''}
    </div>
  </div>
  
  <!-- Resumen -->
  <div class="stats-row">
    <div class="stat-item"><div class="stat-value">${totalProductos}</div><div class="stat-label">Productos</div></div>
    <div class="stat-item"><div class="stat-value">${totalUnidades.toLocaleString('es-BO')}</div><div class="stat-label">Unidades</div></div>
    ${cfg.mostrarCosto ? `<div class="stat-item"><div class="stat-value">Bs. ${totalCosto.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</div><div class="stat-label">Costo Total</div></div>` : ''}
    ${cfg.mostrarPrecioVenta ? `<div class="stat-item"><div class="stat-value">Bs. ${totalVenta.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</div><div class="stat-label">Valor Venta</div></div>` : ''}
  </div>
  
  <!-- Tabla -->
  <table>
    <thead><tr>${columnas}</tr></thead>
    <tbody>${filas}</tbody>
  </table>
  
  <!-- Footer -->
  <div class="footer">
    ${cfg.empresa} | ${cfg.subtitulo} | Total: ${totalProductos} productos, ${totalUnidades.toLocaleString('es-BO')} unidades
  </div>
</body>
</html>`;

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast({ title: 'Error', description: 'No se pudo abrir la ventana de impresión', variant: 'destructive' });
        return;
      }
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => printWindow.print();
      
    } catch (error) {
      console.error('Error generando PDF:', error);
      toast({ title: 'Error', description: 'Error al generar el PDF', variant: 'destructive' });
    }
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
            <Button variant="outline" asChild disabled={isAnalyzing}>
              <span>
                {isAnalyzing ? (
                  <><div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" /> Analizando...</>
                ) : (
                  <><Upload className="mr-2 h-4 w-4" /> Importar</>
                )}
              </span>
            </Button>
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} disabled={isAnalyzing} />
          </label>
          <Button variant="outline" onClick={handleExport} disabled={items.length === 0}>
            <Download className="mr-2 h-4 w-4" /> Exportar
          </Button>
          <Button variant="outline" onClick={generatePDF} disabled={items.length === 0}>
            <FileText className="mr-2 h-4 w-4" /> PDF
          </Button>
          <Button variant="outline" size="icon" onClick={() => setPdfConfigOpen(true)} title="Configurar PDF">
            <Settings className="h-4 w-4" />
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
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Productos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-xl sm:text-2xl font-bold">{stats.productos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Unidades Totales</CardTitle>
            <Boxes className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-xl sm:text-2xl font-bold">{stats.unidadesTotales}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Costo Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-lg sm:text-2xl font-bold">{formatCurrency(stats.costoTotal)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Valor de Venta</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-lg sm:text-2xl font-bold">{formatCurrency(stats.valorVenta)}</div>
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
            <Select value={filterMarca} onValueChange={setFilterMarca}>
              <SelectTrigger>
                <SelectValue placeholder="Todas las marcas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Todas las marcas</SelectItem>
                {marcasOptions.map((marca) => (
                  <SelectItem key={marca} value={marca}>{marca}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterAmperaje} onValueChange={setFilterAmperaje} disabled={!filterMarca || filterMarca === '_all'}>
              <SelectTrigger>
                <SelectValue placeholder={filterMarca && filterMarca !== '_all' ? "Todos los amperajes" : "Seleccione marca"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Todos los amperajes</SelectItem>
                {amperajesOptions.map((amp) => (
                  <SelectItem key={amp} value={amp}>{amp}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={cantidadOp} onValueChange={setCantidadOp}>
              <SelectTrigger>
                <SelectValue placeholder="Cantidad..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Sin filtro</SelectItem>
                <SelectItem value="eq">=  Igual a</SelectItem>
                <SelectItem value="gt">&gt;  Mayor que</SelectItem>
                <SelectItem value="lt">&lt;  Menor que</SelectItem>
                <SelectItem value="gte">≥  Mayor o igual</SelectItem>
                <SelectItem value="lte">≤  Menor o igual</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Valor"
                value={cantidadVal}
                onChange={(e) => setCantidadVal(e.target.value)}
                disabled={!cantidadOp || cantidadOp === '_none'}
              />
              {(search || (filterMarca && filterMarca !== '_all') || (filterAmperaje && filterAmperaje !== '_all') || (cantidadOp && cantidadOp !== '_none')) && (
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
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {stats.productos === 0 ? 'No hay productos en el inventario' : 'No se encontraron productos con los filtros aplicados'}
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
      <Dialog open={addDialogOpen} onOpenChange={(open) => {
        setAddDialogOpen(open);
        if (!open) {
          setExistingProduct(null);
          setAddMode('new');
          setFormData({ marca: '', amperaje: '', cantidad: '', costo: '', precioVenta: '' });
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {addMode === 'restock' ? (
                <>
                  <RefreshCw className="h-5 w-5 text-blue-500" />
                  Reabastecer Producto
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 text-green-500" />
                  Agregar Producto
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {addMode === 'restock' 
                ? 'Producto existente detectado. La cantidad se sumará al stock actual.'
                : 'Ingresa los datos del nuevo producto'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Marca</Label>
                <Input 
                  placeholder="Ingresar Marca" 
                  value={formData.marca} 
                  onChange={(e) => setFormData({ ...formData, marca: e.target.value })} 
                />
              </div>
              <div className="space-y-2">
                <Label>Amperaje</Label>
                <div className="relative">
                  <Input 
                    placeholder="Ingresar Amperaje" 
                    value={formData.amperaje} 
                    onChange={(e) => setFormData({ ...formData, amperaje: e.target.value })} 
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Indicador de producto existente */}
            {existingProduct && addMode === 'restock' && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-blue-500" />
                  <span className="font-medium text-blue-700 dark:text-blue-300">Producto encontrado en inventario</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Stock actual:</span>
                    <p className="font-bold text-lg">{existingProduct.cantidad}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Costo actual:</span>
                    <p className="font-medium">{formatCurrency(existingProduct.costo)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Precio venta:</span>
                    <p className="font-medium">{formatCurrency(existingProduct.precio_venta)}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{addMode === 'restock' ? 'Cantidad a agregar' : 'Cantidad'}</Label>
                <Input 
                  type="number" 
                  placeholder="0" 
                  value={formData.cantidad} 
                  onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })} 
                />
              </div>
              <div className="space-y-2">
                <Label>Costo (Bs.)</Label>
                <Input 
                  type="number" 
                  step="0.01" 
                  placeholder="0.00" 
                  value={formData.costo} 
                  onChange={(e) => setFormData({ ...formData, costo: e.target.value })} 
                />
              </div>
              <div className="space-y-2">
                <Label>Precio Venta (Bs.)</Label>
                <Input 
                  type="number" 
                  step="0.01" 
                  placeholder="0.00" 
                  value={formData.precioVenta} 
                  onChange={(e) => setFormData({ ...formData, precioVenta: e.target.value })} 
                />
              </div>
            </div>
            
            {/* Preview del resultado */}
            {formData.cantidad && (
              <div className={`p-3 rounded-lg ${addMode === 'restock' ? 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800' : 'bg-muted'}`}>
                {addMode === 'restock' && existingProduct ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                      <ArrowRight className="h-4 w-4" />
                      <span className="font-medium">Resultado después del reabastecimiento:</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Stock final:</span>
                        <p className="font-bold text-lg text-green-600 dark:text-green-400">
                          {existingProduct.cantidad + parseInt(formData.cantidad || '0')} unidades
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Costo Total:</span>
                        <p className="font-bold">{formatCurrency((existingProduct.cantidad + parseInt(formData.cantidad || '0')) * parseFloat(formData.costo || '0'))}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Valor Venta:</span>
                        <p className="font-bold">{formatCurrency((existingProduct.cantidad + parseInt(formData.cantidad || '0')) * parseFloat(formData.precioVenta || '0'))}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-muted-foreground">Costo Total:</span>
                      <p className="font-bold">{formatCurrency(parseFloat(formData.cantidad || '0') * parseFloat(formData.costo || '0'))}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Valor Venta:</span>
                      <p className="font-bold">{formatCurrency(parseFloat(formData.cantidad || '0') * parseFloat(formData.precioVenta || '0'))}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancelar</Button>
            <Button 
              onClick={handleAdd} 
              disabled={isSubmitting || !formData.marca || !formData.amperaje || !formData.cantidad}
              className={addMode === 'restock' ? 'bg-blue-600 hover:bg-blue-700' : ''}
            >
              {isSubmitting ? 'Guardando...' : addMode === 'restock' ? 'Reabastecer' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Ver */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalle del Producto</DialogTitle>
            <DialogDescription>Información completa del producto seleccionado</DialogDescription>
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

      {/* Dialog Importación Inteligente */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Importación Inteligente</DialogTitle>
            <DialogDescription>
              Analiza tu archivo y decide cómo importar los productos
            </DialogDescription>
          </DialogHeader>
          
          {importAnalysis && (
            <div className="space-y-4">
              {/* Resumen */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="text-3xl font-bold text-primary">{importAnalysis.total}</div>
                    <p className="text-sm text-muted-foreground">Total en archivo</p>
                  </CardContent>
                </Card>
                <Card className="border-green-200 dark:border-green-800">
                  <CardContent className="pt-4 text-center">
                    <div className="text-3xl font-bold text-green-500">{importAnalysis.new}</div>
                    <p className="text-sm text-muted-foreground">Productos Nuevos</p>
                  </CardContent>
                </Card>
                <Card className="border-blue-200 dark:border-blue-800">
                  <CardContent className="pt-4 text-center">
                    <div className="text-3xl font-bold text-blue-600">{importAnalysis.existing}</div>
                    <p className="text-sm text-muted-foreground">Ya Existentes</p>
                  </CardContent>
                </Card>
              </div>

              {/* Opciones para productos existentes */}
              {importAnalysis.existing > 0 && (
                <div className="space-y-4 p-4 bg-muted rounded-lg">
                  <h4 className="font-medium">Opciones para {importAnalysis.existing} productos existentes:</h4>
                  
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>¿Qué hacer con la cantidad?</Label>
                      <Select value={importUpdateMode} onValueChange={setImportUpdateMode}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sum">➕ Sumar al stock actual (reabastecer)</SelectItem>
                          <SelectItem value="replace">🔄 Reemplazar cantidad existente</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {importUpdateMode === 'sum' 
                          ? 'Ejemplo: Si tienes 10 y el Excel dice 5, tendrás 15'
                          : 'Ejemplo: Si tienes 10 y el Excel dice 5, tendrás 5'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>¿Actualizar precios del Excel?</Label>
                        <p className="text-xs text-muted-foreground">
                          {importUpdatePrices 
                            ? 'Los precios se actualizarán con los del Excel'
                            : 'Los precios existentes se mantendrán'}
                        </p>
                      </div>
                      <Button
                        variant={importUpdatePrices ? "default" : "outline"}
                        size="sm"
                        onClick={() => setImportUpdatePrices(!importUpdatePrices)}
                      >
                        {importUpdatePrices ? 'Sí' : 'No'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Preview de nuevos */}
              {importAnalysis.new > 0 && importAnalysis.newItems?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-green-500">Productos nuevos (preview):</h4>
                  <div className="max-h-40 overflow-y-auto text-sm">
                    <table className="w-full text-xs">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          <th className="text-left p-1">Marca</th>
                          <th className="text-left p-1">Amperaje</th>
                          <th className="text-right p-1">Cant.</th>
                          <th className="text-right p-1">Costo</th>
                          <th className="text-right p-1">P. Venta</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importAnalysis.newItems.map((item: any, i: number) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="p-1 font-medium">{item.marca}</td>
                            <td className="p-1">{item.amperaje}</td>
                            <td className="p-1 text-right">{item.cantidad}</td>
                            <td className="p-1 text-right">{item.costo > 0 ? `Bs. ${item.costo}` : '-'}</td>
                            <td className="p-1 text-right">{item.precio_venta > 0 ? `Bs. ${item.precio_venta}` : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {importAnalysis.new > 10 && (
                      <p className="text-muted-foreground text-center py-1">...y {importAnalysis.new - 10} más</p>
                    )}
                  </div>
                </div>
              )}

              {/* Preview de existentes */}
              {importAnalysis.existing > 0 && importAnalysis.updateItems?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-blue-600">Se actualizarán (preview):</h4>
                  <div className="max-h-40 overflow-y-auto text-sm">
                    <table className="w-full text-xs">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          <th className="text-left p-1">Marca</th>
                          <th className="text-left p-1">Amperaje</th>
                          <th className="text-right p-1">Cantidad</th>
                          {importUpdatePrices && (
                            <>
                              <th className="text-right p-1">Costo</th>
                              <th className="text-right p-1">P. Venta</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {importAnalysis.updateItems.map((item: any, i: number) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="p-1 font-medium">{item.marca}</td>
                            <td className="p-1">{item.amperaje}</td>
                            <td className="p-1 text-right">
                              <span className="text-muted-foreground">{item.existingCantidad}</span>
                              <span className="mx-1">→</span>
                              <span className="text-green-600 font-medium">
                                {importUpdateMode === 'sum' ? item.existingCantidad + item.cantidad : item.cantidad}
                              </span>
                            </td>
                            {importUpdatePrices && (
                              <>
                                <td className="p-1 text-right">
                                  {item.costo > 0 ? (
                                    <>
                                      <span className="text-muted-foreground">{item.existingCosto}</span>
                                      <span className="mx-1">→</span>
                                      <span className="text-orange-500 font-medium">{item.costo}</span>
                                    </>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </td>
                                <td className="p-1 text-right">
                                  {item.precio_venta > 0 ? (
                                    <>
                                      <span className="text-muted-foreground">{item.existingPrecioVenta}</span>
                                      <span className="mx-1">→</span>
                                      <span className="text-orange-500 font-medium">{item.precio_venta}</span>
                                    </>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {importAnalysis.existing > 10 && (
                      <p className="text-muted-foreground text-center py-1">...y {importAnalysis.existing - 10} más</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setImportDialogOpen(false); setImportAnalysis(null); }}>
              Cancelar
            </Button>
            <Button onClick={executeImport} disabled={isSubmitting}>
              {isSubmitting ? 'Importando...' : `Importar ${importAnalysis?.total || 0} productos`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Configuración PDF */}
      <Dialog open={pdfConfigOpen} onOpenChange={setPdfConfigOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurar PDF de Inventario
            </DialogTitle>
            <DialogDescription>
              Personaliza la apariencia del PDF. Esta configuración es exclusiva para el inventario.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="columnas">Columnas</TabsTrigger>
            </TabsList>
            
            <TabsContent value="general" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Nombre de Empresa</Label>
                <Input 
                  value={pdfConfig.empresa} 
                  onChange={(e) => setPdfConfig({...pdfConfig, empresa: e.target.value})}
                  placeholder="NICMAT S.R.L."
                />
              </div>
              
              <div className="space-y-2">
                <Label>Título del PDF</Label>
                <Input 
                  value={pdfConfig.titulo} 
                  onChange={(e) => setPdfConfig({...pdfConfig, titulo: e.target.value})}
                  placeholder="INVENTARIO DE BATERÍAS"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Subtítulo</Label>
                <Input 
                  value={pdfConfig.subtitulo} 
                  onChange={(e) => setPdfConfig({...pdfConfig, subtitulo: e.target.value})}
                  placeholder="Listado completo de productos"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Color Principal</Label>
                <div className="flex gap-2">
                  <Input 
                    type="color"
                    value={pdfConfig.colorPrincipal} 
                    onChange={(e) => setPdfConfig({...pdfConfig, colorPrincipal: e.target.value})}
                    className="w-16 h-10 p-1 cursor-pointer"
                  />
                  <Input 
                    value={pdfConfig.colorPrincipal} 
                    onChange={(e) => setPdfConfig({...pdfConfig, colorPrincipal: e.target.value})}
                    placeholder="#1a5f7a"
                    className="flex-1"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="mostrar-logo">Mostrar Logo/Iniciales</Label>
                <Switch 
                  id="mostrar-logo"
                  checked={pdfConfig.mostrarLogo} 
                  onCheckedChange={(checked) => setPdfConfig({...pdfConfig, mostrarLogo: checked})}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="mostrar-fecha">Mostrar Fecha</Label>
                <Switch 
                  id="mostrar-fecha"
                  checked={pdfConfig.mostrarFecha} 
                  onCheckedChange={(checked) => setPdfConfig({...pdfConfig, mostrarFecha: checked})}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="columnas" className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Selecciona qué columnas mostrar en el PDF del inventario.
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 rounded border">
                  <div>
                    <Label>Costo Unitario</Label>
                    <p className="text-xs text-muted-foreground">Mostrar columna de costo por unidad</p>
                  </div>
                  <Switch 
                    checked={pdfConfig.mostrarCosto} 
                    onCheckedChange={(checked) => setPdfConfig({...pdfConfig, mostrarCosto: checked})}
                  />
                </div>
                
                <div className="flex items-center justify-between p-2 rounded border">
                  <div>
                    <Label>Precio de Venta</Label>
                    <p className="text-xs text-muted-foreground">Mostrar columna de precio de venta</p>
                  </div>
                  <Switch 
                    checked={pdfConfig.mostrarPrecioVenta} 
                    onCheckedChange={(checked) => setPdfConfig({...pdfConfig, mostrarPrecioVenta: checked})}
                  />
                </div>
                
                <div className="flex items-center justify-between p-2 rounded border">
                  <div>
                    <Label>Columnas de Totales</Label>
                    <p className="text-xs text-muted-foreground">Mostrar costo total y venta total por producto</p>
                  </div>
                  <Switch 
                    checked={pdfConfig.mostrarTotales} 
                    onCheckedChange={(checked) => setPdfConfig({...pdfConfig, mostrarTotales: checked})}
                  />
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-xs font-medium mb-2">Vista previa de columnas:</p>
                <div className="flex flex-wrap gap-1 text-xs">
                  <Badge variant="secondary">Marca</Badge>
                  <Badge variant="secondary">Amperaje</Badge>
                  <Badge variant="secondary">Cantidad</Badge>
                  {pdfConfig.mostrarCosto && <Badge>Costo Unit.</Badge>}
                  {pdfConfig.mostrarPrecioVenta && <Badge>Precio Venta</Badge>}
                  {pdfConfig.mostrarTotales && pdfConfig.mostrarCosto && <Badge variant="outline">Costo Total</Badge>}
                  {pdfConfig.mostrarTotales && pdfConfig.mostrarPrecioVenta && <Badge variant="outline">Venta Total</Badge>}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPdfConfigOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={savePdfConfig} disabled={pdfConfigLoading}>
              {pdfConfigLoading ? 'Guardando...' : 'Guardar Configuración'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
