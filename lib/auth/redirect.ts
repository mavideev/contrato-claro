// Destino después de entrar (`?next=`). Solo rutas internas: evita usar el
// login como redirección abierta hacia otro sitio.
export const DEFAULT_AFTER_LOGIN = "/analisis";
/** Después de crear la cuenta: directo a subir el primer contrato (spec 02). */
export const AFTER_SIGN_UP = "/analisis/nuevo";

export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return DEFAULT_AFTER_LOGIN;
  }
  return next;
}
