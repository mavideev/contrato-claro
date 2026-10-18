"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth/client";
import { DEFAULT_AFTER_LOGIN } from "@/lib/auth/redirect";
import { Button, Heading, Notice } from "./ui";

export function VerifyNotice() {
  const email = useSearchParams().get("email") ?? "";
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function resend() {
    setState("sending");
    const { error } = await authClient.sendVerificationEmail({ email, callbackURL: DEFAULT_AFTER_LOGIN });
    setState(error ? "error" : "sent");
  }

  return (
    <div className="flex flex-col gap-4">
      <Heading>Revisá tu email</Heading>
      <p className="text-ink-2">
        Te mandamos un mail{email ? (
          <>
            {" "}a <strong>{email}</strong>
          </>
        ) : null}{" "}
        con un link para confirmar tu cuenta. Vence en 1 hora.
      </p>
      {state === "sent" && <Notice tone="ok">Te lo mandamos de nuevo.</Notice>}
      {state === "error" && <Notice tone="error">No pudimos reenviarlo. Esperá un minuto y probá de nuevo.</Notice>}
      {email && (
        <Button variant="ghost" onClick={resend} disabled={state === "sending"}>
          Reenviar el mail
        </Button>
      )}
      <Link href="/ingresar" className="text-center text-sm font-bold text-primary-hover">
        Volver a ingresar
      </Link>
    </div>
  );
}
