import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { confirmAnalysis } from "@/app/(app)/analisis/actions";
import { ConfirmForm, type AmountSource } from "@/components/app/confirm-form";
import { FlowPage, SkeletonBlock } from "@/components/app/flow";
import { BackLink, Title } from "@/components/ui/typography";
import { loadAnalysis } from "@/lib/analysis/load";
import { EDITABLE_STATUSES } from "@/lib/db/scoped";

// Prototipo 3 · Confirmar datos / móvil 4.
export const metadata: Metadata = { title: "Confirmar datos · Contrato Claro" };

export default function Page({ params }: PageProps<"/analisis/[id]/confirmar">) {
  return (
    <FlowPage>
      <Suspense fallback={<SkeletonBlock className="h-[480px]" />}>
        <Confirm params={params} />
      </Suspense>
    </FlowPage>
  );
}

async function Confirm({ params }: Pick<PageProps<"/analisis/[id]/confirmar">, "params">) {
  const { analysis, db } = await loadAnalysis(params, "confirmar");
  if (!EDITABLE_STATUSES.includes(analysis.status)) redirect(`/analisis/${analysis.id}/estado`);
  const [document, clauses] = await Promise.all([db.analyses.original(analysis.id), db.analyses.clauses(analysis.id)]);
  const fromPhoto = document?.kind === "photo";
  const source = fromPhoto ? amountSource(clauses, analysis.confirmedFields?.initialRent) : null;

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <BackLink href={fromPhoto ? "/analisis/nuevo/escanear" : "/analisis/nuevo"}>Volver</BackLink>
        <Title>Confirmá los datos clave</Title>
        <p className="text-[15px] text-ink-2 md:text-[17px]">
          {fromPhoto ? "Los leímos de tu foto. Corregí lo que haga falta antes de analizar." : "Los leímos de tu contrato. Corregí lo que haga falta antes de analizar."}
        </p>
      </div>
      <ConfirmForm
        action={confirmAnalysis.bind(null, analysis.id)}
        values={analysis.confirmedFields ?? {}}
        signingDate={analysis.signingDate}
        fromPhoto={fromPhoto}
        source={source}
      />
    </>
  );
}

/** La parte de la cláusula de donde salió el monto, para compararla con la copia en papel. */
function amountSource(clauses: { number: number; title: string; text: string }[], rent: string | undefined): AmountSource | null {
  const digits = rent?.replace(/^(?:\$|USD)\s?/, "");
  const clause = (digits && clauses.find((c) => c.text.includes(digits))) || clauses.find((c) => /precio|valor|alquiler/i.test(c.title));
  if (!clause) return null;
  const at = digits ? clause.text.indexOf(digits) : -1;
  const label = `${clause.number ? `Cláusula ${clause.number} · ` : ""}${clause.title}`;
  if (at < 0) return { label, before: clause.text.slice(0, 160), highlight: "", after: "" };
  const from = Math.max(0, at - 80);
  return {
    label,
    before: `${from > 0 ? "…" : ""}${clause.text.slice(from, at)}`,
    highlight: digits!,
    after: `${clause.text.slice(at + digits!.length, at + digits!.length + 80)}…`,
  };
}
