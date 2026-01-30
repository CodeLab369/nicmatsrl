/**
 * Utilidades optimizadas para manejo de Excel
 * Diseñado para alto rendimiento con grandes volúmenes de datos
 */

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

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
  // Opciones de escritura optimizadas
  write: {
    bookType: 'xlsx' as const,
    type: 'array' as const,
    compression: true,     // Comprimir para archivos más pequeños
    cellDates: false,
  }
};

/**
 * Lee un archivo Excel de forma optimizada
 * @param file - Archivo a leer (File o ArrayBuffer)
 * @returns Promise con los datos en formato JSON
 */
export async function readExcelFast<T = Record<string, unknown>>(
  file: File | ArrayBuffer
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    try {
      const processData = (buffer: ArrayBuffer) => {
        // Usar configuración optimizada
        const workbook = XLSX.read(buffer, XLSX_OPTIONS.read);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convertir a JSON de forma eficiente
        const data = XLSX.utils.sheet_to_json<T>(worksheet, {
          raw: true,        // Valores crudos sin formateo
          defval: '',       // Valor por defecto para celdas vacías
        });
        
        resolve(data);
      };

      if (file instanceof File) {
        // Usar arrayBuffer que es más rápido que readAsBinaryString
        file.arrayBuffer().then(processData).catch(reject);
      } else {
        processData(file);
      }
    } catch (error) {
      reject(error);
    }
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
