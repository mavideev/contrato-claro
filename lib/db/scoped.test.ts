// Test de integración: necesita la base del compose con el seed cargado
// (`make up`). Verifica el aislamiento entre usuarios (spec 01, "Acceso").
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { user } from "@/db/schema";
import { db, sql } from "@/lib/db";
import { scoped } from "@/lib/db/scoped";

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
    expect(mine.length).toBe(3);
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
    expect(mine.length).toBe(3);
    expect(mine.every((r) => r.payment.userId === demoId && r.payment.analysisId === r.analysis.id)).toBe(true);
  });

  it("exige userId", () => {
    expect(() => scoped("")).toThrow();
  });
});
