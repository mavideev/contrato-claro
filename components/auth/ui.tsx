"use client";
import type { ComponentProps, ReactNode } from "react";
import { authClient } from "@/lib/auth/client";

// Piezas compartidas de los formularios de cuenta. Se reemplazan por los
// componentes de components/ui cuando llegue la parte de pantallas.

export function Field({ label, ...input }: { label: string } & ComponentProps<"input">) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink-2">
      {label}
      <input
        className="h-12 rounded-[10px] border border-line bg-surface px-3.5 text-base font-normal text-ink outline-none focus-visible:ring-3 focus-visible:ring-focus"
        {...input}
      />
    </label>
  );
}

export function Button({ variant = "primary", className = "", ...props }: { variant?: "primary" | "secondary" } & ComponentProps<"button">) {
  const styles =
    variant === "primary"
      ? "bg-primary text-white hover:bg-primary-hover"
      : "border border-line bg-surface text-ink hover:bg-background";
  return (
    <button
      className={`h-12 w-full rounded-[10px] px-4 text-base font-bold outline-none focus-visible:ring-3 focus-visible:ring-focus disabled:opacity-60 ${styles} ${className}`}
      {...props}
    />
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "error" | "ok"; children: ReactNode }) {
  const styles = {
    info: "border-line-soft bg-background text-ink-2",
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
    <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-ink-3">
      <span className="h-px flex-1 bg-line-soft" />o<span className="h-px flex-1 bg-line-soft" />
    </div>
  );
}

export function GoogleButton({ callbackURL }: { callbackURL: string }) {
  return (
    <Button
      type="button"
      variant="secondary"
      onClick={() => authClient.signIn.social({ provider: "google", callbackURL })}
    >
      Continuar con Google
    </Button>
  );
}
