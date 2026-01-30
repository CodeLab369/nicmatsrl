/**
 * Utilidades optimizadas para manejo de Excel y Google Sheets
 * Diseñado para alto rendimiento con grandes volúmenes de datos
 * Soporta: .xlsx, .xls (Excel y Google Sheets exportado como Excel)
 */

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// Tipos de archivo soportados (solo Excel)
export type SupportedFileType = 'xlsx' | 'xls' | 'unknown';

// Configuración optimizada para XLSX - MÁXIMO RENDIMIENTO
const XLSX_OPTIONS = {
  // Opciones de lectura ultra-optimizadas
  read: {
    type: 'array' as const,
    cellDates: false,      // No convertir fechas (más rápido)
    cellNF: false,         // No parsear formatos numéricos
    cellText: false,       // No generar texto formateado
    cellFormula: false,    // No parsear fórmulas
    sheetStubs: false,     // No incluir celdas vacías
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
 * Detecta el tipo de archivo basado en la extensión
 */
export function detectFileType(file: File): SupportedFileType {
  const name = file.name.toLowerCase();
  if (name.endsWith('.xlsx')) return 'xlsx';
  if (name.endsWith('.xls')) return 'xls';
  
  // Detectar por MIME type
  const type = file.type.toLowerCase();
  if (type.includes('spreadsheet') || type.includes('excel')) return 'xlsx';
  
  return 'unknown';
}

/**
 * Lee un archivo Excel de forma ultra-optimizada
 * Soporta: .xlsx, .xls (Excel y Google Sheets exportado)
 * Compatible con tablets y dispositivos móviles
 * @param file - Archivo a leer (File o ArrayBuffer)
 * @returns Promise con los datos en formato JSON
 */
export async function readExcelFast<T = Record<string, unknown>>(
  file: File | ArrayBuffer
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    try {
      const processData = (buffer: ArrayBuffer) => {
        try {
          // Convertir ArrayBuffer a Uint8Array para mejor compatibilidad
          const uint8Array = new Uint8Array(buffer);
          const workbook = XLSX.read(uint8Array, XLSX_OPTIONS.read);
          
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Convertir a JSON de forma eficiente
          const data = XLSX.utils.sheet_to_json<T>(worksheet, {
            raw: true,        // Valores crudos sin formateo
            defval: '',       // Valor por defecto para celdas vacías
          });
          
          // Normalizar datos para compatibilidad con diferentes fuentes
          const normalizedData = normalizeSheetData(data as Record<string, unknown>[]) as T[];
          
          resolve(normalizedData);
        } catch (parseError) {
          console.error('Error parsing file:', parseError);
          reject(new Error('Error al procesar el archivo. Verifica que sea un archivo Excel válido (.xlsx o .xls)'));
        }
      };

      if (file instanceof File) {
        // Usar FileReader para mejor compatibilidad con tablets
        const reader = new FileReader();
        
        reader.onload = (e) => {
          const result = e.target?.result;
          if (result instanceof ArrayBuffer) {
            processData(result);
          } else {
            reject(new Error('Error al leer el archivo'));
          }
        };
        
        reader.onerror = () => {
          reject(new Error('Error al leer el archivo. Intenta seleccionarlo de nuevo.'));
        };
        
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
 * Lee un archivo de Google Sheets (exportado como Excel)
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
 * Normaliza los datos del archivo para máxima compatibilidad
 * Soporta:
 * - Copiar/pegar desde Google Sheets, Excel u otros
 * - Archivos creados manualmente sin usar el formato
 * - Columnas con diferentes nombres/variaciones
 * - Datos con formatos inconsistentes
 */
function normalizeSheetData(data: Record<string, unknown>[]): Record<string, unknown>[] {
  if (data.length === 0) return data;
  
  // Función para limpiar y normalizar nombres de columnas
  const cleanColumnName = (name: string): string => {
    return name
      .toString()
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
      .replace(/[^a-z0-9]/g, '_')      // Reemplazar caracteres especiales por _
      .replace(/_+/g, '_')              // Múltiples _ a uno solo
      .replace(/^_|_$/g, '');           // Quitar _ al inicio/final
  };
  
  // Mapeo flexible de nombres de columnas (clave = nombre limpio)
  const columnMappings: Record<string, string> = {
    // Variaciones de Marca
    'marca': 'marca',
    'brand': 'marca',
    'marcas': 'marca',
    'nombre_marca': 'marca',
    'nombre': 'marca', // Si solo hay "nombre" sin más contexto, asumir marca
    
    // Variaciones de Amperaje
    'amperaje': 'amperaje',
    'amperage': 'amperaje',
    'amperios': 'amperaje',
    'amp': 'amperaje',
    'amps': 'amperaje',
    'amper': 'amperaje',
    'capacidad': 'amperaje',
    'ah': 'amperaje',
    'modelo': 'amperaje', // A veces usan "modelo" para el amperaje
    
    // Variaciones de Cantidad
    'cantidad': 'cantidad',
    'quantity': 'cantidad',
    'qty': 'cantidad',
    'cant': 'cantidad',
    'stock': 'cantidad',
    'unidades': 'cantidad',
    'existencia': 'cantidad',
    'existencias': 'cantidad',
    'inventario': 'cantidad',
    'disponible': 'cantidad',
    
    // Variaciones de Costo
    'costo': 'costo',
    'cost': 'costo',
    'precio_costo': 'costo',
    'precio_compra': 'costo',
    'costo_unitario': 'costo',
    'compra': 'costo',
    'p_compra': 'costo',
    'pc': 'costo',
    
    // Variaciones de Precio de Venta
    'precio_venta': 'precio_venta',
    'precio_de_venta': 'precio_venta',
    'precioventa': 'precio_venta',
    'precio': 'precio_venta',
    'price': 'precio_venta',
    'venta': 'precio_venta',
    'p_venta': 'precio_venta',
    'pv': 'precio_venta',
    'pvp': 'precio_venta',
    'sale_price': 'precio_venta',
    'precio_publico': 'precio_venta',
    'precio_unitario': 'precio_venta',
  };
  
  // Detectar las columnas del archivo y mapearlas
  const firstRow = data[0];
  const columnMap: Record<string, string> = {};
  
  Object.keys(firstRow).forEach(originalKey => {
    const cleanKey = cleanColumnName(originalKey);
    const mappedKey = columnMappings[cleanKey];
    if (mappedKey) {
      columnMap[originalKey] = mappedKey;
    }
  });
  
  // Si no encontramos las columnas básicas, intentar detección por posición
  // (útil cuando copian datos sin headers o con headers genéricos)
  const mappedColumns = Object.values(columnMap);
  const hasMarca = mappedColumns.includes('marca');
  const hasAmperaje = mappedColumns.includes('amperaje');
  const hasCantidad = mappedColumns.includes('cantidad');
  
  // Si faltan columnas críticas, intentar asignar por orden típico
  if (!hasMarca || !hasAmperaje) {
    const keys = Object.keys(firstRow);
    // Orden típico: Marca, Amperaje, Cantidad, Costo, Precio
    if (keys.length >= 2 && !hasMarca) {
      const firstKey = keys[0];
      if (!columnMap[firstKey]) columnMap[firstKey] = 'marca';
    }
    if (keys.length >= 2 && !hasAmperaje) {
      const secondKey = keys[1];
      if (!columnMap[secondKey]) columnMap[secondKey] = 'amperaje';
    }
    if (keys.length >= 3 && !hasCantidad) {
      const thirdKey = keys[2];
      if (!columnMap[thirdKey]) columnMap[thirdKey] = 'cantidad';
    }
  }
  
  return data.map(row => {
    const normalizedRow: Record<string, unknown> = {};
    
    Object.entries(row).forEach(([key, value]) => {
      // Usar el mapeo o mantener la clave original limpia
      const normalizedKey = columnMap[key] || cleanColumnName(key);
      
      // Procesar el valor
      let cleanValue = processValue(value);
      
      normalizedRow[normalizedKey] = cleanValue;
    });
    
    return normalizedRow;
  }).filter(row => {
    // Filtrar filas vacías o con solo valores nulos
    const values = Object.values(row);
    return values.some(v => v !== '' && v !== null && v !== undefined);
  });
}

/**
 * Procesa un valor individual para limpiarlo y convertirlo al tipo correcto
 */
function processValue(value: unknown): unknown {
  if (value === null || value === undefined) return '';
  
  if (typeof value === 'number') {
    return isNaN(value) ? 0 : value;
  }
  
  if (typeof value === 'string') {
    let cleaned = value.trim();
    
    // Si está vacío después de limpiar
    if (cleaned === '' || cleaned === '-' || cleaned === 'N/A' || cleaned === 'n/a') {
      return '';
    }
    
    // Quitar símbolos de moneda y separadores de miles
    // Soporta: $1,234.56, $1.234,56, 1,234, 1.234
    const currencyPattern = /^[$€Bs.]*\s*([\d.,]+)\s*$/;
    const match = cleaned.match(currencyPattern);
    if (match) {
      cleaned = match[1];
    }
    
    // Detectar formato numérico
    // Si tiene coma como decimal (formato europeo/latino): 1.234,56
    if (/^\d{1,3}(\.\d{3})*(,\d+)?$/.test(cleaned)) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    }
    // Si tiene punto como separador de miles y coma como decimal
    else if (/^\d{1,3}(,\d{3})*(\.\d+)?$/.test(cleaned)) {
      cleaned = cleaned.replace(/,/g, '');
    }
    // Formato simple con coma decimal: 123,45
    else if (/^\d+(,\d+)?$/.test(cleaned) && cleaned.includes(',')) {
      cleaned = cleaned.replace(',', '.');
    }
    
    // Intentar convertir a número
    if (/^-?\d+\.?\d*$/.test(cleaned)) {
      const num = parseFloat(cleaned);
      if (!isNaN(num)) return num;
    }
    
    return cleaned;
  }
  
  return value;
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
 * Lee múltiples hojas de un archivo Excel
 */
export async function readAllSheets<T = Record<string, unknown>>(
  file: File
): Promise<{ [sheetName: string]: T[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const uint8Array = new Uint8Array(buffer);
        const workbook = XLSX.read(uint8Array, XLSX_OPTIONS.read);
        const result: { [sheetName: string]: T[] } = {};
        
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          result[sheetName] = XLSX.utils.sheet_to_json<T>(worksheet, {
            raw: true,
            defval: '',
          });
        });
        
        resolve(result);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsArrayBuffer(file);
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
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const uint8Array = new Uint8Array(buffer);
        const workbook = XLSX.read(uint8Array, XLSX_OPTIONS.read);
        
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet);
        const columns = data.length > 0 ? Object.keys(data[0]) : [];
        
        // Formatear tamaño de archivo
        const sizeInKB = file.size / 1024;
        const fileSize = sizeInKB > 1024 
          ? `${(sizeInKB / 1024).toFixed(2)} MB` 
          : `${sizeInKB.toFixed(2)} KB`;
        
        resolve({
          fileName: file.name,
          fileType,
          fileSize,
          sheetCount: workbook.SheetNames.length,
          sheetNames: workbook.SheetNames,
          rowCount: data.length,
          columnCount: columns.length,
          columns
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Valida datos de inventario y sugiere correcciones
 * Útil para archivos copiados/pegados o creados manualmente
 */
export function validateInventoryData(data: Record<string, unknown>[]): {
  isValid: boolean;
  validRows: number;
  invalidRows: number;
  warnings: string[];
  suggestions: string[];
  detectedColumns: { original: string; mapped: string }[];
} {
  if (data.length === 0) {
    return {
      isValid: false,
      validRows: 0,
      invalidRows: 0,
      warnings: ['El archivo está vacío'],
      suggestions: ['Asegúrate de que el archivo tenga datos'],
      detectedColumns: []
    };
  }
  
  const warnings: string[] = [];
  const suggestions: string[] = [];
  const detectedColumns: { original: string; mapped: string }[] = [];
  
  // Columnas requeridas para inventario
  const requiredColumns = ['marca', 'amperaje', 'cantidad'];
  const optionalColumns = ['costo', 'precio_venta'];
  
  // Analizar columnas detectadas
  const firstRow = data[0];
  const columns = Object.keys(firstRow);
  
  columns.forEach(col => {
    const cleanCol = col.toLowerCase().trim()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_');
    
    let mapped = '';
    if (['marca', 'brand', 'nombre'].some(m => cleanCol.includes(m))) mapped = 'marca';
    else if (['amperaje', 'amp', 'modelo', 'capacidad'].some(m => cleanCol.includes(m))) mapped = 'amperaje';
    else if (['cantidad', 'qty', 'stock', 'existencia', 'unidades'].some(m => cleanCol.includes(m))) mapped = 'cantidad';
    else if (['costo', 'cost', 'compra'].some(m => cleanCol.includes(m))) mapped = 'costo';
    else if (['venta', 'precio', 'price', 'pvp'].some(m => cleanCol.includes(m))) mapped = 'precio_venta';
    
    detectedColumns.push({ original: col, mapped: mapped || '(no reconocida)' });
  });
  
  // Verificar columnas requeridas
  const mappedCols = detectedColumns.filter(d => d.mapped !== '(no reconocida)').map(d => d.mapped);
  const missingRequired = requiredColumns.filter(r => !mappedCols.includes(r));
  const missingOptional = optionalColumns.filter(o => !mappedCols.includes(o));
  
  if (missingRequired.length > 0) {
    warnings.push(`Faltan columnas requeridas: ${missingRequired.join(', ')}`);
    suggestions.push(`Agrega columnas con nombres como: ${missingRequired.map(m => 
      m === 'marca' ? 'Marca, Brand, Nombre' :
      m === 'amperaje' ? 'Amperaje, Amp, Modelo' :
      'Cantidad, Stock, Qty'
    ).join(' | ')}`);
  }
  
  if (missingOptional.length > 0) {
    suggestions.push(`Para mejores resultados, agrega: ${missingOptional.join(', ')}`);
  }
  
  // Contar filas válidas/inválidas
  let validRows = 0;
  let invalidRows = 0;
  
  data.forEach((row, index) => {
    const hasMarca = Object.values(row).some(v => v && String(v).trim() !== '');
    if (hasMarca) {
      validRows++;
    } else {
      invalidRows++;
      if (invalidRows <= 3) {
        warnings.push(`Fila ${index + 2} parece estar vacía o incompleta`);
      }
    }
  });
  
  if (invalidRows > 3) {
    warnings.push(`...y ${invalidRows - 3} filas más con problemas`);
  }
  
  return {
    isValid: missingRequired.length === 0 && validRows > 0,
    validRows,
    invalidRows,
    warnings,
    suggestions,
    detectedColumns
  };
}
