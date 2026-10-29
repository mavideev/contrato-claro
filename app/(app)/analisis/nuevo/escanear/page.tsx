import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ScanScreen } from "@/components/app/scan-screen";
import { requireUser } from "@/lib/auth/session";
import { scoped } from "@/lib/db/scoped";

// Móvil 3 · Escaneo. Con ?rechequeo=<id>, escanea la versión final para el re-chequeo.
export const metadata: Metadata = { title: "Escanear · Contrato Claro" };

export default function Page({ searchParams }: PageProps<"/analisis/nuevo/escanear">) {
  return (
    <Suspense fallback={<main className="h-dvh bg-[#0B1620]" />}>
      <Scan searchParams={searchParams} />
    </Suspense>
  );
}

async function Scan({ searchParams }: Pick<PageProps<"/analisis/nuevo/escanear">, "searchParams">) {
  const { rechequeo } = await searchParams;
  const user = await requireUser("/analisis/nuevo/escanear");
  if (typeof rechequeo !== "string") return <ScanScreen mode="analysis" />;

  if (!(await scoped(user.id).rechecks.entitlement(rechequeo)).ok) notFound();
  return <ScanScreen mode="recheck" analysisId={rechequeo} />;
}
