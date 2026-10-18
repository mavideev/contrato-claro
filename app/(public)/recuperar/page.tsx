import type { Metadata } from "next";
import { RequestResetForm } from "@/components/auth/reset-forms";

export const metadata: Metadata = { title: "Recuperar contraseña · Contrato Claro" };

export default function Page() {
  return <RequestResetForm />;
}
