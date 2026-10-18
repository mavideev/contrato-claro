import type { ConfirmedFields } from "@/db/schema";

// Los 11 campos críticos de §3 más la moneda (spec 03, corrección 5), en el
// orden de la pantalla «Confirmar datos». `wide`: ocupa las dos columnas.
export const FIELDS: { key: keyof ConfirmedFields; label: string; wide?: boolean }[] = [
  { key: "landlord", label: "Locador" },
  { key: "tenant", label: "Locatario" },
  { key: "property", label: "Inmueble", wide: true },
  { key: "term", label: "Plazo" },
  { key: "initialRent", label: "Valor inicial" },
  { key: "currency", label: "Moneda" },
  { key: "adjustment", label: "Ajuste" },
  { key: "deposit", label: "Depósito" },
  { key: "guarantee", label: "Garantía" },
  { key: "termination", label: "Rescisión" },
  { key: "expenses", label: "Expensas" },
  { key: "commission", label: "Comisión" },
];
