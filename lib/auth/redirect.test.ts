import { describe, expect, it } from "vitest";
import { DEFAULT_AFTER_LOGIN, safeNext } from "./redirect";

describe("safeNext()", () => {
  it("acepta rutas internas", () => {
    expect(safeNext("/analisis/123/informe?x=1")).toBe("/analisis/123/informe?x=1");
  });

  it.each([null, undefined, "", "https://evil.test", "//evil.test", "/\\evil.test", "analisis"])(
    "descarta %s",
    (next) => {
      expect(safeNext(next)).toBe(DEFAULT_AFTER_LOGIN);
    },
  );
});
