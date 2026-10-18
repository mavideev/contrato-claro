"use server";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auditLog, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { scoped } from "@/lib/db/scoped";
import { inngest } from "@/lib/inngest/client";

export type DeleteAccountState = { error?: string };

// Borrar la cuenta (spec 02, "Seguridad"): encola el borrado de archivos,
// cierra la sesión y borra el usuario; la base borra en cascada el resto.
export async function deleteAccount(_: DeleteAccountState, form: FormData): Promise<DeleteAccountState> {
  const me = await requireUser("/cuenta");
  if (form.get("confirm") !== "on") return { error: "Marcá la casilla para confirmar." };

  const keys = await scoped(me.id).account.storageKeys();
  try {
    // Primero el evento: si no se puede encolar, no se borra nada y los archivos no quedan huérfanos.
    await inngest.send({ name: "account/deleted", data: { userId: me.id, storageKeys: keys } });
  } catch (err) {
    console.error("[cuenta] no se pudo encolar el borrado de archivos", err);
    return { error: "No pudimos borrar la cuenta. Probá de nuevo en un rato." };
  }

  await auth().api.signOut({ headers: await headers() });
  await db().transaction(async (tx) => {
    await tx.insert(auditLog).values({ action: "account_deleted", userId: me.id, targetType: "user", targetId: me.id, metadata: { files: keys.length } });
    await tx.delete(user).where(eq(user.id, me.id));
  });
  redirect("/registro?borrada=1");
}
