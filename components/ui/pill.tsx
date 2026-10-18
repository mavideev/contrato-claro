import type { ReactNode } from "react";
import type { Tone } from "@/lib/analysis/presentation";

// Píldoras de estado y del semáforo.
const tones: Record<Tone, string> = {
  high: "bg-high-bg text-high-fg",
  attention: "bg-attention-bg text-attention-fg",
  ok: "bg-ok-bg text-ok-fg",
  neutral: "bg-[#E9EEF2] text-ink-2",
};

export function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex h-7.5 shrink-0 items-center rounded-full px-3 text-sm font-bold whitespace-nowrap ${tones[tone]}`}>
      {children}
    </span>
  );
}

/** Conteo del semáforo: «1 riesgo alto · 2 atención · 9 sin alertas». */
export function RiskCounts({ high, attention, none }: { high: number; attention: number; none: number }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Pill tone="high">
        {high} {high === 1 ? "riesgo alto" : "riesgos altos"}
      </Pill>
      <Pill tone="attention">{attention} atención</Pill>
      <Pill tone="ok">{none} sin alertas</Pill>
    </div>
  );
}
