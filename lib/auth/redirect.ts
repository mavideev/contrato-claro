// Destino después de entrar (`?next=`). Solo rutas internas: evita usar el
// login como redirección abierta hacia otro sitio.
export const DEFAULT_AFTER_LOGIN = "/analisis";

export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return DEFAULT_AFTER_LOGIN;
  }
  return next;
}
