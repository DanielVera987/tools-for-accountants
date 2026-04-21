const { createApp, ref } = Vue;

createApp({
    setup() {
        const files = ref([]);
        const filename = ref('');
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
                const downloadedName = new CfdiExcelExporter(cfdis).download(filename.value);
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

        return { files, filename, processing, error, success, fileInput, handleFiles, generateExcel, reset };
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
