# Variables de entorno para Render (checklist)

Lista para copiar a Render → Environment. Verificada contra `lib/env.ts` y el
código que lee cada variable (no contra lo que dice la documentación). Nada
de lo que sigue tiene un default aceptable en producción: donde el código
trae un default, está marcado y explicado por qué igual hay que definirla acá.

No pongas nada de esto en el repositorio ni lo compartas por chat.

## 1. App

| Variable | Valor |
|---|---|
| `APP_URL` | `https://TU-DOMINIO` (sin `/` al final) |

## 2. Base de datos (Render Postgres)

| Variable | Valor |
|---|---|
| `DATABASE_URL` | Internal Database URL del Postgres de Render |

## 3. Auth (Better Auth)

| Variable | Valor |
|---|---|
| `BETTER_AUTH_SECRET` | aleatoria, 32+ caracteres: `openssl rand -base64 32`. Cambiarla cierra todas las sesiones activas. |

## 4. Archivos (Cloudflare R2)

⚠️ El bucket tiene que ser **privado** (no activar acceso público). La app lee y escribe siempre con URLs firmadas que expiran a los 10 minutos (`lib/storage/upload.ts`); nunca expone el bucket directo. Acceso público no hace falta y es un riesgo (los contratos subidos son datos sensibles).

| Variable | Valor | Nota |
|---|---|---|
| `S3_ENDPOINT` | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` | |
| `S3_BUCKET` | `contracts` (o el nombre que uses) | |
| `S3_ACCESS_KEY_ID` | Access Key ID del token de R2 | |
| `S3_SECRET_ACCESS_KEY` | Secret Access Key del token de R2 | |
| `S3_REGION` | `auto` | ⚠️ el código trae `us-east-1` por default si no se define. R2 necesita `auto`: hay que setearla sí o sí, no dejarla en default. |

No hace falta `S3_PUBLIC_ENDPOINT` (solo se usa si el bucket se sirve desde un endpoint público distinto al de la API) ni `S3_FORCE_PATH_STYLE` (R2 no lo necesita).

## 5. Mails (Resend)

| Variable | Valor | Nota |
|---|---|---|
| `EMAIL_FROM` | `Contrato Claro <hola@tudominio.com>`, con el dominio verificado en Resend | ⚠️ el código trae un default (`hola@localhost`) que nunca falla pero tampoco sirve: hay que pisarlo. |
| `RESEND_API_KEY` | API key de Resend | ⚠️ sin esta variable no hay error: el código cae a SMTP y, si tampoco hay `SMTP_HOST`, los mails solo quedan en el log del servidor. Nadie recibe nada. |

No definir `SMTP_HOST` en producción (es solo para Mailpit en local).

## 6. Jobs (Inngest Cloud)

| Variable | Valor |
|---|---|
| `INNGEST_EVENT_KEY` | Event Key de la app en Inngest Cloud |
| `INNGEST_SIGNING_KEY` | Signing Key de la app en Inngest Cloud. Sin ella, `/api/inngest` responde 500. |

No definir `INNGEST_DEV` en producción.

## 7. Pagos (Mercado Pago)

| Variable | Valor |
|---|---|
| `MP_ACCESS_TOKEN` | Access Token de la app de Mercado Pago (primero el de prueba) |
| `MP_WEBHOOK_SECRET` | Clave secreta del webhook, de Mercado Pago Developers → tu app → Webhooks |
| `PRICE_ANALYSIS_ARS` | precio en pesos, entero (ej. `1000`). En `0` (default) la interfaz muestra `[PRECIO]` y Mercado Pago no acepta el cobro. |
| `PRICE_RECHECK_ARS` | precio en pesos, entero (ej. `500`) |

No definir `PAYMENTS_PROVIDER`. El código elige Mercado Pago automáticamente si encuentra `MP_ACCESS_TOKEN`; si esta variable queda en `mock`, la app tira error al arrancar porque el simulador está prohibido en producción.

## 8. IA (Anthropic / Claude)

| Variable | Valor |
|---|---|
| `ANTHROPIC_API_KEY` | API key de console.anthropic.com |

No definir `AI_PROVIDER` por la misma razón que `PAYMENTS_PROVIDER`: el código elige Claude solo si encuentra la API key.

⚠️ Esta variable sola no alcanza todavía: `lib/ai/provider.ts` tira `"Claude todavía no está conectado"` hasta que se implemente `lib/ai/anthropic.ts`. Eso es desarrollo pendiente, no algo que se resuelva seteando la variable.

## 9. Google (opcional)

Solo si querés el botón "Continuar con Google":

| Variable | Valor |
|---|---|
| `GOOGLE_CLIENT_ID` | de Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | de Google Cloud Console |

Sin estas dos, el botón simplemente no aparece (no rompe nada).

## No definir en Render

Las fija la imagen Docker o no aplican en producción: `NODE_ENV`, `PORT`, `HOSTNAME`, `SMTP_HOST`, `INNGEST_DEV`, `PAYMENTS_PROVIDER`, `AI_PROVIDER`.

## Fuente

Tabla completa con el resto de la guía de despliegue (base de datos, R2, Resend, Inngest, Web Service, verificación post-deploy) en [deploy.md](deploy.md).
