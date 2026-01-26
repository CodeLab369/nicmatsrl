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
