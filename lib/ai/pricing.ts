// Precios de Claude en USD por millón de tokens (tier de hasta 100K tokens de
// prompt, que es el único que aplica acá: los contratos no llegan a esa
// longitud). Se calcula el costo al mostrarlo, no al guardarlo, para que un
// cambio de precio no desactualice lo ya registrado.
const PRICE_PER_MTOK_USD: Record<string, { input: number; output: number }> = {
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
  "claude-haiku-4-5": { input: 1, output: 5 },
  "claude-sonnet-5": { input: 2, output: 10 },
  "claude-opus-5": { input: 5, output: 25 },
};

/** `null` si no hay precio cargado para ese modelo (no inventa un número). */
export function costUsd(model: string, inputTokens: number, outputTokens: number): number | null {
  const price = PRICE_PER_MTOK_USD[model];
  if (!price) return null;
  return (inputTokens * price.input + outputTokens * price.output) / 1_000_000;
}
