# Spec 02 — Cuentas y autenticación

**Estado:** borrador para validar · **Etapa:** 0 y 1 · **Fuente:** documento base §0.2 y §3, mockup «1 · Registro»

## Objetivo

Pedir la cuenta antes de subir nada, con tres formas de entrar: Google, link mágico por email y email con contraseña.

## Librería

Better Auth (`lib/auth/`) con el adaptador de Drizzle sobre la misma base, sesiones en la base y cookie `httpOnly`. Plugins: `magicLink`. Proveedores: `emailAndPassword` (con verificación obligatoria) y `google` (solo si están las variables). Ruta del handler: `app/api/auth/[...all]/route.ts`.

## Pantallas y rutas

| Ruta | Contenido | Mockup |
|---|---|---|
| `/registro` | email, contraseña (mínimo 8), «Crear cuenta», «Continuar con Google», link a ingresar, texto legal corregido | 1 · Registro |
| `/ingresar` | email + contraseña, «Recibir un link por email», Google, «¿Olvidaste tu contraseña?» | variante de 1 · Registro (agregada) |
| `/recuperar` | pide el email y manda el link; `/recuperar/nueva?token=` pide la contraseña nueva | agregada |
| `/verificar` | «Te mandamos un mail a …», con botón de reenviar | agregada |

Después de entrar se redirige a `/analisis`. Si no hay análisis, se va a `/analisis/nuevo`.

**Texto legal del registro** (reemplaza «No guardamos tu contrato»):
> Guardamos tu contrato cifrado mientras tengas cuenta. Podés borrarlo cuando quieras. Al continuar aceptás los términos y la política de privacidad.

## Emails

Plantillas en español rioplatense y texto plano + HTML simple: verificación, link mágico (vence en 15 minutos) y recuperación (vence en 1 hora). En local salen por SMTP a Mailpit; en producción, por Resend.

## Protección de rutas

`middleware.ts` revisa si hay cookie de sesión en las rutas del grupo `(app)` y, si no la hay, redirige a `/ingresar?next=<ruta>`. Cada Server Action y Route Handler vuelve a validar la sesión con `auth.api.getSession()`, porque el middleware no alcanza como control de seguridad.

## Seguridad

- Límite de intentos de ingreso y de envío de mails (rate limit de Better Auth en la base).
- Captcha (Turnstile) en registro y en envío de link: queda preparado detrás de una variable y se activa antes del lanzamiento.
- Los eventos `sign_in`, `sign_up`, `password_reset` y `account_deleted` se registran en `audit_log`.
- Borrar la cuenta (en `/cuenta`): pide confirmación, borra en cascada y encola el borrado de archivos.

## Criterios de aceptación

- [ ] Registro con email: llega el mail a Mailpit, el link verifica la cuenta y entra a `/analisis`.
- [ ] Ingreso con contraseña incorrecta: muestra un mensaje genérico, sin decir si el email existe.
- [ ] El link mágico llega a Mailpit y entra con un clic. Usado dos veces, la segunda falla.
- [ ] La recuperación de contraseña funciona y cierra las demás sesiones.
- [ ] Sin `GOOGLE_CLIENT_ID` no aparece el botón de Google. Con las variables cargadas, el flujo OAuth funciona en local.
- [ ] `/analisis` sin sesión redirige a `/ingresar?next=/analisis`.

## Fuera de alcance

2FA, inicio con Apple, cuentas de empresa o roles (llegan con las inmobiliarias).
