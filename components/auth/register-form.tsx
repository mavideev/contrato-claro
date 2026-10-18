"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth/client";
import { DEFAULT_AFTER_LOGIN } from "@/lib/auth/redirect";
import { Button, Divider, Field, GoogleButton, Notice } from "./ui";

export function RegisterForm({ google }: { google: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email"));
    setPending(true);
    setError(null);
    const { error } = await authClient.signUp.email({
      email,
      password: String(data.get("password")),
      // El registro no pide nombre; se puede cambiar después en /cuenta.
      name: email.split("@")[0],
      callbackURL: DEFAULT_AFTER_LOGIN,
    });
    if (!error) return router.push(`/verificar?email=${encodeURIComponent(email)}`);
    setPending(false);
    setError(
      error.code === "PASSWORD_TOO_SHORT"
        ? "La contraseña tiene que tener al menos 8 caracteres."
        : "No pudimos crear la cuenta. Revisá los datos y probá de nuevo.",
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold">Crear cuenta</h1>
      <p className="text-ink-2">Necesitás una cuenta para subir tu contrato.</p>
      {error && <Notice tone="error">{error}</Notice>}

      {google && (
        <>
          <GoogleButton callbackURL={DEFAULT_AFTER_LOGIN} />
          <Divider />
        </>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Email" name="email" type="email" autoComplete="email" required />
        <Field
          label="Contraseña (mínimo 8 caracteres)"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <Button type="submit" disabled={pending}>
          Crear cuenta
        </Button>
      </form>

      <p className="text-xs leading-relaxed text-ink-3">
        Guardamos tu contrato cifrado mientras tengas cuenta. Podés borrarlo cuando quieras. Al continuar aceptás los
        términos y la política de privacidad.
      </p>
      <p className="text-center text-sm text-ink-2">
        ¿Ya tenés cuenta?{" "}
        <Link href="/ingresar" className="font-semibold text-primary">
          Ingresar
        </Link>
      </p>
    </div>
  );
}
