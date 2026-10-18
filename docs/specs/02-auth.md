# Spec 02 — Cuentas y autenticación

**Estado:** implementado en la etapa 0, partes 3 y 4 (falta lo marcado como pendiente) · **Etapa:** 0 y 1 · **Fuente:** documento base §0.2 y §3, mockup «1 · Registro»

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

Después de entrar se redirige a `/analisis`. Después de crear la cuenta (al verificar el email), a `/analisis/nuevo`. Si no hay análisis, `/analisis` muestra el panel vacío con «Subir mi primer contrato».

**Texto legal del registro** (reemplaza «No guardamos tu contrato»):
> Guardamos tu contrato cifrado mientras tengas cuenta. Podés borrarlo cuando quieras. Al continuar aceptás los términos y la política de privacidad.

## Emails

Plantillas en español rioplatense y texto plano + HTML simple: verificación, link mágico (vence en 15 minutos) y recuperación (vence en 1 hora). En local salen por SMTP a Mailpit; en producción, por Resend.

## Protección de rutas

`proxy.ts` (en Next.js 16, `middleware` pasó a llamarse `proxy`) revisa si hay cookie de sesión en las rutas del grupo `(app)` y, si no la hay, redirige a `/ingresar?next=<ruta>`. Cada Server Action y Route Handler vuelve a validar la sesión con `auth.api.getSession()`, porque el proxy no alcanza como control de seguridad. En las páginas, `requireUser()` (`lib/auth/session.ts`) valida la sesión contra la base.

## Seguridad

- Límite de intentos de ingreso y de envío de mails (rate limit de Better Auth en la base). ✅
- Captcha (Turnstile) en registro y en envío de link: queda preparado detrás de una variable y se activa antes del lanzamiento. ⏳ pendiente
- Los eventos `sign_in`, `sign_up`, `password_reset` y `account_deleted` se registran en `audit_log`. ✅
- Borrar la cuenta (en `/cuenta`): pide confirmación, borra en cascada y encola el borrado de archivos (evento de Inngest `account/deleted` con las claves de S3; la función que los borra llega con la etapa 2). ✅

## Criterios de aceptación

- [x] Registro con email: llega el mail a Mailpit, el link verifica la cuenta y entra a `/analisis`.
- [x] Ingreso con contraseña incorrecta: muestra un mensaje genérico, sin decir si el email existe.
- [x] El link mágico llega a Mailpit y entra con un clic. Usado dos veces, la segunda falla.
- [x] La recuperación de contraseña funciona y cierra las demás sesiones.
- [ ] Sin `GOOGLE_CLIENT_ID` no aparece el botón de Google ✅. Con las variables cargadas, el flujo OAuth funciona en local ⏳ (falta probarlo con credenciales reales).
- [x] `/analisis` sin sesión redirige a `/ingresar?next=/analisis`.

## Fuera de alcance

2FA, inicio con Apple, cuentas de empresa o roles (llegan con las inmobiliarias).
