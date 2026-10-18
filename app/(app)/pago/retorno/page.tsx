import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FlowPage, SkeletonBlock } from "@/components/app/flow";
import { ButtonLink } from "@/components/ui/button";
import { Title } from "@/components/ui/typography";
import { requireUser } from "@/lib/auth/session";
import { scoped } from "@/lib/db/scoped";

// Pantalla agregada: vuelta de Mercado Pago. Solo lee el estado del pago en la
// base, nunca los parámetros que manda Mercado Pago (spec 04, paso 5).
export const metadata: Metadata = { title: "Pago · Contrato Claro" };

export default function Page({ searchParams }: PageProps<"/pago/retorno">) {
  return (
    <FlowPage wide={false}>
      <Suspense fallback={<SkeletonBlock className="h-60" />}>
        <Result searchParams={searchParams} />
      </Suspense>
    </FlowPage>
  );
}

async function Result({ searchParams }: Pick<PageProps<"/pago/retorno">, "searchParams">) {
  const { analisis, tipo } = await searchParams;
  if (typeof analisis !== "string") notFound();
  const user = await requireUser("/analisis");
  const recheck = tipo === "rechequeo";
  const payment = await scoped(user.id).payments.latest(analisis, recheck ? "recheck" : "analysis");
  if (!payment) notFound();

  const back = `/analisis/${analisis}/${recheck ? "rechequeo" : "estado"}`;
  const content = {
    approved: {
      title: "Pago aprobado",
      text: recheck ? "Ya podés subir la versión que vas a firmar." : "Estamos preparando tu informe completo. Te avisamos por mail cuando esté listo.",
      action: { href: back, label: recheck ? "Subir la versión final" : "Ver el estado" },
    },
    pending: {
      title: "Tu pago está pendiente",
      text: "Cuando Mercado Pago lo confirme, se desbloquea solo. Podés cerrar esta pantalla: te avisamos por mail.",
      action: { href: "/analisis", label: "Volver a Mis análisis" },
    },
    rejected: {
      title: "El pago fue rechazado",
      text: "Mercado Pago no aprobó el pago. No se te cobró nada. Podés probar con otro medio.",
      action: { href: back, label: "Probar de nuevo" },
    },
    cancelled: {
      title: "Cancelaste el pago",
      text: "No se te cobró nada. Cuando quieras, podés volver a intentarlo.",
      action: { href: back, label: "Volver" },
    },
    refunded: {
      title: "Pago reembolsado",
      text: "Te devolvimos el dinero. Puede tardar unos días en verse en tu cuenta.",
      action: { href: "/pagos", label: "Ver mis pagos" },
    },
  }[payment.status];

  return (
    <section className="flex flex-col gap-5 rounded-2xl border border-line-soft bg-surface p-6 md:mt-12 md:p-8">
      <Title>{content.title}</Title>
      <p className="text-ink-2">{content.text}</p>
      <ButtonLink href={content.action.href} className="self-start">
        {content.action.label}
      </ButtonLink>
    </section>
  );
}
