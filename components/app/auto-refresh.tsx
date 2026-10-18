"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Vuelve a pedir la página cada `seconds` mientras algo está en curso (pago
// pendiente, informe en preparación). Se corta solo después de `maxTries`.
export function AutoRefresh({ seconds = 3, maxTries = 40 }: { seconds?: number; maxTries?: number }) {
  const router = useRouter();
  useEffect(() => {
    let tries = 0;
    const timer = setInterval(() => {
      if (++tries > maxTries) return clearInterval(timer);
      router.refresh();
    }, seconds * 1000);
    return () => clearInterval(timer);
  }, [router, seconds, maxTries]);
  return null;
}
