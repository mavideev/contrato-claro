# Spec 01 — Modelo de datos

**Estado:** borrador para validar · **Etapa:** 0 · **Fuente:** documento base §0.5, §7 y §11

## Objetivo

Definir el esquema inicial en Postgres (Drizzle + migraciones versionadas) que cubra cuentas, análisis, documentos, pagos, re-chequeos y el corpus normativo del RAG (las tablas se crean vacías).

## Convenciones

- Tablas y columnas en inglés, en `snake_case`. Ids `uuid` (`gen_random_uuid()`), salvo las tablas de Better Auth, que usan `text`.
- `created_at` y `updated_at` en todas las tablas (`timestamptz`).
- Todo dato de usuario cuelga de `user.id` con `on delete cascade`: al borrar la cuenta se borra todo. Los archivos en S3 se borran con un job (spec 05).
- **Acceso:** no hay RLS. Toda lectura y escritura de datos de usuario pasa por `lib/db/scoped.ts`, que exige `userId`. Si un id no pertenece al usuario, se responde 404 (no 403, para no revelar que existe).

## Tablas

### Cuentas (las genera Better Auth)
`user` (id, name, email unique, email_verified, image) · `session` · `account` (proveedor: credential, google) · `verification` (tokens de email, link mágico y recuperación).

### Producto

| Tabla | Columnas principales | Notas |
|---|---|---|
| `analyses` | user_id, contract_type `rental\|sale\|boleto`, status (ver abajo), signing_date `date` nullable, property_label, checklist_version, confirmed_fields `jsonb`, preview `jsonb` (conteos por nivel), error_code | `sale` y `boleto` existen en el enum pero la UI las muestra como «Próximamente» |
| `documents` | analysis_id, role `original\|recheck`, kind `photo\|pdf\|docx\|text`, mime, size_bytes, storage_key, page_count, sha256, delete_after, deleted_at | el texto pegado se guarda como objeto `text/plain` |
| `document_pages` | document_id, page_number, storage_key, width, height, blur_score | fotos: una fila por página |
| `clauses` | analysis_id, number, title, text, sha256, page_from, page_to | |
| `findings` | analysis_id, clause_id, level `high\|attention\|none`, title, explanation, what_to_ask, norm_version_id nullable | siempre referencia una cláusula (principio §15) |
| `fingerprints` | analysis_id unique, file_sha256, normalized_text_sha256, clause_hashes `jsonb` | se crea al desbloquear el informe |
| `rechecks` | analysis_id, document_id, payment_id, result `pending\|identical\|changed\|failed`, changes `jsonb`, certificate_key | |
| `payments` | user_id, analysis_id, kind `analysis\|recheck`, mp_preference_id, mp_payment_id unique nullable, status `pending\|approved\|rejected\|cancelled\|refunded`, amount_cents, currency `ARS` | el estado solo cambia desde el servidor |
| `payment_events` | provider, provider_event_id unique, type, payload `jsonb`, processed_at, error | idempotencia del webhook |
| `audit_log` | user_id nullable, action, target_type, target_id, ip, metadata `jsonb` | login, borrado, pago, descarga |

### Normativa (RAG, etapa 5)

| Tabla | Columnas principales |
|---|---|
| `norms` | code (p. ej. `CCCN`, `DNU-70-2023`), title, jurisdiction, source_url |
| `norm_versions` | norm_id, valid_from, valid_to nullable, status `draft\|reviewed\|published`, sha256, reviewed_by |
| `norm_chunks` | norm_version_id, article, text, embedding `vector(1024)`, metadata `jsonb` |

La primera migración ejecuta `create extension if not exists vector`. El índice HNSW sobre `embedding` se crea en la etapa 5, cuando se elija el modelo de embeddings (puede cambiar la dimensión).

### Estados de `analyses.status`

```
draft → extracting → awaiting_confirmation → preview_ready → (pago) paid → analyzing → ready
                ↘ failed            ↘ failed                              ↘ failed
```

- `draft`: creado y con archivos subiéndose.
- `awaiting_confirmation`: datos clave extraídos, esperando que el usuario los confirme.
- `preview_ready`: hay vista previa gratuita (conteos por nivel) y está esperando el pago.
- `paid`: el webhook confirmó el pago. Se encola el análisis completo.

Cómo se mapea al panel: `ready` → «Informe listo»; `ready` + signing_date = hoy → «Firma hoy»; `preview_ready` con pago `pending` → «Pago pendiente».

## Retención y borrado

- El contrato se guarda mientras exista la cuenta (decisión §0.5). `delete_after` queda nulo por defecto y se usará cuando el abogado defina un plazo.
- El borrado a pedido de un análisis borra las filas, programa el borrado de los objetos en S3 y deja registro en `audit_log`.

## Seed local

Un usuario demo (`demo@contratoclaro.local` / `demo12345`, verificado) con un análisis en cada estado del panel: «Informe listo», «Firma hoy» y «Pago pendiente». El de «Informe listo» incluye las 3 cláusulas con hallazgos del mockup, más 9 sin alertas. Un segundo usuario (`otro@contratoclaro.local`) permite probar el aislamiento entre cuentas.

## Criterios de aceptación

- [ ] `drizzle-kit migrate` sobre una base vacía crea todas las tablas y la extensión `vector`.
- [ ] El seed es idempotente: se puede correr dos veces sin errores.
- [ ] Borrar un `user` borra en cascada sus análisis, documentos, cláusulas, hallazgos, pagos y re-chequeos.
- [ ] Un test comprueba que `scoped(userB).analyses.get(idDeA)` devuelve `null`.
