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
