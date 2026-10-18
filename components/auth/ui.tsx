"use client";
import type { ComponentProps, ReactNode } from "react";
import { Button as BaseButton, type ButtonVariant } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";

// Piezas compartidas de los formularios de cuenta (prototipo 1 · Registro).

export function Heading({ children }: { children: ReactNode }) {
  return <h1 className="mb-1 font-display text-[26px] font-semibold md:text-[32px]">{children}</h1>;
}

export function Field({ label, ...input }: { label: string } & ComponentProps<"input">) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {label}
      <input
        className="h-12 rounded-[10px] border border-line bg-surface px-3.5 text-base font-normal text-ink placeholder:text-ink-3"
        {...input}
      />
    </label>
  );
}

export function Button({ variant = "primary", className = "", ...props }: { variant?: ButtonVariant } & ComponentProps<"button">) {
  return <BaseButton variant={variant} className={`w-full ${className}`} {...props} />;
}

export function Notice({ tone = "info", children }: { tone?: "info" | "error" | "ok"; children: ReactNode }) {
  const styles = {
    info: "border-line-soft bg-surface text-ink-2",
    error: "border-high/30 bg-high-bg text-high-fg",
    ok: "border-ok/30 bg-ok-bg text-ok-fg",
  }[tone];
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`rounded-[10px] border px-3.5 py-3 text-sm ${styles}`}>
      {children}
    </p>
  );
}

export function Divider() {
  return (
    <div className="flex items-center gap-3 text-xs font-semibold tracking-wider text-ink-3 uppercase">
      <span className="h-px flex-1 bg-line" />o<span className="h-px flex-1 bg-line" />
    </div>
  );
}

export function TextLink(props: ComponentProps<"button">) {
  return <button type="button" className="self-start text-[15px] font-bold text-primary-hover hover:underline" {...props} />;
}

export function GoogleButton({ callbackURL }: { callbackURL: string }) {
  return (
    <Button type="button" variant="ghost" onClick={() => authClient.signIn.social({ provider: "google", callbackURL })}>
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.7 3.3-8z" />
        <path fill="#34A853" d="M12 23c3 0 5.4-1 7.2-2.7l-3.5-2.7c-1 .7-2.2 1-3.7 1-2.9 0-5.3-1.9-6.2-4.5H2.2v2.8A11 11 0 0 0 12 23z" />
        <path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.2a11 11 0 0 0 0 9.8z" />
        <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.1-3.1A11 11 0 0 0 2.2 7.1l3.6 2.8C6.7 7.3 9.1 5.4 12 5.4z" />
      </svg>
      Continuar con Google
    </Button>
  );
}
