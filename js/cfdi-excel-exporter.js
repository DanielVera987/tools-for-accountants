/**
 * Toma una colección de instancias Cfdi y genera un archivo .xlsx
 * usando SheetJS. La descarga se dispara directo en el navegador.
 */
class CfdiExcelExporter {
    static SHEET_NAME = 'CFDIs';
    static DEFAULT_FILENAME = 'cfdis';

    #cfdis;

    constructor(cfdis) {
        this.#cfdis = cfdis;
    }

    /**
     * Descarga el xlsx en el navegador. Devuelve el nombre final del archivo.
     */
    download(filename) {
        const name = this.#sanitizeFilename(filename);
        const workbook = this.#buildWorkbook();
        XLSX.writeFile(workbook, name);
        return name;
    }

    #buildWorkbook() {
        const rows = [Cfdi.COLUMNS, ...this.#cfdis.map(cfdi => cfdi.toRow())];
        const worksheet = XLSX.utils.aoa_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, CfdiExcelExporter.SHEET_NAME);
        return workbook;
    }

    #sanitizeFilename(filename) {
        const base = (filename || '').trim() || CfdiExcelExporter.DEFAULT_FILENAME;
        return base.endsWith('.xlsx') ? base : `${base}.xlsx`;
    }
}
