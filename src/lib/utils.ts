import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combina clases de Tailwind de forma segura, evitando conflictos
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formatea un número al formato boliviano (1.500,50)
 * @param value - Número a formatear
 * @param decimals - Cantidad de decimales (por defecto 2)
 */
export function formatCurrency(value: number, decimals: number = 2): string {
  const formatted = value.toFixed(decimals);
  const [integerPart, decimalPart] = formatted.split('.');
  
  // Agregar separadores de miles con punto
  const withThousands = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  return `${withThousands},${decimalPart}`;
}

/**
 * Formatea un precio en Bolivianos
 * @param value - Valor numérico
 */
export function formatBolivianos(value: number): string {
  return `Bs. ${formatCurrency(value)}`;
}

/**
 * Parsea un string en formato boliviano a número
 * @param value - String en formato "1.500,50"
 */
export function parseBolivianNumber(value: string): number {
  // Remover el símbolo de moneda si existe
  const cleaned = value.replace(/Bs\.?\s*/gi, '').trim();
  // Reemplazar punto (miles) por nada, y coma (decimal) por punto
  const normalized = cleaned.replace(/\./g, '').replace(',', '.');
  return parseFloat(normalized) || 0;
}

/**
 * Genera un ID único
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Capitaliza la primera letra de un string
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Formatea una fecha al formato local boliviano
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('es-BO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * Formatea fecha y hora
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('es-BO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Delay para operaciones asíncronas
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Trunca un texto a cierta longitud
 */
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

/**
 * Ajusta el brillo de un color hex
 * @param color - Color en formato hex (#RRGGBB)
 * @param amount - Cantidad a ajustar (positivo = más claro, negativo = más oscuro)
 */
export function adjustColor(color: string, amount: number): string {
  const hex = color.replace('#', '');
  const r = Math.min(255, Math.max(0, parseInt(hex.substring(0, 2), 16) + amount));
  const g = Math.min(255, Math.max(0, parseInt(hex.substring(2, 4), 16) + amount));
  const b = Math.min(255, Math.max(0, parseInt(hex.substring(4, 6), 16) + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Genera un gradiente CSS a partir de un color base
 * @param color - Color principal en formato hex
 */
export function generateGradient(color: string): string {
  return `linear-gradient(135deg, ${color} 0%, ${adjustColor(color, 40)} 100%)`;
}

/**
 * Logger condicional - solo muestra logs en desarrollo
 */
export const logger = {
  log: (...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(...args);
    }
  },
  error: (...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.error(...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(...args);
    }
  }
};
