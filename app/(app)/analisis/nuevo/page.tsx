import type { Metadata } from "next";
import { Suspense } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { requireUser } from "@/lib/auth/session";

// Placeholder de la etapa 0 (parte 3): la pantalla «Subir contrato» llega con la parte de pantallas.
export const metadata: Metadata = { title: "Subir contrato · Contrato Claro" };

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10">
      <h1 className="text-3xl font-bold">Subir contrato</h1>
      <Suspense fallback={<p className="text-ink-3">Cargando…</p>}>
        <Greeting />
      </Suspense>
    </main>
  );
}

async function Greeting() {
  const user = await requireUser("/analisis/nuevo");
  return (
    <p className="text-ink-2">
      Todavía no analizaste ningún contrato, {user.email}. <SignOutButton />
    </p>
  );
}
