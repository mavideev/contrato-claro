import type { Metadata } from "next";
import { Suspense } from "react";
import { DeleteAccountForm } from "@/components/app/delete-account-form";
import { MobileBrand, PanelShell } from "@/components/app/panel-shell";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Kicker, STORAGE_NOTICE, Title } from "@/components/ui/typography";
import { requireUser } from "@/lib/auth/session";

// Pantalla agregada (navegación del panel): datos, cerrar sesión y borrar cuenta.
export const metadata: Metadata = { title: "Cuenta · Contrato Claro" };

export default function Page() {
  return (
    <PanelShell current="cuenta">
      <MobileBrand />
      <Title>Cuenta</Title>
      <Suspense fallback={<div aria-hidden className="h-28 animate-pulse rounded-[14px] bg-line-soft" />}>
        <Profile />
      </Suspense>
      <section className="flex max-w-2xl flex-col gap-3 rounded-[14px] border border-line-soft bg-surface p-5 md:p-6">
        <h2 className="font-display text-[22px] font-semibold">Borrar cuenta</h2>
        <p className="text-[15px] text-ink-2">{STORAGE_NOTICE} Si borrás la cuenta, se borran todos tus datos y archivos.</p>
        <DeleteAccountForm />
      </section>
    </PanelShell>
  );
}

async function Profile() {
  const user = await requireUser("/cuenta");
  return (
    <section className="flex max-w-2xl flex-col gap-4 rounded-[14px] border border-line-soft bg-surface p-5 md:p-6">
      <div className="flex flex-col gap-1">
        <Kicker>Email</Kicker>
        <p className="text-lg font-semibold break-all">{user.email}</p>
      </div>
      <SignOutButton />
    </section>
  );
}
