import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { requireUser } from "@/lib/auth/session";
import { scoped } from "@/lib/db/scoped";

// Placeholder de la etapa 0 (parte 3): la pantalla «Mis análisis» llega con la parte de pantallas.
export const metadata: Metadata = { title: "Mis análisis · Contrato Claro" };

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10">
      <h1 className="text-3xl font-bold">Mis análisis</h1>
      <Suspense fallback={<p className="text-ink-3">Cargando…</p>}>
        <Analyses />
      </Suspense>
    </main>
  );
}

async function Analyses() {
  const user = await requireUser("/analisis");
  const rows = await scoped(user.id).analyses.list();
  // Sin análisis, el primer paso es subir uno (spec 02).
  if (rows.length === 0) redirect("/analisis/nuevo");

  return (
    <>
      <p className="text-ink-2">
        Entraste como <strong>{user.email}</strong>. <SignOutButton />
      </p>
      <ul className="flex flex-col gap-2">
        {rows.map((a) => (
          <li key={a.id} className="rounded-xl border border-line-soft bg-surface px-4 py-3">
            {a.propertyLabel ?? "Sin dirección"} · <span className="text-ink-3">{a.status}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
