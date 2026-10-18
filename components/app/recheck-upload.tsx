"use client";
import { useRef } from "react";
import { buttonClass, type ButtonVariant } from "@/components/ui/button";

// «Subir archivo» del re-chequeo: abre el selector y envía al elegir.
// El archivo no viaja en la acción (etapa 0); en la etapa 4 se sube a S3.
export function RecheckUpload({ action, variant = "ghost", className = "" }: { action: () => Promise<void>; variant?: ButtonVariant; className?: string }) {
  const form = useRef<HTMLFormElement>(null);
  return (
    <form ref={form} action={action} className={className}>
      <label className={buttonClass(variant, "w-full cursor-pointer")}>
        Subir archivo
        <input
          type="file"
          accept=".pdf,.docx,image/*"
          className="sr-only"
          onChange={(e) => e.currentTarget.files?.length && form.current?.requestSubmit()}
        />
      </label>
    </form>
  );
}
