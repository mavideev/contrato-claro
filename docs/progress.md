# Avance de la implementación

Qué está hecho, qué falta y dónde está cada cosa. Se actualiza al cerrar cada parte (un commit por parte). El detalle de cada criterio está marcado en su spec (`[x]` hecho, `[ ]` pendiente).

Leyenda: ✅ hecho y probado · 🟡 hecho en parte · ⏳ pendiente

**Para probar a mano:** [guia-de-prueba.md](guia-de-prueba.md), paso a paso.

## Cómo retomar (última actualización: 18/10/2026)

- **Dónde quedamos:** etapa 1 (pagos) terminada con el simulador, probada a mano por la usuaria y con tests en verde. Rama `feat/etapa-1-pagos`; la usuaria hace el PR y el merge a `main`.
- **Para levantar el entorno:** `make dev` (los datos quedan guardados entre reinicios). App en http://localhost:3000, mails en http://localhost:8025.
- **Próximos pasos, en orden:**
  1. Si la usuaria ya tiene la cuenta de Mercado Pago Developers: cargar las credenciales de prueba, levantar un túnel para el webhook y probar el pago real con tarjetas de prueba (ver «Etapa 1» abajo).
  2. Si no: arrancar la **etapa 2, captura y extracción** (subida real a S3 desde «Subir», lectura de PDF, Word, texto y fotos, y división en cláusulas). Spec: `docs/specs/05-jobs-and-analysis.md`.
  3. Pendientes sueltos: borrar un análisis suelto, captcha, la función que borra archivos al borrar la cuenta y la pregunta abierta 2 (qué pasa si el análisis falla después de pagar).

## Etapas del proyecto

El plan completo está en el [documento base, §9](../documento-base-mvp-v0.2.md#9-plan-por-etapas). Cada etapa tiene su spec en `docs/specs/`.

| Etapa | Qué incluye | Estado |
|---|---|---|
| 0. Base | repositorio, Docker, base de datos, cuentas, pantallas, webhook, subida a S3, CI | ✅ (falta el primer despliegue en Render, ver [deploy.md](deploy.md)) |
| 1. Cuentas y pago | Mercado Pago real con webhook | 🟡 todo funciona con el simulador; falta probar con la cuenta de Mercado Pago |
| 2. Captura y extracción | foto, PDF, Word y texto → cláusulas | ⏳ |
| 3. Informe de alquileres | checklist, semáforo, citas, PDF | ⏳ |
| 4. Re-chequeo | huellas, comparación, certificado | ⏳ |
| 5. Normativa (RAG) | normas versionadas y búsqueda | ⏳ |
| 6. Cierre | revisión humana, calidad de fotos, decisión sobre la app | ⏳ |

## Etapa 0 — Base (rama `feat/etapa-0-base`)

| Parte | Estado | Qué incluye | Commit |
|---|---|---|---|
| 1. Entorno Docker y app base | ✅ | Compose (Postgres+pgvector, RustFS, Mailpit, Inngest, Adminer), Dockerfile `dev`/`runner`, Makefile, `lib/env.ts`, `/api/health`, función Inngest `hello` | `23e242c`, `def03ed` |
| 2. Esquema, migraciones y seed | ✅ | `db/schema.ts`, migraciones Drizzle, seed con 2 usuarios y 4 análisis, `lib/db/scoped.ts` con tests de aislamiento | `1925308` |
| 3. Cuentas (Better Auth) | ✅ | ver detalle abajo | `7c70e5e` |
| 4a. Sistema visual y panel | ✅ | ver detalle abajo | `c95df7c` |
| 4b. Flujo del análisis | ✅ | ver detalle abajo | `b8aa7a4` |
| 4c. Navegación entre pantallas (correcciones de la prueba manual) | ✅ | encabezado en el flujo, panel vacío | `fb3a4c3` |
| 5. Webhook de Mercado Pago, subida a S3 e Inngest | ✅ | ver detalle abajo | `56f7000` |
| 6a. Guía de despliegue y migraciones en la imagen de producción | ✅ | [deploy.md](deploy.md); Render lo configura la usuaria | `6dfe00e` |
| 6b. CI (GitHub Actions) | ✅ | `.github/workflows/ci.yml`: lint, tipos, vitest, Playwright y la imagen de producción (~4 min) | `55b67b0` |

### Parte 3 — Cuentas (spec 02)

| Qué | Estado | Dónde |
|---|---|---|
| Better Auth con adaptador Drizzle sobre las tablas de `db/schema.ts` | ✅ | `lib/auth/index.ts` |
| Email + contraseña con verificación obligatoria (link vence en 1 h, entra solo al verificar) | ✅ | `lib/auth/index.ts`, `/registro`, `/verificar` |
| Link mágico (15 min, un solo uso) | ✅ | plugin `magicLink`, `/ingresar` → «Recibir un link por email» |
| Recuperar contraseña (1 h, cierra las demás sesiones) | ✅ | `/recuperar`, `/recuperar/nueva` |
| Google (solo con `GOOGLE_CLIENT_ID/SECRET`) | 🟡 | el botón aparece y desaparece según las variables; falta probar OAuth con credenciales reales |
| Mails: SMTP a Mailpit en local, Resend si hay `RESEND_API_KEY` | ✅ | `lib/email/` |
| `proxy.ts` protege `/analisis`, `/pago`, `/pagos`, `/cuenta` → `/ingresar?next=` | ✅ | `proxy.ts` |
| Sesión validada en el servidor (`requireUser`) | ✅ | `lib/auth/session.ts` |
| `?next=` solo acepta rutas internas | ✅ | `lib/auth/redirect.ts` |
| Rate limit en la base | ✅ | tabla `rate_limit` |
| `audit_log`: `sign_up`, `sign_in`, `password_reset` | ✅ | `databaseHooks` en `lib/auth/index.ts` |
| `audit_log`: `account_deleted` y borrar cuenta | ✅ | `/cuenta` (parte 4a) |
| Captcha (Turnstile) | ⏳ | antes del lanzamiento |
| Pantallas de cuenta con el diseño del prototipo | ✅ | parte 4a |

**Tests:** `pnpm test` y `pnpm e2e`. De la parte 3: `lib/auth/auth.test.ts` (integración contra la base local: registro, verificación, error genérico, link mágico de un solo uso, recuperación que cierra sesiones), `lib/auth/redirect.test.ts`, `lib/email/templates.test.ts`.

**Cómo probarlo a mano:** `make dev` → http://localhost:3000/ingresar con `demo@contratoclaro.local` / `demo12345`. Para registro, link mágico y recuperación, los mails llegan a http://localhost:8025.

### Parte 4a — Sistema visual y panel (spec 03)

| Qué | Estado | Dónde |
|---|---|---|
| Fraunces, Public Sans e IBM Plex Mono con `next/font`; colores del prototipo como tokens | ✅ | `app/layout.tsx`, `app/globals.css` |
| Componentes base: botones, píldoras del semáforo, títulos | ✅ | `components/ui/` |
| Navegación del panel: barra lateral (desktop) y pestañas abajo (mobile) | ✅ | `components/app/panel-shell.tsx` |
| Registro / Ingresar / Recuperar / Verificar con el diseño de «1 · Registro» | ✅ | `app/(public)/` |
| Mis análisis con datos del seed (Firma hoy, Informe listo, Pago pendiente) | ✅ | `app/(app)/analisis/page.tsx`, `lib/analysis/presentation.ts` |
| Pagos (historial) | ✅ | `app/(app)/pagos/` |
| Cuenta: email, cerrar sesión y borrar cuenta (confirmación, cascada, evento `account/deleted`) | ✅ | `app/(app)/cuenta/` |
| 404 propia | ✅ | `app/not-found.tsx` |
| `/` redirige a `/analisis` (sin landing por ahora) | ✅ | `next.config.ts` |
| Textos de guardado corregidos en Registro y Mis análisis | ✅ | |
| Playwright: smoke por ruta en 1280 y 390 (sin errores de consola ni scroll horizontal) y recorrido de borrar cuenta | ✅ | `e2e/` |
| Panel vacío («Todavía no analizaste ningún contrato») | ✅ | parte 4c: antes redirigía a subir y dejaba Pagos y Cuenta inaccesibles |

### Parte 4b — Flujo del análisis (spec 03)

Etapa 0: las pantallas son las reales y navegan como el prototipo, pero detrás no hay extracción, análisis ni Mercado Pago todavía (ver «Stubs» abajo).

| Pantalla | Estado | Ruta |
|---|---|---|
| Subir (Alquiler; Compraventa y Boleto «Próximamente»; «Sacar foto» solo en mobile, aviso en desktop) | ✅ | `/analisis/nuevo` |
| Escanear (mobile): maqueta con contador de páginas y «Listo (n)» | 🟡 | `/analisis/nuevo/escanear` (sin cámara real: etapa 2) |
| Confirmar datos: 12 campos + fecha de firma prevista; aviso y «Revisá» del monto solo si el origen es foto | ✅ | `/analisis/[id]/confirmar` |
| Análisis y pago: pasos, vista previa con el semáforo, «[PRECIO]», re-chequeo como extra | ✅ | `/analisis/[id]/estado` |
| Retorno del pago: aprobado, pendiente, rechazado, cancelado, reembolsado (lee la base) | ✅ | `/pago/retorno?analisis=` |
| Informe: hallazgos por nivel con la cláusula citada y «qué pedir», cláusulas sin alertas | ✅ | `/analisis/[id]/informe` |
| Re-chequeo: compra → subir versión final → comparando → «Todo idéntico» o cambios con diff por palabras | ✅ | `/analisis/[id]/rechequeo` |
| 404 para análisis ajenos o ids inválidos | ✅ | |

**Stubs de la etapa 0** (`app/(app)/analisis/actions.ts`):
- «Analizar contrato» crea el análisis con datos de ejemplo (`lib/analysis/sample.ts`) como si la extracción ya hubiera corrido. El archivo o texto no se envía: en la etapa 2 se sube directo a S3 con URL firmada.
- El origen «foto» viaja en la URL (`?origen=foto`) hasta que exista `documents` (etapa 2).
- «Confirmar y analizar» deja el análisis en `preview_ready` con una vista previa de ejemplo.
- «Pagar con Mercado Pago» crea el pago `pending` (spec 04, paso 2) y va a `/pago/retorno`; la preferencia y el webhook llegan en la etapa 1, así que el pago queda pendiente.
- El re-chequeo subido queda en «comparando» (la comparación real es de la etapa 4).
- «Descargar informe PDF» y «Descargar certificado» están deshabilitados (etapas 3 y 4).

**Seed:** el análisis «Firma hoy» trae un re-chequeo pagado con 2 cambios (cláusulas 4 y 11). Si tu base es anterior, `make reset`.

**Tests:** `lib/diff.test.ts`, `lib/db/scoped.test.ts` (escrituras: confirmar, pagos, re-chequeo y aislamiento), `e2e/flow.spec.ts` (subir → confirmar → pagar; escaneo en mobile; informe y re-chequeo del seed; un usuario no puede abrir el análisis de otro) y el smoke de todas las rutas en 1280 y 390.

### Parte 5 — Webhook, subida a S3 e Inngest (specs 04 y 05)

| Qué | Estado | Dónde |
|---|---|---|
| Webhook de Mercado Pago: firma inválida → 401; evento repetido → una sola fila en `payment_events`; responde 501 hasta la etapa 1 | ✅ | `app/api/webhooks/mercadopago/route.ts`, `lib/payments/mercadopago.ts` |
| Subida con URL firmada (PUT directo del navegador a S3, tipo y tamaño firmados, verificación con HEAD) | ✅ | `lib/storage/upload.ts` |
| Límites: 20 MB, JPG/PNG/HEIC/WEBP, PDF y DOCX | ✅ | `lib/storage/upload.ts` |
| Inngest: la app aparece registrada y `test/hello` corre («Hola, …») | ✅ | `jobs/hello.ts` |
| Usar la subida firmada desde la pantalla «Subir» | ⏳ | etapa 2 (con la extracción) |

**Tests:** `lib/payments/mercadopago.test.ts`, `app/api/webhooks/mercadopago/route.test.ts`, `lib/storage/upload.test.ts` (sube un PDF de prueba a RustFS y lo borra).

### Parte 6b — CI (spec 00)

- Dos trabajos: **Lint y tipos** (rápido) y **Tests con el entorno completo** (levanta el mismo `docker compose` que en local, corre vitest y Playwright y construye la imagen de producción).
- Se probó replicando GitHub: clon limpio, base vacía. Así apareció un error real: la carpeta `public/` no estaba en git y la imagen de producción no se construía (a Render le habría pasado igual). Corregido.

## Etapa 1 — Pagos (rama `feat/etapa-1-pagos`)

Mientras no hay cuenta de Mercado Pago, los pagos pasan por un **simulador**: «Pagar» lleva a una pantalla de prueba con «Aprobar», «Dejarlo pendiente» y «Rechazarlo». El simulador manda el mismo aviso firmado que mandaría Mercado Pago, así que el resto del circuito es el real.

| Qué | Estado | Dónde |
|---|---|---|
| Proveedor de pagos intercambiable: simulador o Mercado Pago (según `MP_ACCESS_TOKEN` / `PAYMENTS_PROVIDER`); el simulador está prohibido en producción | ✅ | `lib/payments/provider.ts` |
| Simulador (pantalla y aviso firmado) | ✅ | `/pago/simulador`, `lib/payments/mock.ts` |
| Mercado Pago real: crear preferencia (Checkout Pro) y leer el pago por API REST | 🟡 escrito y probado con la API simulada; falta probar con credenciales de prueba | `lib/payments/mercadopago-api.ts` |
| Webhook: firma, idempotencia, consulta del pago real, reintento si falla (500) | ✅ | `lib/payments/webhook.ts`, `lib/payments/process.ts` |
| Protecciones: un aviso viejo no deshace una aprobación; si el monto no coincide, no se aprueba | ✅ | `lib/payments/process.ts` |
| Pago aprobado → análisis `paid` → job de Inngest `analysis/paid` → informe de ejemplo → `ready` | ✅ | `jobs/analysis-paid.ts`, `lib/analysis/sample-report.ts` |
| Compra del re-chequeo con el mismo circuito | ✅ | |
| `/pago/retorno` y el estado del análisis se actualizan solos mientras hay algo pendiente | ✅ | `components/app/auto-refresh.tsx` |
| Precios por variable (`PRICE_ANALYSIS_ARS`, `PRICE_RECHECK_ARS`); sin definir se muestra [PRECIO] | ✅ | `lib/env.ts` |
| Túnel para recibir webhooks de Mercado Pago en local | ⏳ | cuando haya credenciales |
| Qué pasa si el análisis falla después de pagar (pregunta abierta 2) | ⏳ | |

**Tests:** `lib/payments/providers.test.ts` (simulador y Mercado Pago con la API simulada) y `app/api/webhooks/mercadopago/route.test.ts` (aprobado, repetido, rechazado, aviso viejo, error y reintento, monto distinto). E2E: pagar en el simulador → informe → comprar el re-chequeo.

**Para probarlo a mano:** cuenta nueva → subir → confirmar → «Pagar con Mercado Pago» → «Aprobar el pago» → «Ver mi informe» (tarda unos segundos).

**Cuando llegue la cuenta de Mercado Pago:** cargar `MP_ACCESS_TOKEN` (de prueba), `MP_WEBHOOK_SECRET` y los precios en `.env`, levantar un túnel (Mercado Pago necesita una URL pública para el webhook) y repetir la prueba con las tarjetas de prueba.

## Pendientes que no son de una parte

- Captcha, Google OAuth probado con credenciales reales.
- Borrar un análisis o un contrato suelto (el aviso «Podés borrarlo cuando quieras» hoy se cumple solo borrando la cuenta).
- Preguntas abiertas: [open-questions.md](open-questions.md).
