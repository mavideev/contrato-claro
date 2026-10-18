import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { FormSkeleton } from "@/components/auth/form-skeleton";
import { RegisterForm } from "@/components/auth/register-form";
import { googleEnabled } from "@/lib/auth";

export const metadata: Metadata = { title: "Crear cuenta · Contrato Claro" };

export default function Page() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <Register />
    </Suspense>
  );
}

async function Register() {
  await connection();
  return <RegisterForm google={googleEnabled()} />;
}
