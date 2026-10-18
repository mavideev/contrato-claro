import { expect, test } from "@playwright/test";
import { seedIds, shotName, visit } from "./helpers";

// Cada ruta renderiza sin errores de consola y sin scroll horizontal (spec 03).

const PUBLIC = ["/ingresar", "/registro", "/verificar?email=demo@contratoclaro.local", "/recuperar", "/recuperar/nueva?token=x"];
const PRIVATE = ["/analisis", "/analisis/nuevo", "/analisis/nuevo/escanear", "/pagos", "/cuenta"];

test.describe("sin sesión", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  for (const path of PUBLIC) {
    test(`renderiza ${path}`, async ({ page }, info) => {
      await visit(page, path);
      await page.screenshot({ path: info.outputPath(`${shotName(path)}.png`), fullPage: true });
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
      await page.screenshot({ path: info.outputPath(`${shotName(path)}.png`), fullPage: true });
    });
  }

  test("renderiza las pantallas de cada análisis del seed", async ({ page }, info) => {
    const ids = await seedIds(page);
    const paths = [
      `/analisis/${ids.ready}/informe`,
      `/analisis/${ids.ready}/rechequeo`, // sin pagar: compra
      `/analisis/${ids.signsToday}/rechequeo`, // con cambios
      `/analisis/${ids.pending}/estado`,
      `/analisis/${ids.pending}/confirmar`,
      `/pago/retorno?analisis=${ids.pending}`,
    ];
    for (const path of paths) {
      await visit(page, path);
      // Todas las pantallas del flujo permiten volver al panel.
      await expect(page.getByRole("link", { name: "Mis análisis" }).first(), path).toBeVisible();
      await page.screenshot({ path: info.outputPath(`${shotName(path)}.png`), fullPage: true });
    }
  });
});
