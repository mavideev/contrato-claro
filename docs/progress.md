# Avance de la implementación

Qué está hecho, qué falta y dónde está cada cosa. Se actualiza al cerrar cada parte (un commit por parte). El detalle de cada criterio está marcado en su spec (`[x]` hecho, `[ ]` pendiente).

Leyenda: ✅ hecho y probado · 🟡 hecho en parte · ⏳ pendiente

## Etapa 0 — Base (rama `feat/etapa-0-base`)

| Parte | Estado | Qué incluye | Commit |
|---|---|---|---|
| 1. Entorno Docker y app base | ✅ | Compose (Postgres+pgvector, RustFS, Mailpit, Inngest, Adminer), Dockerfile `dev`/`runner`, Makefile, `lib/env.ts`, `/api/health`, función Inngest `hello` | `23e242c`, `def03ed` |
| 2. Esquema, migraciones y seed | ✅ | `db/schema.ts`, migraciones Drizzle, seed con 2 usuarios y 4 análisis, `lib/db/scoped.ts` con tests de aislamiento | `1925308` |
| 3. Cuentas (Better Auth) | ✅ | ver detalle abajo | `7c70e5e` |
| 4a. Sistema visual y panel | ✅ | ver detalle abajo | `c95df7c` |
| 4b. Flujo del análisis | ✅ | ver detalle abajo | `b8aa7a4` |
| 4c. Navegación entre pantallas (correcciones de la prueba manual) | ✅ | encabezado en el flujo, panel vacío | este commit |
| 5. Stubs: webhook de Mercado Pago, subida de prueba a S3 | ⏳ | specs 04 y 05 | |
| 6. CI (GitHub Actions) y `render.yaml` | ⏳ | spec 00 | |

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

## Pendientes que no son de una parte

- Captcha, Google OAuth probado con credenciales reales.
- Borrar un análisis o un contrato suelto (el aviso «Podés borrarlo cuando quieras» hoy se cumple solo borrando la cuenta).
- Preguntas abiertas: [open-questions.md](open-questions.md).
