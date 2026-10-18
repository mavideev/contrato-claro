import { expect, test as setup } from "@playwright/test";

// Inicia sesión con el usuario demo del seed y guarda la cookie para los demás tests.
setup("sesión del usuario demo", async ({ page }) => {
  await page.goto("/ingresar");
  await page.getByLabel("Email").fill("demo@contratoclaro.local");
  await page.getByLabel("Contraseña").fill("demo12345");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL(/\/analisis$/);
  await page.context().storageState({ path: "e2e/.auth/demo.json" });
});
