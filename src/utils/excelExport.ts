import * as XLSX from 'xlsx';

/**
 * Export data to Excel file
 */
export function exportToExcel(
  data: any[][],
  sheetName: string = 'Sheet1',
  filename: string = 'export.xlsx'
) {
  try {
    // Create a new workbook
    const wb = XLSX.utils.book_new();
    
    // Convert array of arrays to worksheet
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    
    // Write file
    XLSX.writeFile(wb, filename);
    
    return true;
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    return false;
  }
}

/**
 * Export multiple sheets to Excel file
 */
export function exportMultipleSheets(
  sheets: { name: string; data: any[][] }[],
  filename: string = 'export.xlsx'
) {
  try {
    const wb = XLSX.utils.book_new();
    
    sheets.forEach(({ name, data }) => {
      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, name);
    });
    
    XLSX.writeFile(wb, filename);
    
    return true;
  } catch (error) {
    console.error('Error exporting multiple sheets to Excel:', error);
    return false;
  }
}

/**
 * Format currency for Excel (returns number, not string)
 */
export function formatCurrency(amount: number): number {
  return amount;
}

/**
 * Format date for Excel
 */
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
}

