/**
 * Representa un CFDI (Comprobante Fiscal Digital por Internet) parseado
 * a partir de su XML. Expone accesores limpios para los campos que
 * exportamos a Excel y calcula agregados de impuestos cuando el CFDI
 * no los trae en la raíz.
 */
class Cfdi {
    static TIPO_COMPROBANTE = { I: 'Ingreso', E: 'Egreso', P: 'Pago', N: 'Nomina' };

    static COLUMNS = [
        'Version', 'Tipo De Comprobante', 'Fecha Emision', 'Serie', 'Folio', 'UUID',
        'RFC Emisor', 'Nombre Emisor', 'RFC Receptor', 'Nombre Receptor', 'Uso de CFDI',
        'Subtotal', 'Descuento', 'Retenido IEPS', 'Retenido IVA', 'Retenido ISR',
        'Traslado IVA 16%', 'Total Impuestos Trasladados', 'Total Impuestos Retenidos',
        'Total', 'Moneda', 'Tipo De Cambio', 'Forma de pago', 'Metodo de Pago', 'Conceptos'
    ];

    static COLUMNS_NOMINA = [
        'Version CFDI', 'UUID', 'Fecha Emision', 'Serie', 'Folio',
        'RFC Emisor', 'Nombre Emisor', 'Registro Patronal',
        'RFC Receptor', 'Nombre Receptor', 'CURP', 'NSS',
        'Num Empleado', 'Departamento', 'Puesto', 'Tipo Contrato',
        'Periodicidad de Pago', 'Salario Diario Integrado',
        'Tipo Nomina', 'Fecha Pago', 'Fecha Inicial Pago', 'Fecha Final Pago',
        'Dias Pagados', 'Total Percepciones', 'Total Sueldos', 'Total Gravado',
        'Total Exento', 'Total Deducciones', 'Total Otros Pagos',
        'Subtotal', 'Descuento', 'Total'
    ];

    static COLUMNS_PAGOS = [
        'No. Pago', 'Version', 'Tipo De Comprobante', 'Fecha Emision', 'Serie', 'Folio', 'UUID',
        'RFC Emisor', 'Nombre Emisor', 'RFC Receptor', 'Nombre Receptor',
        'Fecha Pago', 'Forma De Pago P', 'Moneda P', 'Tipo Cambio P', 'Monto', 'Num Operacion',
        'Id Documento', 'Serie Relacionada', 'Folio Relacionado', 'Moneda DR', 'Tipo Cambio DR',
        'Metodo De Pago DR', 'Num Parcialidad', 'Imp Saldo Anterior', 'Imp Pagado', 'Imp Saldo Insoluto',
        'Base IVA Trasladado DR', 'Tasa IVA Trasladado DR', 'Importe IVA Trasladado DR',
        'Base IVA Retenido DR', 'Importe IVA Retenido DR', 'Base ISR Retenido DR', 'Importe ISR Retenido DR',
        'Observaciones'
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

    get version() { return this.#attr(this.#root, 'Version') || this.#attr(this.#root, 'version'); }
    get fecha() { return this.#attr(this.#root, 'Fecha') || this.#attr(this.#root, 'fecha'); }
    get serie() { return this.#attr(this.#root, 'Serie') || this.#attr(this.#root, 'serie'); }
    get folio() { return this.#attr(this.#root, 'Folio') || this.#attr(this.#root, 'folio'); }
    get subTotal() { return this.#attr(this.#root, 'SubTotal') || this.#attr(this.#root, 'subTotal'); }
    get descuento() { return this.#attr(this.#root, 'Descuento') || this.#attr(this.#root, 'descuento'); }
    get total() { return this.#attr(this.#root, 'Total') || this.#attr(this.#root, 'total'); }
    get moneda() { return this.#attr(this.#root, 'Moneda') || this.#attr(this.#root, 'moneda'); }
    get tipoCambio() { return this.#attr(this.#root, 'TipoCambio') || this.#attr(this.#root, 'tipoCambio'); }
    get formaPago() { return this.#attr(this.#root, 'FormaPago') || this.#attr(this.#root, 'formaDePago'); }
    get metodoPago() { return this.#attr(this.#root, 'MetodoPago') || this.#attr(this.#root, 'metodoPago'); }

    get tipoCodigo() {
        return this.#attr(this.#root, 'TipoDeComprobante') || this.#attr(this.#root, 'tipoDeComprobante');
    }

    get tipoDeComprobante() {
        const raw = this.tipoCodigo;
        return Cfdi.TIPO_COMPROBANTE[raw] || raw;
    }

    get uuid() { return this.#attr(this.#timbreFiscalDigital, 'UUID') || this.#attr(this.#timbreFiscalDigital, 'uuid'); }
    get rfcEmisor() { return this.#attr(this.#emisor, 'Rfc') || this.#attr(this.#emisor, 'rfc'); }
    get nombreEmisor() { return this.#attr(this.#emisor, 'Nombre') || this.#attr(this.#emisor, 'nombre'); }
    get rfcReceptor() { return this.#attr(this.#receptor, 'Rfc') || this.#attr(this.#receptor, 'rfc'); }
    get nombreReceptor() { return this.#attr(this.#receptor, 'Nombre') || this.#attr(this.#receptor, 'nombre'); }
    get usoCfdi() { return this.#attr(this.#receptor, 'UsoCFDI') || this.#attr(this.#receptor, 'usoCfdi'); }

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
     * Devuelve los valores del CFDI de nómina en el orden de Cfdi.COLUMNS_NOMINA.
     */
    toNominaRow() {
        const n = this.#nomina;
        const nEmisor = this.#nominaEmisor;
        const nReceptor = this.#nominaReceptor;
        const nPercepciones = this.#nominaPercepciones;

        return [
            this.version,
            this.uuid,
            this.fecha,
            this.serie,
            this.folio,
            this.rfcEmisor,
            this.nombreEmisor,
            this.#attr(nEmisor, 'RegistroPatronal'),
            this.rfcReceptor,
            this.nombreReceptor,
            this.#attr(nReceptor, 'Curp'),
            this.#attr(nReceptor, 'NumSeguridadSocial'),
            this.#attr(nReceptor, 'NumEmpleado'),
            this.#attr(nReceptor, 'Departamento'),
            this.#attr(nReceptor, 'Puesto'),
            this.#attr(nReceptor, 'TipoContrato'),
            this.#attr(nReceptor, 'PeriodicidadPago'),
            this.#attr(nReceptor, 'SalarioDiarioIntegrado'),
            this.#attr(n, 'TipoNomina'),
            this.#attr(n, 'FechaPago'),
            this.#attr(n, 'FechaInicialPago'),
            this.#attr(n, 'FechaFinalPago'),
            this.#attr(n, 'NumDiasPagados'),
            this.#attr(n, 'TotalPercepciones'),
            this.#attr(nPercepciones, 'TotalSueldos'),
            this.#attr(nPercepciones, 'TotalGravado'),
            this.#attr(nPercepciones, 'TotalExento'),
            this.#attr(n, 'TotalDeducciones'),
            this.#attr(n, 'TotalOtrosPagos'),
            this.subTotal,
            this.descuento,
            this.total,
        ];
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

    /**
     * Devuelve un array de filas para complemento de pagos.
     * Cada documento relacionado genera una fila separada.
     * Incluye número de pago para agrupar visualmente.
     */
    toPagosRows(numeroPago = 1) {
        const pagos = this.#pagos;
        const rows = [];

        if (!pagos || pagos.length === 0) {
            return [this.#buildPagosRowComplete(numeroPago, null, null)];
        }

        for (let i = 0; i < pagos.length; i++) {
            const pago = pagos[i];
            const doctosRelacionados = this.#children(pago, 'DoctoRelacionado');
            const pagoNum = numeroPago + i;

            if (doctosRelacionados.length === 0) {
                rows.push(this.#buildPagosRowComplete(pagoNum, pago, null));
            } else {
                for (const docto of doctosRelacionados) {
                    rows.push(this.#buildPagosRowComplete(pagoNum, pago, docto));
                }
            }
        }

        return rows;
    }

    #buildPagosRowComplete(numeroPago, pago, doctoRelacionado) {
        const pagoInfo = this.#extractPagoInfo(pago);
        const doctoInfo = this.#extractDoctoInfo(doctoRelacionado);
        const impuestosInfo = this.#extractImpuestosDocto(doctoRelacionado);

        return [
            numeroPago,
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
            pagoInfo.fechaPago,
            pagoInfo.formaDePagoP,
            pagoInfo.monedaP,
            pagoInfo.tipoCambioP,
            pagoInfo.monto,
            pagoInfo.numOperacion,
            doctoInfo.idDocumento,
            doctoInfo.serie,
            doctoInfo.folio,
            doctoInfo.monedaDR,
            doctoInfo.tipoCambioDR,
            doctoInfo.metodoDePagoDR,
            doctoInfo.numParcialidad,
            doctoInfo.impSaldoAnterior,
            doctoInfo.impPagado,
            doctoInfo.impSaldoInsoluto,
            impuestosInfo.baseIVATrasladado,
            impuestosInfo.tasaIVATrasladado,
            impuestosInfo.importeIVATrasladado,
            impuestosInfo.baseIVARetenido,
            impuestosInfo.importeIVARetenido,
            impuestosInfo.baseISRRetenido,
            impuestosInfo.importeISRRetenido,
            ''
        ];
    }

    #extractPagoInfo(pago) {
        if (!pago) {
            return {
                fechaPago: '',
                formaDePagoP: '',
                monedaP: '',
                tipoCambioP: '',
                monto: '',
                numOperacion: ''
            };
        }

        return {
            fechaPago: this.#attr(pago, 'FechaPago') || this.#attr(pago, 'fechaPago'),
            formaDePagoP: this.#attr(pago, 'FormaDePagoP') || this.#attr(pago, 'formaDePagoP'),
            monedaP: this.#attr(pago, 'MonedaP') || this.#attr(pago, 'monedaP'),
            tipoCambioP: this.#attr(pago, 'TipoCambioP') || this.#attr(pago, 'tipoCambioP'),
            monto: this.#attr(pago, 'Monto') || this.#attr(pago, 'monto'),
            numOperacion: this.#attr(pago, 'NumOperacion') || this.#attr(pago, 'numOperacion')
        };
    }

    #extractDoctoInfo(docto) {
        if (!docto) {
            return {
                idDocumento: '',
                serie: '',
                folio: '',
                monedaDR: '',
                tipoCambioDR: '',
                metodoDePagoDR: '',
                numParcialidad: '',
                impSaldoAnterior: '',
                impPagado: '',
                impSaldoInsoluto: ''
            };
        }

        return {
            idDocumento: this.#attr(docto, 'IdDocumento') || this.#attr(docto, 'idDocumento'),
            serie: this.#attr(docto, 'Serie') || this.#attr(docto, 'serie'),
            folio: this.#attr(docto, 'Folio') || this.#attr(docto, 'folio'),
            monedaDR: this.#attr(docto, 'MonedaDR') || this.#attr(docto, 'monedaDR'),
            tipoCambioDR: this.#attr(docto, 'EquivalenciaDR') || this.#attr(docto, 'equivalenciaDR'),
            metodoDePagoDR: this.#attr(docto, 'MetodoDePagoDR') || this.#attr(docto, 'metodoDePagoDR'),
            numParcialidad: this.#attr(docto, 'NumParcialidad') || this.#attr(docto, 'numParcialidad'),
            impSaldoAnterior: this.#attr(docto, 'ImpSaldoAnt') || this.#attr(docto, 'impSaldoAnt'),
            impPagado: this.#attr(docto, 'ImpPagado') || this.#attr(docto, 'impPagado'),
            impSaldoInsoluto: this.#attr(docto, 'ImpSaldoInsoluto') || this.#attr(docto, 'impSaldoInsoluto')
        };
    }

    #extractImpuestosDocto(docto) {
        const result = {
            baseIVATrasladado: '',
            tasaIVATrasladado: '',
            importeIVATrasladado: '',
            baseIVARetenido: '',
            importeIVARetenido: '',
            baseISRRetenido: '',
            importeISRRetenido: ''
        };

        if (!docto) return result;

        const impuestosDR = this.#child(docto, 'ImpuestosDR');
        if (!impuestosDR) return result;

        const trasladosDR = this.#child(impuestosDR, 'TrasladosDR');
        if (trasladosDR) {
            const traslados = this.#children(trasladosDR, 'TrasladoDR');
            for (const traslado of traslados) {
                const impuesto = this.#attr(traslado, 'ImpuestoDR') || this.#attr(traslado, 'impuestoDR');
                if (impuesto === Cfdi.CODIGO_IMPUESTO.IVA) {
                    result.baseIVATrasladado = this.#attr(traslado, 'BaseDR') || this.#attr(traslado, 'baseDR');
                    result.tasaIVATrasladado = this.#attr(traslado, 'TasaOCuotaDR') || this.#attr(traslado, 'tasaOCuotaDR');
                    result.importeIVATrasladado = this.#attr(traslado, 'ImporteDR') || this.#attr(traslado, 'importeDR');
                    break;
                }
            }
        }

        const retencionesDR = this.#child(impuestosDR, 'RetencionesDR');
        if (retencionesDR) {
            const retenciones = this.#children(retencionesDR, 'RetencionDR');
            for (const retencion of retenciones) {
                const impuesto = this.#attr(retencion, 'ImpuestoDR') || this.#attr(retencion, 'impuestoDR');
                if (impuesto === Cfdi.CODIGO_IMPUESTO.IVA) {
                    result.baseIVARetenido = this.#attr(retencion, 'BaseDR') || this.#attr(retencion, 'baseDR');
                    result.importeIVARetenido = this.#attr(retencion, 'ImporteDR') || this.#attr(retencion, 'importeDR');
                } else if (impuesto === Cfdi.CODIGO_IMPUESTO.ISR) {
                    result.baseISRRetenido = this.#attr(retencion, 'BaseDR') || this.#attr(retencion, 'baseDR');
                    result.importeISRRetenido = this.#attr(retencion, 'ImporteDR') || this.#attr(retencion, 'importeDR');
                }
            }
        }

        return result;
    }

    get #emisor() { return this.#child(this.#root, 'Emisor'); }
    get #receptor() { return this.#child(this.#root, 'Receptor'); }
    get #impuestos() { return this.#child(this.#root, 'Impuestos'); }
    get #complemento() {
        return this.#child(this.#root, 'Complemento') || this.#child(this.#root, 'Complementos');
    }

    get #timbreFiscalDigital() {
        return this.#complemento ? this.#child(this.#complemento, 'TimbreFiscalDigital') : null;
    }

    get #nomina() {
        return this.#complemento ? this.#child(this.#complemento, 'Nomina') : null;
    }

    get #nominaEmisor() {
        return this.#nomina ? this.#child(this.#nomina, 'Emisor') : null;
    }

    get #nominaReceptor() {
        return this.#nomina ? this.#child(this.#nomina, 'Receptor') : null;
    }

    get #nominaPercepciones() {
        return this.#nomina ? this.#child(this.#nomina, 'Percepciones') : null;
    }

    get #complementoPagos() {
        if (!this.#complemento) return null;
        return this.#child(this.#complemento, 'Pagos');
    }

    get #pagos() {
        if (!this.#complementoPagos) return [];
        return this.#children(this.#complementoPagos, 'Pago');
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
