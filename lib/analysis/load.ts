import "server-only";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { scoped } from "@/lib/db/scoped";

// Para las páginas de /analisis/[id]/*: valida la sesión y que el análisis
// sea del usuario; si no, 404 (no revela que existe).
export async function loadAnalysis(params: Promise<{ id: string }>, section: string) {
  const { id } = await params;
  const user = await requireUser(`/analisis/${id}/${section}`);
  const db = scoped(user.id);
  const analysis = await db.analyses.get(id);
  if (!analysis) notFound();
  return { user, db, analysis };
}
