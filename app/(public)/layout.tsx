import Link from "next/link";
import type { ReactNode } from "react";

// Pantallas de cuenta (spec 02): tarjeta centrada, igual en desktop y mobile.
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-10 sm:justify-center">
      <Link href="/" className="mb-6 text-xl font-bold text-ink">
        Contrato Claro
      </Link>
      <div className="w-full max-w-[440px] rounded-2xl border border-line-soft bg-surface p-6 sm:p-8">{children}</div>
    </main>
  );
}
