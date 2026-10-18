import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// Rutas del grupo (app): sin cookie de sesión, redirige a /ingresar?next=<ruta>.
// Es solo un filtro rápido; las páginas, Server Actions y Route Handlers
// vuelven a validar la sesión contra la base (lib/auth/session.ts).
export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  const url = new URL("/ingresar", request.url);
  url.searchParams.set("next", pathname + search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/analisis/:path*", "/pago/:path*", "/pagos/:path*", "/cuenta/:path*"],
};
