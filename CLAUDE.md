@AGENTS.md

# Contrato Claro

Analizador de contratos de alquiler (Argentina). Next.js + Postgres + S3 + Inngest, todo en Docker en local.

## Al empezar una sesión

1. Leer `docs/progress.md`, sección «Cómo retomar»: estado, ramas, decisiones pendientes y próximos pasos.
2. `git status` y `git log --oneline -5`.
3. Levantar el entorno con `make dev` (app en http://localhost:3000, mails en http://localhost:8025).

## Cómo trabajar

- Todo se trabaja directo en `main`, sin ramas aparte (lo pidió la usuaria). Commit + push por partes.
- Al cerrar una parte, actualizar `docs/progress.md` y, si cambia algo que se prueba a mano, `docs/guia-de-prueba.md`. Lo que afecte a producción va en `docs/deploy.md`.
- Las specs están en `docs/specs/`; el plan general, en `documento-base-mvp-v0.2.md`.
- Tests: `pnpm test` (vitest, necesita el entorno levantado) y `pnpm e2e` (Playwright). Antes de dar algo por terminado: `pnpm lint`, `pnpm typecheck` y los tests.
- Sin credenciales, los pagos y la IA usan simuladores (`lib/payments/mock.ts`, `lib/ai/mock.ts`). Los dos están prohibidos en producción.

## Claves y secretos

- Van en `.env` (no está en git). La usuaria las pega ahí ella misma: **nunca pedirlas ni aceptarlas por el chat**, y no mostrarlas al revisar el archivo.
- Qué variables hacen falta y de dónde sale cada una: `docs/progress.md` («Para seguir en otra máquina») y `docs/deploy.md` (producción).

## Cómo hablar con la usuaria

- En español, simple y despacio: un paso por mensaje, frases cortas, sin tablas ni listas largas ni detalles técnicos que no pidió. Esperar su respuesta antes de seguir.
- Al guiar una prueba, dar solo el paso actual y qué tendría que ver.
- Las decisiones (abrir un túnel público, desplegar, gastar plata, borrar datos) las toma ella: explicar la opción en pocas palabras y preguntar.
