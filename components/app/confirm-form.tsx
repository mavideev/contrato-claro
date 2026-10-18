"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import type { FormState } from "@/app/(app)/analisis/actions";
import { BottomBar } from "@/components/app/flow";
import { Button, buttonClass } from "@/components/ui/button";
import type { ConfirmedFields } from "@/db/schema";
import { FIELDS } from "@/lib/analysis/fields";

// Prototipo 3 · Confirmar datos / móvil 4. Si el origen es una foto, el monto
// queda en «Revisá» hasta que se toca, con el aviso al costado.

type Props = {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  values: ConfirmedFields;
  signingDate: string | null;
  fromPhoto: boolean;
};

const labelClass = "text-xs font-semibold tracking-[0.08em] text-ink-3 uppercase md:text-[13px]";

export function ConfirmForm({ action, values, signingDate, fromPhoto }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const [amountChecked, setAmountChecked] = useState(!fromPhoto);
  const warn = !amountChecked;

  const notice = warn ? (
    <p className="text-sm leading-normal text-attention-fg md:text-[15px]">El monto se leyó de una foto. Confirmalo contra tu copia.</p>
  ) : (
    <p className="text-sm leading-normal text-ok-fg md:text-[15px]">Monto confirmado. Gracias.</p>
  );

  return (
    <form action={formAction} className="flex flex-1 flex-col gap-4 md:gap-7">
      <div className="flex flex-col items-start gap-4 md:flex-row md:gap-8">
        {fromPhoto && (
          <aside className="flex w-full flex-col gap-2 rounded-xl border border-[#E8D3A2] bg-surface px-4 py-3.5 md:order-2 md:w-[340px] md:shrink-0 md:gap-2.5 md:rounded-[14px] md:border-line-soft md:p-6">
            <div className="text-[11px] font-bold tracking-[0.08em] text-ink md:text-xs">CLÁUSULA TERCERA · PRECIO</div>
            <div aria-hidden className="hidden flex-col gap-2.5 md:flex">
              <div className="h-1.5 w-full rounded-sm bg-[#D3D8DD]" />
              <div className="h-1.5 w-[88%] rounded-sm bg-[#D3D8DD]" />
            </div>
            <div aria-hidden className="my-0.5 h-[11px] w-full rounded bg-[#F6D98A] md:my-1.5 md:h-3.5" />
            <div aria-hidden className="hidden flex-col gap-2.5 md:flex">
              <div className="h-1.5 w-[94%] rounded-sm bg-[#D3D8DD]" />
              <div className="h-1.5 w-[70%] rounded-sm bg-[#D3D8DD]" />
            </div>
            {notice}
          </aside>
        )}

        <div className="grid w-full min-w-0 flex-1 grid-cols-1 gap-x-[18px] gap-y-3.5 md:grid-cols-2 md:gap-y-5">
          {FIELDS.map((f) => {
            const isAmount = f.key === "initialRent";
            const pill = isAmount && fromPhoto ? (warn ? "Revisá" : "Confirmado") : values[f.key] ? "Leído" : null;
            const amber = isAmount && warn;
            return (
              <div key={f.key} className={`flex flex-col gap-1.5 md:gap-[7px] ${f.wide ? "md:col-span-2" : ""}`}>
                <label htmlFor={f.key} className={labelClass}>
                  {f.label}
                </label>
                <div className="relative flex items-center">
                  <input
                    id={f.key}
                    name={f.key}
                    defaultValue={values[f.key] ?? ""}
                    onChange={isAmount ? () => setAmountChecked(true) : undefined}
                    className={`h-[52px] w-full rounded-[10px] bg-surface pr-28 pl-4 text-[17px] text-ink ${amber ? "border-2 border-attention" : "border border-line"}`}
                  />
                  {pill && (
                    <span
                      className={`pointer-events-none absolute right-3 inline-flex h-[26px] items-center rounded-full px-2.5 text-[13px] font-bold ${
                        amber ? "bg-attention-bg text-attention-fg" : "bg-ok-bg text-ok-fg"
                      }`}
                    >
                      {pill}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          <div className="flex flex-col gap-1.5 md:col-span-2 md:gap-[7px]">
            <label htmlFor="signingDate" className={labelClass}>
              Fecha de firma prevista (opcional)
            </label>
            <input
              id="signingDate"
              name="signingDate"
              type="date"
              defaultValue={signingDate ?? ""}
              className="h-[52px] w-full rounded-[10px] border border-line bg-surface px-4 text-[17px] text-ink md:max-w-xs"
            />
            <p className="text-[13px] text-ink-3">Ese día lo vas a ver marcado como «Firma hoy» en Mis análisis.</p>
          </div>
        </div>
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-high-fg">
          {state.error}
        </p>
      )}

      <BottomBar>
        <div className="flex gap-2.5 md:contents">
          <Link href={fromPhoto ? "/analisis/nuevo/escanear" : "/analisis/nuevo"} className={buttonClass("ghost", "flex-1 md:flex-none")}>
            {fromPhoto ? "Volver a escanear" : "Subir otro archivo"}
          </Link>
          <Button type="submit" disabled={pending} className="flex-[1.6] md:flex-none">
            Confirmar y analizar
          </Button>
        </div>
      </BottomBar>
    </form>
  );
}
