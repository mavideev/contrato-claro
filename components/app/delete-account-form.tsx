"use client";
import { useActionState } from "react";
import { deleteAccount, type DeleteAccountState } from "@/app/(app)/cuenta/actions";
import { Button } from "@/components/ui/button";

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState<DeleteAccountState, FormData>(deleteAccount, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex items-start gap-3 text-[15px] text-ink-2">
        <input type="checkbox" name="confirm" required className="mt-0.5 size-5 shrink-0 accent-high" />
        Entiendo que se borran mis análisis, informes, pagos registrados y archivos, y que no se puede deshacer.
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-high-fg">
          {state.error}
        </p>
      )}
      <Button type="submit" variant="danger" disabled={pending} className="self-start">
        Borrar mi cuenta
      </Button>
    </form>
  );
}
