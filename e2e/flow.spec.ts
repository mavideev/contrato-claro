import { expect, test, type Page } from "@playwright/test";
import { contractDocx, contractPdf, sampleContracts } from "../evals/fixtures";
import { deleteAccount, seedIds, signUpAndVerify } from "./helpers";

// Recorridos del flujo del análisis (spec 03). Los que crean datos usan un
// usuario nuevo y lo borran al final, para no tocar el seed. La extracción
// corre de verdad en Inngest; la IA es el simulador (sin ANTHROPIC_API_KEY).

const CONTRACT = sampleContracts()[0].text;
// PNG de 1×1: el simulador no mira las fotos.
const PHOTO = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

/** Pega el contrato de muestra y espera a que termine la lectura. */
async function pasteContract(page: Page) {
  await page.getByRole("button", { name: "Pegar texto" }).click();
  await page.getByLabel("Texto del contrato").fill(CONTRACT);
  await page.getByRole("button", { name: "Analizar contrato" }).click();
  await expect(page).toHaveURL(/\/confirmar$/, { timeout: 30_000 });
}

test.describe("con un usuario nuevo", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("una cuenta nueva ve el panel vacío y llega a Cuenta y Pagos", async ({ page, request }) => {
    await signUpAndVerify(page, request);
    await page.getByRole("link", { name: "Mis análisis" }).click();
    await expect(page.getByText("Todavía no analizaste ningún contrato")).toBeVisible();
    await page.getByRole("link", { name: "Pagos" }).filter({ visible: true }).click();
    await expect(page.getByRole("heading", { name: "Pagos", exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Cuenta" }).filter({ visible: true }).click();
    await expect(page.getByRole("heading", { name: "Cuenta", exact: true })).toBeVisible();
    await deleteAccount(page);
  });

  // ⚠️ Falla intermitente en CI (no en producción, probado a mano en Render):
  // el servidor deja el análisis en `preview_ready` bien (confirmado por log),
  // pero el navegador a veces se queda en /confirmar y nunca refleja la
  // navegación a /estado. Parece un tema puntual de Next.js en modo desarrollo
  // con este redirect-después-de-Server-Action. Pendiente de investigar a fondo.
  test("subir → confirmar → vista previa → pagar → pago pendiente", async ({
    page,
    request,
  }, info) => {
    test.skip(
      info.project.name !== "desktop",
      "el recorrido con archivo se prueba en desktop",
    );
    await signUpAndVerify(page, request);
    await expect(
      page.getByRole("button", { name: /Compraventa/ }),
    ).toBeDisabled();
    await expect(
      page.getByText("Para sacar fotos, entrá desde tu celular."),
    ).toBeVisible();

    await pasteContract(page);
    await expect(page.getByText("Los leímos de tu foto")).toHaveCount(0);
    // Datos leídos del texto pegado.
    await expect(page.getByLabel("Valor inicial")).toHaveValue("$ 450.000");
    await expect(page.getByLabel("Ajuste")).toHaveValue("Trimestral por IPC");
    await page.getByLabel("Inmueble").fill("Av. Corrientes 1234, 5° B");
    await page
      .getByLabel("Fecha de firma prevista (opcional)")
      .fill("2026-11-02");
    await page.getByRole("button", { name: "Confirmar y analizar" }).click();

    // Primera visita a /estado: el server de desarrollo la compila ahí mismo,
    // puede tardar bastante más que el resto de las rutas (más margen acá).
    await expect(page).toHaveURL(/\/estado$/, { timeout: 60_000 });
    await expect(
      page.getByRole("heading", { name: "Tu vista previa está lista" }),
    ).toBeVisible({ timeout: 60_000 });
    await expect(
      page.getByText("extra, lo comprás cuando lo necesites"),
    ).toBeVisible();
    await page.getByRole("button", { name: "Pagar con Mercado Pago" }).click();

    // Sin credenciales de Mercado Pago, el checkout es el simulador.
    await expect(page).toHaveURL(/\/pago\/simulador\?pago=/);
    await page.getByRole("button", { name: "Dejarlo pendiente" }).click();
    await expect(page).toHaveURL(/\/pago\/retorno\?analisis=/);
    await expect(
      page.getByRole("heading", { name: "Tu pago está pendiente" }),
    ).toBeVisible();

    await page.goto("/analisis");
    await expect(
      page.getByText("Alquiler de vivienda · Av. Corrientes 1234, 5° B"),
    ).toBeVisible();
    await expect(page.getByText("Pago pendiente").filter({ visible: true })).toBeVisible();
    await deleteAccount(page);
  });

  test("pagar en el simulador desbloquea el informe y el re-chequeo (etapa 1)", async ({ page, request }, info) => {
    test.skip(info.project.name !== "desktop", "un solo recorrido alcanza");
    await signUpAndVerify(page, request);
    await pasteContract(page);
    await page.getByRole("button", { name: "Confirmar y analizar" }).click();
    // Primera visita a /estado: el server de desarrollo la compila ahí mismo.
    await expect(page).toHaveURL(/\/estado$/, { timeout: 60_000 });
    await page.getByRole("button", { name: "Pagar con Mercado Pago" }).click();

    await page.getByRole("button", { name: "Aprobar el pago" }).click();
    await expect(page.getByRole("heading", { name: "Pago aprobado" })).toBeVisible();
    await page.getByRole("link", { name: "Ver mi informe" }).click();

    // El job de Inngest corre el análisis real (con el simulador, sin ANTHROPIC_API_KEY).
    await expect(page).toHaveURL(/\/informe$/, { timeout: 60_000 });
    // Las 14 partes del contrato pegado (encabezado + 13 cláusulas); este contrato
    // de muestra no tiene ambigüedades según el checklist, así que no da hallazgos.
    await expect(page.getByText("14 cláusulas sin alertas")).toBeVisible();

    await page.getByRole("link", { name: "Re-chequear el día de la firma" }).click();
    await page.getByRole("button", { name: "Pagar con Mercado Pago" }).click();
    await page.getByRole("button", { name: "Aprobar el pago" }).click();
    await expect(page.getByRole("heading", { name: "Pago aprobado" })).toBeVisible();
    await page.getByRole("link", { name: "Subir la versión final" }).click();
    await expect(page.getByText("Podés sacarle fotos desde el celular o subir el PDF o Word.")).toBeVisible();

    await page.goto("/pagos");
    await expect(page.getByText("Aprobado")).toHaveCount(2);
    await deleteAccount(page);
  });

  test("subir un PDF y un Word: los datos salen del archivo (etapa 2)", async ({ page, request }, info) => {
    test.skip(info.project.name !== "desktop", "el recorrido con archivo se prueba en desktop");
    await signUpAndVerify(page, request);
    const [, guiones, articulos] = sampleContracts();

    const pdf = Buffer.from(await contractPdf(articulos.text, 10));
    // Si el archivo se elige antes de que la página termine de cargar, React no ve el cambio: se reintenta.
    await expect(async () => {
      await page.getByLabel("Archivo del contrato").setInputFiles({ name: "contrato.pdf", mimeType: "application/pdf", buffer: pdf });
      await expect(page.getByText("contrato.pdf")).toBeVisible({ timeout: 1000 });
    }).toPass();
    await page.getByRole("button", { name: "Analizar contrato" }).click();
    await expect(page).toHaveURL(/\/confirmar$/, { timeout: 30_000 });
    await expect(page.getByLabel("Valor inicial")).toHaveValue("USD 500");
    await expect(page.getByLabel("Moneda")).toHaveValue("USD");
    await expect(page.getByLabel("Plazo")).toHaveValue("36 meses");

    await page.goto("/analisis/nuevo");
    await page.getByLabel("Archivo del contrato").setInputFiles({ name: "contrato.docx", mimeType: "", buffer: Buffer.from(await contractDocx(guiones.text)) });
    await page.getByRole("button", { name: "Analizar contrato" }).click();
    await expect(page).toHaveURL(/\/confirmar$/, { timeout: 30_000 });
    await expect(page.getByLabel("Garantía")).toHaveValue("Fiador");
    await expect(page.getByLabel("Ajuste")).toHaveValue("Semestral por ICL");
    await deleteAccount(page);
  });

  test("un archivo que no se puede abrir muestra el motivo y deja subir otro", async ({ page, request }, info) => {
    test.skip(info.project.name !== "desktop", "un solo recorrido alcanza");
    await signUpAndVerify(page, request);
    await page.getByLabel("Archivo del contrato").setInputFiles({ name: "roto.pdf", mimeType: "application/pdf", buffer: Buffer.from("no soy un pdf") });
    await page.getByRole("button", { name: "Analizar contrato" }).click();
    await expect(page.getByRole("heading", { name: "No pudimos leer tu contrato" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("No pudimos abrir el archivo.")).toBeVisible();
    await page.getByRole("link", { name: "Subir otro archivo" }).click();
    await expect(page).toHaveURL(/\/analisis\/nuevo$/);

    await page.goto("/analisis");
    await expect(page.getByText("No se pudo leer").filter({ visible: true })).toBeVisible();
    await deleteAccount(page);
  });

  test("en mobile: sacar fotos → confirmar con el aviso del monto", async ({
    page,
    request,
  }, info) => {
    test.skip(info.project.name !== "mobile", "la cámara es solo mobile");
    await signUpAndVerify(page, request);
    await expect(
      page.getByRole("button", { name: /Sacar foto/ }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("link", { name: "Abrir cámara" }).click();

    await expect(page).toHaveURL(/\/escanear$/);
    const done = page.getByRole("button", { name: /Listo/ });
    await expect(done).toBeDisabled();
    // El disparador abre la cámara; en el test se le pasa la foto directo al input.
    const camera = page.getByLabel("Foto de la página", { exact: true });
    for (const n of [1, 2, 3]) {
      await camera.setInputFiles({ name: `pagina-${n}.png`, mimeType: "image/png", buffer: PHOTO });
      await expect(done).toHaveText(`Listo (${n})`);
    }
    await page.getByRole("button", { name: "Borrar la página 3" }).click();
    await expect(done).toHaveText("Listo (2)");
    await done.click();

    await expect(page).toHaveURL(/\/confirmar$/, { timeout: 30_000 });
    await expect(page.getByText("El monto se leyó de una foto.")).toBeVisible();
    await expect(page.getByText("Cláusula 11 · Valor inicial")).toBeVisible();
    await expect(page.locator("mark", { hasText: "450.000" })).toBeVisible();
    await expect(page.getByText("Revisá", { exact: true })).toBeVisible();
    await page.getByLabel("Valor inicial").fill("$ 460.000");
    await expect(page.getByText("Monto confirmado. Gracias.")).toBeVisible();
    await deleteAccount(page);
  });
});

test("informe y re-chequeo del seed", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "un solo recorrido alcanza");
  const ids = await seedIds(page);

  await page.goto(`/analisis/${ids.ready}/informe`);
  await expect(page.getByText("1 riesgo alto")).toBeVisible();
  await expect(page.getByText("9 cláusulas sin alertas")).toBeVisible();
  // El hallazgo de riesgo alto arranca abierto, con la cláusula citada.
  await expect(page.getByText("QUÉ DICE EL CONTRATO").first()).toBeVisible();

  await page.goto(`/analisis/${ids.ready}/rechequeo`);
  await expect(
    page.getByRole("button", { name: "Pagar con Mercado Pago" }),
  ).toBeVisible();

  await page.goto(`/analisis/${ids.signsToday}/rechequeo`);
  await expect(
    page.getByRole("alert").filter({ hasText: "Se detectaron 2 cambios" }),
  ).toBeVisible();
  await expect(page.getByText("10 de 12")).toBeVisible();
  await expect(
    page.locator("del", { hasText: "trimestralmente" }),
  ).toBeVisible();
  await expect(page.locator("ins", { hasText: "mensualmente" })).toBeVisible();
});

test.describe("aislamiento", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("un usuario no puede abrir el análisis de otro (404)", async ({
    page,
    browser,
  }, info) => {
    test.skip(info.project.name !== "desktop", "un solo recorrido alcanza");
    // Id de un análisis de «otro».
    await page.goto("/ingresar");
    await page.getByLabel("Email").fill("otro@contratoclaro.local");
    await page.getByLabel("Contraseña").fill("otro12345");
    await page.getByRole("button", { name: "Ingresar", exact: true }).click();
    await expect(page).toHaveURL(/\/analisis$/);
    const href = await page
      .getByRole("link", { name: "Ver informe" })
      .getAttribute("href");

    const demo = await browser.newContext({
      storageState: "e2e/.auth/demo.json",
    });
    const demoPage = await demo.newPage();
    for (const path of [
      href!,
      href!.replace("informe", "rechequeo"),
      href!.replace("informe", "estado"),
      href!.replace("informe", "confirmar"),
    ]) {
      await demoPage.goto(path);
      await expect(
        demoPage.getByRole("heading", { name: "No encontramos esta página" }),
        path,
      ).toBeVisible();
    }
    await demoPage.goto("/analisis/no-es-un-id/informe");
    await expect(
      demoPage.getByRole("heading", { name: "No encontramos esta página" }),
    ).toBeVisible();
    await demo.close();
  });
});
