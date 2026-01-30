/**
 * Utilidades optimizadas para manejo de Excel y Google Sheets
 * Diseñado para alto rendimiento con grandes volúmenes de datos
 * Soporta: .xlsx, .xls, .csv, archivos exportados de Google Sheets
 */

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// Tipos de archivo soportados
export type SupportedFileType = 'xlsx' | 'xls' | 'csv' | 'unknown';

// Configuración optimizada para XLSX
const XLSX_OPTIONS = {
  // Opciones de lectura optimizadas
  read: {
    type: 'array' as const,
    cellDates: false,      // No convertir fechas (más rápido)
    cellNF: false,         // No parsear formatos numéricos
    cellText: false,       // No generar texto formateado
    cellFormula: false,    // No parsear fórmulas
    sheetStubs: false,     // No incluir celdas vacías
    dense: true,           // Usar array denso (más eficiente en memoria)
  },
  // Opciones para CSV (Google Sheets exporta en este formato)
  readCSV: {
    type: 'string' as const,
    raw: true,
    codepage: 65001,       // UTF-8 para caracteres especiales
  },
  // Opciones de escritura optimizadas
  write: {
    bookType: 'xlsx' as const,
    type: 'array' as const,
    compression: true,     // Comprimir para archivos más pequeños
    cellDates: false,
  }
};

/**
 * Detecta el tipo de archivo basado en la extensión y contenido
 */
export function detectFileType(file: File): SupportedFileType {
  const name = file.name.toLowerCase();
  if (name.endsWith('.xlsx')) return 'xlsx';
  if (name.endsWith('.xls')) return 'xls';
  if (name.endsWith('.csv')) return 'csv';
  
  // Detectar por MIME type
  const type = file.type.toLowerCase();
  if (type.includes('spreadsheet') || type.includes('excel')) return 'xlsx';
  if (type === 'text/csv' || type === 'application/csv') return 'csv';
  
  return 'unknown';
}

/**
 * Lee un archivo Excel o CSV de forma optimizada
 * Soporta: .xlsx, .xls, .csv (Google Sheets)
 * Compatible con tablets y dispositivos móviles
 * @param file - Archivo a leer (File o ArrayBuffer)
 * @returns Promise con los datos en formato JSON
 */
export async function readExcelFast<T = Record<string, unknown>>(
  file: File | ArrayBuffer
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    try {
      const processData = (buffer: ArrayBuffer, isCSV = false) => {
        try {
          let workbook;
          
          if (isCSV) {
            // Para CSV, convertir a string primero (mejor para Google Sheets)
            const decoder = new TextDecoder('utf-8');
            const csvString = decoder.decode(buffer);
            workbook = XLSX.read(csvString, { type: 'string', raw: true });
          } else {
            // Para Excel, usar configuración optimizada
            // Convertir ArrayBuffer a Uint8Array para mejor compatibilidad
            const uint8Array = new Uint8Array(buffer);
            workbook = XLSX.read(uint8Array, { type: 'array' });
          }
          
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Convertir a JSON de forma eficiente
          const data = XLSX.utils.sheet_to_json<T>(worksheet, {
            raw: true,        // Valores crudos sin formateo
            defval: '',       // Valor por defecto para celdas vacías
          });
          
          // Normalizar datos (útil para Google Sheets que puede tener headers diferentes)
          const normalizedData = normalizeSheetData(data as Record<string, unknown>[]) as T[];
          
          resolve(normalizedData);
        } catch (parseError) {
          console.error('Error parsing file:', parseError);
          reject(new Error('Error al procesar el archivo. Verifica que sea un archivo Excel o CSV válido.'));
        }
      };

      if (file instanceof File) {
        const isCSV = file.name.toLowerCase().endsWith('.csv') || 
                      file.type === 'text/csv';
        
        // Usar FileReader como fallback para mejor compatibilidad con tablets
        const reader = new FileReader();
        
        reader.onload = (e) => {
          const result = e.target?.result;
          if (result instanceof ArrayBuffer) {
            processData(result, isCSV);
          } else {
            reject(new Error('Error al leer el archivo'));
          }
        };
        
        reader.onerror = () => {
          reject(new Error('Error al leer el archivo. Intenta seleccionarlo de nuevo.'));
        };
        
        // readAsArrayBuffer tiene mejor soporte que arrayBuffer() en tablets
        reader.readAsArrayBuffer(file);
      } else {
        processData(file);
      }
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Lee específicamente un archivo de Google Sheets (CSV o XLSX exportado)
 * Maneja las peculiaridades de los archivos de Google Sheets
 */
export async function readGoogleSheet<T = Record<string, unknown>>(
  file: File
): Promise<{ data: T[]; fileType: SupportedFileType; rowCount: number }> {
  const fileType = detectFileType(file);
  const data = await readExcelFast<T>(file);
  
  return {
    data,
    fileType,
    rowCount: data.length
  };
}

/**
 * Normaliza los datos del archivo (útil para Google Sheets)
 * - Elimina espacios extra en headers y valores
 * - Normaliza nombres de columnas comunes
 */
function normalizeSheetData(data: Record<string, unknown>[]): Record<string, unknown>[] {
  if (data.length === 0) return data;
  
  // Mapeo de nombres de columnas comunes (Google Sheets puede variar)
  const columnMappings: Record<string, string> = {
    // Variaciones de Marca
    'marca': 'marca',
    'brand': 'marca',
    'Marca': 'marca',
    'MARCA': 'marca',
    // Variaciones de Amperaje
    'amperaje': 'amperaje',
    'amperage': 'amperaje',
    'Amperaje': 'amperaje',
    'AMPERAJE': 'amperaje',
    'amp': 'amperaje',
    'AMP': 'amperaje',
    // Variaciones de Cantidad
    'cantidad': 'cantidad',
    'quantity': 'cantidad',
    'Cantidad': 'cantidad',
    'CANTIDAD': 'cantidad',
    'qty': 'cantidad',
    'QTY': 'cantidad',
    // Variaciones de Costo
    'costo': 'costo',
    'cost': 'costo',
    'Costo': 'costo',
    'COSTO': 'costo',
    'precio_costo': 'costo',
    'precio costo': 'costo',
    // Variaciones de Precio de Venta
    'precio_venta': 'precio_venta',
    'precio venta': 'precio_venta',
    'Precio Venta': 'precio_venta',
    'Precio de Venta': 'precio_venta',
    'PRECIO VENTA': 'precio_venta',
    'precio': 'precio_venta',
    'price': 'precio_venta',
    'sale_price': 'precio_venta',
    'PrecioVenta': 'precio_venta',
  };
  
  return data.map(row => {
    const normalizedRow: Record<string, unknown> = {};
    
    Object.entries(row).forEach(([key, value]) => {
      // Limpiar el nombre de la columna
      const cleanKey = key.trim();
      
      // Buscar mapeo o usar el nombre limpio
      const normalizedKey = columnMappings[cleanKey] || cleanKey;
      
      // Limpiar el valor si es string
      let cleanValue = value;
      if (typeof value === 'string') {
        cleanValue = value.trim();
        // Convertir números que vienen como string
        if (/^-?\d+\.?\d*$/.test(cleanValue as string)) {
          const num = parseFloat(cleanValue as string);
          if (!isNaN(num)) cleanValue = num;
        }
      }
      
      normalizedRow[normalizedKey] = cleanValue;
    });
    
    return normalizedRow;
  });
}

/**
 * Exporta datos a Excel de forma optimizada
 * @param data - Array de objetos a exportar
 * @param fileName - Nombre del archivo (sin extensión)
 * @param sheetName - Nombre de la hoja (default: 'Datos')
 * @param columns - Configuración opcional de columnas
 */
export function exportToExcelFast(
  data: Record<string, unknown>[],
  fileName: string,
  sheetName = 'Datos',
  columns?: { header: string; key: string; width?: number }[]
): void {
  // Si hay configuración de columnas, reordenar datos
  let exportData = data;
  let colWidths: { wch: number }[] | undefined;
  
  if (columns) {
    exportData = data.map(row => {
      const newRow: Record<string, unknown> = {};
      columns.forEach(col => {
        newRow[col.header] = row[col.key] ?? '';
      });
      return newRow;
    });
    colWidths = columns.map(col => ({ wch: col.width || 15 }));
  }

  // Crear worksheet de forma eficiente
  const worksheet = XLSX.utils.json_to_sheet(exportData);
  
  // Aplicar anchos de columna si están definidos
  if (colWidths) {
    worksheet['!cols'] = colWidths;
  }
  
  // Crear workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  // Generar archivo con compresión
  const excelBuffer = XLSX.write(workbook, XLSX_OPTIONS.write);
  
  // Descargar
  const blob = new Blob([excelBuffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  saveAs(blob, `${fileName}.xlsx`);
}

/**
 * Exporta datos grandes en chunks para evitar bloquear el UI
 * Útil para más de 10,000 filas
 */
export async function exportLargeDataToExcel(
  data: Record<string, unknown>[],
  fileName: string,
  sheetName = 'Datos',
  onProgress?: (progress: number) => void
): Promise<void> {
  return new Promise((resolve) => {
    // Para datos pequeños, usar método rápido
    if (data.length < 5000) {
      exportToExcelFast(data, fileName, sheetName);
      resolve();
      return;
    }

    // Para datos grandes, procesar en el siguiente tick
    setTimeout(() => {
      onProgress?.(10);
      
      const worksheet = XLSX.utils.json_to_sheet(data);
      onProgress?.(50);
      
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      onProgress?.(70);
      
      const excelBuffer = XLSX.write(workbook, XLSX_OPTIONS.write);
      onProgress?.(90);
      
      const blob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      saveAs(blob, `${fileName}.xlsx`);
      
      onProgress?.(100);
      resolve();
    }, 0);
  });
}

/**
 * Crea un archivo de formato/plantilla Excel
 */
export function createExcelTemplate(
  headers: string[],
  fileName: string,
  sheetName = 'Formato'
): void {
  const worksheet = XLSX.utils.aoa_to_sheet([headers]);
  
  // Ajustar anchos automáticamente basado en headers
  worksheet['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 2, 12) }));
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  const excelBuffer = XLSX.write(workbook, XLSX_OPTIONS.write);
  const blob = new Blob([excelBuffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  saveAs(blob, `${fileName}.xlsx`);
}

/**
 * Valida la estructura de un archivo Excel
 */
export function validateExcelStructure(
  data: Record<string, unknown>[],
  requiredColumns: string[]
): { valid: boolean; missingColumns: string[] } {
  if (data.length === 0) {
    return { valid: false, missingColumns: requiredColumns };
  }
  
  const firstRow = data[0];
  const presentColumns = Object.keys(firstRow);
  const missingColumns = requiredColumns.filter(
    col => !presentColumns.some(p => p.toLowerCase() === col.toLowerCase())
  );
  
  return {
    valid: missingColumns.length === 0,
    missingColumns
  };
}

/**
 * Exporta datos a CSV (compatible con Google Sheets)
 * @param data - Array de objetos a exportar
 * @param fileName - Nombre del archivo (sin extensión)
 */
export function exportToCSV(
  data: Record<string, unknown>[],
  fileName: string
): void {
  if (data.length === 0) return;
  
  // Crear worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Generar CSV con BOM para UTF-8 (importante para caracteres especiales en Google Sheets)
  const csvContent = XLSX.utils.sheet_to_csv(worksheet);
  const BOM = '\uFEFF';
  
  // Descargar
  const blob = new Blob([BOM + csvContent], { 
    type: 'text/csv;charset=utf-8;' 
  });
  saveAs(blob, `${fileName}.csv`);
}

/**
 * Crea una plantilla en formato CSV (para Google Sheets)
 */
export function createCSVTemplate(
  headers: string[],
  fileName: string
): void {
  const worksheet = XLSX.utils.aoa_to_sheet([headers]);
  const csvContent = XLSX.utils.sheet_to_csv(worksheet);
  const BOM = '\uFEFF';
  
  const blob = new Blob([BOM + csvContent], { 
    type: 'text/csv;charset=utf-8;' 
  });
  saveAs(blob, `${fileName}.csv`);
}

/**
 * Exporta datos con opción de formato (Excel o CSV para Google Sheets)
 */
export function exportToSpreadsheet(
  data: Record<string, unknown>[],
  fileName: string,
  format: 'excel' | 'csv' | 'google-sheets' = 'excel',
  sheetName = 'Datos'
): void {
  if (format === 'csv' || format === 'google-sheets') {
    exportToCSV(data, fileName);
  } else {
    exportToExcelFast(data, fileName, sheetName);
  }
}

/**
 * Lee múltiples hojas de un archivo Excel/Google Sheets
 */
export async function readAllSheets<T = Record<string, unknown>>(
  file: File
): Promise<{ [sheetName: string]: T[] }> {
  return new Promise((resolve, reject) => {
    file.arrayBuffer()
      .then(buffer => {
        const workbook = XLSX.read(buffer, XLSX_OPTIONS.read);
        const result: { [sheetName: string]: T[] } = {};
        
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          result[sheetName] = XLSX.utils.sheet_to_json<T>(worksheet, {
            raw: true,
            defval: '',
          });
        });
        
        resolve(result);
      })
      .catch(reject);
  });
}

/**
 * Obtiene información del archivo (útil para preview)
 */
export async function getFileInfo(file: File): Promise<{
  fileName: string;
  fileType: SupportedFileType;
  fileSize: string;
  sheetCount: number;
  sheetNames: string[];
  rowCount: number;
  columnCount: number;
  columns: string[];
}> {
  const fileType = detectFileType(file);
  const buffer = await file.arrayBuffer();
  
  let workbook;
  if (fileType === 'csv') {
    const decoder = new TextDecoder('utf-8');
    const csvString = decoder.decode(buffer);
    workbook = XLSX.read(csvString, { type: 'string' });
  } else {
    workbook = XLSX.read(buffer, { type: 'array' });
  }
  
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet);
  const columns = data.length > 0 ? Object.keys(data[0]) : [];
  
  // Formatear tamaño de archivo
  const sizeInKB = file.size / 1024;
  const fileSize = sizeInKB > 1024 
    ? `${(sizeInKB / 1024).toFixed(2)} MB` 
    : `${sizeInKB.toFixed(2)} KB`;
  
  return {
    fileName: file.name,
    fileType,
    fileSize,
    sheetCount: workbook.SheetNames.length,
    sheetNames: workbook.SheetNames,
    rowCount: data.length,
    columnCount: columns.length,
    columns
  };
}
