// Test de integración: necesita la base del compose con el seed cargado
// (`make up`). Verifica el aislamiento entre usuarios (spec 01, "Acceso").
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { analyses, user } from "@/db/schema";
import { db, sql } from "@/lib/db";
import { scoped } from "@/lib/db/scoped";
import { SAMPLE_PREVIEW } from "@/lib/analysis/sample";

let demoId: string;
let otherId: string;

beforeAll(async () => {
  const find = async (email: string) => {
    const [row] = await db().select({ id: user.id }).from(user).where(eq(user.email, email));
    if (!row) throw new Error(`Falta ${email}: corré el seed (make up)`);
    return row.id;
  };
  demoId = await find("demo@contratoclaro.local");
  otherId = await find("otro@contratoclaro.local");
});

afterAll(async () => {
  await sql().end();
});

describe("scoped()", () => {
  it("lista solo los análisis del usuario", async () => {
    const mine = await scoped(demoId).analyses.list();
    // Al menos los 3 del seed (puede haber más si se usó la cuenta demo a mano).
    expect(mine.length).toBeGreaterThanOrEqual(3);
    expect(mine.every((a) => a.userId === demoId)).toBe(true);
  });

  it("no devuelve un análisis de otro usuario", async () => {
    const [ajeno] = await scoped(otherId).analyses.list();
    expect(await scoped(demoId).analyses.get(ajeno.id)).toBeNull();
    expect(await scoped(demoId).analyses.report(ajeno.id)).toBeNull();
  });

  it("el informe trae cláusulas ordenadas y hallazgos con cláusula", async () => {
    const [ready] = (await scoped(demoId).analyses.list()).filter((a) => a.status === "ready");
    const report = await scoped(demoId).analyses.report(ready.id);
    expect(report?.clauses.map((c) => c.number)).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
    const clauseIds = new Set(report?.clauses.map((c) => c.id));
    expect(report?.findings.every((f) => clauseIds.has(f.clauseId))).toBe(true);
  });

  it("el historial de pagos trae solo los del usuario, con su análisis", async () => {
    const mine = await scoped(demoId).payments.list();
    expect(mine.length).toBeGreaterThanOrEqual(4);
    expect(mine.every((r) => r.payment.userId === demoId && r.payment.analysisId === r.analysis.id)).toBe(true);
  });

  it("exige userId", () => {
    expect(() => scoped("")).toThrow();
  });
});

describe("scoped(): escrituras", () => {
  const confirmValues = { confirmedFields: { property: "Test 123" }, signingDate: "2026-11-02", propertyLabel: "Test 123", preview: SAMPLE_PREVIEW };

  it("crear, confirmar y no volver a editar después de pagar", async () => {
    const me = scoped(demoId);
    const a = await me.analyses.create({ status: "awaiting_confirmation" });
    try {
      const confirmed = await me.analyses.confirm(a.id, confirmValues);
      expect(confirmed?.status).toBe("preview_ready");
      expect(confirmed?.signingDate).toBe("2026-11-02");

      await db().update(analyses).set({ status: "paid" }).where(eq(analyses.id, a.id));
      expect(await me.analyses.confirm(a.id, confirmValues)).toBeNull();
    } finally {
      await db().delete(analyses).where(eq(analyses.id, a.id));
    }
  });

  it("no confirma ni cobra análisis ajenos, ni con ids mal formados", async () => {
    const [ajeno] = await scoped(otherId).analyses.list();
    expect(await scoped(demoId).analyses.confirm(ajeno.id, confirmValues)).toBeNull();
    expect(await scoped(demoId).payments.start(ajeno.id, "analysis", 0)).toBeNull();
    expect(await scoped(demoId).rechecks.create(ajeno.id)).toBeNull();
    expect(await scoped(demoId).analyses.get("no-es-un-uuid")).toBeNull();
  });

  it("iniciar el pago dos veces reutiliza el pendiente", async () => {
    const me = scoped(demoId);
    const a = await me.analyses.create({ status: "preview_ready" });
    try {
      const first = await me.payments.start(a.id, "analysis", 0);
      const second = await me.payments.start(a.id, "analysis", 0);
      expect(second?.id).toBe(first?.id);
      expect(first?.status).toBe("pending");
    } finally {
      await db().delete(analyses).where(eq(analyses.id, a.id));
    }
  });

  it("el re-chequeo exige un pago de re-chequeo aprobado", async () => {
    const ready = (await scoped(demoId).analyses.list()).filter((a) => a.status === "ready");
    const results = await Promise.all(ready.map((a) => scoped(demoId).rechecks.paid(a.id)));
    // En el seed, solo el de «Firma hoy» tiene el re-chequeo pagado.
    expect(results.filter(Boolean)).toHaveLength(1);
    const unpaid = ready[results.findIndex((r) => !r)];
    expect(await scoped(demoId).rechecks.create(unpaid.id)).toBeNull();
  });
});
