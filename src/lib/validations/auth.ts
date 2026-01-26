import { z } from 'zod';
import { VALIDATION } from '@/lib/constants';

/**
 * Esquema de validación para login
 */
export const loginSchema = z.object({
  username: z
    .string()
    .min(1, 'El usuario es requerido')
    .min(VALIDATION.USERNAME.MIN_LENGTH, `El usuario debe tener al menos ${VALIDATION.USERNAME.MIN_LENGTH} caracteres`)
    .max(VALIDATION.USERNAME.MAX_LENGTH, `El usuario no puede exceder ${VALIDATION.USERNAME.MAX_LENGTH} caracteres`),
  password: z
    .string()
    .min(1, 'La contraseña es requerida')
    .min(VALIDATION.PASSWORD.MIN_LENGTH, `La contraseña debe tener al menos ${VALIDATION.PASSWORD.MIN_LENGTH} caracteres`),
});

export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Esquema de validación para crear usuario
 */
export const createUserSchema = z.object({
  username: z
    .string()
    .min(1, 'El usuario es requerido')
    .min(VALIDATION.USERNAME.MIN_LENGTH, `El usuario debe tener al menos ${VALIDATION.USERNAME.MIN_LENGTH} caracteres`)
    .max(VALIDATION.USERNAME.MAX_LENGTH, `El usuario no puede exceder ${VALIDATION.USERNAME.MAX_LENGTH} caracteres`)
    .regex(/^[a-zA-Z0-9_]+$/, 'El usuario solo puede contener letras, números y guiones bajos'),
  password: z
    .string()
    .min(1, 'La contraseña es requerida')
    .min(VALIDATION.PASSWORD.MIN_LENGTH, `La contraseña debe tener al menos ${VALIDATION.PASSWORD.MIN_LENGTH} caracteres`)
    .max(VALIDATION.PASSWORD.MAX_LENGTH, `La contraseña no puede exceder ${VALIDATION.PASSWORD.MAX_LENGTH} caracteres`),
  confirmPassword: z.string().min(1, 'Confirme la contraseña'),
  fullName: z
    .string()
    .min(1, 'El nombre completo es requerido')
    .min(VALIDATION.NAME.MIN_LENGTH, `El nombre debe tener al menos ${VALIDATION.NAME.MIN_LENGTH} caracteres`)
    .max(VALIDATION.NAME.MAX_LENGTH, `El nombre no puede exceder ${VALIDATION.NAME.MAX_LENGTH} caracteres`),
  role: z.enum(['admin', 'user'], {
    required_error: 'El rol es requerido',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

export type CreateUserFormData = z.infer<typeof createUserSchema>;

/**
 * Esquema de validación para actualizar perfil
 */
export const updateProfileSchema = z.object({
  username: z
    .string()
    .min(1, 'El usuario es requerido')
    .min(VALIDATION.USERNAME.MIN_LENGTH, `El usuario debe tener al menos ${VALIDATION.USERNAME.MIN_LENGTH} caracteres`)
    .max(VALIDATION.USERNAME.MAX_LENGTH, `El usuario no puede exceder ${VALIDATION.USERNAME.MAX_LENGTH} caracteres`)
    .regex(/^[a-zA-Z0-9_]+$/, 'El usuario solo puede contener letras, números y guiones bajos'),
  fullName: z
    .string()
    .min(1, 'El nombre completo es requerido')
    .min(VALIDATION.NAME.MIN_LENGTH, `El nombre debe tener al menos ${VALIDATION.NAME.MIN_LENGTH} caracteres`)
    .max(VALIDATION.NAME.MAX_LENGTH, `El nombre no puede exceder ${VALIDATION.NAME.MAX_LENGTH} caracteres`),
});

export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;

/**
 * Esquema de validación para cambiar contraseña
 */
export const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, 'La contraseña actual es requerida'),
  newPassword: z
    .string()
    .min(1, 'La nueva contraseña es requerida')
    .min(VALIDATION.PASSWORD.MIN_LENGTH, `La contraseña debe tener al menos ${VALIDATION.PASSWORD.MIN_LENGTH} caracteres`)
    .max(VALIDATION.PASSWORD.MAX_LENGTH, `La contraseña no puede exceder ${VALIDATION.PASSWORD.MAX_LENGTH} caracteres`),
  confirmNewPassword: z.string().min(1, 'Confirme la nueva contraseña'),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmNewPassword'],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: 'La nueva contraseña debe ser diferente a la actual',
  path: ['newPassword'],
});

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

/**
 * Esquema para actualizar usuario (admin)
 */
export const updateUserSchema = z.object({
  username: z
    .string()
    .min(1, 'El usuario es requerido')
    .min(VALIDATION.USERNAME.MIN_LENGTH, `El usuario debe tener al menos ${VALIDATION.USERNAME.MIN_LENGTH} caracteres`)
    .max(VALIDATION.USERNAME.MAX_LENGTH, `El usuario no puede exceder ${VALIDATION.USERNAME.MAX_LENGTH} caracteres`)
    .regex(/^[a-zA-Z0-9_]+$/, 'El usuario solo puede contener letras, números y guiones bajos'),
  fullName: z
    .string()
    .min(1, 'El nombre completo es requerido')
    .min(VALIDATION.NAME.MIN_LENGTH, `El nombre debe tener al menos ${VALIDATION.NAME.MIN_LENGTH} caracteres`)
    .max(VALIDATION.NAME.MAX_LENGTH, `El nombre no puede exceder ${VALIDATION.NAME.MAX_LENGTH} caracteres`),
  role: z.enum(['admin', 'user'], {
    required_error: 'El rol es requerido',
  }),
  isActive: z.boolean(),
  newPassword: z
    .string()
    .optional()
    .refine((val) => !val || val.length >= VALIDATION.PASSWORD.MIN_LENGTH, {
      message: `La contraseña debe tener al menos ${VALIDATION.PASSWORD.MIN_LENGTH} caracteres`,
    }),
});

export type UpdateUserFormData = z.infer<typeof updateUserSchema>;
