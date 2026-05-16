import * as XLSX from 'xlsx';

/**
 * Export specific data to Excel (.xlsx) format.
 * @param {Array} data - Array of objects to be exported.
 * @param {string} fileName - Name of the file (without extension).
 * @param {string} sheetName - Name of the worksheet.
 */
export const exportToExcel = (data, fileName = 'Report', sheetName = 'Data') => {
    try {
        if (!data || data.length === 0) {
            console.warn('No data to export');
            return;
        }

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

        // Buffer to binary string
        XLSX.writeFile(workbook, `${fileName}.xlsx`);
    } catch (error) {
        console.error('Excel export failed:', error);
    }
};
