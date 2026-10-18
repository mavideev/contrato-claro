import { expect, test } from "@playwright/test";

// Registro → mail en Mailpit → verificación → borrar la cuenta (spec 02).
// Necesita Mailpit del compose en MAILPIT_URL (por defecto http://localhost:8025).
const MAILPIT = process.env.MAILPIT_URL ?? "http://localhost:8025";

test.use({ storageState: { cookies: [], origins: [] } });

test("registrarse, verificar el email y borrar la cuenta", async ({ page, request }, info) => {
  test.skip(info.project.name !== "desktop", "un solo recorrido alcanza");
  const email = `e2e-${Date.now()}@contratoclaro.local`;
  const password = "clave-e2e-123";

  await page.goto("/registro");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page).toHaveURL(/\/verificar\?email=/);
  await expect(page.getByText(email)).toBeVisible();

  let link = "";
  await expect(async () => {
    const search = await (await request.get(`${MAILPIT}/api/v1/search?query=to:${encodeURIComponent(email)}`)).json();
    const msg = await (await request.get(`${MAILPIT}/api/v1/message/${search.messages[0].ID}`)).json();
    link = msg.Text.match(/https?:\/\/\S+/)[0];
  }).toPass({ timeout: 10_000 });

  await page.goto(link);
  // Usuario nuevo sin análisis: va directo a subir uno.
  await expect(page).toHaveURL(/\/analisis\/nuevo$/);

  await page.goto("/cuenta");
  await expect(page.getByText(email)).toBeVisible();
  await page.getByLabel(/Entiendo que se borran/).check();
  await page.getByRole("button", { name: "Borrar mi cuenta" }).click();
  await expect(page).toHaveURL(/\/registro\?borrada=1$/);
  await expect(page.getByText("Borramos tu cuenta")).toBeVisible();

  // La sesión se cerró y la cuenta ya no existe.
  await page.goto("/analisis");
  await expect(page).toHaveURL(/\/ingresar/);
  const res = await request.post("/api/auth/sign-in/email", { data: { email, password }, headers: { Origin: info.project.use.baseURL ?? "http://localhost:3000" } });
  expect(res.status()).toBe(401);
});
