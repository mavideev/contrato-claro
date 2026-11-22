"use client";
import Link from "next/link";
import { startTransition, useActionState, useState, type ReactNode } from "react";
import { startAnalysis, type FormState } from "@/app/(app)/analisis/actions";
import { fileType, uploadFiles } from "./upload-client";
import { Button, buttonClass } from "@/components/ui/button";
import { Kicker, STORAGE_NOTICE } from "@/components/ui/typography";
import { useIsMobile } from "./use-is-mobile";

// Prototipo 2 · Subir contrato. Correcciones de la spec 03: «Sacar foto» solo
// en mobile (en desktop, aviso).
// El archivo sube directo a S3 antes de llamar a la acción (no viaja en el formulario).

const MAX_MB = 20;
const MAX_SUPPORTING = 5;

/** Sube el archivo elegido y le pasa a la acción solo la clave. */
async function submit(prev: FormState, form: FormData): Promise<FormState> {
  const file = form.get("upload");
  form.delete("upload");
  if (form.get("method") === "archivo") {
    if (!(file instanceof File) || file.size === 0) return { error: "Elegí el archivo del contrato." };
    const res = await uploadFiles([{ blob: file, type: fileType(file) }]);
    if ("error" in res) return res;
    form.set("file", JSON.stringify(res.uploaded[0]));
  }

  const supporting = form.getAll("supportingUpload").filter((f): f is File => f instanceof File && f.size > 0);
  form.delete("supportingUpload");
  if (supporting.length) {
    const res = await uploadFiles(supporting.map((f) => ({ blob: f, type: fileType(f) })));
    if ("error" in res) return res;
    form.set("supportingDocs", JSON.stringify(res.uploaded.map((u, i) => ({ ...u, name: supporting[i].name }))));
  }

  return startAnalysis(prev, form);
}

type Method = "foto" | "archivo" | "texto";
type ContractType = "rental" | "sale" | "boleto";

const TYPES: { value: ContractType; label: string }[] = [
  { value: "rental", label: "Alquiler" },
  { value: "sale", label: "Compraventa" },
  { value: "boleto", label: "Boleto" },
];

const icon = (d: ReactNode) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
    {d}
  </svg>
);

const METHODS: { value: Method; label: string; hint: string; icon: ReactNode; mobileOnly?: boolean }[] = [
  {
    value: "foto",
    label: "Sacar foto",
    hint: "Escaneá página por página",
    mobileOnly: true,
    icon: icon(
      <>
        <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
        <circle cx="12" cy="13" r="3.5" />
      </>,
    ),
  },
  { value: "archivo", label: "Subir PDF o Word", hint: "Desde archivos o Drive", icon: icon(<path d="M14 3H6v18h12V7zM14 3v4h4M12 11v6M9 14l3-3 3 3" />) },
  { value: "texto", label: "Pegar texto", hint: "Copiado de un mail o WhatsApp", icon: icon(<path d="M5 6h14M5 10h14M5 14h10M5 18h7" />) },
];

export function UploadForm() {
  const isMobile = useIsMobile();
  const [contractType, setContractType] = useState<ContractType>("rental");
  const [chosen, setChosen] = useState<Method | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [supportingFiles, setSupportingFiles] = useState<File[]>([]);
  const [supportingError, setSupportingError] = useState<string | null>(null);
  const method: Method = chosen && (chosen !== "foto" || isMobile) ? chosen : isMobile ? "foto" : "archivo";
  const [state, action, pending] = useActionState<FormState, FormData>(submit, {});

  function pick(input: HTMLInputElement) {
    const file = input.files?.[0];
    setFileName(file?.name ?? null);
    const type = file ? fileType(file) : "";
    if (file && !/pdf|wordprocessingml/.test(type)) setFileError("Subí un PDF o un Word (.docx).");
    else if (file && file.size > MAX_MB * 1024 * 1024) setFileError(`El archivo pesa más de ${MAX_MB} MB.`);
    else setFileError(null);
  }

  function addSupporting(newFiles: File[]) {
    if (!newFiles.length) return;
    const tooBig = newFiles.find((f) => f.size > MAX_MB * 1024 * 1024);
    if (tooBig) {
      setSupportingError(`"${tooBig.name}" pesa más de ${MAX_MB} MB.`);
      return;
    }
    const badType = newFiles.find((f) => !/pdf|wordprocessingml|^image\//.test(fileType(f)));
    if (badType) {
      setSupportingError(`"${badType.name}" tiene que ser un PDF, un Word o una foto.`);
      return;
    }
    setSupportingFiles((prev) => {
      const merged = [...prev, ...newFiles];
      if (merged.length > MAX_SUPPORTING) {
        setSupportingError(`Podés adjuntar hasta ${MAX_SUPPORTING} documentos.`);
        return prev;
      }
      setSupportingError(null);
      return merged;
    });
  }

  function removeSupporting(index: number) {
    setSupportingFiles((prev) => prev.filter((_, i) => i !== index));
    setSupportingError(null);
  }

  return (
    // onSubmit en vez de `action`: si algo falla, React no vacía el formulario (el texto pegado queda).
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        form.delete("supportingUpload");
        supportingFiles.forEach((f) => form.append("supportingUpload", f));
        startTransition(() => action(form));
      }}
      className="flex max-w-[620px] flex-1 flex-col gap-5 md:gap-6"
    >
      <input type="hidden" name="contractType" value={contractType} />
      <input type="hidden" name="method" value={method} />

      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-2.5 hidden md:block">
          <Kicker>Tipo de contrato</Kicker>
        </legend>
        <div className="flex flex-wrap gap-2 md:gap-2.5">
          {TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              aria-pressed={t.value === contractType}
              onClick={() => setContractType(t.value)}
              className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-[15px] font-medium whitespace-nowrap md:px-[18px] md:text-base ${
                t.value === contractType ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink-3 hover:border-primary"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-2.5 hidden md:block">
          <Kicker>¿Cómo lo tenés?</Kicker>
        </legend>
        <div className="flex flex-col gap-2.5 md:flex-row md:flex-wrap md:gap-3">
          {METHODS.map((m) => {
            const on = m.value === method;
            return (
              <button
                key={m.value}
                type="button"
                aria-pressed={on}
                onClick={() => setChosen(m.value)}
                className={`${m.mobileOnly ? "md:hidden" : ""} flex min-h-[68px] w-full items-center gap-3.5 rounded-xl px-4 py-3 text-left text-base md:min-h-[84px] md:flex-[1_1_160px] md:flex-col md:justify-center md:gap-2 md:text-center ${
                  on ? "border-2 border-primary bg-[#F0F8F7] font-bold" : "border border-line bg-surface font-medium hover:border-primary"
                }`}
              >
                {m.icon}
                <span className="flex flex-col gap-0.5">
                  {m.label}
                  <span className="text-[13px] font-normal text-ink-3 md:hidden">{m.hint}</span>
                </span>
              </button>
            );
          })}
        </div>

        <p className="hidden items-center gap-2.5 rounded-xl bg-[#E9EEF2] px-4 py-3.5 text-[15px] text-[#243B53] md:flex">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <rect x="7" y="2" width="10" height="20" rx="2" />
            <path d="M11 18h2" />
          </svg>
          Para sacar fotos, entrá desde tu celular.
        </p>

        {method === "archivo" && (
          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const input = e.currentTarget.querySelector("input");
              if (input && e.dataTransfer.files.length) {
                input.files = e.dataTransfer.files;
                pick(input);
              }
            }}
            className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed border-[#B9C4CC] bg-surface p-6 text-center text-[15px] text-ink-2"
          >
            {fileName ? (
              <span className="font-semibold break-all text-ink">{fileName}</span>
            ) : (
              <span>
                Arrastrá tu archivo acá o <span className="font-semibold text-primary-hover underline">elegilo desde tu dispositivo</span>
              </span>
            )}
            <span className="text-[13px] text-ink-3">{fileName ? "Tocá para cambiarlo" : `PDF o Word · hasta ${MAX_MB} MB`}</span>
            <input
              type="file"
              name="upload"
              required
              aria-label="Archivo del contrato"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => pick(e.currentTarget)}
              className="sr-only"
            />
          </label>
        )}
        {method === "texto" && (
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Texto del contrato
            <textarea
              name="text"
              required
              minLength={100}
              placeholder="Pegá acá el texto completo del contrato"
              className="h-28 resize-y rounded-xl border border-line bg-surface px-3.5 py-3 text-[15px] font-normal text-ink"
            />
          </label>
        )}
      </fieldset>

      {method !== "foto" && (
        <fieldset className="flex flex-col gap-2.5">
          <legend className="mb-2.5">
            <Kicker>Documentos adicionales (opcional)</Kicker>
          </legend>
          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              addSupporting(Array.from(e.dataTransfer.files));
            }}
            className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed border-[#B9C4CC] bg-surface p-5 text-center text-[15px] text-ink-2"
          >
            {supportingFiles.length >= MAX_SUPPORTING ? (
              <span className="font-semibold text-ink">Llegaste al máximo de {MAX_SUPPORTING}</span>
            ) : supportingFiles.length ? (
              <span>
                Arrastrá otro acá o <span className="font-semibold text-primary-hover underline">elegí uno más</span>
              </span>
            ) : (
              <span>
                Arrastrá tus archivos acá o <span className="font-semibold text-primary-hover underline">elegilos desde tu dispositivo</span>
              </span>
            )}
            <span className="text-[13px] text-ink-3">PDF, Word o foto · hasta {MAX_SUPPORTING}, {MAX_MB} MB cada uno</span>
            <input
              type="file"
              multiple
              disabled={supportingFiles.length >= MAX_SUPPORTING}
              aria-label="Documentos adicionales"
              accept=".pdf,.docx,image/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => {
                addSupporting(Array.from(e.currentTarget.files ?? []));
                e.currentTarget.value = "";
              }}
              className="sr-only"
            />
          </label>
          {supportingFiles.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {supportingFiles.map((f, i) => (
                <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 rounded-lg border border-line-soft bg-surface px-3 py-2 text-[13px] text-ink-2">
                  <span className="truncate">{f.name}</span>
                  <button type="button" onClick={() => removeSupporting(i)} aria-label={`Quitar ${f.name}`} className="shrink-0 font-semibold text-ink-3 hover:text-high-fg">
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          )}
          {supportingError && (
            <p role="alert" className="text-sm text-high-fg">
              {supportingError}
            </p>
          )}
        </fieldset>
      )}

      {((method === "archivo" && fileError) || state.error) && (
        <p role="alert" className="text-sm text-high-fg">
          {(method === "archivo" && fileError) || state.error}
        </p>
      )}

      <div className="mt-auto flex flex-col gap-3 pb-6 md:mt-0 md:pb-0">
        {method === "foto" ? (
          <Link href="/analisis/nuevo/escanear" className={buttonClass("primary", "min-h-[52px] w-full text-[17px]")}>
            Abrir cámara
          </Link>
        ) : (
          <Button type="submit" disabled={pending || (method === "archivo" && !!fileError) || !!supportingError} className="min-h-[52px] w-full text-[17px]">
            {pending ? (method === "archivo" ? "Subiendo…" : "Enviando…") : "Analizar contrato"}
          </Button>
        )}
        <p className="text-center text-[13px] leading-snug text-ink-3 md:text-left md:text-sm">{STORAGE_NOTICE}</p>
      </div>
    </form>
  );
}
