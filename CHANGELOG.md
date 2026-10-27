# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [0.3.0] - 2026-10-27

### Added

- Análisis real de riesgos con IA (etapa 3): checklist propio (`lib/analysis/checklists/rental-v1.ts`) basado en la ley vigente (post DNU 70/2023, que derogó la Ley de Alquileres), sin RAG todavía. Reemplaza el informe de ejemplo del flujo pagado por hallazgos reales por cláusula, siempre citando la cláusula, más una revisión del documento completo (anexos no adjuntos, domicilios inconsistentes, firmantes vs. ejemplares, cláusula de jurisdicción faltante).
- Descarga del informe en PDF (con `pdf-lib`), con marca de agua de Contrato Claro.
- Aviso legal visible (no letra chica) en vista previa, informe y re-chequeo: esto no es un consejo legal, consultar a un abogado antes de decidir algo.
- `docs/normativa-alquileres.md`: referencia de la ley vigente usada para el checklist, con fuentes y fecha, para actualizar a mano cuando cambie.
- Animación en la pantalla de "Leyendo tu contrato" / "Preparando tu informe": paso activo con anillo pulsante e ícono animado, para que se note que la IA está trabajando.

### Fixed

- "Mis análisis" escondía el link a "Ver informe" cuando la fecha de firma es hoy (dejaba solo "Re-chequear hoy"), sin forma de volver a ver un informe ya pagado.
- El checklist citaba el régimen de rescisión anticipada derogado (preaviso de 10 días + multa). El vigente (art. 1221 CCyC, reescrito por el DNU 70/2023) es 10% del saldo de alquileres futuros, sin plazo mínimo de permanencia.
- Agrega la Ley 5859 (CABA): prohibido cobrarle la comisión inmobiliaria a la inquilina en alquileres de vivienda.

## [0.2.0] - 2026-10-26

### Added

- Claude (Haiku 5.5) conectado en `lib/ai/`: lee fotos y PDF escaneados, y saca los datos clave del contrato con salida estructurada (Zod).
- Panel `/admin` con el costo de IA por análisis: tokens y costo estimado por llamada a Claude (`ai_usage`), con rol de usuario (`user`/`admin`, se activa por SQL).
- Logs en cada paso del análisis (subida, extracción, lectura con IA, cláusulas, confirmación) para poder seguirlos en producción.
- Primer despliegue en Render: base de datos, storage S3-compatible, Inngest Cloud, Mercado Pago, probado de punta a punta (pago de prueba y pago real).

### Fixed

- Las migraciones corren solas al arrancar el contenedor (`Dockerfile`), sin depender del Pre-Deploy Command pago de Render.
- Webhook de Mercado Pago: ya no manda su propia `notification_url` en la preferencia (usaba una firma distinta a la del panel, imposible de validar); ahora usa siempre el webhook configurado en "Tus integraciones". Se agregaron logs de los rechazos por firma inválida.
- Falla intermitente de los tests de Playwright en CI: un solo worker (evita que el servidor de desarrollo de Next.js se sature compilando rutas en paralelo) y más margen para la primera compilación en frío de cada ruta.
- Health check (`/api/health`) ahora también valida Claude (sin gastar tokens, con `models.retrieve`) y que Mercado Pago tenga la clave del webhook cargada.

### Changed

- Modelo de IA: Claude Haiku 5.5 (antes Haiku 4.5), más nuevo y más barato.

### Known issues

- Un test de Playwright (`e2e/flow.spec.ts`, "subir → confirmar → vista previa...") sigue fallando de forma intermitente en CI; no afecta producción (probado a mano). Detalle en el comentario arriba del test.

## [0.1.0] - 2026-10-18

Etapas 0, 1 y 2 (ver `docs/progress.md`): base del proyecto (Docker, base de datos, cuentas), pagos con Mercado Pago (simulador y real, con webhook) y captura/extracción de contratos (PDF, Word, texto y fotos, con el simulador de IA).
