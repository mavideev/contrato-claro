import { describe, expect, it } from "vitest";
import { wordDiff } from "./diff";

describe("wordDiff()", () => {
  it("marca solo la palabra que cambió", () => {
    expect(wordDiff("Actualización trimestral por IPC.", "Actualización mensual por IPC.")).toEqual([
      { type: "same", text: "Actualización " },
      { type: "del", text: "trimestral" },
      { type: "ins", text: "mensual" },
      { type: "same", text: " por IPC." },
    ]);
  });

  it("cambio de monto al final", () => {
    expect(wordDiff("Alquiler mensual de $ 450.000.", "Alquiler mensual de $ 540.000.")).toEqual([
      { type: "same", text: "Alquiler mensual de $ " },
      { type: "del", text: "450.000." },
      { type: "ins", text: "540.000." },
    ]);
  });

  it("texto agregado sin borrar nada", () => {
    expect(wordDiff("Plazo de 24 meses.", "Plazo de 24 meses. Renovable.")).toEqual([
      { type: "same", text: "Plazo de 24 meses." },
      { type: "ins", text: " Renovable." },
    ]);
  });

  it("textos iguales", () => {
    expect(wordDiff("igual", "igual")).toEqual([{ type: "same", text: "igual" }]);
  });
});
