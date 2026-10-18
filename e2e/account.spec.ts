import { expect, test } from "@playwright/test";
import { deleteAccount, signUpAndVerify } from "./helpers";

// Registro → mail en Mailpit → verificación → borrar la cuenta (spec 02).
test.use({ storageState: { cookies: [], origins: [] } });

test("registrarse, verificar el email y borrar la cuenta", async ({ page, request, baseURL }, info) => {
  test.skip(info.project.name !== "desktop", "un solo recorrido alcanza");
  const { email, password } = await signUpAndVerify(page, request);

  await page.goto("/cuenta");
  await expect(page.getByText(email)).toBeVisible();
  await deleteAccount(page);
  await expect(page.getByText("Borramos tu cuenta")).toBeVisible();

  // La sesión se cerró y la cuenta ya no existe.
  await page.goto("/analisis");
  await expect(page).toHaveURL(/\/ingresar/);
  const res = await request.post("/api/auth/sign-in/email", { data: { email, password }, headers: { Origin: baseURL! } });
  expect(res.status()).toBe(401);
});
