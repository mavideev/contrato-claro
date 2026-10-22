import type { ConfirmedFields, PreviewCounts } from "@/db/schema";

// Datos de ejemplo para el seed (los análisis nuevos usan los datos leídos del contrato).

export const SAMPLE_FIELDS: ConfirmedFields = {
  landlord: "[Nombre completo]",
  tenant: "[Nombre completo]",
  property: "[Dirección y unidad]",
  term: "24 meses",
  initialRent: "$ 450.000",
  currency: "ARS",
  adjustment: "Trimestral por IPC",
  deposit: "3 meses",
  guarantee: "Seguro de caución",
  termination: "Preaviso de 90 días",
  expenses: "Ordinarias a cargo del inquilino",
  commission: "[Sin dato]",
};

export const SAMPLE_PREVIEW: PreviewCounts = { high: 1, attention: 2, none: 9 };
