# Spec 00 — Arquitectura y entornos

**Estado:** borrador para validar · **Etapa:** 0 · **Fuente:** documento base §5, §8, §9 y `docs/decisions/0001-stack.md`

## Objetivo

Que cualquier persona del equipo pueda levantar la app completa en local con Docker y desplegar la misma imagen en Render sin cambios de código, solo cambiando variables de entorno.

## Componentes

```
                 ┌─────────────────────────── Next.js (App Router) ───────────────────────────┐
 navegador ────▶ │ páginas (public) / (app)   ·   /api/auth/*  (Better Auth)                  │
 (desktop/móvil) │ Server Actions             ·   /api/inngest (funciones de jobs)            │
                 │                            ·   /api/webhooks/mercadopago                   │
                 │                            ·   /api/health                                 │
                 └──────┬──────────────┬──────────────────┬──────────────────┬────────────────┘
                        │              │                  │                  │
                  Postgres+pgvector   S3 (archivos)     Inngest           Email (SMTP/Resend)
                  (Drizzle)           URL firmadas      (cola y reintentos)
```

Una sola app Next.js, sin microservicios. Los trabajos largos (extracción y análisis) corren como funciones de Inngest servidas por la misma app en `/api/inngest`. Inngest las invoca por HTTP y se ocupa de reintentos, pasos y concurrencia.

## Entornos

| Pieza | Local (Docker Compose) | Producción (Render) |
|---|---|---|
| App | target `dev` del Dockerfile, hot reload, `:3000` | Web Service, runtime Docker, target `runner` |
| Postgres | `pgvector/pgvector:pg17` | Render Postgres (extensión `vector`) |
| Archivos | RustFS (`:9000`, consola `:9001/rustfs/console/`; MinIO ya no publica imágenes) | Cloudflare R2 (API S3) |
| Jobs | `inngest dev` (`:8288`) | Inngest Cloud |
| Email | Mailpit (`:8025`) | Resend |
| Ver la base | Adminer (`:8080`, perfil `tools`) | consola de Render / cliente SQL |
| Webhooks entrantes | `cloudflared` (perfil `tunnel`, etapa 1) | URL pública de Render |

Más adelante se agrega un entorno `dev` en Render, con su propia base y bucket, para las preview de los PR.

## Variables de entorno

Se validan al arrancar con Zod (`lib/env.ts`). Si falta una obligatoria, la app no arranca y muestra qué variable falta.

| Variable | Obligatoria | Ejemplo local |
|---|---|---|
| `DATABASE_URL` | sí | `postgres://contratos:contratos@db:5432/contratos` |
| `APP_URL` | sí | `http://localhost:3000` |
| `BETTER_AUTH_SECRET` | sí | cadena aleatoria de 32 o más caracteres |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | no | vacío = sin botón de Google |
| `S3_ENDPOINT` / `S3_REGION` / `S3_BUCKET` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | sí | MinIO local |
| `S3_PUBLIC_ENDPOINT` | no | `http://localhost:9000` (para firmar URL que abre el navegador) |
| `EMAIL_FROM` | sí | `Contrato Claro <hola@localhost>` |
| `SMTP_HOST` / `SMTP_PORT` | local | `mailpit` / `1025` |
| `RESEND_API_KEY` | prod | si está definida, se usa Resend en lugar de SMTP |
| `INNGEST_DEV` / `INNGEST_BASE_URL` | local | `1` / `http://inngest:8288` |
| `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` | prod | claves de Inngest Cloud |
| `ANTHROPIC_API_KEY` | etapa 2+ | — |
| `MP_ACCESS_TOKEN` / `MP_WEBHOOK_SECRET` | etapa 1+ | credenciales de prueba |

Ningún secreto va en el repositorio. `.env.example` solo trae valores locales que no sirven fuera de Docker.

## Criterios de aceptación (etapa 0)

- [ ] `cp .env.example .env && docker compose up` levanta todo, sin otro requisito que Docker.
- [x] Todos los servicios quedan *healthy* y el servicio `migrate` termina con código 0.
- [x] `GET /api/health` responde `200 {"status":"ok","db":"ok"}`. Si la base no responde, devuelve 503.
- [x] `docker build --target runner .` produce la imagen de producción y arranca con `node server.js`.
- [ ] CI: lint, typecheck, unit tests, build de la imagen y Playwright smoke contra el compose.
- [ ] El primer despliegue en Render responde a `/api/health`. (Sin `render.yaml`: Render se configura a mano siguiendo [deploy.md](../deploy.md).)

## Fuera de alcance

Kubernetes, microservicios, CDN/WAF (después del MVP), buscador externo, OCR aparte.
