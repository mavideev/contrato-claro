import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

// Títulos en Fraunces y rótulos en mayúsculas, como en el prototipo.

export function Title({ className = "", ...props }: ComponentProps<"h1">) {
  return (
    <h1
      className={`font-display text-[28px] leading-tight font-semibold tracking-[-0.01em] md:text-[38px] ${className}`}
      {...props}
    />
  );
}

export function Kicker({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`text-xs font-semibold tracking-[0.08em] text-ink-3 uppercase md:text-[13px] ${className}`}>{children}</div>;
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex min-h-11 items-center self-start text-[15px] font-semibold text-primary-hover no-underline">
      ← {children}
    </Link>
  );
}

/** Texto de guardado corregido (spec 03, corrección 1). */
export const STORAGE_NOTICE = "Guardamos tu contrato cifrado mientras tengas cuenta. Podés borrarlo cuando quieras.";
