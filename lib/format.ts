// Formatos de la interfaz (español rioplatense, hora de Buenos Aires).
const TZ = "America/Argentina/Buenos_Aires";

const day = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", timeZone: TZ });
const dayTime = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: TZ,
});
const isoDay = new Intl.DateTimeFormat("en-CA", { timeZone: TZ });
const ars = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

/** «14 oct». Acepta un Date o una fecha `YYYY-MM-DD` (columna `date`). */
export function formatDay(value: Date | string): string {
  const date = typeof value === "string" ? new Date(`${value}T12:00:00Z`) : value;
  return day.format(date);
}

/** «14 oct, 10:42». */
export function formatDayTime(value: Date): string {
  return dayTime.format(value);
}

/** Fecha de hoy en Buenos Aires, `YYYY-MM-DD` (para comparar con `signing_date`). */
export function todayInBuenosAires(now: Date = new Date()): string {
  return isoDay.format(now);
}

/** Montos guardados en centavos. Mientras no haya precio (0), se muestra el marcador del prototipo. */
export function formatPrice(cents: number): string {
  return cents > 0 ? ars.format(cents / 100) : "[PRECIO]";
}
