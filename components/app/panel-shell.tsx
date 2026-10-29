import Link from "next/link";
import type { ReactNode } from "react";

// Navegación del panel (prototipo 7 · Mis análisis / móvil 8): barra lateral
// en desktop y pestañas abajo en mobile.

type Section = "analisis" | "suscripcion" | "pagos" | "cuenta";

const icons: Record<Section, ReactNode> = {
  analisis: <path d="M14 3H6v18h12V7zM14 3v4h4M9 13h6M9 17h4" />,
  suscripcion: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 14h8" />
    </>
  ),
  pagos: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
    </>
  ),
  cuenta: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </>
  ),
};

const items: { key: Section; href: string; label: string; short: string }[] = [
  { key: "analisis", href: "/analisis", label: "Mis análisis", short: "Análisis" },
  { key: "suscripcion", href: "/suscripcion", label: "Mi suscripción", short: "Suscripción" },
  { key: "pagos", href: "/pagos", label: "Pagos", short: "Pagos" },
  { key: "cuenta", href: "/cuenta", label: "Cuenta", short: "Cuenta" },
];

export function PanelShell({ current, children }: { current: Section; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <nav aria-label="Principal" className="hidden w-60 shrink-0 flex-col gap-7 bg-ink px-4 py-9 md:flex">
        <Link href="/analisis" className="px-3.5 font-display text-2xl font-semibold text-white no-underline">
          Contrato Claro
        </Link>
        <div className="flex flex-col gap-1">
          {items.map((it) => (
            <Link
              key={it.key}
              href={it.href}
              aria-current={it.key === current ? "page" : undefined}
              className={`flex min-h-11 items-center rounded-lg px-3.5 text-base no-underline ${
                it.key === current ? "bg-navy-2 font-bold text-white" : "font-medium text-navy-text hover:bg-[#1C3A57] hover:text-white"
              }`}
            >
              {it.label}
            </Link>
          ))}
        </div>
      </nav>

      <main className="flex min-w-0 flex-1 flex-col gap-5 px-5 pt-6 pb-28 md:px-12 md:py-11">{children}</main>

      <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 flex bg-ink px-2 pt-1 pb-3 md:hidden">
        {items.map((it) => (
          <Link
            key={it.key}
            href={it.href}
            aria-current={it.key === current ? "page" : undefined}
            className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs no-underline ${
              it.key === current ? "font-bold text-white" : "font-medium text-[#B7C7D6]"
            }`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              {icons[it.key]}
            </svg>
            {it.short}
          </Link>
        ))}
      </nav>
    </div>
  );
}

/** Marca en el encabezado mobile del panel (la barra lateral la muestra en desktop). */
export function MobileBrand({ children }: { children?: ReactNode }) {
  return (
    <div className="flex items-center justify-between md:hidden">
      <span className="font-display text-xl font-semibold">Contrato Claro</span>
      {children}
    </div>
  );
}
