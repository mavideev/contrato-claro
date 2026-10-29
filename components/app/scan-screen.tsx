"use client";
import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { startAnalysis, uploadRecheck, type FormState } from "@/app/(app)/analisis/actions";
import { buttonClass } from "@/components/ui/button";
import { compressPhoto, uploadFiles } from "./upload-client";

// Móvil 3 · Escaneo. El disparador abre la cámara del celular (input con
// `capture`, documento base §10) una vez por página; cada foto se achica y se
// endereza en el navegador. «Listo» sube las páginas directo a S3 y arranca la
// extracción (o, en el re-chequeo, la comparación).

type Props = { mode: "analysis" } | { mode: "recheck"; analysisId: string };

type Page = { blob: Blob; type: string; url: string };

const MAX_PAGES = 30;
const LINES = [96, 88, 92, 66, 94, 86, 72, 95, 80];
const corners = ["left-4 top-4 border-l-[3px] border-t-[3px]", "right-4 top-4 border-r-[3px] border-t-[3px]", "left-4 bottom-4 border-l-[3px] border-b-[3px]", "right-4 bottom-4 border-r-[3px] border-b-[3px]"];

export function ScanScreen(props: Props) {
  const camera = useRef<HTMLInputElement>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [state, run, pending] = useActionState<FormState, void>(async (prev) => {
    setProgress(`Subiendo 0 de ${pages.length}…`);
    const res = await uploadFiles(pages, (done) => setProgress(`Subiendo ${done} de ${pages.length}…`));
    setProgress(null);
    if ("error" in res) return res;
    const form = new FormData();
    form.set("method", "foto");
    form.set("pages", JSON.stringify(res.uploaded));
    if (props.mode === "recheck") return uploadRecheck(props.analysisId, prev, form);
    form.set("contractType", "rental");
    return startAnalysis(prev, form);
  }, {});

  // Libera las vistas previas al salir.
  const urls = useRef<string[]>([]);
  useEffect(() => () => urls.current.forEach(URL.revokeObjectURL), []);

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    const added = await Promise.all([...files].map(compressPhoto));
    const withUrls = added.map((p) => {
      const url = URL.createObjectURL(p.blob);
      urls.current.push(url);
      return { ...p, url };
    });
    setPages((current) => [...current, ...withUrls].slice(0, MAX_PAGES));
    setBusy(false);
  }

  const back = props.mode === "recheck" ? `/analisis/${props.analysisId}/rechequeo` : "/analisis/nuevo";
  const count = pages.length;
  const last = pages.at(-1);
  const shown = pages.slice(-4).map((p, i) => ({ ...p, n: count - Math.min(count, 4) + i + 1 }));
  const working = pending || busy;

  return (
    <main className="mx-auto flex h-dvh w-full max-w-md flex-col gap-3.5 bg-[#0B1620] px-4 pt-4 pb-6 text-white">
      <div className="flex items-center justify-between">
        <Link href={back} className="inline-flex min-h-11 items-center text-base font-medium text-white">
          Cerrar
        </Link>
        <h1 className="text-[17px] font-bold">{count >= MAX_PAGES ? `${MAX_PAGES} páginas` : `Página ${count + 1}`}</h1>
        <span className="w-[52px]" />
      </div>

      <div className="relative flex-1 overflow-hidden rounded-[18px] bg-[#1B2733]">
        {corners.map((c) => (
          <div key={c} aria-hidden className={`absolute size-10 border-[#3FB6B2] ${c}`} />
        ))}
        <div className="absolute top-3.5 left-1/2 z-10 -translate-x-1/2 rounded-full bg-[#F6D98A] px-3.5 py-1.5 text-sm font-semibold whitespace-nowrap text-[#4A3200]">
          {progress ?? (busy ? "Preparando la foto…" : count ? "Seguí con la página siguiente" : "Hoja entera, con buena luz")}
        </div>
        {last ? (
          // eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob:), no pasa por next/image
          <img src={last.url} alt={`Página ${count}`} className="absolute inset-x-9 top-14 bottom-14 h-[calc(100%-7rem)] w-[calc(100%-4.5rem)] object-contain" />
        ) : (
          <>
            <div aria-hidden className="absolute inset-x-9 top-14 bottom-14 flex -rotate-[1.5deg] flex-col gap-[9px] bg-white px-5 py-[22px]">
              <div className="mb-2 text-xs font-bold tracking-[0.08em] text-ink">CLÁUSULA SEGUNDA · PLAZO</div>
              {LINES.map((w, i) => (
                <div key={i} className="h-[7px] rounded bg-[#D3D8DD]" style={{ width: `${w}%` }} />
              ))}
            </div>
            <div aria-hidden className="absolute inset-x-7 h-[3px] animate-[scan_3.2s_ease-in-out_infinite] bg-[#3FB6B2] shadow-[0_0_18px_4px_rgba(63,182,178,.55)]" />
          </>
        )}
      </div>

      <div className="flex min-h-[76px] items-center gap-2.5">
        {shown.map((p) => (
          <div key={p.url} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element -- miniatura local (blob:) */}
            <img src={p.url} alt="" className="h-[70px] w-[52px] rounded-md border-2 border-ink-2 bg-white object-cover" />
            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded bg-white/90 px-1 text-xs font-bold text-ink">{p.n}</span>
            {p.n === count && !working && (
              <button
                type="button"
                onClick={() => setPages(pages.slice(0, -1))}
                aria-label={`Borrar la página ${count}`}
                className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full bg-white text-sm font-bold text-ink"
              >
                ×
              </button>
            )}
          </div>
        ))}
        <span className="text-[15px] text-[#B7C7D6]">{count === 1 ? "1 página" : `${count} páginas`}</span>
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-[#F6D98A]">
          {state.error}
        </p>
      )}

      <div className="flex items-center justify-between gap-2.5">
        <Link href={back} className={buttonClass("dark", "flex-1 px-3 text-[15px]")}>
          Desde archivos
        </Link>
        <input
          ref={camera}
          type="file"
          accept="image/*"
          capture="environment"
          aria-label="Foto de la página"
          className="sr-only"
          onChange={(e) => {
            void add(e.currentTarget.files);
            e.currentTarget.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => camera.current?.click()}
          disabled={working || count >= MAX_PAGES}
          aria-label="Sacar foto de la página"
          className="size-[76px] shrink-0 rounded-full border-[6px] border-[#3FB6B2] bg-white active:scale-95 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => startTransition(() => run())}
          disabled={count === 0 || working}
          className={buttonClass("primary", "flex-1 px-3 text-[15px]")}
        >
          Listo ({count})
        </button>
      </div>
    </main>
  );
}
