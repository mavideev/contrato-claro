import { expect, type APIRequestContext, type Page } from "@playwright/test";

// Visita una ruta y verifica que no haya errores de consola ni scroll horizontal (spec 03).
export async function visit(page: Page, path: string) {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  const res = await page.goto(path);
  await page.waitForLoadState("networkidle");
  expect(res?.status(), path).toBeLessThan(400);
  expect(errors, `errores en ${path}`).toEqual([]);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, `scroll horizontal en ${path}`).toBeLessThanOrEqual(0);
}

export const shotName = (path: string) => path.replace(/[0-9a-f-]{36}/g, "id").replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "home";

/** Ids de los análisis del seed, leídos de los links de «Mis análisis». */
export async function seedIds(page: Page) {
  await page.goto("/analisis");
  const id = async (name: string) => {
    const href = await page.getByRole("link", { name, exact: true }).first().getAttribute("href");
    return href!.split("/")[2];
  };
  return { ready: await id("Ver informe"), signsToday: await id("Re-chequear hoy"), pending: await id("Continuar al pago") };
}

const MAILPIT = process.env.MAILPIT_URL ?? "http://localhost:8025";

/**
 * Registra un usuario nuevo y lo verifica con el link que llega a Mailpit.
 * Deja la sesión abierta en `page`. Para tests que crean datos y no deben
 * tocar al usuario demo del seed.
 */
export async function signUpAndVerify(page: Page, request: APIRequestContext) {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@contratoclaro.local`;
  const password = "clave-e2e-123";
  await page.goto("/registro");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page).toHaveURL(/\/verificar\?email=/);

  let link = "";
  await expect(async () => {
    const search = await (await request.get(`${MAILPIT}/api/v1/search?query=to:${encodeURIComponent(email)}`)).json();
    const msg = await (await request.get(`${MAILPIT}/api/v1/message/${search.messages[0].ID}`)).json();
    link = msg.Text.match(/https?:\/\/\S+/)[0];
  }).toPass({ timeout: 10_000 });
  await page.goto(link);
  await expect(page).toHaveURL(/\/analisis\/nuevo$/);
  return { email, password };
}

/** Borra la cuenta desde /cuenta (limpieza al final de un test). */
export async function deleteAccount(page: Page) {
  await page.goto("/cuenta");
  await page.getByLabel(/Entiendo que se borran/).check();
  await page.getByRole("button", { name: "Borrar mi cuenta" }).click();
  await expect(page).toHaveURL(/\/registro\?borrada=1$/);
}
