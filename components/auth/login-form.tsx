"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth/client";
import { safeNext } from "@/lib/auth/redirect";
import { Button, Divider, Field, GoogleButton, Notice } from "./ui";

type Mode = "password" | "link";

export function LoginForm({ google }: { google: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));

  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(
    params.get("error") ? "El link venció o ya se usó. Pedí uno nuevo." : null,
  );
  const [linkSentTo, setLinkSentTo] = useState<string | null>(null);

  async function onPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("password"));
    setPending(true);
    setError(null);
    const { error } = await authClient.signIn.email({ email, password, callbackURL: next });
    if (!error) return router.push(next);
    setPending(false);
    if (error.code === "EMAIL_NOT_VERIFIED") {
      // Better Auth reenvía el mail de verificación (sendOnSignIn).
      return router.push(`/verificar?email=${encodeURIComponent(email)}`);
    }
    // Mensaje genérico: no dice si el email existe (spec 02).
    setError(
      error.status === 429
        ? "Hiciste muchos intentos seguidos. Esperá un minuto y probá de nuevo."
        : "El email o la contraseña no coinciden.",
    );
  }

  async function onLink(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const { error } = await authClient.signIn.magicLink({
      email,
      callbackURL: next,
      errorCallbackURL: `/ingresar?error=link&next=${encodeURIComponent(next)}`,
    });
    setPending(false);
    if (error) return setError("No pudimos mandar el link. Probá de nuevo en un rato.");
    setLinkSentTo(email);
  }

  if (linkSentTo) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Revisá tu email</h1>
        <p className="text-ink-2">
          Te mandamos un link a <strong>{linkSentTo}</strong>. Sirve una sola vez y vence en 15 minutos.
        </p>
        <Button variant="secondary" onClick={() => setLinkSentTo(null)}>
          Usar otro email
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold">Ingresar</h1>
      {params.get("reset") && <Notice tone="ok">Listo, ya podés entrar con tu contraseña nueva.</Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      <form onSubmit={mode === "password" ? onPassword : onLink} className="flex flex-col gap-4">
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {mode === "password" && (
          <Field label="Contraseña" name="password" type="password" autoComplete="current-password" required />
        )}
        <Button type="submit" disabled={pending}>
          {mode === "password" ? "Ingresar" : "Recibir el link"}
        </Button>
      </form>

      <button
        type="button"
        className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
        onClick={() => {
          setMode(mode === "password" ? "link" : "password");
          setError(null);
        }}
      >
        {mode === "password" ? "Recibir un link por email" : "Ingresar con contraseña"}
      </button>

      {google && (
        <>
          <Divider />
          <GoogleButton callbackURL={next} />
        </>
      )}

      <div className="flex flex-col gap-2 text-center text-sm text-ink-2">
        <Link href="/recuperar" className="font-semibold text-primary">
          ¿Olvidaste tu contraseña?
        </Link>
        <p>
          ¿No tenés cuenta?{" "}
          <Link href="/registro" className="font-semibold text-primary">
            Crear cuenta
          </Link>
        </p>
      </div>
    </div>
  );
}
