# Set de prueba

Contratos de muestra para medir la extracción (spec 05, etapa 2) y, más
adelante, el análisis (etapa 3) y el re-chequeo (etapa 4).

- `contratos/`: contratos **inventados** con los estilos de numeración más
  comunes (PRIMERA:, CLÁUSULA SEGUNDA - PLAZO -, ARTÍCULO 3°, 4.-). No hay datos
  reales: los nombres y direcciones van entre corchetes.
- `esperado.json`: para cada contrato, las cláusulas que deberían salir
  (número y título) y frases que tienen que quedar dentro de una cláusula.

`lib/extraction/extraction.test.ts` corre cada contrato como texto pegado,
como PDF de varias páginas y como Word, y los compara con `esperado.json`.

Pendiente (documento base §10): sumar 15 a 20 contratos reales anonimizados,
con fotos sacadas desde tres celulares, cuando se conecte la IA.
