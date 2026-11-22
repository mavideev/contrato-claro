"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function DeleteAnalysisButton({ id, action }: { id: string; action: (id: string) => Promise<void> }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="text-[13px] font-semibold text-ink-3 hover:text-high-fg md:text-sm">
        Borrar
      </button>
    );
  }

  return (
    <form action={action.bind(null, id)} className="flex flex-wrap items-center gap-2">
      <span className="text-[13px] text-ink-3">¿Borrar? No se puede deshacer.</span>
      <button type="button" onClick={() => setConfirming(false)} className="text-[13px] font-semibold text-ink-3 hover:text-ink md:text-sm">
        Cancelar
      </button>
      <Button type="submit" variant="danger" className="h-9 px-3 text-[13px] md:text-sm">
        Sí, borrar
      </Button>
    </form>
  );
}
