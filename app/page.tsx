import Link from "next/link";

// Placeholder de la etapa 0. Se reemplaza por el flujo real en la parte de pantallas.
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 px-6">
      <p className="text-sm font-semibold uppercase tracking-widest text-neutral-500">Etapa 0</p>
      <h1 className="text-4xl font-semibold">Contrato Claro</h1>
      <p className="text-lg text-neutral-600">
        El entorno está arriba. Estado de los servicios en{" "}
        <a className="underline" href="/api/health">
          /api/health
        </a>
        .
      </p>
      <p className="flex gap-4 text-lg">
        <Link className="font-semibold text-primary underline" href="/ingresar">
          Ingresar
        </Link>
        <Link className="font-semibold text-primary underline" href="/registro">
          Crear cuenta
        </Link>
      </p>
    </main>
  );
}
