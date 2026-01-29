/**
 * Constantes de la aplicación NICMAT S.R.L.
 */

// Información de la empresa
export const COMPANY = {
  name: 'NICMAT S.R.L.',
  fullName: 'NICMAT Sociedad de Responsabilidad Limitada',
  description: 'Comercialización de Baterías',
  country: 'Bolivia',
  currency: 'Bs.',
  currencyCode: 'BOB',
} as const;

// Roles de usuario
export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

// Estados de la aplicación
export const STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  CANCELLED: 'cancelled',
} as const;

// Configuración de paginación
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100],
} as const;

// Rutas de la aplicación
export const ROUTES = {
  // Públicas
  LOGIN: '/login',
  
  // Dashboard
  DASHBOARD: '/dashboard',
  
  // Administración
  ADMIN: '/dashboard/admin',
  ADMIN_USERS: '/dashboard/admin/usuarios',
  ADMIN_PROFILE: '/dashboard/admin/perfil',
  
  // Inventario
  INVENTORY: '/dashboard/inventario',
  
  // Cotizaciones
  QUOTATIONS: '/dashboard/cotizaciones',
  
  // Tiendas
  STORES: '/dashboard/tiendas',
  
  // Estadísticas
  STATISTICS: '/dashboard/estadisticas',
  
  // Movimientos (Control Financiero)
  MOVEMENTS: '/dashboard/movimientos',
} as const;

// Mensajes de error comunes
export const ERROR_MESSAGES = {
  GENERIC: 'Ha ocurrido un error. Por favor, intente nuevamente.',
  UNAUTHORIZED: 'No tiene permisos para realizar esta acción.',
  NOT_FOUND: 'El recurso solicitado no fue encontrado.',
  INVALID_CREDENTIALS: 'Usuario o contraseña incorrectos.',
  SESSION_EXPIRED: 'Su sesión ha expirado. Por favor, inicie sesión nuevamente.',
  NETWORK_ERROR: 'Error de conexión. Verifique su conexión a internet.',
} as const;

// Mensajes de éxito comunes
export const SUCCESS_MESSAGES = {
  SAVED: 'Los cambios han sido guardados exitosamente.',
  DELETED: 'El registro ha sido eliminado exitosamente.',
  CREATED: 'El registro ha sido creado exitosamente.',
  UPDATED: 'El registro ha sido actualizado exitosamente.',
  LOGIN: 'Bienvenido al sistema.',
  LOGOUT: 'Ha cerrado sesión exitosamente.',
} as const;

// Configuración de validación
export const VALIDATION = {
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 50,
  },
  PASSWORD: {
    MIN_LENGTH: 6,
    MAX_LENGTH: 100,
  },
  NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 100,
  },
} as const;
