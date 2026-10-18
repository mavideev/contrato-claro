"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { startAnalysis, type FormState } from "@/app/(app)/analisis/actions";
import { buttonClass } from "@/components/ui/button";

// Móvil 3 · Escaneo. Etapa 0: maqueta sin cámara; el disparador suma páginas
// y «Listo» sigue el flujo. La cámara real llega con la extracción (etapa 2).

type Props =
  | { mode: "analysis" }
  | { mode: "recheck"; analysisId: string; action: () => Promise<void> };

const LINES = [96, 88, 92, 66, 94, 86, 72, 95, 80];
const corners = ["left-4 top-4 border-l-[3px] border-t-[3px]", "right-4 top-4 border-r-[3px] border-t-[3px]", "left-4 bottom-4 border-l-[3px] border-b-[3px]", "right-4 bottom-4 border-r-[3px] border-b-[3px]"];

export function ScanScreen(props: Props) {
  const [count, setCount] = useState(0);
  const [state, startAction, pending] = useActionState<FormState, FormData>(startAnalysis, {});
  const back = props.mode === "recheck" ? `/analisis/${props.analysisId}/rechequeo` : "/analisis/nuevo";
  const shown = Array.from({ length: Math.min(count, 4) }, (_, i) => count - Math.min(count, 4) + i + 1);

  return (
    <main className="mx-auto flex h-dvh w-full max-w-md flex-col gap-3.5 bg-[#0B1620] px-4 pt-4 pb-6 text-white">
      <div className="flex items-center justify-between">
        <Link href={back} className="inline-flex min-h-11 items-center text-base font-medium text-white">
          Cerrar
        </Link>
        <h1 className="text-[17px] font-bold">Página {count + 1}</h1>
        <span className="w-[52px]" />
      </div>

      <div className="relative flex-1 overflow-hidden rounded-[18px] bg-[#1B2733]" aria-hidden>
        {corners.map((c) => (
          <div key={c} className={`absolute size-10 border-[#3FB6B2] ${c}`} />
        ))}
        <div className="absolute top-3.5 left-1/2 z-10 -translate-x-1/2 rounded-full bg-[#F6D98A] px-3.5 py-1.5 text-sm font-semibold whitespace-nowrap text-[#4A3200]">
          Acercate un poco más
        </div>
        <div className="absolute inset-x-9 top-14 bottom-14 flex -rotate-[1.5deg] flex-col gap-[9px] bg-white px-5 py-[22px]">
          <div className="mb-2 text-xs font-bold tracking-[0.08em] text-ink">CLÁUSULA SEGUNDA · PLAZO</div>
          {LINES.map((w, i) => (
            <div key={i} className="h-[7px] rounded bg-[#D3D8DD]" style={{ width: `${w}%` }} />
          ))}
        </div>
        <div className="absolute inset-x-7 h-[3px] animate-[scan_3.2s_ease-in-out_infinite] bg-[#3FB6B2] shadow-[0_0_18px_4px_rgba(63,182,178,.55)]" />
      </div>

      <div className="flex min-h-[76px] items-center gap-2.5">
        {shown.map((n) => (
          <div key={n} className="flex h-[70px] w-[52px] items-end justify-center rounded-md border-2 border-ink-2 bg-white pb-1 text-xs font-bold text-ink">
            {n}
          </div>
        ))}
        <span className="text-[15px] text-[#B7C7D6]">{count === 1 ? "1 página" : `${count} páginas`}</span>
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-[#F6D98A]">
          {state.error}
        </p>
      )}

      <div className="flex items-center justify-between gap-2.5">
        <Link href={back} className={buttonClass("dark", "flex-1 px-3 text-[15px]")}>
          Desde archivos
        </Link>
        <button
          type="button"
          onClick={() => setCount(count + 1)}
          aria-label="Sacar foto de la página"
          className="size-[76px] shrink-0 rounded-full border-[6px] border-[#3FB6B2] bg-white active:scale-95"
        />
        <form action={props.mode === "recheck" ? props.action : startAction} className="flex flex-1">
          {props.mode === "analysis" && (
            <>
              <input type="hidden" name="contractType" value="rental" />
              <input type="hidden" name="method" value="foto" />
            </>
          )}
          <button type="submit" disabled={count === 0 || pending} className={buttonClass("primary", "w-full px-3 text-[15px]")}>
            Listo ({count})
          </button>
        </form>
      </div>
    </main>
  );
}
