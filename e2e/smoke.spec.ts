import { expect, test, type Page } from "@playwright/test";

// Cada ruta renderiza sin errores de consola y sin scroll horizontal (spec 03).

const PUBLIC = ["/ingresar", "/registro", "/verificar?email=demo@contratoclaro.local", "/recuperar", "/recuperar/nueva?token=x"];
const PRIVATE = ["/analisis", "/analisis/nuevo", "/pagos", "/cuenta"];

async function visit(page: Page, path: string) {
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

const shot = (path: string) => path.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "home";

test.describe("sin sesión", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  for (const path of PUBLIC) {
    test(`renderiza ${path}`, async ({ page }, info) => {
      await visit(page, path);
      await page.screenshot({ path: info.outputPath(`${shot(path)}.png`), fullPage: true });
    });
  }

  test("las rutas del panel redirigen a /ingresar?next=", async ({ page }) => {
    await page.goto("/analisis");
    await expect(page).toHaveURL(/\/ingresar\?next=%2Fanalisis$/);
  });
});

test.describe("con sesión (demo)", () => {
  for (const path of PRIVATE) {
    test(`renderiza ${path}`, async ({ page }, info) => {
      await visit(page, path);
      await page.screenshot({ path: info.outputPath(`${shot(path)}.png`), fullPage: true });
    });
  }
});
