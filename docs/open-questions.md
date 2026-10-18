# Preguntas abiertas

Se actualiza a medida que se decide. Cuando una pregunta se cierra, se mueve a `docs/decisions/`.

## Bloquean etapas próximas

| # | Pregunta | Bloquea | Propuesta |
|---|---|---|---|
| 1 | ¿Cifrado propio por archivo (envelope, con clave por usuario) o alcanza el cifrado del lado del servidor de S3/R2? | etapa 2 | SSE de R2 en el MVP; cifrado propio si lo pide el abogado |
| 2 | Si el análisis falla después de pagar: ¿reintento, reembolso automático o manual? | etapa 1 | 3 reintentos automáticos; después, reembolso manual con aviso por mail |
| 3 | ¿Límite de análisis gratis (extracción + vista previa) por cuenta o por día? | etapa 2 | 3 por día por cuenta + Turnstile |
| 4 | Re-chequeo entre formatos distintos (se analizó una foto y la versión final es un PDF): ¿se acepta? ¿con qué tolerancia? | etapa 4 | se acepta, con diff por cláusula; los números no tienen tolerancia |
| 5 | Simulador de ajuste: ¿qué índices (ICL, IPC, Casa Propia)? ¿carga manual o API oficial? ¿contratos en dólares? | etapa 3 | ICL (BCRA) + IPC (INDEC) con carga semanal automática |
| 6 | ¿El MVP cubre contratos firmados antes del DNU 70/2023 (Ley 27.551)? | etapa 3 y 5 | solo los firmados desde el 29/12/2023 |
| 7 | ¿Solo `.docx` o también `.doc`? | etapa 2 | solo `.docx` |

## Del documento base (§14)

Nombre y dominio · precios · modelos de IA definitivos · plazo de retención (con el abogado) · alcance normativo · modalidad del abogado o escribano · revisión humana en el MVP · umbral para decidir la app · facturación electrónica (ARCA) · horas y perfil del equipo.

## Para Render

- Plan pago de Postgres y del Web Service antes de cargar datos reales.
- Región de los datos (EE. UU. o Frankfurt) y su revisión con el abogado.
