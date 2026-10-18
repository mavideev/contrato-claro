"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth/client";
import { Button, Field, Notice } from "./ui";

export function RequestResetForm() {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(false);
    const { error } = await authClient.requestPasswordReset({
      email: String(new FormData(e.currentTarget).get("email")),
      redirectTo: "/recuperar/nueva",
    });
    setPending(false);
    if (error) setError(true);
    else setSent(true);
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold">Recuperar contraseña</h1>
      {sent ? (
        // Mismo mensaje exista o no la cuenta.
        <Notice tone="ok">Si hay una cuenta con ese email, te mandamos un link para elegir una contraseña nueva. Vence en 1 hora.</Notice>
      ) : (
        <>
          <p className="text-ink-2">Te mandamos un link para elegir una contraseña nueva.</p>
          {error && <Notice tone="error">No pudimos mandar el link. Esperá un minuto y probá de nuevo.</Notice>}
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <Field label="Email" name="email" type="email" autoComplete="email" required />
            <Button type="submit" disabled={pending}>
              Mandar link
            </Button>
          </form>
        </>
      )}
      <Link href="/ingresar" className="text-center text-sm font-semibold text-primary">
        Volver a ingresar
      </Link>
    </div>
  );
}

export function NewPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token || params.get("error")) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">El link no sirve</h1>
        <Notice tone="error">Venció o ya se usó. Pedí uno nuevo.</Notice>
        <Link href="/recuperar" className="text-center text-sm font-semibold text-primary">
          Pedir otro link
        </Link>
      </div>
    );
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const newPassword = String(data.get("password"));
    if (newPassword !== String(data.get("confirm"))) return setError("Las contraseñas no coinciden.");
    setPending(true);
    setError(null);
    const { error } = await authClient.resetPassword({ newPassword, token: token! });
    if (!error) return router.push("/ingresar?reset=1");
    setPending(false);
    setError(error.code === "INVALID_TOKEN" ? "El link venció o ya se usó. Pedí uno nuevo." : "No pudimos cambiar la contraseña.");
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold">Elegí una contraseña nueva</h1>
      <p className="text-ink-2">Al cambiarla, se cierran las sesiones abiertas en otros dispositivos.</p>
      {error && <Notice tone="error">{error}</Notice>}
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Contraseña nueva (mínimo 8)" name="password" type="password" autoComplete="new-password" minLength={8} required />
        <Field label="Repetila" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
        <Button type="submit" disabled={pending}>
          Guardar contraseña
        </Button>
      </form>
    </div>
  );
}
