// Checklist de riesgos para contratos de alquiler (etapa 3, sin RAG).
// Basado en docs/normativa-alquileres.md — actualizar ambos juntos si cambia
// la ley. Sin revisión por un abogado todavía: ver el aviso en el informe.

export const CHECKLIST_VERSION = "rental-v1";

/** Primer día de vigencia del DNU 70/2023 (derogó la Ley de Alquileres). */
export const DNU_70_2023_DATE = "2023-12-29";

export const RENTAL_CHECKLIST = `
Analizá este contrato de alquiler de un inmueble en Argentina, cláusula por cláusula Y como documento completo, y marcá los riesgos, según el derecho vigente desde el DNU 70/2023 (derogó la Ley de Alquileres 27.551).

Hoy la ley deja casi todo librado a lo que acuerden las partes (plazo, depósito, ajuste, moneda). Por eso el riesgo principal ya no es que una cláusula "viole la ley", sino que el contrato NO ACLARE algo importante, porque ya no hay un piso legal que lo resuelva por default. Marcá "attention" cuando falte una aclaración importante, y "high" cuando la falta de claridad pueda perjudicar claramente al inquilino, haya una cláusula abusiva evidente (por ejemplo, que el inquilino renuncie a un derecho básico, o una penalidad desproporcionada), o la ambigüedad sea sobre un elemento esencial del contrato (precio, duración, identidad de las partes) — eso siempre es "high", no "attention".

Puntos a revisar en cada cláusula, cuando correspondan:
- Precio y plazo: ¿el monto en letras coincide con el número? ¿la fecha de inicio y fin coincide con la duración que dice el contrato (ej. "24 meses" pero las fechas dan 36)? Cualquier inconsistencia acá es "high": es ambigüedad sobre lo esencial.
- Depósito en garantía: ¿dice el monto, la moneda, y cómo se devuelve al final (si se actualiza o no)? Ya no hay tope legal, así que la claridad acá es clave. Si no dice cómo se devuelve, "attention".
- Ajuste del precio: ¿dice qué índice se usa y cada cuánto se aplica? ¿qué pasa si el índice deja de publicarse? ¿lo define una sola parte unilateralmente? Si falta o es unilateral, "attention" o "high" si no hay forma de objetarlo.
- Moneda y forma de pago: ¿es clara? ¿permite medios de pago verificables?
- Rescisión anticipada del inquilino: desde el DNU 70/2023 (art. 1221 CCyC reescrito), el inquilino puede rescindir EN CUALQUIER MOMENTO pagando el 10% del saldo de alquileres futuros hasta el fin pactado — no hay plazo mínimo de permanencia ni preaviso obligatorio por ley. Si el contrato dice exactamente esto, está bien (no es un hallazgo). Marcá "attention" solo si el contrato pone condiciones MÁS gravosas que esa (otro porcentaje más alto, un plazo mínimo antes de poder irse, u otra restricción) sin justificarlo.
- Comisión inmobiliaria: en CABA (Ley 5859) y en algunas provincias, está prohibido cobrarle la comisión al inquilino en alquileres de vivienda (la paga el propietario, con un tope del 4,15% del valor total del contrato). Si el contrato se la cobra a la inquilina, marcá "high" y aclará que conviene verificar la jurisdicción exacta.
- Expensas: ¿deja claro qué paga cada parte (ordinarias vs. extraordinarias)?
- Garantía (fiador, seguro de caución, etc.): ¿está claro qué se exige? ¿el inmueble del garante está identificado (matrícula o dirección)?
- Mora e intereses punitorios: ¿la tasa es razonable, o desproporcionada (ej. un interés diario que anualizado es absurdo)?
- Reparaciones: ¿se le cargan a la inquilina reparaciones estructurales o por vicios ocultos, que en principio son del propietario?
- Inspecciones del locador: ¿puede ingresar sin aviso previo?
- Cualquier cláusula donde el inquilino renuncie a un derecho básico, o una penalidad que parezca desproporcionada: "high".

Revisión del documento completo (no solo cláusula por cláusula), y marcá el hallazgo en la cláusula más relacionada (o en el encabezado si no hay una cláusula clara):
- Anexos mencionados (ej. "Anexo I", un inventario): ¿están incluidos en el texto, o solo nombrados?
- Domicilios y datos de las partes: ¿son consistentes entre el encabezado y el resto del contrato? ¿falta DNI, CUIT/CUIL o estado civil de alguna parte?
- Cantidad de ejemplares firmados vs. cantidad de firmantes: ¿coincide?
- ¿Falta una cláusula de jurisdicción (a qué tribunales se someten las partes)?
- Sellado/impuesto de sellos: si el contrato no lo menciona, marcá "attention" indicando que conviene verificarlo (varía mucho según la jurisdicción, no lo asumas).

El texto puede traer pegados encabezados, pies de página o marcas de agua repetidos (ej. "DOCUMENTO DE PRUEBA", números de página, líneas de firma) en medio de una cláusula — ignorá esas partes al evaluar el riesgo, no son parte del contrato real.

No inventes problemas en cláusulas que ya están claras y son razonables. Si una cláusula no tiene nada para señalar, no la incluyas en la respuesta. Cada hallazgo tiene que citar el número de cláusula exacto al que corresponde.
`.trim();

/** Aviso cuando el contrato se firmó antes del DNU: el checklist no aplica del todo. */
export const PRE_DNU_FINDING = {
  level: "attention" as const,
  title: "Contrato firmado antes del cambio de la Ley de Alquileres",
  explanation:
    "Este contrato está fechado antes del 29/12/2023, cuando regía la Ley 27.551 (plazo mínimo de 3 años, depósito con tope de 1 mes por año, ajuste solo por ICL). Este análisis usa los criterios vigentes hoy, que son distintos — puede no aplicar del todo a este contrato.",
  whatToAsk: "Consultá con un abogado qué reglas rigen tu contrato según la fecha en que lo firmaste.",
};
