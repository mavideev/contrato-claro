import type { analyses } from "@/db/schema";
import { formatDay } from "@/lib/format";

// Cómo se muestra cada análisis en «Mis análisis» (prototipo 7 y móvil 8).

type Analysis = Pick<
  typeof analyses.$inferSelect,
  "id" | "contractType" | "status" | "propertyLabel" | "signingDate" | "createdAt"
>;

export type Tone = "high" | "attention" | "ok" | "neutral";
export type Action = { label: string; href: string; variant: "primary" | "ghost" };
export type AnalysisCard = {
  title: string;
  subtitle: string;
  pill: { tone: Tone; label: string };
  actions: Action[];
  /** «Firma hoy»: borde y acción destacados. */
  highlight: boolean;
};

export const CONTRACT_LABEL: Record<Analysis["contractType"], string> = {
  rental: "Alquiler de vivienda",
  sale: "Compraventa",
  boleto: "Boleto de compraventa",
};

export function analysisCard(a: Analysis, today: string): AnalysisCard {
  const base = `/analisis/${a.id}`;
  const title = a.propertyLabel ? `${CONTRACT_LABEL[a.contractType]} · ${a.propertyLabel}` : CONTRACT_LABEL[a.contractType];
  const created = formatDay(a.createdAt);

  if (a.status === "ready") {
    const signsToday = a.signingDate === today;
    const signing = a.signingDate && a.signingDate >= today ? ` · firma ${signsToday ? "hoy, " : "el "}${formatDay(a.signingDate)}` : "";
    return {
      title,
      subtitle: `Analizado el ${created}${signing}`,
      pill: signsToday ? { tone: "attention", label: "Firma hoy" } : { tone: "ok", label: "Informe listo" },
      actions: signsToday
        ? [{ label: "Re-chequear hoy", href: `${base}/rechequeo`, variant: "primary" }]
        : [
            { label: "Ver informe", href: `${base}/informe`, variant: "ghost" },
            { label: "Re-chequear", href: `${base}/rechequeo`, variant: "ghost" },
          ],
      highlight: signsToday,
    };
  }

  const pending: Record<Exclude<Analysis["status"], "ready">, Pick<AnalysisCard, "pill" | "actions">> = {
    draft: { pill: { tone: "neutral", label: "Sin terminar" }, actions: [{ label: "Subir contrato", href: "/analisis/nuevo", variant: "ghost" }] },
    extracting: { pill: { tone: "neutral", label: "Leyendo" }, actions: [{ label: "Ver estado", href: `${base}/estado`, variant: "ghost" }] },
    awaiting_confirmation: {
      pill: { tone: "attention", label: "Falta confirmar" },
      actions: [{ label: "Confirmar datos", href: `${base}/confirmar`, variant: "ghost" }],
    },
    preview_ready: {
      pill: { tone: "neutral", label: "Pago pendiente" },
      actions: [{ label: "Continuar al pago", href: `${base}/estado`, variant: "ghost" }],
    },
    paid: { pill: { tone: "neutral", label: "Analizando" }, actions: [{ label: "Ver estado", href: `${base}/estado`, variant: "ghost" }] },
    analyzing: { pill: { tone: "neutral", label: "Analizando" }, actions: [{ label: "Ver estado", href: `${base}/estado`, variant: "ghost" }] },
    failed: { pill: { tone: "high", label: "No se pudo leer" }, actions: [{ label: "Subir otro archivo", href: "/analisis/nuevo", variant: "ghost" }] },
  };
  return { title, subtitle: `Creado el ${created}`, highlight: false, ...pending[a.status] };
}
