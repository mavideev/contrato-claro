import "server-only";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";

// Sesión del lado del servidor. El proxy solo mira si hay cookie; esto la
// valida contra la base (spec 02, "Protección de rutas"). Con Cache Components,
// quien lo llame tiene que estar dentro de un <Suspense>.

export type CurrentUser = { id: string; name: string; email: string; role: string };

export async function getCurrentUser(): Promise<CurrentUser | null> {
  // headers() primero: en el prerender corta acá, antes de leer el entorno.
  const requestHeaders = await headers();
  const session = await auth().api.getSession({ headers: requestHeaders });
  if (!session) return null;
  const { id, name, email, role } = session.user as typeof session.user & { role: string };
  return { id, name, email, role };
}

export async function requireUser(next?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(next ? `/ingresar?next=${encodeURIComponent(next)}` : "/ingresar");
  return user;
}

/** Panel de costo de IA (/admin). El rol se activa a mano por SQL, nunca desde la app. */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser("/admin");
  if (user.role !== "admin") notFound();
  return user;
}
