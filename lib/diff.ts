// Diff por palabras para el re-chequeo (prototipo 6): «Actualización ~~trimestral~~ mensual por IPC».
// Recorta el prefijo y el sufijo comunes y marca el medio como borrado/agregado:
// alcanza para cambios puntuales dentro de una cláusula.

export type DiffSegment = { type: "same" | "del" | "ins"; text: string };

/**
 * Espacios, comillas y guiones no cuentan como cambio real (spec 05, re-chequeo):
 * una foto puede leer " vs " o - vs – distinto sin que el contrato haya cambiado.
 */
export function normalizeForCompare(text: string): string {
  return text
    .replace(/[“”«»]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const tokens = (s: string) => s.split(/(\s+)/).filter(Boolean);

export function wordDiff(before: string, after: string): DiffSegment[] {
  const a = tokens(before);
  const b = tokens(after);
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let end = 0;
  while (end < a.length - start && end < b.length - start && a[a.length - 1 - end] === b[b.length - 1 - end]) end++;

  const segments: DiffSegment[] = [
    { type: "same", text: a.slice(0, start).join("") },
    { type: "del", text: a.slice(start, a.length - end).join("") },
    { type: "ins", text: b.slice(start, b.length - end).join("") },
    { type: "same", text: a.slice(a.length - end).join("") },
  ];
  return segments.filter((s) => s.text.trim() !== "" || (s.type === "same" && s.text !== ""));
}
