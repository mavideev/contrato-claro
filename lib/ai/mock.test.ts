import { describe, expect, it } from "vitest";
import { sampleContracts } from "@/evals/fixtures";
import { splitClauses } from "@/lib/extraction/clauses";
import { guessFields, mockAi, sampleContractPages } from "./mock";

describe("simulador de IA", () => {
  it("las fotos devuelven el contrato de ejemplo, una página por foto", async () => {
    const pages = await mockAi.readPages([1, 2, 3].map(() => ({ bytes: new Uint8Array(), mime: "image/jpeg" })));
    expect(pages).toHaveLength(3);
    const clauses = splitClauses(pages);
    expect(clauses).toHaveLength(12);
    expect(clauses[6]).toMatchObject({ number: 7, title: "Depósito", pageFrom: 2 });
  });

  it("nunca devuelve más páginas que cláusulas", () => {
    expect(sampleContractPages(30)).toHaveLength(12);
    expect(sampleContractPages(0)).toHaveLength(1);
  });

  it("lee los datos clave del contrato de muestra", () => {
    const [first] = sampleContracts();
    expect(guessFields(splitClauses([first.text]))).toEqual({
      landlord: "[Nombre del locador]",
      tenant: "[Nombre del locatario]",
      property: '[Calle 123, piso 4 "B"]',
      term: "24 meses",
      initialRent: "$ 450.000",
      currency: "ARS",
      adjustment: "Trimestral por IPC",
      deposit: "1 mes",
      guarantee: "Seguro de caución",
      termination: "Preaviso de 30 días",
      expenses: "Ordinarias a cargo del inquilino",
      commission: "La comisión inmobiliaria, si la hubiera, estará a cargo de EL LOCADOR.",
    });
  });

  it("dólares y fiador", () => {
    const contracts = sampleContracts();
    const articles = guessFields(splitClauses([contracts[2].text]));
    expect(articles).toMatchObject({ initialRent: "USD 500", currency: "USD", term: "36 meses", deposit: "2 meses" });
    const dashes = guessFields(splitClauses([contracts[1].text]));
    expect(dashes).toMatchObject({ guarantee: "Fiador", adjustment: "Semestral por ICL", landlord: "[Nombre]", initialRent: "$ 380.000" });
  });
});
