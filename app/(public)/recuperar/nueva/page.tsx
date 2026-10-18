import type { Metadata } from "next";
import { Suspense } from "react";
import { FormSkeleton } from "@/components/auth/form-skeleton";
import { NewPasswordForm } from "@/components/auth/reset-forms";

export const metadata: Metadata = { title: "Contraseña nueva · Contrato Claro" };

export default function Page() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <NewPasswordForm />
    </Suspense>
  );
}
