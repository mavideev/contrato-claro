import { ButtonLink } from "@/components/ui/button";

// 404 propia (spec 03). También se usa cuando un análisis no es del usuario,
// para no revelar que existe.
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center gap-5 px-6">
      <p className="font-display text-xl font-semibold">Contrato Claro</p>
      <h1 className="font-display text-[32px] leading-tight font-semibold">No encontramos esta página</h1>
      <p className="text-ink-2">Puede que el link esté mal o que el análisis ya no exista.</p>
      <ButtonLink href="/analisis" className="self-start">
        Ir a Mis análisis
      </ButtonLink>
    </main>
  );
}
