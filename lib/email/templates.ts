// Plantillas de los mails de cuenta (spec 02, "Emails"): texto plano + HTML simple.

export type EmailMessage = { subject: string; text: string; html: string };

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function layout(opts: { title: string; intro: string; action: string; url: string; outro: string }): EmailMessage {
  const text = `${opts.intro}\n\n${opts.action}: ${opts.url}\n\n${opts.outro}\n\n— Contrato Claro`;
  const html = `<!doctype html>
<html lang="es-AR">
  <body style="margin:0;padding:24px;background:#F4F2EC;font-family:Arial,Helvetica,sans-serif;color:#102A43">
    <table role="presentation" width="100%" style="max-width:520px;margin:0 auto;background:#FFFFFF;border:1px solid #E2DED4;border-radius:14px">
      <tr><td style="padding:28px">
        <p style="margin:0 0 16px;font-size:20px;font-weight:700">${escape(opts.title)}</p>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.5">${escape(opts.intro)}</p>
        <a href="${escape(opts.url)}" style="display:inline-block;padding:14px 22px;background:#0E7C7B;color:#FFFFFF;text-decoration:none;border-radius:10px;font-weight:700">${escape(opts.action)}</a>
        <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#5B6B7B">${escape(opts.outro)}</p>
        <p style="margin:16px 0 0;font-size:12px;color:#5B6B7B;word-break:break-all">Si el botón no funciona, copiá este link: ${escape(opts.url)}</p>
      </td></tr>
    </table>
  </body>
</html>`;
  return { subject: opts.title, text, html };
}

export function verificationEmail(url: string): EmailMessage {
  return layout({
    title: "Confirmá tu email",
    intro: "Para terminar de crear tu cuenta en Contrato Claro, confirmá que este email es tuyo.",
    action: "Confirmar email",
    url,
    outro: "El link vence en 1 hora. Si no creaste una cuenta, ignorá este mail.",
  });
}

export function magicLinkEmail(url: string): EmailMessage {
  return layout({
    title: "Tu link para entrar",
    intro: "Tocá el botón para entrar a Contrato Claro. El link sirve una sola vez.",
    action: "Entrar",
    url,
    outro: "El link vence en 15 minutos. Si no lo pediste, ignorá este mail.",
  });
}

export function resetPasswordEmail(url: string): EmailMessage {
  return layout({
    title: "Cambiá tu contraseña",
    intro: "Pediste cambiar la contraseña de tu cuenta en Contrato Claro.",
    action: "Elegir contraseña nueva",
    url,
    outro: "El link vence en 1 hora. Si no lo pediste, ignorá este mail: tu contraseña sigue igual.",
  });
}
