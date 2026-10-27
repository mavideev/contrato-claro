import { degrees, PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import type { analyses, clauses as clausesTable, findings as findingsTable } from "@/db/schema";
import { formatDayTime } from "@/lib/format";
import { CONTRACT_LABEL, clauseLabel } from "./presentation";

// PDF del informe (etapa 3): mismo contenido que /informe, para guardar o
// imprimir. Con pdf-lib (ya una dependencia del repo, usada en evals/fixtures.ts).

type Analysis = typeof analyses.$inferSelect;
type Clause = typeof clausesTable.$inferSelect;
type Finding = typeof findingsTable.$inferSelect;

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const LEVEL_LABEL: Record<Finding["level"], string> = { high: "RIESGO ALTO", attention: "ATENCIÓN", none: "" };
const LEVEL_COLOR: Record<Finding["level"], ReturnType<typeof rgb>> = {
  high: rgb(0.74, 0.2, 0.15),
  attention: rgb(0.48, 0.29, 0),
  none: rgb(0.1, 0.4, 0.2),
};
const INK = rgb(0.06, 0.16, 0.26);
const INK_2 = rgb(0.24, 0.3, 0.35);
const INK_3 = rgb(0.36, 0.42, 0.48);

export async function buildReportPdf(analysis: Analysis, clauses: Clause[], findings: Finding[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Informe del contrato · Contrato Claro`);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const newPage = () => {
    page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
  };

  const ensureSpace = (needed: number) => {
    if (y - needed < MARGIN) newPage();
  };

  const wrap = (text: string, size: number, f: PDFFont, maxWidth: number): string[] => {
    const lines: string[] = [];
    for (const paragraph of text.split("\n")) {
      let current = "";
      for (const word of paragraph.split(/\s+/)) {
        const attempt = current ? `${current} ${word}` : word;
        if (current && f.widthOfTextAtSize(attempt, size) > maxWidth) {
          lines.push(current);
          current = word;
        } else {
          current = attempt;
        }
      }
      lines.push(current);
    }
    return lines;
  };

  const text = (
    value: string,
    opts: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; gap?: number; indent?: number } = {},
  ) => {
    const { size = 10, font: f = font, color = INK, gap = 4, indent = 0 } = opts;
    for (const line of wrap(value, size, f, CONTENT_WIDTH - indent)) {
      ensureSpace(size + gap);
      page.drawText(line, { x: MARGIN + indent, y, size, font: f, color });
      y -= size + gap;
    }
  };

  text("Contrato Claro", { size: 13, font: bold, color: INK_3, gap: 2 });
  text("Informe del contrato", { size: 20, font: bold, gap: 10 });
  text(`${CONTRACT_LABEL[analysis.contractType]} · ${clauses.length} cláusulas · analizado el ${formatDayTime(analysis.createdAt)}`, {
    size: 11,
    color: INK_2,
    gap: 14,
  });

  const counts = { high: 0, attention: 0, none: 0 };
  for (const f of findings) counts[f.level]++;
  counts.none = Math.max(0, clauses.length - counts.high - counts.attention);
  text(`${counts.high} riesgos altos  ·  ${counts.attention} atención  ·  ${counts.none} sin alertas`, { size: 13, font: bold, gap: 14 });

  text(
    "Esto no es un consejo legal. Es un análisis automático hecho con inteligencia artificial, que puede tener errores o quedar desactualizado. Antes de decidir algo a partir de este informe — firmar, rescindir, reclamar o dejar de pagar algo — consultá con un abogado o escribano.",
    { size: 9, color: LEVEL_COLOR.attention, gap: 16 },
  );

  const byClause = new Map(clauses.map((c) => [c.id, c]));
  const order: Record<Finding["level"], number> = { high: 0, attention: 1, none: 2 };
  const flagged = findings.slice().sort((a, b) => order[a.level] - order[b.level]);

  for (const finding of flagged) {
    const clause = byClause.get(finding.clauseId);
    if (!clause) continue;
    ensureSpace(70);
    text(`${clauseLabel(clause)}  —  ${LEVEL_LABEL[finding.level]}`, { size: 9, font: bold, color: LEVEL_COLOR[finding.level], gap: 4 });
    text(finding.title, { size: 12, font: bold, gap: 5 });
    text(finding.explanation, { size: 10, gap: 6 });
    text(`"${clause.text}"`, { size: 9, color: INK_3, indent: 10, gap: 6 });
    if (finding.whatToAsk) text(`Qué pedir: ${finding.whatToAsk}`, { size: 10, color: rgb(0.1, 0.4, 0.38), gap: 6 });
    y -= 10;
  }

  const flaggedIds = new Set(findings.map((f) => f.clauseId));
  const clean = clauses.filter((c) => !flaggedIds.has(c.id));
  if (clean.length) {
    ensureSpace(30);
    text(`${clean.length} cláusulas sin alertas`, { size: 12, font: bold, color: LEVEL_COLOR.none, gap: 8 });
    for (const c of clean) text(`•  ${clauseLabel(c)}`, { size: 9, color: INK_2, gap: 4 });
  }

  y -= 10;
  ensureSpace(20);
  text("Informe orientativo. No reemplaza el asesoramiento de un abogado o escribano.", { size: 8, color: INK_3 });

  watermarkAll(doc.getPages(), bold);
  return doc.save();
}

function watermarkAll(pages: PDFPage[], font: PDFFont) {
  pages.forEach((p, i) => {
    p.drawText("Contrato Claro", {
      x: PAGE_WIDTH / 2 - 150,
      y: PAGE_HEIGHT / 2 - 20,
      size: 46,
      font,
      color: rgb(0.85, 0.85, 0.85),
      rotate: degrees(-35),
      opacity: 0.35,
    });
    p.drawText(`Página ${i + 1} de ${pages.length}`, { x: PAGE_WIDTH - MARGIN - 70, y: 24, size: 8, font, color: INK_3 });
  });
}
