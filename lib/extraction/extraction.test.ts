// Set de prueba de la extracción (spec 05, etapa 2): cada contrato de
// evals/contratos se lee como texto, PDF y Word, y se compara con esperado.json.
import { describe, expect, it } from "vitest";
import { contractDocx, contractPdf, sampleContracts, type Expected } from "@/evals/fixtures";
import { ordinalValue, splitClauses, type Clause } from "./clauses";
import { ExtractionError, readDocument } from "./read";

function check(clauses: Clause[], expected: Expected) {
  expect(clauses.map((c) => [c.number, c.title])).toEqual(expected.clausulas);
  for (const [number, phrase] of Object.entries(expected.contiene)) {
    expect(clauses.find((c) => c.number === Number(number))?.text).toContain(phrase);
  }
  // Ninguna cláusula queda vacía ni arrastra el encabezado («PRIMERA:») al comienzo.
  for (const c of clauses) {
    expect(c.text.length).toBeGreaterThan(10);
    expect(c.text).not.toMatch(/^(?:CL[AÁ]USULA|ART[IÍ]CULO|PRIMER|SEGUND)/);
  }
}

describe.each(sampleContracts())("$name", ({ text, expected }) => {
  it("como texto pegado", async () => {
    const pages = await readDocument("text", new TextEncoder().encode(text));
    check(splitClauses(pages), expected);
  });

  it("como PDF de varias páginas", async () => {
    const pages = await readDocument("pdf", await contractPdf(text, 8));
    expect(pages.length).toBeGreaterThan(1);
    const clauses = splitClauses(pages);
    check(clauses, expected);
    // El pie «Página n de m» no se mete en el texto.
    expect(clauses.map((c) => c.text).join(" ")).not.toMatch(/Página \d+ de \d+/);
    expect(clauses[0].pageFrom).toBe(1);
    expect(clauses.at(-1)!.pageTo).toBe(pages.length);
  });

  it("como Word", async () => {
    const pages = await readDocument("docx", await contractDocx(text));
    check(splitClauses(pages), expected);
  });
});

describe("ordinales", () => {
  it.each([
    ["PRIMERA", 1],
    ["SEPTIMO", 7],
    ["DECIMA", 10],
    ["DECIMA PRIMERA", 11],
    ["DECIMOSEGUNDA", 12],
    ["DECIMO-TERCERA", 13],
    ["UNDECIMA", 11],
    ["VIGESIMA", 20],
    ["VIGESIMO QUINTA", 25],
  ])("%s = %i", (word, n) => {
    expect(ordinalValue(word)).toBe(n);
  });
});

describe("casos borde", () => {
  it("sin encabezados, un párrafo por cláusula", () => {
    const clauses = splitClauses(["El locador alquila el inmueble.\n\nEl plazo es de dos años.\n\nSe firma en conformidad."]);
    expect(clauses.map((c) => [c.number, c.title])).toEqual([
      [1, "Objeto"],
      [2, "Plazo"],
      [3, "Párrafo 3"],
    ]);
  });

  it("une las palabras cortadas con guion al final del renglón", () => {
    const [clause] = splitClauses(["PRIMERA: OBJETO. El locador da en loca-\nción el inmueble de la calle Falsa 123.\nSEGUNDA: PLAZO. Dos años."]);
    expect(clause.text).toBe("El locador da en locación el inmueble de la calle Falsa 123.");
  });

  it("una referencia en minúscula no corta la cláusula", () => {
    const clauses = splitClauses(["PRIMERA: OBJETO. El locador alquila el inmueble.\nSEGUNDA: PLAZO. Dos años, salvo lo previsto en la\ncláusula primera, que rige igual."]);
    expect(clauses).toHaveLength(2);
    expect(clauses[1].text).toContain("cláusula primera, que rige igual");
  });

  it("un texto sin letras es un error claro", async () => {
    await expect(readDocument("text", new TextEncoder().encode("123 456"))).rejects.toMatchObject({ code: "empty" });
  });

  it("un PDF sin texto (escaneado) se marca para leerlo con la IA", async () => {
    const { PDFDocument } = await import("pdf-lib");
    const doc = await PDFDocument.create();
    doc.addPage();
    await expect(readDocument("pdf", await doc.save())).rejects.toMatchObject({ code: "pdf_without_text" });
  });

  it("un archivo roto no se puede abrir", async () => {
    const err = await readDocument("pdf", new TextEncoder().encode("no soy un pdf")).catch((e) => e);
    expect(err).toBeInstanceOf(ExtractionError);
    expect(err.code).toBe("unreadable");
  });
});
