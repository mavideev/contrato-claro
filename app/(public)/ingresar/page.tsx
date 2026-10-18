import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { FormSkeleton } from "@/components/auth/form-skeleton";
import { LoginForm } from "@/components/auth/login-form";
import { googleEnabled } from "@/lib/auth";

export const metadata: Metadata = { title: "Ingresar · Contrato Claro" };

export default function Page() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <Login />
    </Suspense>
  );
}

async function Login() {
  // Google depende de variables de entorno del servidor en tiempo de ejecución.
  await connection();
  return <LoginForm google={googleEnabled()} />;
}
