import Link from "next/link";
import type { ReactNode } from "react";

// Pantallas de cuenta (prototipo 1 · Registro): panel azul con la propuesta
// a la izquierda (arriba en mobile) y el formulario a la derecha.
const POINTS = ["Foto, PDF o Word en un solo lugar.", "Riesgos explicados cláusula por cláusula.", "Re-chequeo el día de la firma."];

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex flex-col justify-center gap-3.5 bg-ink px-6 pt-10 pb-8 text-white md:w-[440px] md:shrink-0 md:gap-7 md:px-14 md:py-18 lg:w-[520px]">
        <Link href="/" className="font-display text-xl font-semibold text-white no-underline md:text-2xl">
          Contrato Claro
        </Link>
        <p className="font-display text-[32px] leading-[1.12] font-semibold tracking-[-0.01em] md:text-[44px] md:leading-[1.1]">
          Revisá tu contrato antes de firmar
        </p>
        <ul className="flex flex-col gap-2 text-[15px] text-navy-text md:gap-4 md:text-[17px]">
          {POINTS.map((p) => (
            <li key={p} className="flex items-center gap-3">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-check)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
                <path d="M5 12l5 5L20 7" />
              </svg>
              {p}
            </li>
          ))}
        </ul>
      </aside>
      <main className="flex flex-1 items-start justify-center px-6 pt-7 pb-10 md:items-center md:px-6 md:py-14">
        <div className="w-full max-w-[400px]">{children}</div>
      </main>
    </div>
  );
}
