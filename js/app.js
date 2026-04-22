const { createApp, ref } = Vue;

createApp({
    setup() {
        const files = ref([]);
        const filename = ref('');
        const tipo = ref(CfdiExcelExporter.TIPO_INGRESO_EGRESO);
        const processing = ref(false);
        const error = ref('');
        const success = ref('');
        const fileInput = ref(null);

        function handleFiles(event) {
            files.value = Array.from(event.target.files || []);
            error.value = '';
            success.value = '';
        }

        async function generateExcel() {
            error.value = '';
            success.value = '';
            if (!files.value.length) return;

            processing.value = true;
            try {
                const cfdis = await parseAllFiles(files.value);
                validateTipos(cfdis, tipo.value);
                const downloadedName = new CfdiExcelExporter(cfdis, tipo.value).download(filename.value);
                success.value = `Se generó ${downloadedName} con ${cfdis.length} CFDI(s).`;
            } catch (err) {
                console.error(err);
                error.value = err.message || 'Error procesando los archivos.';
            } finally {
                processing.value = false;
            }
        }

        function reset() {
            files.value = [];
            filename.value = '';
            error.value = '';
            success.value = '';
            if (fileInput.value) fileInput.value.value = '';
        }

        return { files, filename, tipo, processing, error, success, fileInput, handleFiles, generateExcel, reset };
    }
}).mount('#app');

async function parseAllFiles(fileList) {
    const cfdis = [];
    for (const file of fileList) {
        try {
            const xml = await file.text();
            cfdis.push(new Cfdi(xml));
        } catch (err) {
            throw new Error(`Error en "${file.name}": ${err.message}`);
        }
    }
    return cfdis;
}

function validateTipos(cfdis, tipo) {
    const permitidos = tipo === CfdiExcelExporter.TIPO_NOMINA ? ['N'] : ['I', 'E'];
    const incompatibles = cfdis.some(c => !permitidos.includes(c.tipoCodigo));
    if (incompatibles) {
        throw new Error('Existen CFDI de diferente tipo al seleccionado. Procura subir archivos del mismo tipo.');
    }
}
