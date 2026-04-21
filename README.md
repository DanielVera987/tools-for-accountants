# CFDI a Excel

Herramienta web para convertir Comprobantes Fiscales Digitales por Internet (CFDI) en formato XML a una hoja de cálculo de Excel (`.xlsx`) consolidada.

## Características

- **Conversión masiva**: sube uno o varios CFDIs a la vez y obtén un único archivo Excel.
- **Compatible con CFDI 3.3 y 4.0**.
- **100% en el navegador**: los archivos nunca salen de tu equipo.
- **Sin instalación, sin registro, sin base de datos**.
- **Cálculo automático de impuestos** cuando el CFDI no los trae precalculados en el nodo raíz.

## Uso

1. Abre la aplicación en tu navegador.
2. (Opcional) Escribe el nombre del archivo de salida.
3. Selecciona uno o varios archivos `.xml` de CFDIs.
4. Presiona **Generar Excel**. El archivo `.xlsx` se descargará automáticamente.

## Columnas exportadas

Cada fila del Excel representa un CFDI con los siguientes campos:

| Campo | Descripción |
| --- | --- |
| Versión | Versión del CFDI (3.3 / 4.0) |
| Tipo de Comprobante | Ingreso / Egreso / Pago |
| Fecha de Emisión | Fecha del comprobante |
| Serie | Serie del comprobante |
| Folio | Folio del comprobante |
| UUID | Identificador del Timbre Fiscal Digital |
| RFC Emisor | RFC del emisor |
| Nombre Emisor | Razón social del emisor |
| RFC Receptor | RFC del receptor |
| Nombre Receptor | Razón social del receptor |
| Uso de CFDI | Clave del uso declarado por el receptor |
| Subtotal | Subtotal del comprobante |
| Descuento | Descuento aplicado |
| Retenido IEPS | Total de retenciones de IEPS |
| Retenido IVA | Total de retenciones de IVA |
| Retenido ISR | Total de retenciones de ISR |
| Traslado IVA 16% | Total de traslados de IVA al 16% |
| Total Impuestos Trasladados | Suma de todos los impuestos trasladados |
| Total Impuestos Retenidos | Suma de todos los impuestos retenidos |
| Total | Importe total del comprobante |
| Moneda | Moneda del comprobante |
| Tipo de Cambio | Tipo de cambio aplicado |
| Forma de Pago | Clave de la forma de pago |
| Método de Pago | Clave del método de pago |
| Conceptos | Descripciones concatenadas de los conceptos |

## Ejecución local

No requiere instalación ni servidor. Basta con abrir el archivo `index.html` en cualquier navegador moderno (Chrome, Firefox, Safari, Edge).

## Estructura del proyecto

```
.
├── index.html
└── js/
    ├── cfdi.js                  # Clase Cfdi: parseo y extracción de datos
    ├── cfdi-excel-exporter.js   # Generación del archivo Excel
    └── app.js                   # Interfaz y orquestación
```

### Arquitectura

- **`Cfdi`**: encapsula el parseo de un XML. Expone accesores limpios (`version`, `uuid`, `rfcEmisor`, etc.), calcula agregados de impuestos con fallback concepto por concepto, y devuelve una fila lista para exportar vía `toRow()`.
- **`CfdiExcelExporter`**: recibe una colección de instancias `Cfdi` y genera el archivo `.xlsx` usando SheetJS.
- **`app.js`**: capa de interfaz. Solo orquesta eventos, estado reactivo y llamadas a las clases anteriores.

## Privacidad

Al ser una aplicación 100% del lado del cliente:

- Los archivos `.xml` **no se suben a ningún servidor**.
- La información fiscal **nunca sale del navegador**.
- No se genera ningún registro de uso.

## Licencia

MIT

## Autor

Daniel Alberto Vera Angulo · [ClouDav](https://danielvera987.github.io/danielvera)
