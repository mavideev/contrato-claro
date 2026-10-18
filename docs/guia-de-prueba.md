# Guía de prueba paso a paso

Para probar a mano lo que ya está hecho. Cada paso dice qué hacer y qué tendrías que ver.

**Antes de empezar:** el entorno tiene que estar levantado (`make dev`).

- La app: http://localhost:3000
- Los mails de prueba: http://localhost:8025

Si algo no coincide con lo que dice el paso, anotá el número del paso y qué ves.

---

## Parte A — Cuenta de ejemplo (etapa 0)

**A1. Ingresar**
Entrá a http://localhost:3000 con `demo@contratoclaro.local` / `demo12345`.
✔️ Ves «Mis análisis» con 3 contratos: uno con «Firma hoy», uno con «Pago pendiente» y uno con «Informe listo».

**A2. Ver un informe**
En el que dice «Informe listo», tocá **Ver informe**.
✔️ Arriba hay un riesgo en rojo, abierto, y debajo dos en amarillo.

**A3. Abrir un riesgo**
Tocá **Ver detalle** en uno amarillo.
✔️ Se abren dos cuadros: «Qué dice el contrato» y «Qué pedir».

**A4. Ver un re-chequeo con cambios**
Volvé a **Mis análisis** y, en «Firma hoy», tocá **Re-chequear hoy**.
✔️ Ves el aviso rojo «Se detectaron 2 cambios» y las palabras cambiadas: las viejas tachadas en rojo y las nuevas en verde.

**A5. Navegación**
En cualquier pantalla de un contrato, mirá arriba.
✔️ Están «Contrato Claro» y los links **Mis análisis** y **Cuenta**.

**A6. Cerrar sesión**
Entrá a **Cuenta** y tocá **Cerrar sesión**.
✔️ Volvés a «Iniciá sesión».

---

## Parte B — Cuenta nueva y mails (etapa 0)

**B1. Crear una cuenta**
Tocá **Creá tu cuenta**, poné un email inventado (por ejemplo `prueba1@test.com`) y una contraseña de 8 letras o más.
✔️ Aparece «Revisá tu email».

**B2. Confirmar el email**
Abrí http://localhost:8025, abrí el mail «Confirmá tu email» y tocá **Confirmar email**.
✔️ Entrás a «Subí tu contrato…» con la sesión iniciada.

**B3. Panel vacío**
Tocá **Mis análisis** (arriba a la derecha).
✔️ Dice «Todavía no analizaste ningún contrato».

---

## Parte C — Analizar y pagar con el simulador (etapa 1)

Seguí con la cuenta nueva de la parte B.

**C1. Subir un contrato**
Tocá **Subir mi primer contrato**, elegí **Pegar texto**, escribí cualquier cosa y tocá **Analizar contrato**.
✔️ Aparece «Confirmá los datos clave» con los campos completos (son datos de ejemplo).

**C2. Confirmar**
Cambiá el **Inmueble** por una dirección cualquiera y tocá **Confirmar y analizar**.
✔️ Aparece «Tu vista previa está lista», con cuántos riesgos hay y el botón de pagar.

**C3. Pagar**
Tocá **Pagar con Mercado Pago**.
✔️ Aparece el **simulador** (recuadro amarillo, «Simulador de Mercado Pago · solo desarrollo») con tres botones.

**C4. Aprobar el pago**
Tocá **Aprobar el pago**.
✔️ Aparece «Pago aprobado».

**C5. Ver el informe**
Tocá **Ver mi informe** y esperá unos segundos.
✔️ La pantalla se actualiza sola y aparece el informe completo.

**C6. Comprar el re-chequeo**
Tocá **Re-chequear el día de la firma** → **Pagar con Mercado Pago** → **Aprobar el pago** → **Subir la versión final**.
✔️ Aparece «Podés sacarle fotos desde el celular o subir el PDF o Word».

**C7. Ver los pagos**
Entrá a **Pagos** desde el menú.
✔️ Hay dos pagos «Aprobado»: el del análisis y el del re-chequeo.

**C8. Pago pendiente y rechazado (opcional)**
Subí otro contrato y repetí C1 a C3, pero tocá **Dejarlo pendiente**.
✔️ Aparece «Tu pago está pendiente». Si volvés a pagar y tocás **Rechazarlo**: «El pago fue rechazado», con el botón para probar de nuevo.

---

## Parte D — Recuperar la contraseña y borrar la cuenta (etapa 0)

**D1. Link mágico**
Cerrá sesión. En «Iniciá sesión», tocá **Recibir un link por email**, poné el email de la parte B y tocá **Recibir el link**.
✔️ En Mailpit llega «Tu link para entrar». Al tocarlo, entrás.

**D2. Recuperar la contraseña**
Cerrá sesión y tocá **¿Olvidaste tu contraseña?**. Poné el mismo email.
✔️ En Mailpit llega «Cambiá tu contraseña». El link lleva a elegir una contraseña nueva, y después podés entrar con ella.

**D3. Borrar la cuenta**
Entrá a **Cuenta**, marcá la casilla «Entiendo que se borran…» y tocá **Borrar mi cuenta**.
✔️ Aparece «Borramos tu cuenta y todos tus datos». Ya no podés entrar con esa cuenta.

---

## Parte E — Nadie ve lo ajeno (etapa 0)

**E1.** Ingresá con la cuenta demo, abrí un informe y copiá la dirección (la URL).
**E2.** Cerrá sesión e ingresá con `otro@contratoclaro.local` / `otro12345`.
**E3.** Pegá la dirección copiada.
✔️ Aparece «No encontramos esta página».

---

## Parte F — En el celular (opcional)

En el navegador de la computadora: Cmd+Opt+I y después Cmd+Shift+M, y elegí un ancho de unos 390.

**F1.** ✔️ El menú pasa a estar abajo (Análisis, Pagos, Cuenta).
**F2.** En «Nuevo análisis» aparece **Sacar foto**. Tocá **Abrir cámara**, después el botón redondo dos veces y **Listo (2)**.
✔️ En «Confirmá los datos clave», el «Valor inicial» está en amarillo con «Revisá», y cambia a «Confirmado» cuando lo editás.

---

## Qué todavía no es real

- **Subir un contrato** carga datos de ejemplo: todavía no se lee tu archivo (etapa 2).
- **El informe** es de ejemplo: el análisis con IA llega en la etapa 3.
- **El pago** usa el simulador hasta que esté la cuenta de Mercado Pago.
- **La cámara** es una maqueta.
- **Descargar el PDF** y **el certificado** están deshabilitados.

El estado de cada etapa está en [progress.md](progress.md).
