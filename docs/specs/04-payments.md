# Spec 04 — Pagos con Mercado Pago

**Estado:** borrador para validar · **Etapa:** 1 (en la etapa 0 solo el stub del webhook) · **Fuente:** documento base §0.4, §6 y §12

## Objetivo

Cobrar un pago único por análisis y otro por re-chequeo con Checkout Pro. El informe se desbloquea solo cuando el servidor confirma el pago.

## Flujo

1. El usuario toca «Pagar con Mercado Pago» en `/analisis/[id]/estado`.
2. Una Server Action crea una fila en `payments` (`pending`) y una **preferencia** en Mercado Pago con `external_reference = payments.id`, `notification_url = APP_URL/api/webhooks/mercadopago` y `back_urls → /pago/retorno`.
3. Redirección a `init_point`.
4. Mercado Pago llama al webhook. El servidor:
   1. verifica la firma (`x-signature` con `MP_WEBHOOK_SECRET`); si no coincide, responde 401;
   2. inserta en `payment_events` con `provider_event_id` único; si ya existía, responde 200 sin hacer nada (idempotencia);
   3. **consulta el pago en la API de Mercado Pago** (nunca confía en el cuerpo del webhook);
   4. actualiza `payments.status` y, si quedó `approved`, en la misma transacción pasa el análisis a `paid` y emite el evento de Inngest `analysis/paid` (o `recheck/paid`);
   5. responde 200.
5. `/pago/retorno` solo consulta el estado en la base y muestra aprobado, pendiente o rechazado. Mientras esté `pending`, vuelve a consultar cada pocos segundos.

## Estados

`pending → approved | rejected | cancelled`; `approved → refunded` (manual por ahora).

## Precio

Configurable por variable (`PRICE_ANALYSIS_ARS` y `PRICE_RECHECK_ARS`) hasta que se mida el costo real. En la interfaz aparece `[PRECIO]` mientras no esté definido.

## Etapa 0: stub

`POST /api/webhooks/mercadopago` verifica la firma, registra el evento en `payment_events` y responde `501 Not Implemented`. Sirve para probar la idempotencia y la verificación antes de integrar.

## Criterios de aceptación

- Etapa 0:
  - [ ] Una firma inválida responde 401.
  - [ ] Si el mismo evento llega dos veces, se guarda una sola fila.
- Etapa 1:
  - [ ] Un pago aprobado en sandbox desbloquea el informe de ejemplo.
  - [ ] Si se recarga `/pago/retorno` antes del webhook, se ve «pendiente» y no se desbloquea nada.
  - [ ] Un pago rechazado deja el análisis en `preview_ready` y permite reintentar.
  - [ ] Un test simula el webhook con el SDK mockeado.

## Fuera de alcance

Suscripciones, facturación electrónica con ARCA (antes del primer cobro real, ver preguntas abiertas), pagos en la app de tiendas.
