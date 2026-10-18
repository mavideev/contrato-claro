# Spec 05 — Jobs, extracción, análisis y re-chequeo

**Estado:** borrador para validar · **Etapas:** 2, 3 y 4 (en la etapa 0 solo la función de prueba) · **Fuente:** documento base §3, §5, §6 y §10

## Objetivo

Correr fuera de la petición HTTP todo lo que tarda: lectura de archivos, extracción, análisis con IA, generación del PDF y comparación del re-chequeo. Además, que cada paso sea reintentable y observable.

## Funciones de Inngest (`jobs/`)

| Evento | Función | Pasos | Etapa |
|---|---|---|---|
| `test/hello` | `hello` | devuelve un saludo | 0 |
| `analysis/uploaded` | `extractAnalysis` | 1) texto directo (pdf.js / mammoth) o visión para fotos; 2) dividir en cláusulas; 3) extraer los campos críticos; 4) estado → `awaiting_confirmation` | 2 |
| `analysis/confirmed` | `previewAnalysis` | checklist rápida → conteos por nivel → `preview_ready` | 3 |
| `analysis/paid` | `runAnalysis` | hallazgos por cláusula (JSON validado con Zod) → `findings` → huellas → PDF → `ready` | 3 |
| `recheck/uploaded` | `runRecheck` | extraer la versión final → comparar hash y diff por cláusula → certificado | 4 |
| `user/deleted`, `document/deleted` | `purgeFiles` | borrar objetos de S3 | 0–1 |

Cada paso de IA usa `step.run` para que un reintento no repita pasos que ya terminaron. Concurrencia por usuario: 1 análisis a la vez.

## Subida de archivos

1. El cliente comprime y corrige la orientación (fotos). Después pide URL firmadas de subida (`PUT`) a una Server Action, una por archivo o página.
2. El navegador sube directo a S3, sin pasar por la app.
3. Al terminar, el cliente avisa y el servidor verifica tamaño y tipo con un `HEAD` del objeto. Recién entonces emite `analysis/uploaded`.
4. Límites: 20 MB por archivo, 30 páginas por contrato, tipos `image/jpeg|png|heic|webp`, `application/pdf`, `.docx`.

## IA (etapas 2 y 3)

- SDK de Anthropic, con salida estructurada validada con Zod y caché de prompts para la checklist.
- Modelos propuestos: Haiku 5.5 para extracción y clasificación, y Sonnet 5.5 para el juicio de riesgo y la redacción. Se valida con el set de prueba (`evals/`) antes de cerrar.
- Todo hallazgo **debe** tener `clause_id`. Si el modelo devuelve un hallazgo sin cláusula, se descarta y queda registrado.
- Los prompts y la versión de la checklist se guardan en el repo (`lib/analysis/checklists/rental-v1.ts`), y `analyses.checklist_version` registra cuál se usó.

## Re-chequeo (etapa 4)

- Si el archivo digital es idéntico (mismo `file_sha256`), el resultado es «idéntico» sin más.
- Si no, se normaliza el texto (espacios, comillas, guiones) y se compara la huella por cláusula. Para cada cláusula distinta se calcula un diff por palabras.
- Fotos: hay tolerancia a errores de lectura (umbral a definir con el set de prueba). Una diferencia en números (montos, plazos, porcentajes) siempre se marca como cambio.
- El certificado (PDF) incluye fechas, huellas y la lista de cambios, con la leyenda «No certifica autenticidad ni validez legal».

## Criterios de aceptación

- Etapa 0:
  - [x] El panel de Inngest local muestra la app registrada.
  - [x] Enviar `test/hello` ejecuta la función y se ve el resultado.
- Etapa 2:
  - [ ] Los contratos de muestra se convierten en cláusulas correctas según las métricas de `evals/`.
- Etapa 3:
  - [ ] El informe del set de prueba alcanza las métricas base, y todo hallazgo cita su cláusula.
- Etapa 4:
  - [ ] Los cambios inyectados en el set de prueba se detectan, con 0 falsos «idéntico».

## Fuera de alcance (MVP)

OCR aparte, firma digital y sellado de tiempo, revisión humana integrada.
