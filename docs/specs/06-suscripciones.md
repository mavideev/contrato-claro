# Spec 06 — Suscripción mensual con cupo de páginas

**Estado:** borrador, en implementación · **Etapa:** nueva (no estaba en el plan original de etapas 0-6, ver [progress.md](../progress.md)) · **Fuente:** decisión de negocio de la usuaria (28/10/2026), reemplaza el modelo de "pago por análisis" de [spec 04](04-payments.md)

## Objetivo

Reemplazar el pago único por análisis por una **suscripción mensual con cobro automático recurrente**: cada mes trae un cupo de páginas para analizar. El re-chequeo también descuenta del mismo cupo (no se cobra aparte). Si el cupo se agota antes de fin de mes, la usuaria final puede esperar al próximo ciclo o comprar páginas extra (top-up) dentro del mismo mes.

## Por qué

El pago por análisis de la spec 04 sigue activo (Checkout Pro) para quien no se suscriba, pero el negocio quiere previsibilidad de ingresos y que analizar varios contratos en el mes no implique pagar uno por uno. El cupo de páginas (en vez de "cantidad de análisis") existe porque el costo real de IA escala con el tamaño del contrato, no con la cantidad de veces que se usa.

## Flujo

1. La usuaria se suscribe a un plan (`/suscripcion`). Se crea una **Preapproval** en Mercado Pago (cobro recurrente mensual) y se redirige a `init_point`, igual que hoy con Checkout Pro pero con otro endpoint.
2. Mercado Pago avisa por webhook (`type: subscription_preapproval` para altas/pausas/bajas, `subscription_authorized_payment` para cada cobro mensual). El servidor:
   - verifica la firma (mismo mecanismo que spec 04);
   - guarda el evento en `payment_events` (misma tabla, misma idempotencia);
   - `authorized` → crea/activa la suscripción y abre un ciclo nuevo (`subscription_cycles`) con el cupo de páginas del plan;
   - `authorized_payment` → cierra el ciclo vencido y abre el siguiente con el cupo completo de nuevo;
   - `paused`/`cancelled` → actualiza el estado de la suscripción.
3. Antes de subir un contrato (análisis nuevo o re-chequeo), el servidor valida que haya suscripción activa y cupo disponible en el ciclo actual. Si no alcanza, ofrece comprar páginas extra (un pago único de Checkout Pro, como hoy, pero sin ligarlo a un análisis puntual).
4. El cupo se descuenta recién cuando se sabe la cantidad real de páginas leídas (al terminar la extracción), no al empezar a subir el archivo — así no se descuenta de más si el archivo no se puede leer.

## Modelo de datos (nuevo)

| Tabla | Para qué |
|---|---|
| `plans` | Catálogo de planes: nombre, precio, cupo de páginas por mes. Editable sin tocar código. |
| `subscriptions` | Una fila por suscripción de un usuario a un plan: estado (`pending`/`authorized`/`paused`/`cancelled`), id de la Preapproval en Mercado Pago, período actual. |
| `subscription_cycles` | El "saldo" de cada mes: cupo de ese ciclo, páginas usadas, páginas extra compradas. |

`payments` suma un tipo nuevo (`topup`, páginas extra) y pasa a poder existir sin un análisis ligado. `analyses` y `rechecks` suman de qué ciclo salió su cupo, para no descontar dos veces si un job se reintenta.

## Quiénes conviven

Quien no se suscribe sigue con el pago por análisis de la spec 04, sin cambios. Los dos modelos conviven: cada análisis queda marcado con cuál de los dos usó.

## Cómo se define el cupo de cada plan

El costo real de IA por página todavía tiene poca data histórica (la medición en `/admin` arrancó el 26/10/2026). Mientras tanto, el cupo de cada plan se calcula con el **peor costo por página observado** (no el promedio) más un margen de seguridad extra, asumiendo el escenario más caro (contrato fotografiado en vez de PDF). `/admin` muestra ese costo por página y cuántos análisis reales respaldan el número, para ir ajustando el cupo con menos margen de seguridad a medida que haya más data real.

## Criterios de aceptación

- [ ] Suscribirse crea la Preapproval en Mercado Pago y, al aprobarse, habilita el primer ciclo con el cupo completo.
- [ ] Un análisis o re-chequeo descuenta del cupo del ciclo vigente solo una vez, incluso si el job de extracción se reintenta.
- [ ] Si no hay cupo, se ofrece comprar páginas extra en vez de bloquear sin alternativa.
- [ ] El cobro mensual (`authorized_payment`) abre un ciclo nuevo con el cupo completo, sin arrastrar lo que sobró del mes anterior.
- [ ] Pausar o cancelar la suscripción impide empezar análisis nuevos sin romper los que ya están en curso.
- [ ] Quien sigue con pago por análisis (sin suscripción) no nota ningún cambio.

## Fuera de alcance (por ahora)

Cambiar de plan a mitad de ciclo, prorratear el cupo, facturación electrónica de un cobro recurrente, reembolsos de suscripción.