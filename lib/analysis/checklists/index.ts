import type { analyses } from "@/db/schema";
import { BOLETO_CHECKLIST, CHECKLIST_VERSION as BOLETO_VERSION } from "./boleto-v1";
import { CHECKLIST_VERSION as RENTAL_VERSION, RENTAL_CHECKLIST } from "./rental-v1";
import { CHECKLIST_VERSION as SALE_VERSION, SALE_CHECKLIST } from "./sale-v1";

type ContractType = typeof analyses.$inferSelect.contractType;

export function checklistFor(contractType: ContractType): { version: string; checklist: string } {
  if (contractType === "sale") return { version: SALE_VERSION, checklist: SALE_CHECKLIST };
  if (contractType === "boleto") return { version: BOLETO_VERSION, checklist: BOLETO_CHECKLIST };
  return { version: RENTAL_VERSION, checklist: RENTAL_CHECKLIST };
}
