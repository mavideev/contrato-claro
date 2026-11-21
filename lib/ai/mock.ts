import type { ConfirmedFields } from "@/db/schema";
import { SAMPLE_CLAUSES } from "@/lib/analysis/sample-report";
import type { Clause } from "@/lib/extraction/clauses";
import type { AiProvider, ContractType, RiskFinding } from "./types";

// Simulador de IA, para trabajar sin ANTHROPIC_API_KEY (como el simulador de pagos).
// - Fotos: no las mira. Devuelve el contrato de ejemplo repartido en tantas
//   páginas como fotos, así el resto del circuito (cláusulas, confirmar, informe) es el real.
// - Datos clave: los busca con reglas simples en el texto real. Claude lo hará mejor.

const ORDINALS = ["PRIMERA", "SEGUNDA", "TERCERA", "CUARTA", "QUINTA", "SEXTA", "SÉPTIMA", "OCTAVA", "NOVENA", "DÉCIMA", "DÉCIMA PRIMERA", "DÉCIMA SEGUNDA"];

export function sampleContractPages(count: number): string[] {
  const clauses = SAMPLE_CLAUSES.map((c, i) => `${ORDINALS[i]}: ${c.title.toUpperCase()}. ${c.text}`);
  const pages = Math.max(1, Math.min(count, clauses.length));
  const perPage = Math.ceil(clauses.length / pages);
  return Array.from({ length: pages }, (_, p) => clauses.slice(p * perPage, (p + 1) * perPage).join("\n\n"));
}

export const mockAi: AiProvider = {
  name: "mock",
  async readPages(pages) {
    return sampleContractPages(pages.length);
  },
  async extractFields(clauses, contractType) {
    return guessFields(clauses, contractType);
  },
  async analyzeRisks(clauses, _checklist, contractType) {
    return guessRisks(clauses, contractType);
  },
};

/** Hallazgos con reglas simples: marca "attention" cuando falta una aclaración típica, según el checklist del tipo. */
export function guessRisks(clauses: Clause[], contractType: ContractType): RiskFinding[] {
  if (contractType === "sale") return guessSaleRisks(clauses);
  if (contractType === "boleto") return guessBoletoRisks(clauses);
  return guessRentalRisks(clauses);
}

function guessSaleRisks(clauses: Clause[]): RiskFinding[] {
  const findings: RiskFinding[] = [];
  const find = (re: RegExp) => clauses.find((c) => re.test(c.title));

  if (!find(/dominio|hipoteca|gravamen|inhibici/i)) {
    const anchor = clauses[0];
    if (anchor) {
      findings.push({
        clauseNumber: anchor.number,
        level: "attention",
        title: "Falta aclarar el estado de dominio",
        explanation: "No encontramos una cláusula que diga que el inmueble se entrega libre de deudas, embargos e hipotecas.",
        whatToAsk: "Pedí que se aclare el estado de dominio del inmueble.",
      });
    }
  }

  const signing = find(/escritur/i);
  if (signing && !/d[ií]as|mes(es)?/i.test(signing.text)) {
    findings.push({
      clauseNumber: signing.number,
      level: "attention",
      title: "Plazo para escriturar sin fecha concreta",
      explanation: "No encontramos un plazo concreto para la escrituración.",
      whatToAsk: "Preguntá en cuánto tiempo se va a escriturar.",
    });
  }

  return findings;
}

function guessBoletoRisks(clauses: Clause[]): RiskFinding[] {
  const findings: RiskFinding[] = [];
  const find = (re: RegExp) => clauses.find((c) => re.test(c.title));

  const delivery = find(/entrega|posesi[oó]n/i);
  if (delivery && !/d[ií]as|mes(es)?|\d{4}/i.test(delivery.text)) {
    findings.push({
      clauseNumber: delivery.number,
      level: "attention",
      title: "Plazo de entrega sin fecha concreta",
      explanation: "No encontramos una fecha o plazo concreto para la entrega/posesión del inmueble.",
      whatToAsk: "Pedí que se aclare la fecha de entrega y qué pasa si se demora.",
    });
  }

  if (!find(/garant|cauci[oó]n|fideicomiso/i)) {
    const anchor = clauses[0];
    if (anchor) {
      findings.push({
        clauseNumber: anchor.number,
        level: "attention",
        title: "Sin garantías mencionadas",
        explanation: "No encontramos ninguna garantía de la desarrolladora (seguro de caución, fideicomiso al costo, u otra) ante un incumplimiento.",
        whatToAsk: "Preguntá qué garantía respalda la entrega si la desarrolladora no termina la obra.",
      });
    }
  }

  return findings;
}

function guessRentalRisks(clauses: Clause[]): RiskFinding[] {
  const findings: RiskFinding[] = [];
  const find = (re: RegExp) => clauses.find((c) => re.test(c.title));

  const term = find(/plazo|duraci/i);
  if (term && !/\(?\d{1,3}\)?\s*(mes|año)/i.test(term.text)) {
    findings.push({
      clauseNumber: term.number,
      level: "attention",
      title: "Plazo sin duración explícita",
      explanation: "No encontramos una duración en meses o años. Sin esto, por ley rige un piso de 2 años (vivienda) o 3 (otros usos).",
      whatToAsk: "Pedí que se aclare la duración exacta del contrato.",
    });
  }

  const deposit = find(/dep[oó]sito/i);
  if (deposit && !/devol|devuel|restituc|actualiza/i.test(deposit.text)) {
    findings.push({
      clauseNumber: deposit.number,
      level: "attention",
      title: "Depósito sin forma de devolución",
      explanation: "No dice cómo se devuelve el depósito al final del contrato. Ya no hay tope legal, así que esto conviene que quede por escrito.",
      whatToAsk: "Pedí que se aclare cómo y cuándo se devuelve el depósito.",
    });
  }

  const adjustment = find(/ajuste|actualizaci/i);
  if (adjustment && !/\b(IPC|ICL|CAC|CER|UVA|[ií]ndice)\b/i.test(adjustment.text)) {
    findings.push({
      clauseNumber: adjustment.number,
      level: "attention",
      title: "Ajuste sin índice claro",
      explanation: "No se especifica qué índice se usa para actualizar el precio.",
      whatToAsk: "Preguntá qué índice se usa y qué pasa si deja de publicarse.",
    });
  }

  const termination = find(/rescisi/i);
  if (termination && !/d[ií]as/i.test(termination.text)) {
    findings.push({
      clauseNumber: termination.number,
      level: "attention",
      title: "Rescisión sin preaviso claro",
      explanation: "No se especifica con cuántos días de anticipación hay que avisar.",
      whatToAsk: "Preguntá el plazo de preaviso y si hay multa por irte antes.",
    });
  }

  return findings;
}

const MAX = 300;
const clip = (s: string | undefined) => (s ? s.replace(/\s+/g, " ").trim().slice(0, MAX) : "");

/** Datos clave con reglas simples: busca primero en la cláusula del tema y después en todo el contrato. */
export function guessFields(clauses: Clause[], contractType: ContractType): ConfirmedFields {
  if (contractType === "sale") return guessSaleFields(clauses);
  if (contractType === "boleto") return guessBoletoFields(clauses);
  return guessRentalFields(clauses);
}

function propertyOf(all: string): string | undefined {
  return all.match(/(?:ubicad[oa] en|sit[oa] en|de calle|inmueble de)\s+((?:\[[^\]]+\]|[^,.\n])+(?:,\s*(?:piso|depto|dpto|unidad)[^,.\n]*)?)/i)?.[1];
}

function commonSaleFields(clauses: Clause[]) {
  const all = clauses.map((c) => c.text).join("\n");
  const about = (re: RegExp) => clauses.filter((c) => re.test(c.title)).map((c) => c.text).join("\n") || all;

  const priceText = about(/precio|valor/i);
  const money = priceText.match(/(?:\$|ARS|USD|U\$S|US\$)\s?\d[\d.,]*\d/i) ?? all.match(/(?:\$|ARS|USD|U\$S|US\$)\s?\d[\d.,]*\d/i);
  const dollars = /USD|U\$S|US\$|d[oó]lares/i.test(money?.[0] ?? "") || /d[oó]lares/i.test(priceText);

  return {
    seller: clip(party(clauses, /vendedor(?:a)?|desarrolladora/i)),
    buyer: clip(party(clauses, /comprador(?:a)?/i)),
    property: clip(propertyOf(all)),
    price: clip(money?.[0]?.replace(/^(?:\$|ARS|USD|U\$S|US\$)\s?/i, dollars ? "USD " : "$ ")),
    currency: money ? (dollars ? "USD" : "ARS") : "",
    paymentForm: clip(about(/forma de pago|cuotas?|se[ñn]a/i)),
    signingTerm: clip(about(/escritur/i)),
    deliveryTerm: clip(about(/entrega|posesi[oó]n/i)),
    titleStatus: clip(about(/dominio|hipoteca|gravamen|inhibici/i)),
  };
}

function guessSaleFields(clauses: Clause[]): ConfirmedFields {
  const commission = clauses.find((c) => /comisi/i.test(c.title))?.text;
  const debtsStatus = clauses.filter((c) => /expensas|deudas/i.test(c.title)).map((c) => c.text).join("\n");
  return { ...commonSaleFields(clauses), debtsStatus: clip(debtsStatus), commission: clip(commission?.split(/(?<=\.)\s/)[0]) };
}

function guessBoletoFields(clauses: Clause[]): ConfirmedFields {
  const guarantee = clauses.filter((c) => /garant/i.test(c.title)).map((c) => c.text).join("\n");
  const cession = clauses.filter((c) => /cesi[oó]n/i.test(c.title)).map((c) => c.text).join("\n");
  return {
    ...commonSaleFields(clauses),
    cession: clip(cession),
    guarantee: /cauci[oó]n/i.test(guarantee) ? "Seguro de caución" : /fideicomiso/i.test(guarantee) ? "Fideicomiso al costo" : "",
  };
}

function guessRentalFields(clauses: Clause[]): ConfirmedFields {
  const all = clauses.map((c) => c.text).join("\n");
  const about = (re: RegExp) => clauses.filter((c) => re.test(c.title)).map((c) => c.text).join("\n") || all;

  const price = about(/precio|valor|alquiler|canon/i);
  const money = price.match(/(?:\$|ARS|USD|U\$S|US\$)\s?\d[\d.,]*\d/i) ?? all.match(/(?:\$|ARS|USD|U\$S|US\$)\s?\d[\d.,]*\d/i);
  const dollars = /USD|U\$S|US\$|d[oó]lares/i.test(money?.[0] ?? "") || /d[oó]lares/i.test(price);

  const term = about(/plazo|duraci/i);
  const months = term.match(/\((\d{1,3})\)\s*meses/i)?.[1] ?? term.match(/(\d{1,3})\s*meses/i)?.[1];
  const years = term.match(/\b(dos|tres|cuatro|cinco|\d)\s+años/i)?.[0];

  const adjustment = about(/ajuste|actualizaci/i);
  const index = adjustment.match(/\b(IPC|ICL|CAC|CER|UVA)\b/)?.[1] ?? (/precios al consumidor/i.test(adjustment) ? "IPC" : undefined);
  const every = frequency(adjustment);

  const deposit = about(/dep[oó]sito/i);
  const depositMonths = deposit.match(/\((\d)\)\s*mes(es)?/i) ?? deposit.match(/\b(\d|un|una|dos|tres)\s+mes(es)?/i);

  const guarantee = about(/garant/i);
  const termination = about(/rescisi/i);
  const notice = termination.match(/\((\d{1,3})\)\s*días/i)?.[1] ?? termination.match(/(\d{1,3})\s*días/i)?.[1];

  const expenses = about(/expensas/i);
  const commission = clauses.find((c) => /comisi/i.test(c.title))?.text;

  return {
    landlord: clip(party(clauses, /locador[ae]?/i)),
    tenant: clip(party(clauses, /locatari[oa]/i)),
    property: clip(all.match(/(?:ubicad[oa] en|sit[oa] en|de calle|inmueble de)\s+((?:\[[^\]]+\]|[^,.\n])+(?:,\s*(?:piso|depto|dpto|unidad)[^,.\n]*)?)/i)?.[1]),
    term: months ? `${months} meses` : clip(years),
    initialRent: clip(money?.[0].replace(/^(?:\$|ARS|USD|U\$S|US\$)\s?/i, dollars ? "USD " : "$ ")),
    currency: money ? (dollars ? "USD" : "ARS") : "",
    adjustment: [every, index && `por ${index}`].filter(Boolean).join(" "),
    deposit: depositMonths ? plural(NUMBERS[depositMonths[1].toLowerCase()] ?? Number(depositMonths[1]), "mes", "meses") : "",
    guarantee: /cauci[oó]n/i.test(guarantee) ? "Seguro de caución" : /fiador|fianza/i.test(guarantee) ? "Fiador" : /propietari/i.test(guarantee) ? "Garantía propietaria" : "",
    termination: notice ? `Preaviso de ${notice} días` : "",
    expenses: /ordinarias[^.]*(?:locatari|inquilin)/i.test(expenses) ? "Ordinarias a cargo del inquilino" : "",
    commission: clip(commission?.split(/(?<=\.)\s/)[0]),
  };
}

const NUMBERS: Record<string, number> = { un: 1, una: 1, dos: 2, tres: 3 };
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function frequency(text: string): string | undefined {
  if (/mensual/i.test(text)) return "Mensual";
  if (/trimestral|cada tres \(?3?\)?\s*meses/i.test(text)) return "Trimestral";
  if (/cuatrimestral|cada cuatro \(?4?\)?\s*meses/i.test(text)) return "Cuatrimestral";
  if (/semestral|cada seis \(?6?\)?\s*meses/i.test(text)) return "Semestral";
  if (/anual/i.test(text)) return "Anual";
  return undefined;
}

/** El nombre que va antes del DNI en el tramo del encabezado que nombra al rol («…, DNI …, en adelante "EL LOCADOR"»). */
function party(clauses: Clause[], role: RegExp): string | undefined {
  const head = clauses.find((c) => c.number <= 1)?.text ?? "";
  for (const chunk of head.split(/\s+y\s+|;|\bpor la otra\b/i)) {
    if (!role.test(chunk)) continue;
    const name = chunk.match(/(\[[^\]]+\]|[A-ZÁÉÍÓÚÑ][\p{L}.]+(?:\s+[A-ZÁÉÍÓÚÑ][\p{L}.]+){1,4}),?\s*(?:DNI|D\.N\.I|CUIT)/u)?.[1];
    if (name) return name;
  }
  return undefined;
}
