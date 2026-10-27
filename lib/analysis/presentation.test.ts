import { describe, expect, it } from "vitest";
import { analysisCard } from "./presentation";

const base = {
  id: "a1",
  contractType: "rental" as const,
  propertyLabel: "[Dirección] · Palermo",
  signingDate: null,
  createdAt: new Date("2026-10-14T13:42:00Z"),
};
const today = "2026-10-16";

describe("analysisCard()", () => {
  it("informe listo: ver informe y re-chequear", () => {
    const card = analysisCard({ ...base, status: "ready" }, today);
    expect(card.title).toBe("Alquiler de vivienda · [Dirección] · Palermo");
    expect(card.subtitle).toBe("Analizado el 14 oct");
    expect(card.pill).toEqual({ tone: "ok", label: "Informe listo" });
    expect(card.actions.map((a) => a.href)).toEqual(["/analisis/a1/informe", "/analisis/a1/rechequeo"]);
    expect(card.highlight).toBe(false);
  });

  it("firma hoy: destacado con «Re-chequear hoy»", () => {
    const card = analysisCard({ ...base, status: "ready", signingDate: today }, today);
    expect(card.subtitle).toBe("Analizado el 14 oct · firma hoy, 16 oct");
    expect(card.pill.label).toBe("Firma hoy");
    expect(card.actions).toEqual([
      { label: "Re-chequear hoy", href: "/analisis/a1/rechequeo", variant: "primary" },
      { label: "Ver informe", href: "/analisis/a1/informe", variant: "ghost" },
    ]);
    expect(card.highlight).toBe(true);
  });

  it("firma futura se muestra; firma pasada no", () => {
    expect(analysisCard({ ...base, status: "ready", signingDate: "2026-10-20" }, today).subtitle).toBe(
      "Analizado el 14 oct · firma el 20 oct",
    );
    expect(analysisCard({ ...base, status: "ready", signingDate: "2026-10-01" }, today).subtitle).toBe(
      "Analizado el 14 oct",
    );
  });

  it("vista previa sin pagar: continuar al pago", () => {
    const card = analysisCard({ ...base, status: "preview_ready" }, today);
    expect(card.subtitle).toBe("Creado el 14 oct");
    expect(card.pill.label).toBe("Pago pendiente");
    expect(card.actions[0]).toMatchObject({ label: "Continuar al pago", href: "/analisis/a1/estado" });
  });
});
