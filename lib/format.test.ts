import { describe, expect, it } from "vitest";
import { formatDay, formatDayTime, formatPrice, todayInBuenosAires } from "./format";

describe("formatos", () => {
  it("fechas cortas en hora de Buenos Aires", () => {
    expect(formatDay(new Date("2026-10-14T13:42:00Z"))).toBe("14 oct");
    expect(formatDay("2026-10-16")).toBe("16 oct");
    expect(formatDayTime(new Date("2026-10-14T13:42:00Z"))).toBe("14 oct, 10:42");
  });

  it("el día de hoy cambia a medianoche de Buenos Aires, no de UTC", () => {
    expect(todayInBuenosAires(new Date("2026-10-17T02:30:00Z"))).toBe("2026-10-16");
    expect(todayInBuenosAires(new Date("2026-10-17T03:30:00Z"))).toBe("2026-10-17");
  });

  it("precio en pesos o marcador si todavía no está definido", () => {
    expect(formatPrice(45_000_000).replace(/\s/g, " ")).toBe("$ 450.000");
    expect(formatPrice(0)).toBe("[PRECIO]");
  });
});
