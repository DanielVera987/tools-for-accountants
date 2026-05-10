/**
 * Toma una colección de instancias Cfdi y genera un archivo .xlsx
 * usando SheetJS. La descarga se dispara directo en el navegador.
 */
class CfdiExcelExporter {
    static SHEET_NAME = 'CFDIs';
    static DEFAULT_FILENAME = 'cfdis';
    static TIPO_NOMINA = 'nomina';
    static TIPO_INGRESO_EGRESO = 'ingreso-egreso';
    static TIPO_PAGOS = 'pagos';

    #cfdis;
    #tipo;

    constructor(cfdis, tipo = CfdiExcelExporter.TIPO_INGRESO_EGRESO) {
        this.#cfdis = cfdis;
        this.#tipo = tipo;
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
        let columns, rows;

        if (this.#tipo === CfdiExcelExporter.TIPO_NOMINA) {
            columns = Cfdi.COLUMNS_NOMINA;
            rows = [columns, ...this.#cfdis.map(cfdi => cfdi.toNominaRow())];
        } else if (this.#tipo === CfdiExcelExporter.TIPO_PAGOS) {
            columns = Cfdi.COLUMNS_PAGOS;
            rows = [columns, ...this.#buildPagosRows()];
        } else {
            columns = Cfdi.COLUMNS;
            rows = [columns, ...this.#cfdis.map(cfdi => cfdi.toRow())];
        }

        const worksheet = XLSX.utils.aoa_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, CfdiExcelExporter.SHEET_NAME);
        return workbook;
    }

    #buildPagosRows() {
        const allRows = [];
        let numeroPagoActual = 1;

        for (const cfdi of this.#cfdis) {
            const rows = cfdi.toPagosRows(numeroPagoActual);
            allRows.push(...rows);

            const pagosCount = cfdi.toPagosRows(numeroPagoActual).filter((row, idx, arr) => {
                return idx === 0 || row[0] !== arr[idx - 1][0];
            }).length;

            numeroPagoActual += pagosCount;
        }

        return allRows;
    }

    #sanitizeFilename(filename) {
        const base = (filename || '').trim() || CfdiExcelExporter.DEFAULT_FILENAME;
        return base.endsWith('.xlsx') ? base : `${base}.xlsx`;
    }
}
