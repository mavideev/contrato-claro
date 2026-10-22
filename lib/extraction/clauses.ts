// División del texto de un contrato en cláusulas (spec 05, `extractAnalysis`, paso 2).
// Sin IA: busca los encabezados típicos de los contratos argentinos
// («PRIMERA:», «CLÁUSULA SEGUNDA - PLAZO», «ARTÍCULO 3°», «4.-») y respeta la
// numeración del contrato, así «cláusula 7» en el informe es la SÉPTIMA del papel.

export type Clause = {
  /** Número de la cláusula en el contrato; 0 = encabezado (partes, antes de la PRIMERA). */
  number: number;
  title: string;
  text: string;
  pageFrom: number | null;
  pageTo: number | null;
};

const UNITS = ["PRIMER", "SEGUND", "TERCER", "CUART", "QUINT", "SEXT", "SEPTIM", "OCTAV", "NOVEN"];
const TENS: [string, number][] = [
  ["DECIM", 10],
  ["VIGESIM", 20],
  ["TRIGESIM", 30],
];
const UNIT = `(?:${UNITS.join("|")})[AO]?`;
// «DÉCIMA PRIMERA», «DECIMOPRIMERA», «DÉCIMO-SEGUNDA», «UNDÉCIMA», «VIGÉSIMA».
const ORDINAL = `(?:(?:DECIM|VIGESIM|TRIGESIM)[AO]?(?:[\\s-]*${UNIT})?|UNDECIM[AO]|DUODECIM[AO]|${UNIT})`;
const PUNCT = `[\\s]*(?:[:.)\\-–—]+|$)`;

/** «DECIMA PRIMERA» → 11. Recibe el texto ya plegado (mayúsculas, sin tildes). */
export function ordinalValue(word: string): number | null {
  const w = word.replace(/[\s-]+/g, "");
  if (/^UNDECIM/.test(w)) return 11;
  if (/^DUODECIM/.test(w)) return 12;
  let n = 0;
  let rest = w;
  for (const [stem, value] of TENS) {
    if (rest.startsWith(stem)) {
      n = value;
      rest = rest.slice(stem.length).replace(/^[AO]/, "");
      break;
    }
  }
  if (rest) {
    const unit = UNITS.findIndex((u) => rest.startsWith(u));
    if (unit < 0) return null;
    n += unit + 1;
  }
  return n || null;
}

const FOLD: Record<string, string> = { Á: "A", É: "E", Í: "I", Ó: "O", Ú: "U", Ü: "U" };

/** Mayúsculas y sin tildes, con el mismo largo que el original (los índices coinciden). */
function fold(text: string): string {
  let out = "";
  for (const ch of text) {
    const up = ch.toUpperCase();
    const one = up.length === 1 ? up : ch;
    out += FOLD[one] ?? one;
  }
  return out;
}

// Encabezados al comienzo de una línea. `kw`: con «CLÁUSULA» o «ARTÍCULO» delante.
const HEADINGS: { re: RegExp; kind: "kw" | "word" | "digit" }[] = [
  { re: new RegExp(`^[ \\t]*(?:CLAUSULA|ARTICULO|ART\\.)[ \\t]*(${ORDINAL}|\\d{1,2})[ \\t]*[°ºª]?(?=${PUNCT}|[ \\t]+[A-ZÑ])`, "gm"), kind: "kw" },
  { re: new RegExp(`^[ \\t]*(${ORDINAL})(?=${PUNCT})`, "gm"), kind: "word" },
  { re: /^[ \t]*(\d{1,2})[ \t]*[°º]?[ \t]*(?:\.-|[.)\-–:])[ \t]+(?=\S)/gm, kind: "digit" },
];

type Heading = { index: number; end: number; number: number };

function findHeadings(text: string): Heading[] {
  const folded = fold(text);
  const byKind = HEADINGS.map(({ re, kind }) => {
    const found: Heading[] = [];
    for (const m of folded.matchAll(re)) {
      const raw = m[1];
      const number = /^\d/.test(raw) ? Number(raw) : ordinalValue(raw);
      if (!number) continue;
      // «cláusula cuarta, el locatario…» en minúscula es una referencia, no un encabezado.
      if (kind !== "digit" && !isUpper(text.slice(m.index, m.index + m[0].length)) && !followedByPunct(folded, m.index + m[0].length)) continue;
      found.push({ index: m.index, end: m.index + m[0].length, number });
    }
    return { kind, found };
  });
  // Palabras (PRIMERA, CLÁUSULA SEGUNDA) primero; los números sueltos solo si no hay otra cosa,
  // porque los incisos «1) 2)» dentro de una cláusula se confunden con encabezados.
  const words = increasing([...byKind[0].found, ...byKind[1].found].sort((a, b) => a.index - b.index));
  const digits = increasing(byKind[2].found);
  return words.length >= 2 ? words : digits.length >= 2 ? digits : [];
}

const isUpper = (s: string) => s === s.toUpperCase();
const followedByPunct = (folded: string, at: number) => /^[ \t]*(?:[:.)\-–—]|\n|$)/.test(folded.slice(at, at + 20));

/** Se queda con una secuencia creciente que arranca en 1 o 2: descarta incisos y referencias sueltas. */
function increasing(headings: Heading[]): Heading[] {
  const out: Heading[] = [];
  for (const h of headings) {
    const last = out.at(-1);
    if (!last ? h.number <= 2 : h.number > last.number && h.number <= last.number + 2) out.push(h);
  }
  return out;
}

// Títulos cuando el contrato no los trae: la primera palabra clave que aparece.
const TOPICS: [RegExp, string][] = [
  [/\b(?:destino|objeto|alquila|en locaci[oó]n)\b/i, "Objeto"],
  [/\bplazo\b|\bduraci[oó]n\b|\bvigencia\b/i, "Plazo"],
  [/\b(?:actualizaci[oó]n|ajust\w*|[ií]ndice|IPC|ICL)\b/i, "Ajuste"],
  [/\bprecio\b|\bcanon\b|\balquiler mensual\b/i, "Precio"],
  [/\bdep[oó]sito\b/i, "Depósito"],
  [/\bgarant[ií]a\b|\bfiador\b|\bcauci[oó]n\b/i, "Garantía"],
  [/\bexpensas\b/i, "Expensas"],
  [/\bservicios\b/i, "Servicios"],
  [/\bimpuestos\b|\btasas\b/i, "Impuestos"],
  [/\brescisi[oó]n\b|\brescindir\b/i, "Rescisión"],
  [/\bmejoras\b|\breparaciones\b/i, "Mejoras y reparaciones"],
  [/\bcomisi[oó]n\b|\bhonorarios\b/i, "Comisión"],
  [/\bdomicilio/i, "Domicilios"],
  [/\bjurisdicci[oó]n\b|\btribunales\b/i, "Jurisdicción"],
];

function inferTitle(body: string): string | null {
  const head = body.slice(0, 400);
  let best: { at: number; title: string } | null = null;
  for (const [re, title] of TOPICS) {
    const at = head.search(re);
    if (at >= 0 && (!best || at < best.at)) best = { at, title };
  }
  return best?.title ?? null;
}

/** «PLAZO. El contrato…» o «- Del precio: el…» al comienzo del cuerpo → título explícito. */
function splitTitle(body: string): { title: string | null; rest: string } {
  const m = body.match(/^[\s\-–—:.)]*([^\n.:]{2,60}?)\s*([.:\-–—]+)\s+(?=\S)/);
  if (!m) return { title: null, rest: body.replace(/^[\s\-–—:.)]+/, "") };
  const candidate = m[1].trim();
  // Un título es corto y no es el comienzo de una oración («El locador da en…»).
  const words = candidate.split(/\s+/);
  // «El locatario acepta.» no es un título: con artículo o pronombre adelante, solo si es muy corto.
  const sentence = /^(?:el|la|los|las|se|en|por|las partes|ambas)\s/i.test(candidate) && words.length > 2;
  const looksLikeTitle = !sentence && words.length <= 6 && (isUpper(candidate) || /^(?:del?|de la|de los|de las)\s/i.test(candidate) || words.length <= 3 || m[2] === ":");
  if (!looksLikeTitle) return { title: null, rest: body.replace(/^[\s\-–—:.)]+/, "") };
  return { title: tidyTitle(candidate), rest: body.slice(m[0].length) };
}

function tidyTitle(t: string): string {
  const clean = t.replace(/^(?:del?|de la|de los|de las)\s+/i, "").replace(/\s+/g, " ").trim();
  const lower = isUpper(clean) ? clean.toLowerCase() : clean;
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/** Une los renglones de un párrafo y corrige los cortes con guion («loca-\nción»). */
export function tidyBody(text: string): string {
  return text
    .replace(/(\p{Ll})-\n(\p{Ll})/gu, "$1$2")
    .split(/\n[ \t]*\n+/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");
}

/** Saca renglones de número de página («Página 2 de 5», «- 3 -») y espacios raros. */
export function cleanPage(page: string): string {
  return page
    .replace(/\r\n?/g, "\n")
    .replace(/[   ]/g, " ")
    .split("\n")
    .filter((line) => !/^\s*(?:p[aá]g(?:ina)?\.?\s*)?[-–]?\s*\d{1,3}\s*(?:(?:de|\/)\s*\d{1,3})?\s*[-–]?\s*$/i.test(line))
    .join("\n");
}

/**
 * Divide el contrato en cláusulas. `pages`: el texto de cada página (PDF o
 * fotos); un texto pegado o un Word es una sola página.
 */
export function splitClauses(pages: string[]): Clause[] {
  const cleaned = pages.map(cleanPage);
  const starts: number[] = [];
  let text = "";
  for (const p of cleaned) {
    starts.push(text.length);
    text += p + "\n";
  }
  const pageAt = (i: number) => (pages.length > 1 ? starts.findLastIndex((s) => s <= i) + 1 : null);

  const headings = findHeadings(text);
  if (headings.length === 0) return byParagraphs(text, pageAt);

  const clauses: Clause[] = [];
  const preamble = tidyBody(text.slice(0, headings[0].index));
  // Solo si es más que el título del documento («CONTRATO DE ALQUILER»).
  if (preamble.length >= 40) clauses.push({ number: 0, title: "Encabezado", text: preamble, pageFrom: pageAt(0), pageTo: pageAt(headings[0].index - 1) });

  headings.forEach((h, i) => {
    const endAt = headings[i + 1]?.index ?? text.length;
    const { title, rest } = splitTitle(text.slice(h.end, endAt));
    const body = tidyBody(rest);
    clauses.push({
      number: h.number,
      title: title ?? inferTitle(body) ?? `Cláusula ${h.number}`,
      text: body,
      pageFrom: pageAt(h.index),
      pageTo: pageAt(Math.max(h.index, endAt - 2)),
    });
  });
  return clauses;
}

/** Sin encabezados reconocibles: un párrafo por cláusula (o todo junto si es uno solo). */
function byParagraphs(text: string, pageAt: (i: number) => number | null): Clause[] {
  const paragraphs: { text: string; at: number }[] = [];
  const re = /\S[\s\S]*?(?=\n[ \t]*\n|$)/g;
  for (const m of text.matchAll(re)) {
    const body = tidyBody(m[0]);
    if (body) paragraphs.push({ text: body, at: m.index });
  }
  return paragraphs.map((p, i) => ({
    number: i + 1,
    title: inferTitle(p.text) ?? (paragraphs.length === 1 ? "Texto completo" : `Párrafo ${i + 1}`),
    text: p.text,
    pageFrom: pageAt(p.at),
    pageTo: pageAt(p.at + p.text.length),
  }));
}
