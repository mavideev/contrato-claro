import Link from "next/link";
import type { ReactNode } from "react";

// Contenedor de las pantallas del flujo: sin la barra del panel (como en el
// prototipo), pero con un encabezado para volver siempre a «Mis análisis».
export function FlowPage({ children, wide = true }: { children: ReactNode; wide?: boolean }) {
  return (
    <main className={`mx-auto flex min-h-screen w-full flex-col gap-4 px-5 pt-4 md:gap-6 md:px-14 md:py-10 ${wide ? "max-w-[1280px]" : "max-w-3xl"}`}>
      <FlowHeader />
      {children}
    </main>
  );
}

export function FlowHeader() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <Link href="/analisis" className="font-display text-xl font-semibold text-ink no-underline md:text-2xl">
        Contrato Claro
      </Link>
      <nav aria-label="Principal" className="flex items-center gap-4 text-[15px] font-semibold">
        <Link href="/analisis" className="inline-flex min-h-11 items-center text-primary-hover">
          Mis análisis
        </Link>
        <Link href="/cuenta" className="hidden min-h-11 items-center text-primary-hover md:inline-flex">
          Cuenta
        </Link>
      </nav>
    </header>
  );
}

/** Acciones al pie: barra fija abajo en mobile, fila al final en desktop. */
export function BottomBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 -mx-5 mt-auto flex flex-col gap-2.5 border-t border-line-soft bg-surface px-5 pt-3.5 pb-6 md:static md:mx-0 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-3 md:border-0 md:bg-transparent md:p-0 md:pt-4">
      {children}
    </div>
  );
}

export function SkeletonBlock({ className = "h-40" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-[14px] bg-line-soft ${className}`} />;
}
