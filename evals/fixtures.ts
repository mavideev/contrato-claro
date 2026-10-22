import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import JSZip from "jszip";
import { PDFDocument, StandardFonts } from "pdf-lib";

// Arma PDF y Word a partir de los contratos de texto del set de prueba, para
// probar la lectura de cada formato con el mismo contenido (tests y e2e).

// Relativo a la raíz del repo (vitest y Playwright corren desde ahí; Playwright no admite import.meta).
const ROOT = resolve("evals");
const DIR = join(ROOT, "contratos");

export type Expected = { clausulas: [number, string][]; contiene: Record<string, string> };

export function sampleContracts(): { name: string; text: string; expected: Expected }[] {
  const expected = JSON.parse(readFileSync(join(ROOT, "esperado.json"), "utf8")) as Record<string, Expected>;
  return readdirSync(DIR)
    .filter((f) => f.endsWith(".txt"))
    .sort()
    .map((name) => ({ name, text: readFileSync(join(DIR, name), "utf8"), expected: expected[name] }));
}

/** Corta los renglones en ~`width` caracteres, como en un PDF real. */
function wrap(text: string, width: number): string[] {
  return text.split("\n").flatMap((line) => {
    if (!line.trim()) return [""];
    const out: string[] = [];
    let current = "";
    for (const word of line.split(" ")) {
      if (current && current.length + word.length + 1 > width) {
        out.push(current);
        current = word;
      } else current = current ? `${current} ${word}` : word;
    }
    out.push(current);
    return out;
  });
}

/** PDF con texto seleccionable, varias páginas y pie «Página n de m». */
export async function contractPdf(text: string, linesPerPage = 28): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const lines = wrap(text.trim(), 80);
  const total = Math.ceil(lines.length / linesPerPage);
  for (let p = 0; p < total; p++) {
    const page = doc.addPage([595, 842]);
    lines.slice(p * linesPerPage, (p + 1) * linesPerPage).forEach((line, i) => {
      if (line) page.drawText(line, { x: 50, y: 790 - i * 24, size: 11, font });
    });
    page.drawText(`Página ${p + 1} de ${total}`, { x: 260, y: 30, size: 9, font });
  }
  return doc.save();
}

const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Word mínimo (.docx): un párrafo por renglón. */
export async function contractDocx(text: string): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
  );
  const paragraphs = text
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => `<w:p><w:r><w:t xml:space="preserve">${xml(l)}</w:t></w:r></w:p>`)
    .join("");
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs}</w:body></w:document>`,
  );
  return zip.generateAsync({ type: "uint8array" });
}
