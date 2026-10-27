# Normativa de alquileres (base para el checklist, etapa 3)

Estado del derecho vigente a la fecha de este documento (26/10/2026). Sin RAG
todavía (eso es la etapa 5): esto es la referencia manual que usa
`lib/analysis/checklists/rental-v1.ts`. Actualizar a mano cuando haya una
reforma, y anotar la fecha del cambio.

## El cambio clave: DNU 70/2023

El **DNU 70/2023** (29/12/2023), en su Artículo 136, **derogó por completo la Ley 27.551** ("Ley de Alquileres", 2020). Desde esa fecha, la locación de inmuebles vuelve a regirse por el Código Civil y Comercial (CCyC), con los artículos 1196 y 1198 reescritos por el propio DNU — no es solo "volver al texto de antes de 2020", el DNU puso un texto nuevo.

⚠️ **Contratos firmados antes del 29/12/2023** quedan bajo la Ley 27.551 (plazo mínimo 3 años, depósito tope 1 mes por año, ajuste solo por ICL). El checklist de abajo asume un contrato firmado **después** de esa fecha; si `signingDate` es anterior, el informe debería avisarlo en vez de aplicar estos criterios.

## Qué dice hoy (post DNU 70/2023)

| Tema | Artículo | Qué dice |
|---|---|---|
| Plazo | Art. 1198 CCyC (reescrito) | Libre entre las partes. Si el contrato no dice nada, rige un piso legal: **2 años** para vivienda permanente, **3 años** para otros usos. |
| Depósito en garantía | Art. 1196 CCyC (reescrito) | Libre en monto, moneda y forma de devolución — **sin tope legal** (antes, con la 27.551, el tope era 1 mes de alquiler por año de contrato). |
| Ajuste / actualización | Art. 1196 CCyC (reescrito) | Libre: cualquier índice público o privado, siempre en la misma moneda en que se pactó el alquiler (antes, con la 27.551, era obligatorio el ICL). |
| Periodicidad de pago | Art. 1196 CCyC (reescrito) | Libre, pero no puede ser más frecuente que mensual. |
| Rescisión anticipada del locatario | Art. 1221 CCyC | **Sin confirmar si el DNU lo tocó.** Hasta nueva verificación, asumir el régimen clásico: preaviso de (10) días, indemnización de 1,5 meses de alquiler si rescinde antes del primer año, 1 mes si es después. |
| Comisión inmobiliaria | — | No se encontró una fuente clara sobre quién la paga después del DNU. No incluir como criterio hasta confirmar. |

## Qué significa para el checklist

Con esto, la ley casi no exige nada por default: el riesgo real es la **ambigüedad** (algo que el contrato no aclara y que, al no haber un piso legal como antes, puede jugar en contra del inquilino). El checklist v1 prioriza señalar qué no quedó explícito, no afirmar "esto es ilegal".

## Fuentes

- [Decreto 70/2023 (texto)](https://www.argentina.gob.ar/normativa/nacional/decreto-70-2023-395521/texto) — Art. 136, derogación de la Ley 27.551.
- Búsqueda web (26/10/2026) sobre el estado post-DNU de los artículos 1196 y 1198 del CCyC — varios estudios jurídicos coinciden en lo resumido arriba (ver `abeledogottheil.com.ar`, `pg-abogados.com.ar`, `aldiaargentina.microjuris.com`).

## Pendiente de confirmar

- Si el DNU 70/2023 modificó el Art. 1221 CCyC (rescisión anticipada).
- Quién paga la comisión inmobiliaria después del DNU.
- Texto literal actualizado de los artículos (las fuentes consultadas son análisis de estudios jurídicos, no el Boletín Oficial línea por línea).

**Esto no reemplaza una revisión por un abogado antes de confiar en el checklist con usuarios reales.**
