import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { confirmAnalysis } from "@/app/(app)/analisis/actions";
import { ConfirmForm } from "@/components/app/confirm-form";
import { FlowPage, SkeletonBlock } from "@/components/app/flow";
import { BackLink, Title } from "@/components/ui/typography";
import { loadAnalysis } from "@/lib/analysis/load";
import { EDITABLE_STATUSES } from "@/lib/db/scoped";

// Prototipo 3 · Confirmar datos / móvil 4.
export const metadata: Metadata = { title: "Confirmar datos · Contrato Claro" };

export default function Page({ params, searchParams }: PageProps<"/analisis/[id]/confirmar">) {
  return (
    <FlowPage>
      <Suspense fallback={<SkeletonBlock className="h-[480px]" />}>
        <Confirm params={params} searchParams={searchParams} />
      </Suspense>
    </FlowPage>
  );
}

async function Confirm({ params, searchParams }: PageProps<"/analisis/[id]/confirmar">) {
  const { analysis } = await loadAnalysis(params, "confirmar");
  if (!EDITABLE_STATUSES.includes(analysis.status)) redirect(`/analisis/${analysis.id}/estado`);
  // Etapa 0: el origen llega en la URL. Con la subida real (etapa 2) sale de `documents.kind`.
  const fromPhoto = (await searchParams).origen === "foto";

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
      />
    </>
  );
}
