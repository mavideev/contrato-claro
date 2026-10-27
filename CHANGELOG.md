# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

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
