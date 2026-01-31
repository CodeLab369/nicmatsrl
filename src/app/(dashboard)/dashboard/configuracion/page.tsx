'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Settings, Building2, FileText, Package, Store, Upload, Trash2,
  Save, Palette, Phone, Mail, MapPin, Hash, ChevronRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTableSubscription } from '@/contexts';
import {
  Button, Card, CardContent, CardHeader, CardTitle, CardDescription,
  Input, Label, Switch, Tabs, TabsContent, TabsList, TabsTrigger,
  Separator, Badge
} from '@/components/ui';

// Tipos
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

interface PdfInventarioConfig {
  titulo: string;
  subtitulo: string;
  empresa: string;
  colorPrincipal: string;
  mostrarCosto: boolean;
  mostrarPrecioVenta: boolean;
  mostrarTotales: boolean;
  mostrarFecha: boolean;
  mostrarLogo: boolean;
  logo: string | null;
}

// Defaults
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
  prefijo_cotizacion: 'COT',
  siguiente_numero: 1,
  pie_empresa: 'NICMAT S.R.L.',
  pie_agradecimiento: '¡Gracias por su preferencia!',
  pie_contacto: '',
  color_principal: '#1a5f7a'
};

const defaultPdfInventarioConfig: PdfInventarioConfig = {
  titulo: 'INVENTARIO DE BATERÍAS',
  subtitulo: 'Listado completo de productos en stock',
  empresa: 'NICMAT S.R.L.',
  colorPrincipal: '#1a5f7a',
  mostrarCosto: true,
  mostrarPrecioVenta: true,
  mostrarTotales: true,
  mostrarFecha: true,
  mostrarLogo: true,
  logo: null,
};

export default function ConfiguracionPage() {
  // Estados
  const [activeTab, setActiveTab] = useState('empresa');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Configuración de empresa (cotizaciones y tiendas)
  const [empresaConfig, setEmpresaConfig] = useState<EmpresaConfig>(defaultEmpresaConfig);
  const empresaLogoRef = useRef<HTMLInputElement>(null);
  
  // Configuración PDF Inventario
  const [pdfInventarioConfig, setPdfInventarioConfig] = useState<PdfInventarioConfig>(defaultPdfInventarioConfig);
  const inventarioLogoRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();

  // Cargar configuración de empresa
  const loadEmpresaConfig = useCallback(async () => {
    try {
      const response = await fetch('/api/empresa-config');
      const data = await response.json();
      if (data.config) {
        setEmpresaConfig(prev => ({ ...prev, ...data.config }));
      }
    } catch (error) {
      console.error('Error cargando config empresa:', error);
    }
  }, []);

  // Cargar configuración PDF inventario
  const loadPdfInventarioConfig = useCallback(async () => {
    try {
      const response = await fetch('/api/pdf-config?modulo=inventario');
      const data = await response.json();
      if (data.config) {
        setPdfInventarioConfig(prev => ({ ...prev, ...data.config }));
      }
    } catch (error) {
      console.error('Error cargando config PDF inventario:', error);
    }
  }, []);

  // Cargar todo al inicio
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([loadEmpresaConfig(), loadPdfInventarioConfig()]);
      setLoading(false);
    };
    loadAll();
  }, [loadEmpresaConfig, loadPdfInventarioConfig]);

  // Realtime subscriptions
  useTableSubscription('empresa_config', loadEmpresaConfig);
  useTableSubscription('pdf_config', loadPdfInventarioConfig);

  // Guardar configuración de empresa
  const saveEmpresaConfig = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/empresa-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(empresaConfig),
      });
      if (!response.ok) throw new Error();
      toast({ title: 'Guardado', description: 'Configuración de empresa guardada correctamente' });
    } catch {
      toast({ title: 'Error', description: 'No se pudo guardar la configuración', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Guardar configuración PDF inventario
  const savePdfInventarioConfig = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/pdf-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modulo: 'inventario', config: pdfInventarioConfig }),
      });
      if (!response.ok) throw new Error();
      toast({ title: 'Guardado', description: 'Configuración de PDF guardada correctamente' });
    } catch {
      toast({ title: 'Error', description: 'No se pudo guardar la configuración', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Manejar subida de logo empresa
  const handleEmpresaLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      toast({ title: 'Error', description: 'El logo debe ser menor a 500KB', variant: 'destructive' });
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Error', description: 'Solo se permiten imágenes', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setEmpresaConfig(prev => ({ ...prev, logo: reader.result as string }));
    reader.readAsDataURL(file);
  };

  // Manejar subida de logo inventario
  const handleInventarioLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      toast({ title: 'Error', description: 'El logo debe ser menor a 500KB', variant: 'destructive' });
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Error', description: 'Solo se permiten imágenes', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPdfInventarioConfig(prev => ({ ...prev, logo: reader.result as string }));
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <Settings className="h-7 w-7" />
          Configuración
        </h1>
        <p className="text-muted-foreground">Administra la configuración de la empresa y los PDFs</p>
      </div>

      {/* Tabs principales */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="empresa" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Empresa</span>
          </TabsTrigger>
          <TabsTrigger value="pdfs" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">PDFs</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab: Empresa */}
        <TabsContent value="empresa" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Datos de la Empresa
              </CardTitle>
              <CardDescription>
                Esta configuración se usa en cotizaciones y envíos de tiendas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Upload className="h-4 w-4" /> Logo de la Empresa
                </Label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 border-2 border-dashed rounded-lg flex items-center justify-center overflow-hidden bg-muted">
                    {empresaConfig.logo ? (
                      <img src={empresaConfig.logo} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <div className="text-2xl font-bold text-muted-foreground">
                        {empresaConfig.nombre?.substring(0, 2).toUpperCase() || 'NM'}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <input
                      type="file"
                      ref={empresaLogoRef}
                      accept="image/*"
                      onChange={handleEmpresaLogoUpload}
                      className="hidden"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => empresaLogoRef.current?.click()}
                      >
                        <Upload className="mr-1 h-3 w-3" /> Subir
                      </Button>
                      {empresaConfig.logo && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setEmpresaConfig(prev => ({ ...prev, logo: null }))}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-1 h-3 w-3" /> Quitar
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">PNG, JPG, SVG. Máx 500KB</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Datos básicos */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nombre de la Empresa</Label>
                  <Input
                    value={empresaConfig.nombre}
                    onChange={(e) => setEmpresaConfig(prev => ({ ...prev, nombre: e.target.value }))}
                    placeholder="NICMAT S.R.L."
                  />
                </div>
                <div className="space-y-2">
                  <Label>NIT</Label>
                  <Input
                    value={empresaConfig.nit}
                    onChange={(e) => setEmpresaConfig(prev => ({ ...prev, nit: e.target.value }))}
                    placeholder="123456789"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Dirección</Label>
                  <Input
                    value={empresaConfig.direccion}
                    onChange={(e) => setEmpresaConfig(prev => ({ ...prev, direccion: e.target.value }))}
                    placeholder="Av. Principal #123"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ciudad</Label>
                  <Input
                    value={empresaConfig.ciudad}
                    onChange={(e) => setEmpresaConfig(prev => ({ ...prev, ciudad: e.target.value }))}
                    placeholder="Santa Cruz, Bolivia"
                  />
                </div>
              </div>

              <Separator />

              {/* Contacto */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><Phone className="h-3 w-3" /> Teléfono Principal</Label>
                  <Input
                    value={empresaConfig.telefono_principal}
                    onChange={(e) => setEmpresaConfig(prev => ({ ...prev, telefono_principal: e.target.value }))}
                    placeholder="+591 70000000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono Secundario</Label>
                  <Input
                    value={empresaConfig.telefono_secundario}
                    onChange={(e) => setEmpresaConfig(prev => ({ ...prev, telefono_secundario: e.target.value }))}
                    placeholder="+591 70000001"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono Adicional</Label>
                  <Input
                    value={empresaConfig.telefono_adicional}
                    onChange={(e) => setEmpresaConfig(prev => ({ ...prev, telefono_adicional: e.target.value }))}
                    placeholder="+591 70000002"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Mail className="h-3 w-3" /> Email</Label>
                <Input
                  type="email"
                  value={empresaConfig.email}
                  onChange={(e) => setEmpresaConfig(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="contacto@empresa.com"
                />
              </div>

              <Separator />

              {/* Cotizaciones */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Configuración de Cotizaciones
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1"><Hash className="h-3 w-3" /> Prefijo de Cotización</Label>
                    <Input
                      value={empresaConfig.prefijo_cotizacion}
                      onChange={(e) => setEmpresaConfig(prev => ({ ...prev, prefijo_cotizacion: e.target.value }))}
                      placeholder="COT"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Siguiente Número</Label>
                    <Input
                      type="number"
                      value={empresaConfig.siguiente_numero}
                      onChange={(e) => setEmpresaConfig(prev => ({ ...prev, siguiente_numero: parseInt(e.target.value) || 1 }))}
                      min={1}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Pie de página */}
              <div className="space-y-4">
                <h3 className="font-semibold">Pie de Página (PDFs)</h3>
                <div className="space-y-2">
                  <Label>Texto de Empresa</Label>
                  <Input
                    value={empresaConfig.pie_empresa}
                    onChange={(e) => setEmpresaConfig(prev => ({ ...prev, pie_empresa: e.target.value }))}
                    placeholder="NICMAT S.R.L."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mensaje de Agradecimiento</Label>
                  <Input
                    value={empresaConfig.pie_agradecimiento}
                    onChange={(e) => setEmpresaConfig(prev => ({ ...prev, pie_agradecimiento: e.target.value }))}
                    placeholder="¡Gracias por su preferencia!"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Información de Contacto</Label>
                  <Input
                    value={empresaConfig.pie_contacto}
                    onChange={(e) => setEmpresaConfig(prev => ({ ...prev, pie_contacto: e.target.value }))}
                    placeholder="Tel: +591 70000000"
                  />
                </div>
              </div>

              <Separator />

              {/* Color */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Palette className="h-3 w-3" /> Color Principal</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={empresaConfig.color_principal}
                    onChange={(e) => setEmpresaConfig(prev => ({ ...prev, color_principal: e.target.value }))}
                    className="w-14 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={empresaConfig.color_principal}
                    onChange={(e) => setEmpresaConfig(prev => ({ ...prev, color_principal: e.target.value }))}
                    placeholder="#1a5f7a"
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Botón guardar */}
              <div className="flex justify-end pt-4">
                <Button onClick={saveEmpresaConfig} disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? 'Guardando...' : 'Guardar Configuración'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: PDFs */}
        <TabsContent value="pdfs" className="space-y-4">
          {/* PDF Inventario */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                PDF de Inventario
              </CardTitle>
              <CardDescription>
                Configuración del PDF que se genera desde el módulo de Inventario
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Upload className="h-4 w-4" /> Logo para PDF de Inventario
                </Label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 border-2 border-dashed rounded-lg flex items-center justify-center overflow-hidden bg-muted">
                    {pdfInventarioConfig.logo ? (
                      <img src={pdfInventarioConfig.logo} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <div className="text-xl font-bold text-muted-foreground">
                        {pdfInventarioConfig.empresa?.substring(0, 2).toUpperCase() || 'NM'}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <input
                      type="file"
                      ref={inventarioLogoRef}
                      accept="image/*"
                      onChange={handleInventarioLogoUpload}
                      className="hidden"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => inventarioLogoRef.current?.click()}
                      >
                        <Upload className="mr-1 h-3 w-3" /> Subir
                      </Button>
                      {pdfInventarioConfig.logo && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setPdfInventarioConfig(prev => ({ ...prev, logo: null }))}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-1 h-3 w-3" /> Quitar
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">PNG, JPG, SVG. Máx 500KB</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Datos del PDF */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nombre de Empresa</Label>
                  <Input
                    value={pdfInventarioConfig.empresa}
                    onChange={(e) => setPdfInventarioConfig(prev => ({ ...prev, empresa: e.target.value }))}
                    placeholder="NICMAT S.R.L."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Título del PDF</Label>
                  <Input
                    value={pdfInventarioConfig.titulo}
                    onChange={(e) => setPdfInventarioConfig(prev => ({ ...prev, titulo: e.target.value }))}
                    placeholder="INVENTARIO DE BATERÍAS"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Subtítulo</Label>
                <Input
                  value={pdfInventarioConfig.subtitulo}
                  onChange={(e) => setPdfInventarioConfig(prev => ({ ...prev, subtitulo: e.target.value }))}
                  placeholder="Listado completo de productos"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Palette className="h-3 w-3" /> Color Principal</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={pdfInventarioConfig.colorPrincipal}
                    onChange={(e) => setPdfInventarioConfig(prev => ({ ...prev, colorPrincipal: e.target.value }))}
                    className="w-14 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={pdfInventarioConfig.colorPrincipal}
                    onChange={(e) => setPdfInventarioConfig(prev => ({ ...prev, colorPrincipal: e.target.value }))}
                    placeholder="#1a5f7a"
                    className="flex-1"
                  />
                </div>
              </div>

              <Separator />

              {/* Opciones de visualización */}
              <div className="space-y-4">
                <h3 className="font-semibold">Opciones de Visualización</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center justify-between p-3 rounded border">
                    <Label>Mostrar Logo/Iniciales</Label>
                    <Switch
                      checked={pdfInventarioConfig.mostrarLogo}
                      onCheckedChange={(checked) => setPdfInventarioConfig(prev => ({ ...prev, mostrarLogo: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded border">
                    <Label>Mostrar Fecha</Label>
                    <Switch
                      checked={pdfInventarioConfig.mostrarFecha}
                      onCheckedChange={(checked) => setPdfInventarioConfig(prev => ({ ...prev, mostrarFecha: checked }))}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Columnas */}
              <div className="space-y-4">
                <h3 className="font-semibold">Columnas del PDF</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded border">
                    <div>
                      <Label>Costo Unitario</Label>
                      <p className="text-xs text-muted-foreground">Mostrar columna de costo por unidad</p>
                    </div>
                    <Switch
                      checked={pdfInventarioConfig.mostrarCosto}
                      onCheckedChange={(checked) => setPdfInventarioConfig(prev => ({ ...prev, mostrarCosto: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded border">
                    <div>
                      <Label>Precio de Venta</Label>
                      <p className="text-xs text-muted-foreground">Mostrar columna de precio de venta</p>
                    </div>
                    <Switch
                      checked={pdfInventarioConfig.mostrarPrecioVenta}
                      onCheckedChange={(checked) => setPdfInventarioConfig(prev => ({ ...prev, mostrarPrecioVenta: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded border">
                    <div>
                      <Label>Columnas de Totales</Label>
                      <p className="text-xs text-muted-foreground">Costo total y venta total por producto</p>
                    </div>
                    <Switch
                      checked={pdfInventarioConfig.mostrarTotales}
                      onCheckedChange={(checked) => setPdfInventarioConfig(prev => ({ ...prev, mostrarTotales: checked }))}
                    />
                  </div>
                </div>

                {/* Vista previa */}
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs font-medium mb-2">Vista previa de columnas:</p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary">Marca</Badge>
                    <Badge variant="secondary">Amperaje</Badge>
                    <Badge variant="secondary">Cantidad</Badge>
                    {pdfInventarioConfig.mostrarCosto && <Badge>Costo</Badge>}
                    {pdfInventarioConfig.mostrarPrecioVenta && <Badge>Precio</Badge>}
                    {pdfInventarioConfig.mostrarTotales && pdfInventarioConfig.mostrarCosto && <Badge variant="outline">Total Costo</Badge>}
                    {pdfInventarioConfig.mostrarTotales && pdfInventarioConfig.mostrarPrecioVenta && <Badge variant="outline">Total Venta</Badge>}
                  </div>
                </div>
              </div>

              {/* Botón guardar */}
              <div className="flex justify-end pt-4">
                <Button onClick={savePdfInventarioConfig} disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? 'Guardando...' : 'Guardar Configuración'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Info adicional */}
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3 text-muted-foreground">
                <Store className="h-5 w-5 mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">PDFs de Tiendas y Cotizaciones</p>
                  <p className="text-sm">
                    Los PDFs de envíos y cotizaciones usan la configuración de empresa (logo, datos de contacto, color).
                    Los cambios en la pestaña "Empresa" se reflejarán automáticamente.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
