// Checklist de riesgos para contratos de alquiler (etapa 3, sin RAG).
// Basado en docs/normativa-alquileres.md — actualizar ambos juntos si cambia
// la ley. Sin revisión por un abogado todavía: ver el aviso en el informe.

export const CHECKLIST_VERSION = "rental-v1";

/** Primer día de vigencia del DNU 70/2023 (derogó la Ley de Alquileres). */
export const DNU_70_2023_DATE = "2023-12-29";

export const RENTAL_CHECKLIST = `
Analizá cada cláusula de este contrato de alquiler de un inmueble en Argentina y marcá los riesgos, según el derecho vigente desde el DNU 70/2023 (derogó la Ley de Alquileres 27.551).

Hoy la ley deja casi todo librado a lo que acuerden las partes (plazo, depósito, ajuste, moneda). Por eso el riesgo principal ya no es que una cláusula "viole la ley", sino que el contrato NO ACLARE algo importante, porque ya no hay un piso legal que lo resuelva por default. Marcá "attention" cuando falte una aclaración importante, y "high" cuando la falta de claridad pueda perjudicar claramente al inquilino, o haya una cláusula abusiva evidente (por ejemplo, que el inquilino renuncie a un derecho básico, o una penalidad desproporcionada).

Puntos a revisar en cada cláusula, cuando correspondan:
- Plazo: ¿dice fecha de inicio y fin, o duración en meses/años? Si no dice nada, por ley rige un piso de 2 años (vivienda) o 3 (otros usos) — marcá "attention" si no está explícito.
- Depósito en garantía: ¿dice el monto, la moneda, y cómo se devuelve al final (si se actualiza o no)? Ya no hay tope legal, así que la claridad acá es clave. Si no dice cómo se devuelve, "attention".
- Ajuste del precio: ¿dice qué índice se usa y cada cuánto se aplica? ¿qué pasa si el índice deja de publicarse? Si falta, "attention".
- Moneda y forma de pago: ¿es clara? ¿permite medios de pago verificables?
- Rescisión anticipada del inquilino: ¿dice el preaviso y si hay multa? El régimen clásico (si el contrato no dice nada) es preaviso de 10 días y multa de 1,5 meses de alquiler si rescinde antes del año, 1 mes si es después — marcá si el contrato se aparta mucho de esto sin explicarlo.
- Expensas: ¿deja claro qué paga cada parte (ordinarias vs. extraordinarias)?
- Garantía (fiador, seguro de caución, etc.): ¿está claro qué se exige?
- Cualquier cláusula donde el inquilino renuncie a un derecho básico, o una penalidad que parezca desproporcionada: "high".

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
