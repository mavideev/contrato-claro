import type { Metadata } from "next";
import { Suspense } from "react";
import { FormSkeleton } from "@/components/auth/form-skeleton";
import { VerifyNotice } from "@/components/auth/verify-notice";

export const metadata: Metadata = { title: "Verificá tu email · Contrato Claro" };

export default function Page() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <VerifyNotice />
    </Suspense>
  );
}
