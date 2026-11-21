export const CHECKLIST_VERSION = "boleto-v1";

export const BOLETO_CHECKLIST = `
Analizá este boleto de compraventa de un inmueble en Argentina (compra sin escritura todavía: puede ser una unidad nueva "en pozo"/en construcción, o una unidad ya terminada con posesión entregada antes de escriturar), cláusula por cláusula Y como documento completo, y marcá los riesgos.

Marcá "attention" cuando falte una aclaración importante para el comprador, y "high" cuando la falta de claridad pueda perjudicarlo claramente, haya una cláusula abusiva evidente, o la ambigüedad sea sobre un elemento esencial (precio, identidad de las partes, identificación del inmueble, plazo de entrega) — eso siempre es "high", no "attention".

Puntos a revisar en cada cláusula, cuando correspondan:
- Precio y forma de pago: ¿el monto en letras coincide con el número? ¿está clara la moneda y el cronograma de cuotas (montos, fechas, o índice de ajuste — UVA, dólar, costo de construcción)? ¿qué pasa si el comprador se atrasa en una cuota (mora, intereses, pérdida de lo pagado)?
- Plazo de entrega (posesión): ¿tiene una fecha o plazo concreto? ¿hay multa o compensación si la desarrolladora se demora? Desconfiá de plazos de tolerancia muy largos sin tope.
- Si la unidad está en pozo/construcción: ¿el contrato deja claro que lo entregado puede diferir del plano en detalles menores, o esa diferencia no tiene ningún límite? ¿qué pasa si cambian metros cuadrados, cocheras o amenities prometidos?
- Qué pasa si la obra no se termina o la desarrolladora incumple: ¿el contrato dice cómo se rescinde y cómo se devuelve lo pagado (en cuánto tiempo, con o sin actualización)?
- Garantías de la desarrolladora: ¿hay seguro de caución, fideicomiso al costo, o algún otro respaldo ante incumplimiento? Si no se menciona ninguno, marcá "attention".
- Estado del terreno/unidad: ¿dice si el lote o el edificio tiene hipoteca u otro gravamen? ¿el boleto queda inscripto registralmente, o no dice nada al respecto?
- Si ya hay posesión entregada (o se va a entregar antes de escriturar): ¿el contrato aclara qué protege al comprador si el vendedor vendiera el mismo inmueble a otra persona, o si aparece un embargo o una hipoteca después de la posesión pero antes de escriturar?
- Cesión del boleto: ¿el comprador puede ceder su posición a otra persona? ¿bajo qué condiciones (autorización del vendedor, costo)? Si lo prohíbe sin motivo o lo condiciona a un costo desproporcionado, marcá "attention".
- Escrituración: ¿hay un plazo para escriturar una vez terminada la obra o entregada la posesión? ¿queda claro quién paga los gastos de escritura y sellos?
- Gastos adicionales no incluidos en el precio (expensas, conexión de servicios, gastos de la desarrolladora trasladados al comprador): ¿están identificados?
- Identificación de las partes: ¿DNI/CUIT de ambas, y si el vendedor es una sociedad o fideicomiso, su identificación completa (razón social, CUIT, inscripción)?
- Cualquier cláusula donde el comprador renuncie a un derecho básico, o una penalidad que parezca desproporcionada: "high".

Revisión del documento completo (no solo cláusula por cláusula), y marcá el hallazgo en la cláusula más relacionada (o en el encabezado si no hay una cláusula clara):
- Anexos mencionados (plano, memoria descriptiva, cronograma de pagos): ¿están incluidos en el texto, o solo nombrados?
- Domicilios y datos de las partes: ¿son consistentes entre el encabezado y el resto del contrato?
- Cantidad de ejemplares firmados vs. cantidad de firmantes: ¿coincide?
- ¿Falta una cláusula de jurisdicción (a qué tribunales se someten las partes)?
- Sellado/impuesto de sellos: si el contrato no lo menciona, marcá "attention" indicando que conviene verificarlo (varía según la jurisdicción, no lo asumas).

El texto puede traer pegados encabezados, pies de página o marcas de agua repetidos (ej. "DOCUMENTO DE PRUEBA", números de página, líneas de firma) en medio de una cláusula — ignorá esas partes al evaluar el riesgo, no son parte del contrato real.

No inventes problemas en cláusulas que ya están claras y son razonables. Si una cláusula no tiene nada para señalar, no la incluyas en la respuesta. Cada hallazgo tiene que citar el número de cláusula exacto al que corresponde.
`.trim();
