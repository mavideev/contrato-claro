"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { analysisStatus } from "@/app/(app)/analisis/actions";

// Mientras se lee el contrato, consulta el estado y, al terminar, lleva a
// «Confirmar datos». No usa router.refresh() + redirect del servidor: el router
// recordaba esa redirección y, después de confirmar, /estado volvía a mandar a
// confirmar.
export function WaitForReading({ id, seconds = 2, maxTries = 90 }: { id: string; seconds?: number; maxTries?: number }) {
  const router = useRouter();
  useEffect(() => {
    let tries = 0;
    const timer = setInterval(async () => {
      if (++tries > maxTries) return clearInterval(timer);
      const status = await analysisStatus(id);
      if (status === "extracting") return;
      clearInterval(timer);
      if (status === "awaiting_confirmation") router.replace(`/analisis/${id}/confirmar`);
      else router.refresh();
    }, seconds * 1000);
    return () => clearInterval(timer);
  }, [id, router, seconds, maxTries]);
  return null;
}
