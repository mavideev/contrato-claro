import type { analyses, ConfirmedFields } from "@/db/schema";

type FieldDef = { key: keyof ConfirmedFields; label: string; wide?: boolean };

const RENTAL_FIELDS: FieldDef[] = [
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

const SALE_FIELDS: FieldDef[] = [
  { key: "seller", label: "Vendedor" },
  { key: "buyer", label: "Comprador" },
  { key: "property", label: "Inmueble", wide: true },
  { key: "price", label: "Precio" },
  { key: "currency", label: "Moneda" },
  { key: "paymentForm", label: "Forma de pago y seña" },
  { key: "signingTerm", label: "Plazo para escriturar" },
  { key: "deliveryTerm", label: "Entrega de posesión" },
  { key: "titleStatus", label: "Estado de dominio" },
  { key: "debtsStatus", label: "Deudas y expensas" },
  { key: "commission", label: "Comisión inmobiliaria" },
];

const BOLETO_FIELDS: FieldDef[] = [
  { key: "seller", label: "Vendedor / Desarrolladora" },
  { key: "buyer", label: "Comprador" },
  { key: "property", label: "Inmueble", wide: true },
  { key: "price", label: "Precio" },
  { key: "currency", label: "Moneda" },
  { key: "paymentForm", label: "Forma de pago y cuotas" },
  { key: "deliveryTerm", label: "Plazo de entrega / posesión" },
  { key: "signingTerm", label: "Plazo para escriturar" },
  { key: "titleStatus", label: "Estado de dominio del terreno" },
  { key: "cession", label: "Cesión del boleto" },
  { key: "guarantee", label: "Garantías de la desarrolladora" },
];

export const FIELDS_BY_TYPE: Record<typeof analyses.$inferSelect.contractType, FieldDef[]> = {
  rental: RENTAL_FIELDS,
  sale: SALE_FIELDS,
  boleto: BOLETO_FIELDS,
};

export function fieldsFor(contractType: typeof analyses.$inferSelect.contractType): FieldDef[] {
  return FIELDS_BY_TYPE[contractType];
}

type ViewerRole = { key: string; label: string };

const VIEWER_ROLES_BY_TYPE: Record<typeof analyses.$inferSelect.contractType, ViewerRole[]> = {
  rental: [
    { key: "tenant", label: "Locatario/a (quien alquila)" },
    { key: "landlord", label: "Locador/a (dueño/a)" },
  ],
  sale: [
    { key: "buyer", label: "Comprador/a" },
    { key: "seller", label: "Vendedor/a" },
  ],
  boleto: [
    { key: "buyer", label: "Comprador/a" },
    { key: "seller", label: "Vendedor/a o desarrolladora" },
  ],
};

export function viewerRolesFor(contractType: typeof analyses.$inferSelect.contractType): ViewerRole[] {
  return VIEWER_ROLES_BY_TYPE[contractType];
}

export function viewerRoleLabel(contractType: typeof analyses.$inferSelect.contractType, viewerRole: string | null): string | null {
  if (!viewerRole) return null;
  return VIEWER_ROLES_BY_TYPE[contractType].find((r) => r.key === viewerRole)?.label ?? null;
}
