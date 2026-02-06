import { UserRole } from '@/lib/constants';

/**
 * Tipo base para entidades con timestamps
 */
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Permisos de módulos del sistema
 */
export interface UserPermissions {
  inventario: boolean;
  tiendas: boolean;
  clientes: boolean;
  cotizaciones: boolean;
  movimientos: boolean;
  estadisticas: boolean;
  [key: string]: boolean; // Para módulos futuros
}

/**
 * Usuario del sistema
 */
export interface User extends BaseEntity {
  username: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  lastLogin?: string;
  permissions?: UserPermissions;
  isOnline?: boolean;
  lastSeen?: string;
}

/**
 * Sesión del usuario
 */
export interface UserSession {
  user: User;
  accessToken: string;
  expiresAt: string;
}

/**
 * Respuesta de autenticación
 */
export interface AuthResponse {
  success: boolean;
  message: string;
  data?: UserSession;
}

/**
 * Respuesta genérica de la API
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

/**
 * Paginación
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Filtros de búsqueda para usuarios
 */
export interface UserFilters {
  search?: string;
  role?: UserRole | 'all';
  isActive?: boolean | 'all';
}

/**
 * Item del inventario central
 */
export interface InventoryItem {
  id: string;
  marca: string;
  amperaje: string;
  cantidad: number;
  costo: number;
  precio_venta: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Item del inventario de tienda
 */
export interface TiendaInventoryItem {
  id: string;
  tienda_id: string;
  marca: string;
  amperaje: string;
  cantidad: number;
  costo: number;
  precio_venta: number;
}

/**
 * Tienda
 */
export interface Tienda {
  id: string;
  nombre: string;
  tipo: 'casa_matriz' | 'sucursal';
  encargado: string | null;
  ciudad: string | null;
  direccion: string | null;
  created_at: string;
}

/**
 * Configuración de empresa (para PDFs y cotizaciones)
 */
export interface EmpresaConfig {
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
  // Campos opcionales para cotizaciones
  prefijo_cotizacion?: string;
  siguiente_numero?: number;
}

/**
 * Valores por defecto de configuración de empresa
 */
export const DEFAULT_EMPRESA_CONFIG: EmpresaConfig = {
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
  pie_agradecimiento: '¡Gracias por su preferencia!',
  pie_contacto: '',
  prefijo_cotizacion: 'COT',
  siguiente_numero: 1
};

/**
 * Envío de tienda
 */
export interface TiendaEnvio {
  id: string;
  tienda_id: string;
  estado: 'pendiente' | 'precios_asignados' | 'completado' | 'cancelado';
  total_productos: number;
  total_unidades: number;
  created_at: string;
  updated_at: string;
  completado_at: string | null;
}

/**
 * Item de envío
 */
export interface EnvioItem {
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

/**
 * Producto en cotización
 */
export interface ProductoCotizacion {
  marca: string;
  amperaje: string;
  cantidad: number;
  precio: number;
  total: number;
}

/**
 * Cotización
 */
export interface Cotizacion {
  id: string;
  numero: string;
  fecha: string;
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_email: string;
  cliente_direccion: string;
  productos: ProductoCotizacion[];
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
