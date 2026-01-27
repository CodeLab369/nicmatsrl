'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Plus, Search, Clock, CheckCircle, ShoppingCart, FileText,
  ChevronLeft, ChevronRight, Eye, Printer, Check, X, Trash2,
  Package, User, Phone, Mail, MapPin, Calendar, AlertCircle,
  Minus, RefreshCw, Settings, Upload, Building2, Hash, Save
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
  Textarea, Separator
} from '@/components/ui';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';

// Cliente Supabase para Realtime
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Producto {
  marca: string;
  amperaje: string;
  cantidad: number;
  precio: number;
  total: number;
}

interface Cotizacion {
  id: string;
  numero: string;
  fecha: string;
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_email: string;
  cliente_direccion: string;
  productos: Producto[];
  total_unidades: number;
  subtotal: number;
  descuento: number;
  total: number;
  estado: string;
  vigencia_dias: number;
  fecha_vencimiento: string;
  terminos: string;
  created_at: string;
}

interface InventoryItem {
  id: string;
  marca: string;
  amperaje: string;
  cantidad: number;
  precio_venta: number;
}

interface Stats {
  pendientes: number;
  aceptadas: number;
  convertidas: number;
  rechazadas: number;
  total: number;
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
  prefijo_cotizacion: string;
  siguiente_numero: number;
  pie_empresa: string;
  pie_agradecimiento: string;
  pie_contacto: string;
  color_principal: string;
}

const defaultConfig: EmpresaConfig = {
  nombre: 'NICMAT S.R.L.',
  nit: '',
  direccion: '',
  ciudad: 'Bolivia',
  telefono_principal: '',
  telefono_secundario: '',
  telefono_adicional: '',
  email: '',
  logo: null,
  prefijo_cotizacion: 'COT',
  siguiente_numero: 1,
  pie_empresa: 'NICMAT S.R.L.',
  pie_agradecimiento: '¡Gracias por su preferencia!',
  pie_contacto: '',
  color_principal: '#1a5f7a'
};

export default function CotizacionesPage() {
  // Estados principales
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [stats, setStats] = useState<Stats>({ pendientes: 0, aceptadas: 0, convertidas: 0, rechazadas: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('_all');
  
  // Configuración de empresa
  const [empresaConfig, setEmpresaConfig] = useState<EmpresaConfig>(defaultConfig);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [configForm, setConfigForm] = useState<EmpresaConfig>(defaultConfig);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  
  // Inventario
  const [inventario, setInventario] = useState<InventoryItem[]>([]);
  const [marcasOptions, setMarcasOptions] = useState<string[]>([]);
  const [amperajesOptions, setAmperajesOptions] = useState<string[]>([]);
  
  // Formulario nueva cotización
  const [showForm, setShowForm] = useState(false);
  const [clienteData, setClienteData] = useState({
    nombre: '', telefono: '', email: '', direccion: ''
  });
  const [productosAgregados, setProductosAgregados] = useState<Producto[]>([]);
  const [productoActual, setProductoActual] = useState({
    marca: '', amperaje: '', cantidad: '', precio: ''
  });
  const [stockDisponible, setStockDisponible] = useState<number | null>(null);
  const [descuento, setDescuento] = useState('0');
  const [vigenciaDias, setVigenciaDias] = useState('7');
  const [terminos, setTerminos] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Dialogs
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCotizacion, setSelectedCotizacion] = useState<Cotizacion | null>(null);
  
  // Realtime
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  
  const { toast } = useToast();

  // Fetch configuración de empresa
  const fetchEmpresaConfig = useCallback(async () => {
    try {
      const response = await fetch('/api/empresa-config');
      const data = await response.json();
      if (data.config) {
        setEmpresaConfig(data.config);
        setConfigForm(data.config);
      }
    } catch (error) {
      console.error('Error fetching config:', error);
    }
  }, []);

  // Fetch cotizaciones
  const fetchCotizaciones = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search,
        estado: filterEstado
      });
      
      const response = await fetch(`/api/cotizaciones?${params}`);
      const data = await response.json();
      
      setCotizaciones(data.cotizaciones || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, filterEstado]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/cotizaciones?getStats=true');
      const data = await response.json();
      if (data.stats) setStats(data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  // Fetch inventario para dropdown
  const fetchInventario = useCallback(async () => {
    try {
      const response = await fetch('/api/inventory?limit=1000');
      const data = await response.json();
      setInventario(data.items || []);
      
      // Extraer marcas únicas
      const marcas = Array.from(new Set((data.items || []).map((i: InventoryItem) => i.marca)));
      setMarcasOptions(marcas as string[]);
    } catch (error) {
      console.error('Error:', error);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchCotizaciones();
    fetchStats();
    fetchInventario();
    fetchEmpresaConfig();
  }, [fetchCotizaciones, fetchStats, fetchInventario, fetchEmpresaConfig]);

  // Refs para callbacks (evita recrear el canal)
  const fetchCotizacionesRef = useRef(fetchCotizaciones);
  const fetchStatsRef = useRef(fetchStats);
  const fetchEmpresaConfigRef = useRef(fetchEmpresaConfig);
  
  useEffect(() => {
    fetchCotizacionesRef.current = fetchCotizaciones;
    fetchStatsRef.current = fetchStats;
    fetchEmpresaConfigRef.current = fetchEmpresaConfig;
  }, [fetchCotizaciones, fetchStats, fetchEmpresaConfig]);

  // Realtime subscription - estable
  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 10;
    let isSubscribed = false;

    const setupChannel = () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      const channel = supabase
        .channel('cotizaciones-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'cotizaciones' }, () => {
          fetchCotizacionesRef.current();
          fetchStatsRef.current();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'empresa_config' }, () => {
          fetchEmpresaConfigRef.current();
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            isSubscribed = true;
            reconnectAttempts = 0;
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setIsConnected(false);
            isSubscribed = false;
            if (reconnectAttempts < maxReconnectAttempts) {
              const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
              reconnectTimeout = setTimeout(() => {
                reconnectAttempts++;
                setupChannel();
              }, delay);
            }
          }
        });

      channelRef.current = channel;
    };

    setupChannel();

    // Handlers para móviles - solo reconectar si no está conectado
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isSubscribed) {
        reconnectAttempts = 0;
        setupChannel();
      }
      if (document.visibilityState === 'visible') {
        fetchCotizacionesRef.current();
        fetchStatsRef.current();
      }
    };

    const handleOnline = () => {
      if (!isSubscribed) {
        reconnectAttempts = 0;
        setupChannel();
      }
      fetchCotizacionesRef.current();
      fetchStatsRef.current();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, []); // Sin dependencias - solo se ejecuta una vez

  // Actualizar amperajes cuando cambia la marca
  useEffect(() => {
    if (productoActual.marca) {
      const amperajes = inventario
        .filter(i => i.marca === productoActual.marca)
        .map(i => i.amperaje);
      setAmperajesOptions(Array.from(new Set(amperajes)));
      setProductoActual(prev => ({ ...prev, amperaje: '', cantidad: '', precio: '' }));
      setStockDisponible(null);
    }
  }, [productoActual.marca, inventario]);

  // Actualizar stock y precio cuando cambia el amperaje
  useEffect(() => {
    if (productoActual.marca && productoActual.amperaje) {
      const producto = inventario.find(
        i => i.marca === productoActual.marca && i.amperaje === productoActual.amperaje
      );
      if (producto) {
        setStockDisponible(producto.cantidad);
        setProductoActual(prev => ({ ...prev, precio: producto.precio_venta.toString() }));
      }
    }
  }, [productoActual.marca, productoActual.amperaje, inventario]);

  // Resetear página al cambiar filtros
  useEffect(() => {
    setPage(1);
  }, [search, filterEstado, limit]);

  // Agregar producto a la lista
  const handleAgregarProducto = () => {
    const cantidad = parseInt(productoActual.cantidad);
    const precio = parseFloat(productoActual.precio);
    
    if (!productoActual.marca || !productoActual.amperaje || !cantidad || !precio) {
      toast({ title: 'Error', description: 'Completa todos los campos del producto', variant: 'destructive' });
      return;
    }
    
    if (stockDisponible !== null && cantidad > stockDisponible) {
      toast({ title: 'Error', description: 'La cantidad excede el stock disponible', variant: 'destructive' });
      return;
    }
    
    // Verificar si ya existe el producto
    const existeIndex = productosAgregados.findIndex(
      p => p.marca === productoActual.marca && p.amperaje === productoActual.amperaje
    );
    
    if (existeIndex >= 0) {
      // Actualizar cantidad existente
      const nuevosProductos = [...productosAgregados];
      nuevosProductos[existeIndex].cantidad += cantidad;
      nuevosProductos[existeIndex].total = nuevosProductos[existeIndex].cantidad * nuevosProductos[existeIndex].precio;
      setProductosAgregados(nuevosProductos);
    } else {
      // Agregar nuevo
      setProductosAgregados([...productosAgregados, {
        marca: productoActual.marca,
        amperaje: productoActual.amperaje,
        cantidad,
        precio,
        total: cantidad * precio
      }]);
    }
    
    // Limpiar
    setProductoActual({ marca: '', amperaje: '', cantidad: '', precio: '' });
    setStockDisponible(null);
  };

  // Eliminar producto de la lista
  const handleEliminarProducto = (index: number) => {
    setProductosAgregados(productosAgregados.filter((_, i) => i !== index));
  };

  // Calcular totales
  const totalUnidades = productosAgregados.reduce((sum, p) => sum + p.cantidad, 0);
  const subtotal = productosAgregados.reduce((sum, p) => sum + p.total, 0);
  const descuentoNum = parseFloat(descuento) || 0;
  const totalFinal = subtotal - descuentoNum;

  // Limpiar formulario
  const handleLimpiar = () => {
    setClienteData({ nombre: '', telefono: '', email: '', direccion: '' });
    setProductosAgregados([]);
    setDescuento('0');
    setVigenciaDias('7');
    setTerminos('');
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
      
      const data = await response.json();
      setEmpresaConfig(data.config);
      setConfigDialogOpen(false);
      toast({ title: 'Éxito', description: 'Configuración guardada correctamente', variant: 'success' });
    } catch {
      toast({ title: 'Error', description: 'No se pudo guardar la configuración', variant: 'destructive' });
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Manejar subida de logo
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validar tamaño (max 500KB)
    if (file.size > 500 * 1024) {
      toast({ title: 'Error', description: 'El logo debe ser menor a 500KB', variant: 'destructive' });
      return;
    }
    
    // Validar tipo
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Error', description: 'Solo se permiten imágenes', variant: 'destructive' });
      return;
    }
    
    const reader = new FileReader();
    reader.onload = () => {
      setConfigForm(prev => ({ ...prev, logo: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  // Remover logo
  const handleRemoveLogo = () => {
    setConfigForm(prev => ({ ...prev, logo: null }));
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  // Crear cotización
  const handleCrearCotizacion = async () => {
    if (productosAgregados.length === 0) {
      toast({ title: 'Error', description: 'Agrega al menos un producto', variant: 'destructive' });
      return;
    }
    
    try {
      setIsSubmitting(true);
      const response = await fetch('/api/cotizaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_nombre: clienteData.nombre,
          cliente_telefono: clienteData.telefono,
          cliente_email: clienteData.email,
          cliente_direccion: clienteData.direccion,
          productos: productosAgregados,
          descuento: descuentoNum,
          vigencia_dias: parseInt(vigenciaDias),
          terminos
        })
      });
      
      if (!response.ok) throw new Error();
      
      toast({ title: 'Éxito', description: 'Cotización creada correctamente', variant: 'success' });
      handleLimpiar();
      setShowForm(false);
      fetchCotizaciones();
      fetchStats();
    } catch {
      toast({ title: 'Error', description: 'No se pudo crear la cotización', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cambiar estado
  const handleCambiarEstado = async (id: string, nuevoEstado: string) => {
    try {
      const response = await fetch('/api/cotizaciones', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, estado: nuevoEstado })
      });
      
      if (!response.ok) throw new Error();
      
      const mensajes: Record<string, string> = {
        aceptada: 'Cotización aceptada',
        rechazada: 'Cotización rechazada',
        convertida: 'Cotización convertida a venta'
      };
      
      toast({ title: 'Éxito', description: mensajes[nuevoEstado] || 'Estado actualizado', variant: 'success' });
      fetchCotizaciones();
      fetchStats();
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar el estado', variant: 'destructive' });
    }
  };

  // Eliminar cotización
  const handleEliminar = async () => {
    if (!selectedCotizacion) return;
    
    try {
      const response = await fetch(`/api/cotizaciones?id=${selectedCotizacion.id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error();
      
      toast({ title: 'Éxito', description: 'Cotización eliminada', variant: 'success' });
      setDeleteDialogOpen(false);
      setSelectedCotizacion(null);
      fetchCotizaciones();
      fetchStats();
    } catch {
      toast({ title: 'Error', description: 'No se pudo eliminar', variant: 'destructive' });
    }
  };

  // Imprimir/PDF
  const handlePrint = (cotizacion: Cotizacion) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = generatePDFHTML(cotizacion);
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  // Generar HTML para PDF
  const generatePDFHTML = (cot: Cotizacion) => {
    const fechaFormat = new Date(cot.fecha).toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' });
    const venceFormat = new Date(cot.fecha_vencimiento).toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' });
    
    // Usar configuración de empresa
    const cfg = empresaConfig;
    
    // Color principal configurable
    const colorPrincipal = cfg.color_principal || '#1a5f7a';
    
    // Función para crear gradiente con el color
    const gradiente = `linear-gradient(135deg, ${colorPrincipal} 0%, ${adjustColor(colorPrincipal, 40)} 100%)`;
    
    // Función para aclarar/oscurecer color
    function adjustColor(color: string, amount: number): string {
      const hex = color.replace('#', '');
      const r = Math.min(255, parseInt(hex.substring(0, 2), 16) + amount);
      const g = Math.min(255, parseInt(hex.substring(2, 4), 16) + amount);
      const b = Math.min(255, parseInt(hex.substring(4, 6), 16) + amount);
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
    
    // Logo HTML
    const logoHTML = cfg.logo 
      ? `<img src="${cfg.logo}" alt="Logo" style="width: 70px; height: 70px; object-fit: contain; border-radius: 8px;">`
      : `<div class="company-logo-placeholder">${cfg.nombre.substring(0, 2).toUpperCase()}</div>`;
    
    // Teléfonos
    const telefonos = [cfg.telefono_principal, cfg.telefono_secundario, cfg.telefono_adicional].filter(Boolean).join(' | ');
    
    const productosHTML = cot.productos.map((p, i) => `
      <tr style="background-color: ${i % 2 === 0 ? '#ffffff' : '#f8f9fa'};">
        <td style="padding: 12px; border-bottom: 1px solid #e9ecef; text-align: center;">${i + 1}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e9ecef; font-weight: 500;">${p.marca}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e9ecef;">${p.amperaje}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e9ecef; text-align: center;">${p.cantidad}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e9ecef; text-align: right;">Bs. ${p.precio.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e9ecef; text-align: right; font-weight: 600;">Bs. ${p.total.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</td>
      </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Cotización ${cot.numero}</title>
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
    .quote-info {
      text-align: right;
    }
    .quote-number {
      background: var(--gradiente);
      color: white;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 14pt;
      font-weight: 700;
      margin-bottom: 10px;
      display: inline-block;
    }
    .quote-date {
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
    .client-box {
      background: #f8f9fa;
      border-left: 4px solid var(--color-principal);
      padding: 15px 20px;
      margin-bottom: 25px;
      border-radius: 0 8px 8px 0;
    }
    .client-title {
      font-size: 10pt;
      font-weight: 600;
      color: var(--color-principal);
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .client-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 30px;
    }
    .client-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 10pt;
    }
    .client-item label {
      font-weight: 600;
      color: var(--color-principal);
      white-space: nowrap;
    }
    .client-item label::after {
      content: ':';
    }
    .client-item span {
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
    .validity-box {
      background: #fff8e6;
      border: 1px solid #ffc107;
      border-radius: 8px;
      padding: 12px 20px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .validity-icon {
      font-size: 18pt;
    }
    .validity-text {
      font-size: 10pt;
      color: #856404;
    }
    .validity-text strong {
      color: #664d03;
    }
    .terms-box {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 15px 20px;
      margin-bottom: 20px;
    }
    .terms-title {
      font-size: 10pt;
      font-weight: 600;
      color: var(--color-principal);
      margin-bottom: 8px;
      text-transform: uppercase;
    }
    .terms-content {
      font-size: 9pt;
      color: #666;
      white-space: pre-line;
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
    /* La tabla puede dividirse entre páginas */
    table {
      page-break-inside: auto;
    }
    /* Pero el encabezado se repite en cada página */
    thead {
      display: table-header-group;
    }
    /* Evitar cortar filas a la mitad */
    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
    /* El tbody puede dividirse */
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
      <div class="quote-info">
        <div class="quote-number">${cot.numero}</div>
        <div class="quote-date">
          <strong>Fecha:</strong> ${fechaFormat}<br>
          <strong>Válida hasta:</strong> ${venceFormat}
        </div>
      </div>
    </div>

    <!-- Título -->
    <div class="title">COTIZACIÓN</div>

    <!-- Datos del cliente -->
    <div class="client-box page-break">
      <div class="client-title">Datos del Cliente</div>
      <div class="client-grid">
        <div class="client-item">
          <label>Nombre</label>
          <span>${cot.cliente_nombre || 'No especificado'}</span>
        </div>
        <div class="client-item">
          <label>Teléfono</label>
          <span>${cot.cliente_telefono || '-'}</span>
        </div>
        <div class="client-item">
          <label>Email</label>
          <span>${cot.cliente_email || '-'}</span>
        </div>
        <div class="client-item">
          <label>Dirección</label>
          <span>${cot.cliente_direccion || '-'}</span>
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
          <th style="width: 18%; text-align: right;">Total</th>
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
          <span class="total-label">Total Baterías</span>
          <span class="total-value">${cot.total_unidades} unidades</span>
        </div>
        <div class="total-row">
          <span class="total-label">Subtotal</span>
          <span class="total-value">Bs. ${cot.subtotal.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</span>
        </div>
        ${cot.descuento > 0 ? `
        <div class="total-row">
          <span class="total-label">Descuento</span>
          <span class="total-value" style="color: #dc3545;">- Bs. ${cot.descuento.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</span>
        </div>
        ` : ''}
        <div class="total-row highlight">
          <span class="total-label">TOTAL</span>
          <span class="total-value">Bs. ${cot.total.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
    </div>

    <!-- Vigencia -->
    <div class="validity-box page-break">
      <span class="validity-icon">⏰</span>
      <span class="validity-text">
        Esta cotización tiene una vigencia de <strong>${cot.vigencia_dias} días</strong> a partir de la fecha de emisión.
        Válida hasta el <strong>${venceFormat}</strong>.
      </span>
    </div>

    ${cot.terminos ? `
    <!-- Términos -->
    <div class="terms-box page-break">
      <div class="terms-title">Términos y Condiciones</div>
      <div class="terms-content">${cot.terminos}</div>
    </div>
    ` : ''}

    <!-- Footer -->
    <div class="footer page-break">
      <div class="footer-company">${cfg.pie_empresa || cfg.nombre}</div>
      <div class="footer-thanks">${cfg.pie_agradecimiento || '¡Gracias por su preferencia!'}</div>
      <div class="footer-contact">${cfg.pie_contacto || (telefonos ? `Para consultas: ${telefonos}${cfg.email ? ' | ' + cfg.email : ''}` : '')}</div>
    </div>
  </div>
</body>
</html>
    `;
  };

  // Formatear fecha
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Badge de estado
  const getEstadoBadge = (estado: string) => {
    const config: Record<string, { color: string; label: string }> = {
      pendiente: { color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30', label: 'Pendiente' },
      aceptada: { color: 'bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30', label: 'Aceptada' },
      convertida: { color: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30', label: 'Convertida a Venta' },
      rechazada: { color: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30', label: 'Rechazada' },
    };
    const { color, label } = config[estado] || config.pendiente;
    return <Badge className={`${color} border`}>{label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Cotizaciones</h1>
          <p className="text-muted-foreground">Crea y gestiona cotizaciones para tus clientes</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 text-xs ${isConnected ? 'text-green-500' : 'text-muted-foreground'}`}>
            {isConnected ? <RefreshCw className="h-3 w-3" /> : <RefreshCw className="h-3 w-3" />}
            {isConnected ? 'Conectado' : 'Sin conexión'}
          </div>
          <Button variant="outline" onClick={() => { setConfigForm(empresaConfig); setConfigDialogOpen(true); }}>
            <Settings className="mr-2 h-4 w-4" />
            Configurar
          </Button>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
            {showForm ? 'Cancelar' : 'Nueva Cotización'}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="shadow-soft border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{stats.pendientes}</p>
                <p className="text-sm text-muted-foreground">Pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.aceptadas}</p>
                <p className="text-sm text-muted-foreground">Aceptadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <ShoppingCart className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.convertidas}</p>
                <p className="text-sm text-muted-foreground">Convertidas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft border-l-4 border-l-muted-foreground">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Formulario Nueva Cotización */}
      {showForm && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Formulario principal */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>Nueva Cotización</CardTitle>
                <p className="text-sm text-muted-foreground">Selecciona productos del inventario</p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Datos del cliente */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Datos del Cliente</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label>Nombre</Label>
                      <Input 
                        placeholder="Nombre del cliente"
                        value={clienteData.nombre}
                        onChange={(e) => setClienteData({ ...clienteData, nombre: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Teléfono</Label>
                      <Input 
                        placeholder="Teléfono"
                        value={clienteData.telefono}
                        onChange={(e) => setClienteData({ ...clienteData, telefono: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input 
                        type="email"
                        placeholder="Email"
                        value={clienteData.email}
                        onChange={(e) => setClienteData({ ...clienteData, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Dirección</Label>
                      <Input 
                        placeholder="Dirección del cliente"
                        value={clienteData.direccion}
                        onChange={(e) => setClienteData({ ...clienteData, direccion: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Agregar productos */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Agregar Productos</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
                    <div>
                      <Label>Marca *</Label>
                      <Select value={productoActual.marca} onValueChange={(v) => setProductoActual({ ...productoActual, marca: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          {marcasOptions.map((m) => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Amperaje *</Label>
                      <Select 
                        value={productoActual.amperaje} 
                        onValueChange={(v) => setProductoActual({ ...productoActual, amperaje: v })}
                        disabled={!productoActual.marca}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          {amperajesOptions.map((a) => (
                            <SelectItem key={a} value={a}>{a}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {stockDisponible !== null && (
                        <p className="text-xs text-muted-foreground mt-1">Stock disponible: {stockDisponible}</p>
                      )}
                    </div>
                    <div>
                      <Label>Cantidad *</Label>
                      <Input 
                        type="number"
                        placeholder="Cantidad"
                        value={productoActual.cantidad}
                        onChange={(e) => setProductoActual({ ...productoActual, cantidad: e.target.value })}
                        max={stockDisponible || undefined}
                      />
                    </div>
                    <div>
                      <Label>Precio Venta *</Label>
                      <Input 
                        type="number"
                        step="0.01"
                        placeholder="Precio"
                        value={productoActual.precio}
                        onChange={(e) => setProductoActual({ ...productoActual, precio: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Total</Label>
                      <div className="h-10 px-3 flex items-center bg-muted rounded-md font-semibold text-primary">
                        {formatCurrency((parseFloat(productoActual.cantidad) || 0) * (parseFloat(productoActual.precio) || 0))}
                      </div>
                    </div>
                    <div>
                      <Button 
                        onClick={handleAgregarProducto}
                        disabled={!productoActual.marca || !productoActual.amperaje}
                        className="w-full"
                      >
                        Agregar
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Detalle de productos */}
            <Card className="shadow-soft">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Detalle de la cotización</CardTitle>
                  <span className="text-sm text-muted-foreground">{productosAgregados.length} productos agregados</span>
                </div>
              </CardHeader>
              <CardContent>
                {productosAgregados.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>No hay productos agregados</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 font-medium">Marca</th>
                          <th className="text-left py-2 font-medium">Amperaje</th>
                          <th className="text-center py-2 font-medium">Cantidad</th>
                          <th className="text-right py-2 font-medium">Precio</th>
                          <th className="text-right py-2 font-medium">Total</th>
                          <th className="text-center py-2 font-medium">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productosAgregados.map((p, i) => (
                          <tr key={i} className="border-b">
                            <td className="py-3 font-medium">{p.marca}</td>
                            <td className="py-3">{p.amperaje}</td>
                            <td className="py-3 text-center">{p.cantidad}</td>
                            <td className="py-3 text-right">{formatCurrency(p.precio)}</td>
                            <td className="py-3 text-right font-semibold">{formatCurrency(p.total)}</td>
                            <td className="py-3 text-center">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-destructive h-8 w-8"
                                onClick={() => handleEliminarProducto(i)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
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

          {/* Resumen */}
          <div>
            <Card className="shadow-soft sticky top-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Resumen</CardTitle>
                <p className="text-xs text-muted-foreground">Totales de la cotización</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted p-3 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">Total Baterías</p>
                    <p className="text-2xl font-bold">{totalUnidades}</p>
                  </div>
                  <div className="bg-muted p-3 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">Total Importe</p>
                    <p className="text-lg font-bold">{formatCurrency(subtotal)}</p>
                  </div>
                </div>

                <div>
                  <Label>Descuento (Bs.)</Label>
                  <Input 
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={descuento}
                    onChange={(e) => setDescuento(e.target.value)}
                  />
                </div>

                <div className="bg-primary/10 p-3 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Total Saldo</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(totalFinal)}</p>
                </div>

                <div>
                  <Label>Vigencia (días)</Label>
                  <Input 
                    type="number"
                    placeholder="7"
                    value={vigenciaDias}
                    onChange={(e) => setVigenciaDias(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Términos y Condiciones</Label>
                  <Textarea 
                    placeholder="Opcional..."
                    value={terminos}
                    onChange={(e) => setTerminos(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={handleLimpiar}>
                    Limpiar
                  </Button>
                  <Button 
                    className="flex-1" 
                    onClick={handleCrearCotizacion}
                    disabled={isSubmitting || productosAgregados.length === 0}
                  >
                    {isSubmitting ? 'Creando...' : 'Crear Cotización'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Historial de Cotizaciones */}
      <Card className="shadow-soft">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Cotizaciones</CardTitle>
              <p className="text-sm text-muted-foreground">Historial de cotizaciones</p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={filterEstado} onValueChange={setFilterEstado}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Todos los estados</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="aceptada">Aceptada</SelectItem>
                  <SelectItem value="convertida">Convertida</SelectItem>
                  <SelectItem value="rechazada">Rechazada</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                Mostrar:
                <Select value={limit.toString()} onValueChange={(v) => setLimit(parseInt(v))}>
                  <SelectTrigger className="w-16 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">Cargando...</p>
            </div>
          ) : cotizaciones.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>No hay cotizaciones</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 font-medium">Número</th>
                      <th className="text-left py-3 font-medium">Fecha</th>
                      <th className="text-left py-3 font-medium">Cliente</th>
                      <th className="text-center py-3 font-medium">Unidades</th>
                      <th className="text-right py-3 font-medium">Total</th>
                      <th className="text-center py-3 font-medium">Estado</th>
                      <th className="text-center py-3 font-medium">Vence</th>
                      <th className="text-center py-3 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cotizaciones.map((cot) => (
                      <tr key={cot.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 font-mono text-primary">{cot.numero}</td>
                        <td className="py-3">{formatDate(cot.fecha)}</td>
                        <td className="py-3">{cot.cliente_nombre || '-'}</td>
                        <td className="py-3 text-center">{cot.total_unidades}</td>
                        <td className="py-3 text-right font-semibold">{formatCurrency(cot.total)}</td>
                        <td className="py-3 text-center">{getEstadoBadge(cot.estado)}</td>
                        <td className={`py-3 text-center ${new Date(cot.fecha_vencimiento) < new Date() ? 'text-red-500' : 'text-amber-600'}`}>
                          {formatDate(cot.fecha_vencimiento)}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center justify-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => { setSelectedCotizacion(cot); setViewDialogOpen(true); }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => handlePrint(cot)}
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            {cot.estado === 'pendiente' && (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-green-500 hover:text-green-600"
                                  onClick={() => handleCambiarEstado(cot.id, 'aceptada')}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-red-500 hover:text-red-600"
                                  onClick={() => handleCambiarEstado(cot.id, 'rechazada')}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => { setSelectedCotizacion(cot); setDeleteDialogOpen(true); }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {cot.estado === 'aceptada' && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-blue-600"
                                onClick={() => handleCambiarEstado(cot.id, 'convertida')}
                                title="Convertir a Venta"
                              >
                                <ShoppingCart className="h-4 w-4" />
                              </Button>
                            )}
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

      {/* Dialog Ver Cotización */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Cotización {selectedCotizacion?.numero}
            </DialogTitle>
            <DialogDescription>
              Detalle completo de la cotización
            </DialogDescription>
          </DialogHeader>
          {selectedCotizacion && (
            <div className="space-y-4">
              {/* Estado y fechas */}
              <div className="flex items-center justify-between">
                {getEstadoBadge(selectedCotizacion.estado)}
                <div className="text-sm text-muted-foreground">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  {formatDate(selectedCotizacion.fecha)} | Vence: {formatDate(selectedCotizacion.fecha_vencimiento)}
                </div>
              </div>

              {/* Datos del cliente */}
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <User className="h-4 w-4" /> Cliente
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Nombre:</span> {selectedCotizacion.cliente_nombre || '-'}</div>
                  <div><span className="text-muted-foreground">Teléfono:</span> {selectedCotizacion.cliente_telefono || '-'}</div>
                  <div><span className="text-muted-foreground">Email:</span> {selectedCotizacion.cliente_email || '-'}</div>
                  <div><span className="text-muted-foreground">Dirección:</span> {selectedCotizacion.cliente_direccion || '-'}</div>
                </div>
              </div>

              {/* Productos */}
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Package className="h-4 w-4" /> Productos
                </h4>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-2">Marca</th>
                        <th className="text-left p-2">Amperaje</th>
                        <th className="text-center p-2">Cant.</th>
                        <th className="text-right p-2">Precio</th>
                        <th className="text-right p-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedCotizacion.productos.map((p, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-2 font-medium">{p.marca}</td>
                          <td className="p-2">{p.amperaje}</td>
                          <td className="p-2 text-center">{p.cantidad}</td>
                          <td className="p-2 text-right">{formatCurrency(p.precio)}</td>
                          <td className="p-2 text-right font-semibold">{formatCurrency(p.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totales */}
              <div className="flex justify-end">
                <div className="w-64 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Total unidades:</span>
                    <span className="font-medium">{selectedCotizacion.total_unidades}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(selectedCotizacion.subtotal)}</span>
                  </div>
                  {selectedCotizacion.descuento > 0 && (
                    <div className="flex justify-between text-sm text-red-500">
                      <span>Descuento:</span>
                      <span>- {formatCurrency(selectedCotizacion.descuento)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg border-t pt-1">
                    <span>Total:</span>
                    <span className="text-primary">{formatCurrency(selectedCotizacion.total)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Cerrar</Button>
            <Button onClick={() => selectedCotizacion && handlePrint(selectedCotizacion)}>
              <Printer className="mr-2 h-4 w-4" /> Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Eliminar */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cotización?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará la cotización {selectedCotizacion?.numero} permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleEliminar} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Configuración de Empresa */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Configuración de Empresa
            </DialogTitle>
            <DialogDescription>
              Configura los datos que aparecerán en las cotizaciones PDF
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            {/* Logo */}
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Upload className="h-4 w-4" /> Logo de la Empresa
              </Label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 border-2 border-dashed rounded-lg flex items-center justify-center overflow-hidden bg-muted">
                  {configForm.logo ? (
                    <img src={configForm.logo} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-2xl font-bold text-muted-foreground">
                      {configForm.nombre?.substring(0, 2).toUpperCase() || 'NM'}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    type="file"
                    ref={logoInputRef}
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => logoInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-3 w-3" />
                    Subir Logo
                  </Button>
                  {configForm.logo && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveLogo}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-3 w-3" />
                      Quitar
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground">PNG, JPG o SVG. Máx. 500KB</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Datos de la empresa */}
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Datos de la Empresa
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cfg-nombre">Nombre de la Empresa</Label>
                  <Input
                    id="cfg-nombre"
                    value={configForm.nombre}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, nombre: e.target.value }))}
                    placeholder="NICMAT S.R.L."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cfg-nit">NIT</Label>
                  <Input
                    id="cfg-nit"
                    value={configForm.nit}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, nit: e.target.value }))}
                    placeholder="123456789"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="cfg-direccion">Dirección</Label>
                  <Input
                    id="cfg-direccion"
                    value={configForm.direccion}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, direccion: e.target.value }))}
                    placeholder="Av. Principal #123, Zona Central"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cfg-ciudad">Ciudad</Label>
                  <Input
                    id="cfg-ciudad"
                    value={configForm.ciudad}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, ciudad: e.target.value }))}
                    placeholder="Santa Cruz - Bolivia"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cfg-email">Correo Electrónico</Label>
                  <Input
                    id="cfg-email"
                    type="email"
                    value={configForm.email}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="info@empresa.com"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Teléfonos */}
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Phone className="h-4 w-4" /> Teléfonos
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cfg-tel1">Teléfono Principal</Label>
                  <Input
                    id="cfg-tel1"
                    value={configForm.telefono_principal}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, telefono_principal: e.target.value }))}
                    placeholder="+591 3 123-4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cfg-tel2">Teléfono Secundario</Label>
                  <Input
                    id="cfg-tel2"
                    value={configForm.telefono_secundario}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, telefono_secundario: e.target.value }))}
                    placeholder="+591 70012345"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cfg-tel3">Teléfono Adicional</Label>
                  <Input
                    id="cfg-tel3"
                    value={configForm.telefono_adicional}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, telefono_adicional: e.target.value }))}
                    placeholder="+591 70000000"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Color Principal */}
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                🎨 Color Principal del PDF
              </Label>
              <div className="flex items-center gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cfg-color">Seleccionar Color</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      id="cfg-color"
                      value={configForm.color_principal}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, color_principal: e.target.value }))}
                      className="w-12 h-10 rounded cursor-pointer border-0"
                    />
                    <Input
                      value={configForm.color_principal}
                      onChange={(e) => setConfigForm(prev => ({ ...prev, color_principal: e.target.value }))}
                      placeholder="#1a5f7a"
                      className="w-28 font-mono"
                    />
                    <div 
                      className="h-10 px-4 rounded flex items-center text-white font-semibold text-sm"
                      style={{ background: `linear-gradient(135deg, ${configForm.color_principal} 0%, ${configForm.color_principal}99 100%)` }}
                    >
                      Vista previa
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Este color se aplicará a títulos, encabezados de tabla, badges y acentos del PDF</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Numeración */}
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Hash className="h-4 w-4" /> Numeración de Cotizaciones
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cfg-prefijo">Prefijo</Label>
                  <Input
                    id="cfg-prefijo"
                    value={configForm.prefijo_cotizacion}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, prefijo_cotizacion: e.target.value }))}
                    placeholder="COT"
                  />
                  <p className="text-xs text-muted-foreground">Ej: COT generará COT-2025-0001</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cfg-numero">Siguiente Número</Label>
                  <Input
                    id="cfg-numero"
                    type="number"
                    min="1"
                    value={configForm.siguiente_numero}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, siguiente_numero: parseInt(e.target.value) || 1 }))}
                    placeholder="1"
                  />
                  <p className="text-xs text-muted-foreground">El próximo número de cotización</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Pie de página */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Pie de Página del PDF</Label>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cfg-pie-empresa">Nombre en Pie</Label>
                  <Input
                    id="cfg-pie-empresa"
                    value={configForm.pie_empresa}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, pie_empresa: e.target.value }))}
                    placeholder="NICMAT S.R.L."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cfg-pie-agradecimiento">Mensaje de Agradecimiento</Label>
                  <Input
                    id="cfg-pie-agradecimiento"
                    value={configForm.pie_agradecimiento}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, pie_agradecimiento: e.target.value }))}
                    placeholder="¡Gracias por su preferencia!"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cfg-pie-contacto">Información de Contacto</Label>
                  <Input
                    id="cfg-pie-contacto"
                    value={configForm.pie_contacto}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, pie_contacto: e.target.value }))}
                    placeholder="Para consultas: +591 70012345 | info@empresa.com"
                  />
                  <p className="text-xs text-muted-foreground">Dejar vacío para usar teléfonos y email configurados</p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveConfig} disabled={isSavingConfig}>
              {isSavingConfig ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Configuración
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
