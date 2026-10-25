# Arranque para un agente nuevo

Sos el agente que continúa **Contrato Claro**, un analizador de contratos de alquiler para Argentina. Otro agente hizo las etapas 0, 1 y 2. Este archivo te dice cómo ponerte al día y qué hacer primero.

## 1. Ponete al día (antes de hablar con la usuaria)

1. Asegurate de estar en `main` y al día: `git switch main && git pull`. Todo se trabaja en `main`, sin ramas aparte.
2. Leé, en este orden:
   - `CLAUDE.md`: cómo trabajar y **cómo hablarle a la usuaria** (muy importante).
   - `docs/progress.md`, sección «Cómo retomar»: estado, ramas, decisión pendiente y próximos pasos.
   - `docs/deploy.md`: la guía del primer despliegue en Render.
   - Si vas a tocar código: la spec que corresponda en `docs/specs/` (la de la IA y la extracción es `05-jobs-and-analysis.md`).
3. Mirá `git log --oneline -15` para ver los últimos cambios.
4. Si la máquina es nueva, seguí «Para seguir en otra máquina» en `docs/progress.md` (Docker, Node 22, pnpm, `.env`, `make dev`). Si algo no levanta, decíselo a la usuaria con palabras simples antes de cambiar nada.

## 2. Dónde quedó todo (resumen)

- **Etapa 2 terminada:** la app sube PDF, Word, texto y fotos, los divide en cláusulas y completa los datos clave. La IA (fotos y datos clave) pasa por un **simulador** hasta conectar Claude.
- **Mercado Pago:** la usuaria ya tiene su aplicación (Checkout Pro, API de Preferences) y un Access Token de prueba. Decidió **no** usar túnel en local: el webhook se prueba en el primer despliegue.
- **En curso:** preparar el primer despliegue en Render.
- **Decisión pendiente de la usuaria:** antes de desplegar, (A) conectar Claude o (B) desplegar ya, sabiendo que subir contratos falla sin Claude. Ella dijo que va a conseguir la clave de Anthropic pronto.
- **Todo está en `main`**, incluidas las etapas 1 y 2. No se usan ramas aparte.

## 3. Lo primero que hacés con la usuaria

Saludala en una o dos frases y contale dónde quedó el trabajo, sin detalles técnicos. Después hacele **una sola pregunta**: ¿opción A (esperar la clave de Claude y conectarla) u opción B (desplegar ya)?

- Si elige **A**: pedile que agregue `ANTHROPIC_API_KEY=…` en su `.env` ella misma (nunca por el chat). Después conectá Claude en `lib/ai/`: falta un `anthropic.ts` que implemente `AiProvider` (leer fotos y PDF escaneados, y sacar los datos clave con salida validada con Zod) y elegirlo en `lib/ai/provider.ts`. Antes de escribir código con la API de Claude, cargá la skill `claude-api`. Probalo con el set de `evals/`.
- Si elige **B**: acompañala paso a paso con `docs/deploy.md`. Render publica `main`, que ya tiene todo.

## 4. Reglas que no se negocian

- Un paso por mensaje, en español simple. Esperá su respuesta.
- Las claves van en `.env` y las pega ella. No las pidas ni las muestres.
- No abras túneles públicos. Ya se descartó.
- Trabajá directo en `main`, sin ramas. Hacé commit y push por partes, y mantené `docs/progress.md` al día al cerrar cada parte.
