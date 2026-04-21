/**
 * Representa un CFDI (Comprobante Fiscal Digital por Internet) parseado
 * a partir de su XML. Expone accesores limpios para los campos que
 * exportamos a Excel y calcula agregados de impuestos cuando el CFDI
 * no los trae en la raíz.
 */
class Cfdi {
    static TIPO_COMPROBANTE = { I: 'Ingreso', E: 'Egreso', P: 'Pago' };

    static COLUMNS = [
        'Version', 'Tipo De Comprobante', 'Fecha Emision', 'Serie', 'Folio', 'UUID',
        'RFC Emisor', 'Nombre Emisor', 'RFC Receptor', 'Nombre Receptor', 'Uso de CFDI',
        'Subtotal', 'Descuento', 'Retenido IEPS', 'Retenido IVA', 'Retenido ISR',
        'Traslado IVA 16%', 'Total Impuestos Trasladados', 'Total Impuestos Retenidos',
        'Total', 'Moneda', 'Tipo De Cambio', 'Forma de pago', 'Metodo de Pago', 'Conceptos'
    ];

    static CODIGO_IMPUESTO = { ISR: '001', IVA: '002', IEPS: '003' };

    #root;

    constructor(xmlString) {
        const doc = new DOMParser().parseFromString(xmlString, 'application/xml');
        if (doc.getElementsByTagName('parsererror').length) {
            throw new Error('XML inválido');
        }
        this.#root = doc.documentElement;
    }

    get version() { return this.#attr(this.#root, 'Version'); }
    get fecha() { return this.#attr(this.#root, 'Fecha'); }
    get serie() { return this.#attr(this.#root, 'Serie'); }
    get folio() { return this.#attr(this.#root, 'Folio'); }
    get subTotal() { return this.#attr(this.#root, 'SubTotal'); }
    get descuento() { return this.#attr(this.#root, 'Descuento'); }
    get total() { return this.#attr(this.#root, 'Total'); }
    get moneda() { return this.#attr(this.#root, 'Moneda'); }
    get tipoCambio() { return this.#attr(this.#root, 'TipoCambio'); }
    get formaPago() { return this.#attr(this.#root, 'FormaPago'); }
    get metodoPago() { return this.#attr(this.#root, 'MetodoPago'); }

    get tipoDeComprobante() {
        const raw = this.#attr(this.#root, 'TipoDeComprobante');
        return Cfdi.TIPO_COMPROBANTE[raw] || raw;
    }

    get uuid() { return this.#attr(this.#timbreFiscalDigital, 'UUID'); }
    get rfcEmisor() { return this.#attr(this.#emisor, 'Rfc'); }
    get nombreEmisor() { return this.#attr(this.#emisor, 'Nombre'); }
    get rfcReceptor() { return this.#attr(this.#receptor, 'Rfc'); }
    get nombreReceptor() { return this.#attr(this.#receptor, 'Nombre'); }
    get usoCfdi() { return this.#attr(this.#receptor, 'UsoCFDI'); }

    /**
     * Calcula los totales de impuestos. Si el CFDI no los trae precalculados
     * en el nodo raíz <cfdi:Impuestos>, los suma iterando por concepto.
     */
    impuestos() {
        const raiz = this.#impuestos;
        const totals = {
            totalTrasladados: this.#num(raiz, 'TotalImpuestosTrasladados'),
            totalRetenidos: this.#num(raiz, 'TotalImpuestosRetenidos'),
            ivaTraslado16: this.#num(raiz, 'TotalTrasladosImpuestoIVA16'),
            ivaRetenido: this.#num(raiz, 'TotalRetencionesIVA'),
            isrRetenido: this.#num(raiz, 'TotalRetencionesISR'),
            iepsRetenido: this.#num(raiz, 'TotalRetencionesIEPS'),
        };

        const esPrecalculado = {
            totalTrasladados: this.#has(raiz, 'TotalImpuestosTrasladados'),
            totalRetenidos: this.#has(raiz, 'TotalImpuestosRetenidos'),
            ivaTraslado16: this.#has(raiz, 'TotalTrasladosImpuestoIVA16'),
            ivaRetenido: this.#has(raiz, 'TotalRetencionesIVA'),
            isrRetenido: this.#has(raiz, 'TotalRetencionesISR'),
            iepsRetenido: this.#has(raiz, 'TotalRetencionesIEPS'),
        };

        for (const concepto of this.#conceptos) {
            const conceptoImpuestos = this.#child(concepto, 'Impuestos');
            if (!conceptoImpuestos) continue;

            this.#acumularTraslados(conceptoImpuestos, totals, esPrecalculado);
            this.#acumularRetenciones(conceptoImpuestos, totals, esPrecalculado);
        }

        return totals;
    }

    conceptosDescripcion() {
        const descripciones = this.#conceptos.map(c => this.#attr(c, 'Descripcion'));
        return descripciones.length ? descripciones.join(' * ') + ' * ' : '';
    }

    /**
     * Devuelve los valores del CFDI en el orden de Cfdi.COLUMNS para
     * alimentar directo al exportador de Excel.
     */
    toRow() {
        const imp = this.impuestos();
        return [
            this.version,
            this.tipoDeComprobante,
            this.fecha,
            this.serie,
            this.folio,
            this.uuid,
            this.rfcEmisor,
            this.nombreEmisor,
            this.rfcReceptor,
            this.nombreReceptor,
            this.usoCfdi,
            this.subTotal,
            this.descuento,
            imp.iepsRetenido || '',
            imp.ivaRetenido || '',
            imp.isrRetenido || '',
            imp.ivaTraslado16 || '',
            imp.totalTrasladados || '',
            imp.totalRetenidos || '',
            this.total,
            this.moneda,
            this.tipoCambio,
            this.formaPago,
            this.metodoPago,
            this.conceptosDescripcion(),
        ];
    }

    get #emisor() { return this.#child(this.#root, 'Emisor'); }
    get #receptor() { return this.#child(this.#root, 'Receptor'); }
    get #impuestos() { return this.#child(this.#root, 'Impuestos'); }
    get #complemento() { return this.#child(this.#root, 'Complemento'); }

    get #timbreFiscalDigital() {
        return this.#complemento ? this.#child(this.#complemento, 'TimbreFiscalDigital') : null;
    }

    get #conceptos() {
        return this.#children(this.#child(this.#root, 'Conceptos'), 'Concepto');
    }

    #acumularTraslados(conceptoImpuestos, totals, esPrecalculado) {
        const traslados = this.#children(this.#child(conceptoImpuestos, 'Traslados'), 'Traslado');

        for (const traslado of traslados) {
            const importe = this.#num(traslado, 'Importe');
            const tasa = this.#attr(traslado, 'TasaOCuota');

            if (!esPrecalculado.totalTrasladados) totals.totalTrasladados += importe;
            if (!esPrecalculado.ivaTraslado16 && tasa.includes('0.16')) totals.ivaTraslado16 += importe;
        }
    }

    #acumularRetenciones(conceptoImpuestos, totals, esPrecalculado) {
        const retenciones = this.#children(this.#child(conceptoImpuestos, 'Retenciones'), 'Retencion');
        const { ISR, IVA, IEPS } = Cfdi.CODIGO_IMPUESTO;

        for (const retencion of retenciones) {
            const importe = this.#num(retencion, 'Importe');
            const codigo = this.#attr(retencion, 'Impuesto');

            if (!esPrecalculado.totalRetenidos) totals.totalRetenidos += importe;
            if (!esPrecalculado.isrRetenido && codigo === ISR) totals.isrRetenido += importe;
            if (!esPrecalculado.ivaRetenido && codigo === IVA) totals.ivaRetenido += importe;
            if (!esPrecalculado.iepsRetenido && codigo === IEPS) totals.iepsRetenido += importe;
        }
    }

    #attr(el, name) {
        if (!el) return '';
        const v = el.getAttribute(name);
        return v === null ? '' : v;
    }

    #num(el, name) {
        return parseFloat(this.#attr(el, name)) || 0;
    }

    #has(el, name) {
        return !!this.#attr(el, name);
    }

    #child(parent, localName) {
        if (!parent) return null;
        for (const child of parent.children) {
            if (child.localName === localName) return child;
        }
        return null;
    }

    #children(parent, localName) {
        if (!parent) return [];
        return Array.from(parent.children).filter(c => c.localName === localName);
    }
}
