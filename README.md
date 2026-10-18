# Contrato Claro

Webapp para analizar contratos de alquiler en Argentina: el usuario sube una foto, un PDF, un Word o el texto; la app detecta riesgos cláusula por cláusula y, el día de la firma, comprueba que la versión final no cambió. Nombre provisorio.

> Estado: **etapa 0, parte 4** — entorno Docker, base con datos de ejemplo, cuentas y todas las pantallas del prototipo (con stubs donde todavía no hay extracción, análisis ni pagos). Detalle en [docs/progress.md](docs/progress.md).

## Correr en local

Único requisito: **Docker Desktop**.

```bash
make up          # o: docker compose up --build -d
```

| Qué | URL | Notas |
|---|---|---|
| App | http://localhost:3000 | ingresar en `/ingresar`, crear cuenta en `/registro` |
| Estado de servicios | http://localhost:3000/api/health | `{"status":"ok","db":"ok","storage":"ok"}` |
| Mails (Mailpit) | http://localhost:8025 | acá llegan los mails de verificación, link mágico y recuperación |
| Archivos S3 (RustFS) | http://localhost:9001/rustfs/console/ | usuario `contratos`, clave `contratos-local-secret` |
| Jobs (Inngest) | http://localhost:8288 | en *Functions* aparece `hello`; se prueba enviando el evento `test/hello` |
| Base (Adminer) | http://localhost:8080 | `make tools`; servidor `db`, usuario/clave/base `contratos` |

**Usuarios de ejemplo** (los crea el seed): `demo@contratoclaro.local` / `demo12345` (3 análisis: informe listo, firma hoy con re-chequeo y 2 cambios, pago pendiente) y `otro@contratoclaro.local` / `otro12345` (para probar que nadie ve análisis ajenos).

**Google (opcional):** cargá `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en `.env` (URI de redirección: `http://localhost:3000/api/auth/callback/google`) y volvé a levantar. Sin esas variables no aparece el botón.

**Tests:** `pnpm test` (unitarios e integración; necesita `make up` corriendo: usa la base local) y `pnpm e2e` (Playwright contra http://localhost:3000, en 1280 y 390 px; la primera vez, `pnpm exec playwright install chromium`).

**Base de datos:** el esquema está en `db/schema.ts`. Para cambiarlo: editar el esquema → `pnpm db:generate` → `make up` (el servicio `setup` aplica las migraciones).

Otros comandos: `make down` (detiene), `make reset` (borra datos y vuelve a levantar), `make logs`, `make ps`, `make build-prod` (imagen de producción, la misma que usa Render).

**Hot reload:** `make up` copia el código en la imagen; tras cambiar código, `make up` reconstruye. Para recarga en caliente usá `make dev`, que monta la carpeta. Si cambiás dependencias (`package.json`), volvé a correr `make dev` para reconstruir la imagen. En macOS, Docker Desktop necesita permiso para `Documentos` (Configuración del Sistema → Privacidad y seguridad → Archivos y carpetas → Docker).

**Sin Docker para la app:** `cp .env.example .env`, `docker compose up -d db storage mailpit setup inngest` y `pnpm install && pnpm dev`.

## Servicios (docker-compose.yml)

`db` Postgres 17 + pgvector · `storage` RustFS (S3 compatible; MinIO dejó de publicar imágenes) · `mailpit` · `setup` (crea el bucket, aplica migraciones y carga el seed) · `app` Next.js · `inngest` dev server · `adminer` (perfil `tools`).

## Documentos

- [Avance de la implementación](docs/progress.md)
- [Documento base del MVP v0.2](documento-base-mvp-v0.2.md)
- Specs: [00 Arquitectura](docs/specs/00-architecture.md) · [01 Modelo de datos](docs/specs/01-data-model.md) · [02 Cuentas](docs/specs/02-auth.md) · [03 Pantallas](docs/specs/03-screens.md) · [04 Pagos](docs/specs/04-payments.md) · [05 Jobs y análisis](docs/specs/05-jobs-and-analysis.md)
- [Decisión 0001 — Stack](docs/decisions/0001-stack.md) · [Preguntas abiertas](docs/open-questions.md)
- Prototipo: https://claude.ai/artifact/GXnaigS8tcsATZxUN1mQ6P
