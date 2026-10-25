import "server-only";
import { env } from "@/lib/env";
import { anthropicAi } from "./anthropic";
import { mockAi } from "./mock";
import type { AiProvider } from "./types";

// Elige la IA: Claude si hay ANTHROPIC_API_KEY, el simulador si no. El
// simulador inventa el texto de las fotos, así que en producción está prohibido.
export function aiProvider(): AiProvider {
  const e = env();
  const name = e.AI_PROVIDER ?? (e.ANTHROPIC_API_KEY ? "anthropic" : "mock");
  if (name === "mock") {
    if (e.NODE_ENV === "production") throw new Error("El simulador de IA no se puede usar en producción");
    return mockAi;
  }
  return anthropicAi;
}
