import { describe, expect, it } from "vitest";
import { magicLinkEmail, resetPasswordEmail, verificationEmail } from "./templates";

describe("plantillas de mail", () => {
  const url = "http://localhost:3000/api/auth/verify-email?token=abc&callbackURL=/analisis";

  it.each([
    ["verificación", verificationEmail, "1 hora"],
    ["link mágico", magicLinkEmail, "15 minutos"],
    ["recuperación", resetPasswordEmail, "1 hora"],
  ])("%s: texto y HTML con el link y el vencimiento", (_, template, expiry) => {
    const mail = template(url);
    expect(mail.subject).toBeTruthy();
    expect(mail.text).toContain(url);
    expect(mail.text).toContain(expiry);
    expect(mail.html).toContain(url.replace(/&/g, "&amp;"));
  });

  it("escapa el HTML del link", () => {
    expect(magicLinkEmail('http://x/"><script>').html).not.toContain("<script>");
  });
});
