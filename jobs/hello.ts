import { inngest } from "@/lib/inngest/client";

// Función de prueba de la etapa 0: confirma que Inngest invoca a la app.
export const hello = inngest.createFunction(
  { id: "hello", triggers: [{ event: "test/hello" }] },
  async ({ event, step }) => {
    const greeting = await step.run("saludar", () => {
      const name = typeof event.data?.name === "string" ? event.data.name : "mundo";
      return `Hola, ${name}`;
    });
    return { greeting };
  },
);
