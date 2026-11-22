export const CHECKLIST_VERSION = "boleto-v1";

export const BOLETO_CHECKLIST = `
Analizá este boleto de compraventa de un inmueble en Argentina (compra sin escritura todavía: puede ser una unidad nueva "en pozo"/en construcción, o una unidad ya terminada con posesión entregada antes de escriturar), cláusula por cláusula Y como documento completo, y marcá los riesgos.

Marcá "attention" cuando falte una aclaración importante para el comprador, y "high" cuando la falta de claridad pueda perjudicarlo claramente, haya una cláusula abusiva evidente, o la ambigüedad sea sobre un elemento esencial (precio, identidad de las partes, identificación del inmueble, plazo de entrega) — eso siempre es "high", no "attention".

Puntos a revisar en cada cláusula, cuando correspondan:
- Precio y forma de pago: ¿el monto en letras coincide con el número? ¿está clara la moneda y el cronograma de cuotas (montos, fechas, o índice de ajuste — UVA, dólar, costo de construcción)? ¿qué pasa si el comprador se atrasa en una cuota (mora, intereses, pérdida de lo pagado)?
- Plazo de entrega (posesión): ¿tiene una fecha o plazo concreto? ¿hay multa o compensación si la desarrolladora se demora? Desconfiá de plazos de tolerancia muy largos sin tope.
- Si la unidad está en pozo/construcción: es una unidad "a construir o en construcción" sujeta al régimen de prehorizontalidad (arts. 2070 a 2072 CCyC). ¿El contrato deja claro que lo entregado puede diferir del plano en detalles menores, o esa diferencia no tiene ningún límite? ¿qué pasa si cambian metros cuadrados, cocheras o amenities prometidos?
- Qué pasa si la obra no se termina o la desarrolladora incumple: la resolución por incumplimiento exige que el incumplimiento sea esencial para el contrato (arts. 1083 y 1084 CCyC) — ¿el contrato dice cómo se rescinde y cómo se devuelve lo pagado (en cuánto tiempo, con o sin actualización)?
- Garantías de la desarrolladora: ¿hay seguro de caución, fideicomiso al costo, o algún otro respaldo ante incumplimiento? El seguro a favor del comprador del art. 2071 CCyC hoy es optativo (no obligatorio por ley, depende de lo que acuerden las partes) — no asumas que tiene que haber uno por ley, pero si no se menciona ningún respaldo, marcá "attention".
- Estado del terreno/unidad: ¿dice si el lote o el edificio tiene hipoteca u otro gravamen? ¿el boleto queda inscripto registralmente, o no dice nada al respecto?
- Si ya hay posesión entregada (o se va a entregar antes de escriturar): un boleto de fecha cierta, de un comprador de buena fe que pagó al menos el 25% del precio, es oponible frente a un concurso o quiebra del vendedor (arts. 1170 y 1171 CCyC) — ¿el contrato aclara la fecha cierta y dice qué protege al comprador si el vendedor vendiera el mismo inmueble a otra persona, o si aparece un embargo o una hipoteca después de la posesión pero antes de escriturar?
- Cesión del boleto: ceder la posición contractual a otra persona exige la conformidad de la otra parte (arts. 1636 y 1637 CCyC) — ¿el contrato deja claro cómo se pide esa conformidad? Si lo prohíbe sin motivo o lo condiciona a un costo desproporcionado, marcá "attention".
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
- Cualquier cláusula que remita a las de incumplimiento, resolución o mora (por ejemplo, ante fallecimiento, incapacidad sobreviniente o cesión) — si esa remisión expone a esa parte a la misma consecuencia dura (pérdida de lo pagado, penalidad, etc.), marcá el riesgo también ahí, no solo en la cláusula de incumplimiento original.

El texto puede traer pegados encabezados, pies de página o marcas de agua repetidos (ej. "DOCUMENTO DE PRUEBA", números de página, líneas de firma) en medio de una cláusula — ignorá esas partes al evaluar el riesgo, no son parte del contrato real.

No inventes problemas en cláusulas que ya están claras y son razonables. Si una cláusula no tiene nada para señalar, no la incluyas en la respuesta. Cada hallazgo tiene que citar el número de cláusula exacto al que corresponde.

Las únicas normas que podés citar en un hallazgo son las que están nombradas en este texto (arts. 1083, 1084, 1170, 1171, 1636, 1637, 2070, 2071 y 2072 del Código Civil y Comercial). Si un punto no tiene una norma citada acá, no inventes ninguna otra ley, artículo o número — explicá el riesgo sin citar nada.
`.trim();
