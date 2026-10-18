"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth/client";
import { DEFAULT_AFTER_LOGIN } from "@/lib/auth/redirect";
import { Button, Divider, Field, GoogleButton, Heading, Notice } from "./ui";

export function RegisterForm({ google }: { google: boolean }) {
  const router = useRouter();
  const deleted = useSearchParams().has("borrada");
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
    <div className="flex flex-col gap-[18px]">
      <Heading>Creá tu cuenta</Heading>
      {deleted && <Notice tone="ok">Borramos tu cuenta y todos tus datos.</Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Email" name="email" type="email" autoComplete="email" placeholder="nombre@correo.com" required />
        <Field
          label="Contraseña"
          placeholder="Mínimo 8 caracteres"
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

      {google && (
        <>
          <Divider />
          <GoogleButton callbackURL={DEFAULT_AFTER_LOGIN} />
        </>
      )}

      <p className="text-[15px] text-ink-2">
        ¿Ya tenés cuenta?{" "}
        <Link href="/ingresar" className="font-bold text-primary-hover">
          Iniciá sesión
        </Link>
      </p>
      <p className="text-[13px] leading-normal text-ink-3">
        Guardamos tu contrato cifrado mientras tengas cuenta. Podés borrarlo cuando quieras. Al continuar aceptás los
        términos y la política de privacidad.
      </p>
    </div>
  );
}
