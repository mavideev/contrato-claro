# Documento base del MVP — v0.2

*16–18 de octubre de 2026 · Webapp para analizar contratos inmobiliarios en Argentina · Nombre provisorio: «Contrato Claro» (el nombre y el dominio se deciden más adelante)*

## 0. Decisiones cerradas

1. **Usuario principal:** personas (inquilino o comprador). Inmobiliarias y estudios quedan para una segunda etapa.
2. **Cuenta:** se pide al principio, antes de subir nada. Inicio con Google, link por email y contraseña.
3. **Stack:** Next.js con Postgres, más los complementos de la sección 5.
4. **Cobro:** pago único por análisis, con el re-chequeo del día de la firma como extra. El precio se define después de medir el costo real por análisis. Pagos con Mercado Pago.
5. **Datos:** se guarda el contrato mientras exista la cuenta, cifrado, con borrado a pedido del usuario y borrado total al cerrar la cuenta. **Los textos de los mockups que dicen «no guardamos tu contrato» hay que corregirlos.**
6. **Plataforma:** solo web, responsive y pensada para sacar la foto desde el celular. La app para tiendas se evalúa después con datos.
7. **Servicios:** se usan planes gratuitos durante el desarrollo y las pruebas. Antes de lanzar con usuarios reales hay que revisar condiciones de uso comercial, respaldos y región de los datos.

**Propuestos, todavía sin cerrar:** Haiku 5.5 para extracción y Sonnet 5.5 para el análisis de riesgos (se valida con el set de prueba), y las decisiones de la sección 14.

## 1. Resumen

El usuario sube una foto, un PDF, un Word o pega el texto de un contrato. La app lo divide en cláusulas, detecta riesgos, los explica en lenguaje claro y, el día de la firma, comprueba que la versión final no cambió respecto de la analizada. El informe es orientativo: no reemplaza a un abogado o escribano, y la app nunca dice «es legal» ni «firmá».

**Objetivos del MVP:** validar que alguien paga, comprobar que la lectura de fotos alcanza, y medir RAG sobre normativa argentina versionada.

## 2. Alcance

**Incluye:** alquiler de vivienda; carga por foto, PDF, Word o texto; informe con semáforo por cláusula y cita de la cláusula original; re-chequeo del día de la firma; cuentas; pago con Mercado Pago; panel de análisis; informe en PDF.

**No incluye por ahora:** app nativa, compraventa y boleto completos, normativa provincial o municipal, firma digital y sellado de tiempo, revisión humana integrada, integraciones con registros públicos.

## 3. Funcionalidades

- **Captura:** foto con la cámara del celular desde el navegador (`capture`), subida de imagen, PDF o Word, texto pegado. Varias páginas por contrato, vista previa, aviso de foto borrosa, compresión y corrección de orientación en el navegador.
- **Extracción:** texto directo de PDF y Word; visión para fotos y escaneos; división en cláusulas; campos críticos (partes, inmueble, plazo, valor, ajuste, depósito, garantía, rescisión, expensas, comisión, moneda). El usuario confirma los datos leídos de una foto.
- **Análisis e informe:** checklist de alquiler con salida JSON validada; semáforo (alto, atención, sin alertas); explicación y cita de la cláusula; simulador de ajuste a 12 meses; PDF.
- **Re-chequeo (extra pago):** se compara la versión final contra la analizada (hash exacto para archivos digitales, diff por cláusula y tolerancia a errores de lectura para fotos). Resultado: «idéntico» o lista de cambios, con certificado descargable. No afirma autenticidad ni validez legal.
- **Cuentas y pagos:** registro e inicio de sesión; pago por análisis; el informe completo se desbloquea al confirmarse el pago por webhook; panel con historial y estados.
- **Más adelante:** revisión humana paga, compraventa y boleto, plan para inmobiliarias.

## 4. Mockups

Prototipo interactivo (7 pantallas desktop y 8 mobile): https://claude.ai/artifact/GXnaigS8tcsATZxUN1mQ6P (hay que compartirlo con la cuenta del colega; si no, usar `Analizador de contratos – MVP.pdf`). Mapeo de rutas y correcciones: `docs/specs/03-screens.md`.

Pantallas: 1 registro, 2 subir contrato, 3 captura en celular, 4 confirmar datos, 5 análisis en curso y pago, 6 informe, 7 re-chequeo, 8 panel.

**Cambios pendientes en los mockups:** corregir los textos sobre no guardar el contrato (registro y panel); mostrar el re-chequeo como extra en la pantalla de pago; agregar inicio de sesión y recuperar contraseña, flujo de Mercado Pago (resumen, aprobado, pendiente, rechazado), estados de error (foto borrosa), re-chequeo «todo idéntico», estados vacíos, versión mobile del resto de las pantallas y vista de administración.

## 5. Stack

- **Frontend:** Next.js (App Router) con TypeScript, Tailwind y shadcn/ui, React Hook Form y Zod, TanStack Query. Los componentes de cámara son Client Components.
- **API:** Route Handlers y Server Actions, con esquemas Zod compartidos.
- **Base de datos:** Postgres con pgvector (Supabase o Neon), migraciones versionadas y respaldos. ORM: Drizzle o Prisma.
- **Trabajos en segundo plano:** Inngest o Trigger.dev (si se despliega en serverless); BullMQ con Redis (si se usan contenedores). El análisis puede tardar más que una petición normal.
- **Autenticación:** Supabase Auth, Auth.js o Clerk.
- **Archivos:** almacenamiento compatible con S3 (Supabase Storage, Cloudflare R2 o S3), URL firmadas, cifrado en reposo, límites de tamaño y tipo.
- **Documentos:** pdf.js y mammoth para texto, sharp para imágenes (orientación EXIF, HEIC), SHA-256 para huellas, diff de texto.
- **IA:** SDK de Anthropic, salida estructurada validada con Zod, caché de prompts. Modelos propuestos: Haiku 5.5 (extracción, clasificación) y Sonnet 5.5 (juicio de riesgo y redacción). Se empieza con el más capaz y se baja según el set de prueba.
- **Pagos:** SDK de Mercado Pago (Checkout Pro), webhooks con verificación de firma, idempotencia y tabla de eventos.
- **Emails:** Resend o Postmark. **PDF:** React-PDF o Playwright.
- **Seguridad:** límites de uso, captcha (Turnstile), cabeceras CSP, secretos gestionados, log de auditoría, borrado a pedido.
- **Observabilidad:** Sentry, logs estructurados, PostHog para medir fallos de lectura y abandono.
- **Pruebas y evaluación:** Vitest, Playwright, simulacros de Mercado Pago y de la API de IA, set de prueba propio y una herramienta para comparar prompts y modelos.
- **CI/CD:** GitHub Actions, entornos local/dev/prod, Docker Compose local, despliegues de preview.
- **Después del MVP:** panel `/admin`, RAG (pgvector, búsqueda híbrida, reranking), facturación electrónica con ARCA, Cloudflare como CDN y WAF.
- **No usar todavía:** microservicios, Kubernetes, buscador externo, OCR aparte.

## 6. Flujos clave

**Análisis:** registro o inicio de sesión → subir archivos o pegar texto → compresión y subida directa al almacenamiento → creación del trabajo → extracción y división en cláusulas → confirmación de datos clave → vista previa gratuita → pago → webhook confirma → se desbloquea el informe → se guarda la huella.

**Re-chequeo (extra):** abrir un análisis previo → comprar el re-chequeo → subir la versión final (archivo o foto) → comparación contra la huella y el documento guardado → resultado y certificado.

**Pago:** preferencia creada en el servidor → redirección a Mercado Pago → webhook que valida el pago consultando la API, con idempotencia → estado actualizado solo desde el servidor. La pantalla de retorno solo consulta ese estado. Estados: aprobado, pendiente, rechazado o cancelado.

## 7. Modelo de datos inicial

users; analyses (usuario, tipo, fecha de firma, estado, versión del checklist); documents (análisis, tipo, tamaño, ruta cifrada, fecha de borrado); clauses (número, título, texto, huella); findings (cláusula, nivel, explicación, norma opcional); fingerprints (hash del archivo y de cada cláusula); rechecks (resultado y cambios); payments (usuario, análisis, tipo: análisis o re-chequeo, id de Mercado Pago, estado, monto); norms, norm_versions (vigente desde y hasta, estado, hash) y norm_chunks (texto, embedding, metadatos) para el RAG.

## 8. Estructura sugerida del repositorio

```
app/ (public, app, api) · components/ · lib/ (extraction, analysis, fingerprint, payments, rag)
db/ · jobs/ · evals/ · docs/
```

## 9. Plan por etapas

0. **Base:** repositorio, entornos, CI, base y almacenamiento. Salida: despliegue vacío conectado.
1. **Cuentas y pago:** registro, Mercado Pago con webhook, estados. Salida: un pago de prueba desbloquea un informe de ejemplo.
2. **Captura y extracción:** foto, PDF, Word, texto; cláusulas. Salida: contratos de muestra convertidos correctamente.
3. **Informe de alquileres sin RAG:** checklist, JSON, semáforo, citas, PDF, set de prueba. Salida: métricas base.
4. **Re-chequeo:** huellas, comparación, certificado. Salida: cambios inyectados se detectan.
5. **RAG con normativa versionada:** ingesta, vigencia, búsqueda híbrida, filtro por fecha de firma. Salida: mejora medible frente a la etapa 3.
6. **Cierre:** revisión humana manual, prueba de calidad de fotos, decisión sobre la app.

Las duraciones se definen cuando se confirmen horas y perfil del equipo.

## 10. Calidad y evaluación

Set de 15 a 20 contratos reales anonimizados (impresión nítida, letra chica, hojas arrugadas, sellos, anotaciones a mano). Tres dispositivos (iPhone, Android medio y bajo). Se comparan `capture` nativo, cámara propia con canvas e `ImageCapture`. Métricas: campos críticos leídos bien, errores por palabra contra el PDF original, cláusulas detectadas completas, fotos repetidas, peso del archivo. El umbral de aceptación se fija antes de probar. El análisis se evalúa con cláusulas de respuesta esperada validadas por un profesional.

## 11. Seguridad, privacidad y legal

- Se guardan contratos completos con datos personales: HTTPS, cifrado, acceso mínimo, botón de borrado, eliminación total al cerrar la cuenta. Revisar con un abogado las obligaciones de la Ley 25.326.
- Términos y condiciones, política de privacidad y disclaimers redactados o revisados por un abogado antes de cobrar.
- Los textos de la app evitan «válido», «legal» o «firmá». Usan «riesgos detectados» y recomiendan consultar a un profesional.
- Normativa solo de fuentes oficiales públicas; doctrina y modelos de terceros requieren revisar licencias. Cada cambio importante del corpus lo revisa una persona.
- Facturación y alta impositiva en regla antes del primer cobro.

## 12. Pagos y negocio

Pago único por análisis; re-chequeo como extra. Costo variable por análisis: IA, lectura de fotos, comisión de Mercado Pago, impuestos; se mide con contratos reales antes de fijar precios. Los costos principales están en dólares y los ingresos en pesos: precio en pesos con margen y revisión periódica. Por ahora el cobro es solo web. Si más adelante hay app, evaluar cuenta con compra en la web y acceso en la app, o la facturación de la tienda, según las políticas vigentes para Argentina. Segundo ingreso posible: revisión humana paga.

## 13. Riesgos

Respuestas incorrectas del modelo (citar siempre la cláusula, evaluar con set de prueba y revisión profesional); exposición legal (disclaimers, términos y abogado); fotos de mala calidad (guía de captura, confirmación de datos); cambios normativos (versionado y monitoreo); competencia de chatbots generales (contexto argentino, flujo de foto a informe, re-chequeo); costo en dólares (medir y ajustar precios); custodia de contratos completos (seguridad y política de borrado).

## 14. Decisiones abiertas

Nombre y dominio; precios; modelos de IA definitivos; hosting, autenticación y cola de trabajos; plazo y política de retención del informe y los archivos (con el abogado); alcance de la normativa del MVP; modalidad del abogado o escribano asesor; revisión humana en el MVP; umbral para decidir sobre la app; facturación electrónica; horas y perfil del equipo.

## 15. Guía para el agente que arme el scaffolding

**Principios:** seguir este documento; ante una decisión abierta, preguntar antes de decidir; todo hallazgo del informe cita la cláusula de origen; ningún texto afirma validez legal; la lógica de pagos y de estado corre en el servidor; no hay secretos en el repositorio.

**Orden:** etapa 0; esquema de datos con migraciones; etapa 1 con Mercado Pago en modo de prueba y webhook idempotente; pantallas de los mockups en versión estática; luego una etapa por vez.

**Terminado por tarea:** pruebas pasando, flujo ejecutable de punta a punta, variables de entorno documentadas, notas de decisión en `docs/`.

**Primer pedido sugerido:** crear el scaffolding de las secciones 5, 7 y 8 con las rutas vacías de las pantallas, la conexión a la base, el esquema inicial y un README para correr todo en local. No implementar todavía análisis ni pagos reales.
