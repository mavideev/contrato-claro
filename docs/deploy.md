# Despliegue en producción (Render)

Guía para publicar Contrato Claro. Está pensada para seguirla en orden. Lo marcado con ⚠️ hay que revisarlo sí o sí.

> **Estado de la app:** etapa 2. Se suben y se leen PDF, Word y texto, y el cobro va por Mercado Pago (con credenciales de prueba). Las fotos y los datos clave necesitan Claude (`ANTHROPIC_API_KEY`), y el informe todavía es de ejemplo (etapa 3). Publicarla hoy sirve como **demo**, no para usuarios reales. Ver [«Antes de abrir a usuarios reales»](#antes-de-abrir-a-usuarios-reales).
>
> ⚠️ Los simuladores de pago y de IA están prohibidos en producción. Sin `MP_ACCESS_TOKEN`, «Pagar» falla; sin `ANTHROPIC_API_KEY` (y Claude conectado en `lib/ai/`), la lectura del contrato falla.

## 1. Qué se necesita

| Pieza | Servicio | Para qué |
|---|---|---|
| App | **Render Web Service**, runtime **Docker** | la app Next.js |
| Base de datos | **Render Postgres 17** (con la extensión `vector`) | datos de usuarios, análisis y pagos |
| Archivos | **Cloudflare R2** (compatible con S3) | contratos subidos, certificados |
| Mails | **Resend** | verificación, link mágico, recuperar contraseña |
| Jobs | **Inngest Cloud** | tareas en segundo plano (análisis, borrados) |
| Pagos | **Mercado Pago** (Checkout Pro) | cobro y webhook |
| IA | **Anthropic** (Claude) | leer fotos y sacar los datos clave |
| Login con Google | Google Cloud Console | opcional |

## 2. Base de datos (Render Postgres)

1. Crear una base **PostgreSQL 17** en la misma región que la app.
2. ⚠️ El plan gratuito de Render **se borra a los 30 días**. Pasarlo a un plan pago antes de cargar datos reales.
3. Copiar la **Internal Database URL** (la usa la app) y guardar aparte la **External Database URL** (para conectarse desde tu máquina si hace falta).
4. La extensión `vector` la crea la primera migración (`create extension if not exists vector`). No hay que hacer nada a mano.

## 3. Archivos (Cloudflare R2)

1. Crear un bucket **privado** (por ejemplo `contracts`). No activar el acceso público.
2. Crear un **API token de R2** con permiso de lectura y escritura sobre ese bucket. Anotar `Access Key ID`, `Secret Access Key` y el endpoint `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`.
3. ⚠️ **CORS del bucket.** El navegador sube los archivos directo a R2 con URL firmadas, así que el bucket tiene que aceptar `PUT` desde el dominio de la app:

   ```json
   [
     {
       "AllowedOrigins": ["https://TU-DOMINIO"],
       "AllowedMethods": ["PUT"],
       "AllowedHeaders": ["content-type"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

   Sin esto, «Analizar contrato» y la cámara responden «No pudimos subir el archivo». En local lo aplica `scripts/setup-storage.ts`.

## 4. Mails (Resend)

1. Agregar y **verificar el dominio** desde el que salen los mails (registros DNS que indica Resend).
2. Crear una API key.
3. `EMAIL_FROM` tiene que usar ese dominio, por ejemplo `Contrato Claro <hola@tudominio.com>`.

Si `RESEND_API_KEY` está definida, la app usa Resend; si no, intenta SMTP (`SMTP_HOST`), y sin ninguno los mails solo se escriben en el log.

## 5. Jobs (Inngest Cloud)

1. Crear la app en Inngest Cloud y copiar **Event Key** y **Signing Key**.
2. ⚠️ Sin `INNGEST_SIGNING_KEY`, `/api/inngest` responde 500 (comprobado con la imagen de producción).
3. Después del primer deploy, en Inngest: **Sync app** con la URL `https://TU-DOMINIO/api/inngest`. Tienen que aparecer las funciones `hello`, `extract-analysis`, `analysis-paid` y `purge-files`.
4. No definir `INNGEST_DEV` en producción.

## 6. Web Service (Render)

| Campo | Valor |
|---|---|
| Runtime | **Docker** |
| Dockerfile | `./Dockerfile` |
| Etapa del Dockerfile | Docker construye la **última** etapa, que es `runner` (la de producción). ⚠️ Si se agregan etapas al `Dockerfile`, `runner` tiene que seguir siendo la última. |
| Puerto | `3000` (la imagen ya define `PORT=3000`) |
| Health check path | `/api/health` |
| Auto-deploy | desde la rama `main` |

- **Health check:** `/api/health` comprueba la base, el bucket y (si está conectado) Claude. Si algo está mal configurado responde 503 y Render no da el deploy por bueno. Es intencional.
- **Migraciones:** automáticas, no dependen de ningún plan pago. El contenedor las corre al arrancar, antes de levantar el servidor (`CMD` del `Dockerfile`: `node migrate.mjs && node server.js`). Si fallan, el contenedor no arranca y Render mantiene la versión anterior corriendo. Se probó sobre una base vacía: crea las 18 tablas y la extensión `vector`.
- ⚠️ **Nunca** correr `pnpm db:seed` ni `pnpm bootstrap` contra la base de producción: crean los usuarios demo con contraseñas conocidas. El seed solo se frena si `NODE_ENV=production`, y en tu máquina no lo es.

### Probar la imagen antes de subirla (opcional)

```bash
make build-prod                                  # docker build --target runner
docker run --rm -p 3100:3000 --env-file .env.produccion contrato-claro:prod
curl http://localhost:3100/api/health            # {"status":"ok","db":"ok","storage":"ok"}
```

## 7. Variables de entorno

Se cargan en Render → Environment. Ninguna va en el repositorio. La validación está en `lib/env.ts`: si falta una obligatoria, la app falla al primer uso con un mensaje que dice cuál.

| Variable | Obligatoria | Valor en producción |
|---|---|---|
| `APP_URL` | sí | `https://TU-DOMINIO` (sin `/` final). Better Auth arma los links de los mails con esto. |
| `DATABASE_URL` | sí | Internal Database URL de Render |
| `BETTER_AUTH_SECRET` | sí | aleatoria, 32+ caracteres: `openssl rand -base64 32`. ⚠️ Si se cambia, se cierran todas las sesiones. |
| `S3_ENDPOINT` | sí | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
| `S3_PUBLIC_ENDPOINT` | no | igual que `S3_ENDPOINT` (o dejar vacía) |
| `S3_REGION` | no | `auto` |
| `S3_BUCKET` | sí | `contracts` |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | sí | token de R2 |
| `S3_FORCE_PATH_STYLE` | no | `false` (default) |
| `EMAIL_FROM` | sí | `Contrato Claro <hola@tudominio.com>` |
| `RESEND_API_KEY` | sí | API key de Resend |
| `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` | sí | de Inngest Cloud |
| `MP_WEBHOOK_SECRET` | sí (si se configura el webhook) | «Clave secreta» del webhook en Mercado Pago Developers. Sin ella el webhook responde 401 a todo. |
| `MP_ACCESS_TOKEN` | sí, para cobrar | token de la app de Mercado Pago (primero el de prueba). ⚠️ Sin él, «Pagar» falla: el simulador de pagos está prohibido en producción. |
| `PRICE_ANALYSIS_ARS` / `PRICE_RECHECK_ARS` | sí, para cobrar | precios en pesos, enteros. Con 0 (default) se muestra [PRECIO] y Mercado Pago no acepta el cobro. |
| `PAYMENTS_PROVIDER` | no | no definir en producción (`mock` está prohibido) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | no | si están las dos aparece «Continuar con Google» |
| `ANTHROPIC_API_KEY` | sí, para leer contratos | clave de Anthropic. ⚠️ Sin ella la lectura falla: el simulador de IA está prohibido en producción. |
| `AI_PROVIDER` | no | no definir en producción (`mock` está prohibido) |

No hace falta definir `NODE_ENV`, `PORT` ni `HOSTNAME`: los fija la imagen. No definir `SMTP_HOST` ni `INNGEST_DEV` en producción.

## 8. Servicios externos que apuntan a la app

Una vez que la app tiene su URL:

- **Google OAuth** (opcional): en Google Cloud Console → Credenciales → «URI de redireccionamiento autorizados»: `https://TU-DOMINIO/api/auth/callback/google`. ⚠️ El login con Google todavía no se probó con credenciales reales.
- **Mercado Pago:** en Mercado Pago Developers → tu app → Webhooks: URL `https://TU-DOMINIO/api/webhooks/mercadopago`, evento «Pagos». Copiar la clave secreta a `MP_WEBHOOK_SECRET`. El webhook verifica la firma, guarda el evento, consulta el pago a Mercado Pago y, si está aprobado, desbloquea el análisis. Si algo falla responde 500 y Mercado Pago reintenta.
- **Inngest:** Sync app (paso 5).

## 9. Verificación después del primer deploy

1. `https://TU-DOMINIO/api/health` → `{"status":"ok","db":"ok","storage":"ok"}`.
2. Crear una cuenta con un email real: llega el mail (Resend → Logs) y el link entra a «Subí tu contrato».
3. «Recibir un link por email» y «¿Olvidaste tu contraseña?» también llegan.
4. Inngest Cloud muestra la app sincronizada con sus 4 funciones.
5. Subir un PDF de prueba: pasa por «Leyendo tu contrato» y llega a «Confirmá los datos clave» (en Inngest se ve `extract-analysis` terminada).
6. Pagar con una tarjeta de prueba de Mercado Pago: en Mercado Pago Developers → Webhooks se ve el aviso con respuesta 200 y en la app se desbloquea el informe.
7. `/analisis` sin sesión redirige a `/ingresar`.
8. ⚠️ **IP de los visitantes (límite de intentos).** Better Auth toma la IP de `x-forwarded-for` y, si el header trae más de una IP (cliente + proxies), la descarta. Después de ingresar, revisar en la base:
   `select ip_address from session order by created_at desc limit 5;`
   Si aparece vacío, el límite de intentos no está funcionando: hay que configurar `advanced.ipAddress` en `lib/auth/index.ts` (`trustedProxies` con los rangos del proxy de Render, o el header que corresponda) y volver a probar.

## 10. Antes de abrir a usuarios reales

Nada de esto bloquea publicar una demo, pero sí recibir usuarios:

- [ ] Cobro con Mercado Pago probado con credenciales de prueba y después reales (hoy probado con el simulador).
- [ ] Claude conectado (fotos y datos clave) y etapas 3 y 4: análisis e informe reales. Hoy el informe es de ejemplo.
- [ ] Postgres en plan pago y región de los datos revisada con el abogado ([preguntas abiertas](open-questions.md)).
- [ ] Captcha (Turnstile) en registro y envío de links (spec 02).
- [ ] Verificar la IP detrás del proxy (paso 9.8).
- [ ] Regla de vencimiento en R2 para subidas abandonadas (`users/*/uploads/` sin análisis).
- [ ] Borrar un análisis suelto (hoy solo se puede borrando la cuenta).
- [ ] Precios definidos (`[PRECIO]` en la interfaz).
- [ ] Términos y política de privacidad (el registro los menciona pero no hay páginas).
- [ ] Facturación electrónica (ARCA) antes del primer cobro.
