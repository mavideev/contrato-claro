"use client";
import { useSyncExternalStore } from "react";

// Mismo corte que `md:` de Tailwind. En el servidor se asume desktop.
const query = "(max-width: 767px)";

export function useIsMobile() {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
