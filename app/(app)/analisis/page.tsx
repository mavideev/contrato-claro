import type { Metadata } from "next";
import { Suspense } from "react";
import { MobileBrand, PanelShell } from "@/components/app/panel-shell";
import { ButtonLink } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { STORAGE_NOTICE, Title } from "@/components/ui/typography";
import { analysisCard } from "@/lib/analysis/presentation";
import { requireUser } from "@/lib/auth/session";
import { scoped } from "@/lib/db/scoped";
import { todayInBuenosAires } from "@/lib/format";

// Prototipo 7 · Mis análisis / móvil 8.
export const metadata: Metadata = { title: "Mis análisis · Contrato Claro" };

export default function Page() {
  return (
    <PanelShell current="analisis">
      <MobileBrand>
        <ButtonLink href="/analisis/nuevo" className="min-h-11 px-4">
          + Nuevo
        </ButtonLink>
      </MobileBrand>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Title>Mis análisis</Title>
        <div className="hidden md:block">
          <ButtonLink href="/analisis/nuevo" className="min-h-[50px] px-6">
            Nuevo análisis
          </ButtonLink>
        </div>
      </div>
      <Suspense fallback={<CardsSkeleton />}>
        <Analyses />
      </Suspense>
      <p className="mt-auto pt-6 text-center text-xs leading-snug text-ink-3 md:text-left md:text-sm">{STORAGE_NOTICE}</p>
    </PanelShell>
  );
}

async function Analyses() {
  const user = await requireUser("/analisis");
  const rows = await scoped(user.id).analyses.list();
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-[14px] border border-line-soft bg-surface p-6">
        <p className="font-display text-[22px] font-semibold">Todavía no analizaste ningún contrato</p>
        <p className="text-ink-2">Subí una foto, un PDF, un Word o el texto, y te mostramos los riesgos cláusula por cláusula.</p>
        <ButtonLink href="/analisis/nuevo">Subir mi primer contrato</ButtonLink>
      </div>
    );
  }

  const today = todayInBuenosAires();
  const cards = rows.map((a) => ({ id: a.id, ...analysisCard(a, today) }));
  // «Firma hoy» primero, como en el prototipo mobile.
  cards.sort((a, b) => Number(b.highlight) - Number(a.highlight));

  return (
    <ul className="flex flex-col gap-3.5">
      {cards.map((c) => (
        <li
          key={c.id}
          className={`flex flex-col gap-3 rounded-[14px] bg-surface p-4 md:flex-row md:flex-wrap md:items-center md:gap-4 md:px-6 md:py-5 ${
            c.highlight ? "border-2 border-primary md:px-[23px] md:py-[19px]" : "border border-line-soft"
          }`}
        >
          <div className="flex items-start justify-between gap-2.5 md:flex-[1_1_260px]">
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-bold md:text-lg">{c.title}</h2>
              <p className="text-[13px] text-ink-3 md:text-[15px]">{c.subtitle}</p>
            </div>
            <span className="md:hidden">
              <Pill tone={c.pill.tone}>{c.pill.label}</Pill>
            </span>
          </div>
          <span className="hidden md:inline">
            <Pill tone={c.pill.tone}>{c.pill.label}</Pill>
          </span>
          <div className="flex gap-2 md:gap-3">
            {c.actions.map((a) => (
              <ButtonLink
                key={a.href}
                href={a.href}
                variant={a.variant}
                className={`flex-1 md:flex-none ${c.highlight ? "shadow-[0_0_0_6px_#D6ECEB]" : ""}`}
              >
                {a.label}
              </ButtonLink>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}

function CardsSkeleton() {
  return (
    <div aria-hidden className="flex animate-pulse flex-col gap-3.5">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-24 rounded-[14px] bg-line-soft" />
      ))}
    </div>
  );
}
