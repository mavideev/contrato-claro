"use client";
import Link from "next/link";
import { useActionState, useState, type ReactNode } from "react";
import { startAnalysis, type FormState } from "@/app/(app)/analisis/actions";
import { Button, buttonClass } from "@/components/ui/button";
import { Kicker, STORAGE_NOTICE } from "@/components/ui/typography";
import { useIsMobile } from "./use-is-mobile";

// Prototipo 2 · Subir contrato. Correcciones de la spec 03: «Sacar foto» solo
// en mobile (en desktop, aviso), Compraventa y Boleto «Próximamente».

type Method = "foto" | "archivo" | "texto";

const TYPES = [
  { value: "rental", label: "Alquiler", enabled: true },
  { value: "sale", label: "Compraventa", enabled: false },
  { value: "boleto", label: "Boleto", enabled: false },
];

const icon = (d: ReactNode) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
    {d}
  </svg>
);

const METHODS: { value: Method; label: string; hint: string; icon: ReactNode; mobileOnly?: boolean }[] = [
  {
    value: "foto",
    label: "Sacar foto",
    hint: "Escaneá página por página",
    mobileOnly: true,
    icon: icon(
      <>
        <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
        <circle cx="12" cy="13" r="3.5" />
      </>,
    ),
  },
  { value: "archivo", label: "Subir PDF o Word", hint: "Desde archivos o Drive", icon: icon(<path d="M14 3H6v18h12V7zM14 3v4h4M12 11v6M9 14l3-3 3 3" />) },
  { value: "texto", label: "Pegar texto", hint: "Copiado de un mail o WhatsApp", icon: icon(<path d="M5 6h14M5 10h14M5 14h10M5 18h7" />) },
];

export function UploadForm() {
  const isMobile = useIsMobile();
  const [chosen, setChosen] = useState<Method | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const method: Method = chosen && (chosen !== "foto" || isMobile) ? chosen : isMobile ? "foto" : "archivo";
  const [state, action, pending] = useActionState<FormState, FormData>(startAnalysis, {});

  return (
    <form action={action} className="flex max-w-[620px] flex-1 flex-col gap-5 md:gap-6">
      <input type="hidden" name="contractType" value="rental" />
      <input type="hidden" name="method" value={method} />

      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-2.5 hidden md:block">
          <Kicker>Tipo de contrato</Kicker>
        </legend>
        <div className="flex flex-wrap gap-2 md:gap-2.5">
          {TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              disabled={!t.enabled}
              aria-pressed={t.enabled}
              className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-[15px] font-medium whitespace-nowrap md:px-[18px] md:text-base ${
                t.enabled ? "border-ink bg-ink text-white" : "cursor-not-allowed border-line bg-surface text-ink-3"
              }`}
            >
              {t.label}
              {!t.enabled && <span className="text-xs font-semibold">Próximamente</span>}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-2.5 hidden md:block">
          <Kicker>¿Cómo lo tenés?</Kicker>
        </legend>
        <div className="flex flex-col gap-2.5 md:flex-row md:flex-wrap md:gap-3">
          {METHODS.map((m) => {
            const on = m.value === method;
            return (
              <button
                key={m.value}
                type="button"
                aria-pressed={on}
                onClick={() => setChosen(m.value)}
                className={`${m.mobileOnly ? "md:hidden" : ""} flex min-h-[68px] w-full items-center gap-3.5 rounded-xl px-4 py-3 text-left text-base md:min-h-[84px] md:flex-[1_1_160px] md:flex-col md:justify-center md:gap-2 md:text-center ${
                  on ? "border-2 border-primary bg-[#F0F8F7] font-bold" : "border border-line bg-surface font-medium hover:border-primary"
                }`}
              >
                {m.icon}
                <span className="flex flex-col gap-0.5">
                  {m.label}
                  <span className="text-[13px] font-normal text-ink-3 md:hidden">{m.hint}</span>
                </span>
              </button>
            );
          })}
        </div>

        <p className="hidden items-center gap-2.5 rounded-xl bg-[#E9EEF2] px-4 py-3.5 text-[15px] text-[#243B53] md:flex">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <rect x="7" y="2" width="10" height="20" rx="2" />
            <path d="M11 18h2" />
          </svg>
          Para sacar fotos, entrá desde tu celular.
        </p>

        {/* Sin `name`: en la etapa 0 no se procesa; en la etapa 2 se sube directo a S3. */}
        {method === "archivo" && (
          <label className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed border-[#B9C4CC] bg-surface p-6 text-center text-[15px] text-ink-2">
            {fileName ? (
              <span className="font-semibold break-all text-ink">{fileName}</span>
            ) : (
              <span>
                Arrastrá tu archivo acá o <span className="font-semibold text-primary-hover underline">elegilo desde tu dispositivo</span>
              </span>
            )}
            <span className="text-[13px] text-ink-3">{fileName ? "Tocá para cambiarlo" : "PDF o Word · hasta 20 MB"}</span>
            <input
              type="file"
              required
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => setFileName(e.currentTarget.files?.[0]?.name ?? null)}
              className="sr-only"
            />
          </label>
        )}
        {method === "texto" && (
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Texto del contrato
            <textarea
              required
              placeholder="Pegá acá el texto completo del contrato"
              className="h-28 resize-y rounded-xl border border-line bg-surface px-3.5 py-3 text-[15px] font-normal text-ink"
            />
          </label>
        )}
      </fieldset>

      {state.error && (
        <p role="alert" className="text-sm text-high-fg">
          {state.error}
        </p>
      )}

      <div className="mt-auto flex flex-col gap-3 pb-6 md:mt-0 md:pb-0">
        {method === "foto" ? (
          <Link href="/analisis/nuevo/escanear" className={buttonClass("primary", "min-h-[52px] w-full text-[17px]")}>
            Abrir cámara
          </Link>
        ) : (
          <Button type="submit" disabled={pending} className="min-h-[52px] w-full text-[17px]">
            Analizar contrato
          </Button>
        )}
        <p className="text-center text-[13px] leading-snug text-ink-3 md:text-left md:text-sm">{STORAGE_NOTICE}</p>
      </div>
    </form>
  );
}
