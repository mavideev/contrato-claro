# 0001 — Stack de infraestructura

**Fecha:** 2026-10-18 · **Estado:** aceptada

## Contexto

El documento base (§5) deja abiertos el hosting, la autenticación, la cola de trabajos y el ORM. Requisitos de la usuaria: desplegar en Render, poder probar **todo en local con Docker Compose** usando imágenes open source y depender de pocos proveedores.

## Decisión

| Pieza | Elegido | Alternativas consideradas |
|---|---|---|
| Hosting de la app | Render, Web Service con runtime Docker | Vercel (serverless; límites de duración para análisis largos) |
| Base | Postgres + pgvector (`pgvector/pgvector` local, Render Postgres en producción) | Supabase, Neon |
| Autenticación | Better Auth (corre dentro de la app y guarda las tablas en nuestra base) | Supabase Auth, Auth.js, Clerk |
| Archivos | S3: MinIO local, Cloudflare R2 en producción | Supabase Storage, AWS S3 |
| Jobs | Inngest (dev server en Docker, Inngest Cloud en producción) | BullMQ + Redis + worker |
| ORM | Drizzle | Prisma |
| Email | SMTP a Mailpit local, Resend en producción | Postmark |

## Por qué no Supabase

Supabase resolvía base, autenticación, archivos y RLS en un solo servicio, pero:
- autoalojado en local son unos 11 contenedores, más pesado y difícil de depurar que los 5 de esta opción;
- con hosting en Render, quedaría como un segundo proveedor solo para datos;
- Better Auth + Postgres + MinIO son open source y se reemplazan pieza por pieza.

**Lo que se pierde:** RLS en la base (el aislamiento pasa al código con `lib/db/scoped.ts` y tests), el panel de usuarios y la región São Paulo (Render no tiene región en Sudamérica).

## Por qué Better Auth y no Auth.js

Auth.js figura en el documento, pero el login con contraseña obliga a sesiones JWT y a escribir a mano el registro, la verificación y la recuperación. Better Auth trae email+contraseña, verificación, recuperación, link mágico y Google de forma nativa, con adaptador para Drizzle.

## Por qué Inngest y no BullMQ

En Render, BullMQ necesita un Background Worker y Key Value persistente, que son servicios pagos. Inngest corre como endpoint de la misma app, tiene plan gratuito y su dev server es una imagen Docker. Si el volumen lo justifica, se puede migrar a BullMQ sin tocar la lógica de los pasos.

## Consecuencias

- **Render Postgres gratis vence a los 30 días y no tiene respaldos:** hay que pasar a plan pago antes de cargar datos reales.
- **Web Service gratis de Render se duerme a los 15 minutos:** Mercado Pago e Inngest reintentan, pero para producción conviene un plan pago.
- **Región:** Render no tiene región en Sudamérica, así que los datos quedan en EE. UU. o Frankfurt. Revisarlo con el abogado (Ley 25.326, transferencia internacional).
