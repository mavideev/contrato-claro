export const CHECKLIST_VERSION = "sale-v1";

export const SALE_CHECKLIST = `
Analizá este contrato de compraventa de un inmueble en Argentina (incluye escritura, o un boleto con escrituración ya acordada en un plazo corto), cláusula por cláusula Y como documento completo, y marcá los riesgos.

Marcá "attention" cuando falte una aclaración importante para el comprador, y "high" cuando la falta de claridad pueda perjudicarlo claramente, haya una cláusula abusiva evidente, o la ambigüedad sea sobre un elemento esencial (precio, identidad de las partes, identificación del inmueble) — eso siempre es "high", no "attention".

Puntos a revisar en cada cláusula, cuando correspondan:
- Precio y seña: ¿el monto en letras coincide con el número? ¿la moneda es clara? ¿dice qué pasa con la seña si el comprador o el vendedor se arrepienten? Por el art. 1059 CCyC, la seña se presume confirmatoria (nadie puede arrepentirse) salvo que el contrato pacte expresamente la facultad de arrepentirse — si la pacta, quien se arrepiente pierde la seña o, si fue el vendedor, debe devolverla doblada (art. 1060 CCyC). Si el contrato no aclara nada sobre esto, marcá "attention" explicando que por default la seña es confirmatoria.
- Estado de dominio: ¿el contrato dice que el inmueble se entrega libre de deudas, embargos e hipotecas al momento de escriturar? Si no lo aclara, marcá "attention".
- Certificado de inhibición del vendedor: ¿se menciona que se va a verificar que el vendedor no esté inhibido para vender?
- Gastos de la operación: ¿queda claro quién paga escribano, sellos, impuesto a la transferencia (ITI) y comisión inmobiliaria?
- Plazo para escriturar: ¿tiene una fecha o plazo concreto? ¿qué pasa si una de las partes no se presenta a firmar? La compraventa de un inmueble requiere escritura pública (art. 1017 CCyC) — si el contrato no prevé qué pasa ante la falta de comparecencia de una parte, marcá "attention".
- Entrega de posesión: ¿el plazo de entrega de llaves coincide con la escrituración, o es en otro momento? Si es en otro momento, ¿qué protege al comprador en el medio?
- Deudas al momento de la entrega (expensas, ABL, servicios): ¿dice hasta cuándo las paga el vendedor?
- Vicios o diferencias con lo mostrado: ¿hay alguna cláusula sobre el estado de conservación o diferencias con lo que se mostró/tasó antes de firmar?
- Identificación de las partes: ¿DNI/CUIT de ambas, y si alguna es una sociedad, su identificación completa (razón social, CUIT, inscripción)?
- Cualquier cláusula donde el comprador renuncie a un derecho básico, o una penalidad que parezca desproporcionada: "high".

Revisión del documento completo (no solo cláusula por cláusula), y marcá el hallazgo en la cláusula más relacionada (o en el encabezado si no hay una cláusula clara):
- Anexos mencionados (plano, inventario de mejoras): ¿están incluidos en el texto, o solo nombrados?
- Domicilios y datos de las partes: ¿son consistentes entre el encabezado y el resto del contrato?
- Cantidad de ejemplares firmados vs. cantidad de firmantes: ¿coincide?
- ¿Falta una cláusula de jurisdicción (a qué tribunales se someten las partes)?
- Sellado/impuesto de sellos: si el contrato no lo menciona, marcá "attention" indicando que conviene verificarlo (varía según la jurisdicción, no lo asumas).
- Cualquier cláusula que remita a las de incumplimiento, resolución o mora (por ejemplo, ante fallecimiento, incapacidad sobreviniente o cesión) — si esa remisión expone a esa parte a la misma consecuencia dura (pérdida de lo pagado, penalidad, etc.), marcá el riesgo también ahí, no solo en la cláusula de incumplimiento original.

El texto puede traer pegados encabezados, pies de página o marcas de agua repetidos (ej. "DOCUMENTO DE PRUEBA", números de página, líneas de firma) en medio de una cláusula — ignorá esas partes al evaluar el riesgo, no son parte del contrato real.

No inventes problemas en cláusulas que ya están claras y son razonables. Si una cláusula no tiene nada para señalar, no la incluyas en la respuesta. Cada hallazgo tiene que citar el número de cláusula exacto al que corresponde.

Las únicas normas que podés citar en un hallazgo son las que están nombradas en este texto (art. 1017, 1059 y 1060 del Código Civil y Comercial). Si un punto no tiene una norma citada acá, no inventes ninguna otra ley, artículo o número — explicá el riesgo sin citar nada.
`.trim();
