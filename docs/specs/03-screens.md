# Spec 03 — Pantallas y rutas

**Estado:** en implementación (etapa 0, parte 4; ver [progress.md](../progress.md)) · **Etapa:** 0 (versión estática), después cada etapa conecta datos reales
**Fuente:** prototipo https://claude.ai/artifact/GXnaigS8tcsATZxUN1mQ6P (7 pantallas desktop y 8 mobile), documento base §3, §4 y §6

## Objetivo

Llevar las pantallas del prototipo a rutas reales de Next.js, responsive (una sola ruta sirve para desktop y mobile), con datos de ejemplo en la etapa 0 y con las correcciones que pide el documento base.

## Mapa de rutas

| Ruta | Pantalla (desktop / mobile) | Notas |
|---|---|---|
| `/registro`, `/ingresar`, `/recuperar`, `/verificar` | 1 · Registro / 1 · Registro | ver spec 02 |
| `/analisis` | 7 · Mis análisis / 8 · Mis análisis | navegación: Mis análisis · Pagos · Cuenta (abajo en mobile) |
| `/analisis/nuevo` | 2 · Subir contrato / 2 · Subir contrato | tipo de contrato, método y aviso de guardado |
| `/analisis/nuevo/escanear` | — / 3 · Escaneo | solo mobile: cámara, páginas, «Listo (n)» |
| `/analisis/[id]/confirmar` | 3 · Confirmar datos / 4 · Confirmar datos | |
| `/analisis/[id]/estado` | 4 · Análisis y pago / 5 · Análisis y pago | progreso + vista previa + pago |
| `/pago/retorno` | agregada | aprobado, pendiente, rechazado o cancelado; solo lee el estado del servidor |
| `/analisis/[id]/informe` | 5 · Informe / 6 · Informe | |
| `/analisis/[id]/rechequeo` | 6 · Re-chequeo / 7 · Re-chequeo | compra del extra, subida y resultado |
| `/pagos` | agregada (navegación del panel) | historial de pagos |
| `/cuenta` | agregada (navegación del panel) | datos, cerrar sesión, borrar cuenta |

## Correcciones respecto del prototipo

1. **Textos de guardado** (6 lugares: Registro, Subir y Mis análisis, en desktop y mobile). Reemplazar «No guardamos tu contrato…» y «…no el contrato original» por:
   > Guardamos tu contrato cifrado mientras tengas cuenta. Podés borrarlo cuando quieras.
2. **Pago:** «Re-chequeo del día de la firma: [incluido / extra]» pasa a «Re-chequeo del día de la firma: extra, lo comprás cuando lo necesites».
3. **Subir en desktop:** se quita «Sacar foto» (el prototipo prometía mandar un link al celular). En su lugar va un aviso: «Para sacar fotos, entrá desde tu celular». En mobile, «Sacar foto» abre `/analisis/nuevo/escanear`.
4. **Tipo de contrato:** Alquiler habilitado. Compraventa y Boleto se muestran deshabilitados con «Próximamente», y tocarlos registra un evento de interés (PostHog en etapa posterior).
5. **Confirmar datos:** a los 7 campos del prototipo (locador, locatario, inmueble, plazo, valor inicial, ajuste, depósito) se suman garantía, rescisión, expensas, comisión y moneda (los 11 campos críticos de §3) y **fecha de firma prevista** (opcional, la usa el panel para «Firma hoy»). El aviso «Los leímos de tu foto» se muestra solo cuando el origen es una foto.
6. **Re-chequeo:** se agrega el paso previo de compra («Re-chequeo: [PRECIO], pago único»). Después se sube la versión final y se ve el resultado. Se agrega también el estado «Todo idéntico».
7. **Pantallas agregadas:** ingresar, recuperar, verificar, retorno del pago, pagos y cuenta.

## Estados que el prototipo no muestra (se diseñan en la etapa que corresponde)

- Panel vacío: «Todavía no analizaste ningún contrato» con botón a `/analisis/nuevo`.
- Foto borrosa: aviso por página con «Repetir foto».
- Extracción fallida: mensaje y opción de subir otro archivo.
- Pago pendiente o rechazado (`/pago/retorno`).
- Re-chequeo «Todo idéntico».
- Página 404 propia: también se usa cuando un análisis no pertenece al usuario.

## Sistema visual (tomado del prototipo)

- **Tipografías:** Fraunces 600/700 (títulos), Public Sans 400–700 (texto), IBM Plex Mono 400 (huellas), cargadas con `next/font`.
- **Colores:** fondo `#F4F2EC`, superficie `#FFFFFF`, tinta `#102A43`, texto secundario `#3E4C59` y `#5B6B7B`, primario `#0E7C7B` (hover `#0B6665`, foco `#7CC4C2`), bordes `#CFCBC0` y `#E2DED4`.
- **Semáforo:** alto `#C0392B` / fondo `#FBE3E0` / texto `#8E2A20`; atención `#D69E2E` / `#FBEFD5` / `#7A4B00`; sin alertas `#2F7D4F` / `#DFF0E3` / `#1F5E39`.
- **Formas:** radio de 10 px (botones, inputs), 12–16 px (tarjetas), píldoras de 999 px. Altura de botones e inputs entre 48 y 54 px. Foco visible con un contorno de 3 px.
- **Textos de la interfaz:** español rioplatense con voseo. Nunca «válido», «legal» ni «firmá». Siempre «riesgos detectados» y la recomendación de consultar a un profesional.

## Criterios de aceptación (etapa 0)

- [ ] Las 15 vistas del prototipo y las 6 agregadas existen como rutas y renderizan sin errores en consola.
- [ ] En 390 px no hay scroll horizontal y las acciones quedan al alcance (≥ 44 px).
- [ ] Las vistas usan datos del seed cuando existen y datos fijos de ejemplo cuando no. Los botones navegan como en el prototipo.
- [ ] `grep -ri "no guardamos" app components` no devuelve resultados.
- [ ] Ningún texto dice «válido», «legal» ni «firmá».
- [ ] Playwright: smoke test por ruta en 1280 y en 390.
