"use client";
import { startTransition, useActionState, useRef } from "react";
import { uploadRecheck, type FormState } from "@/app/(app)/analisis/actions";
import { buttonClass, type ButtonVariant } from "@/components/ui/button";
import { fileType, uploadFiles } from "./upload-client";

// «Subir archivo» del re-chequeo (desktop): sube directo a S3 y recién
// entonces llama a la acción, igual que el contrato original.
export function RecheckUpload({ analysisId, variant = "ghost", className = "" }: { analysisId: string; variant?: ButtonVariant; className?: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, form) => {
    const file = form.get("upload");
    if (!(file instanceof File) || file.size === 0) return { error: "Elegí el archivo." };
    const res = await uploadFiles([{ blob: file, type: fileType(file) }]);
    if ("error" in res) return res;
    const next = new FormData();
    next.set("method", "archivo");
    next.set("file", JSON.stringify(res.uploaded[0]));
    return uploadRecheck(analysisId, prev, next);
  }, {});

  return (
    <div className={className}>
      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(() => action(new FormData(e.currentTarget)));
        }}
      >
        <label className={buttonClass(variant, "w-full cursor-pointer")}>
          {pending ? "Subiendo…" : "Subir archivo"}
          <input
            type="file"
            name="upload"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
            disabled={pending}
            className="sr-only"
            onChange={(e) => e.currentTarget.files?.length && formRef.current?.requestSubmit()}
          />
        </label>
      </form>
      {state.error && (
        <p role="alert" className="mt-2 text-sm text-high-fg">
          {state.error}
        </p>
      )}
    </div>
  );
}
