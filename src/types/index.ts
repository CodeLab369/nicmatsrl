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
