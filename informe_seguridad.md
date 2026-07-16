# INFORME DE AUDITORÍA DE SEGURIDAD

**Proyecto:** Facturas XML  
**Fecha:** 09/07/2026  
**Tipo:** Auditoría estática de código  
**Puntaje general:** 45/100 — No apto para producción

---

## CRÍTICO

### C01 — Datos PII en git (storage/*.json)

| Campo | Detalle |
|-------|---------|
| **Archivo** | `storage/compras.json`, `storage/ventas.json`, `storage/conciliaciones.json` |
| **Línea** | Todo el archivo |
| **Descripción** | Nombres de pacientes, cédulas, datos financieros están commiteados en git. `git ls-files storage/` confirma que todos están trackeados. |
| **Riesgo** | CRÍTICO — Violación de Ley 1581 (Habeas Data), posible breach notificable |
| **Impacto** | Cualquier persona con acceso al repo puede extraer datos personales y financieros de pacientes |
| **Explotación** | `git clone <repo>` → `cat storage/compras.json` |
| **Mitigación** | `git rm --cached storage/*.json`, agregar `storage/*.json` a `.gitignore`, rotar repo si es público |

### C02 — Credenciales Firebase no protegidas en .gitignore

| Campo | Detalle |
|-------|---------|
| **Archivo** | `.gitignore` (raíz) |
| **Línea** | — |
| **Descripción** | No se excluyen `service-account-key.json`, `config.json` (backend), `.env`, `*.pem`, `*credential*`. La documentación instruye a colocar service account key en el proyecto. |
| **Riesgo** | CRÍTICO — Filtración de clave de servicio Firebase = acceso total a Firestore |
| **Impacto** | Si alguien commitea un archivo de credenciales, un atacante tiene control total de la base de datos |
| **Explotación** | `git add service-account-key.json && git push` (accidental) |
| **Mitigación** | Agregar: `service-account-key.json`, `config.json`, `.env`, `*.pem`, `*credential*` al `.gitignore` |

### C03 — Firebase init sin manejo de errores

| Campo | Detalle |
|-------|---------|
| **Archivo** | `backend/src/storage/firebaseStorage.ts` |
| **Línea** | 8-30 |
| **Descripción** | `getDb()` no tiene try/catch. Si `STORAGE_TYPE=firestore` y las credenciales son inválidas, la excepción no se captura. |
| **Riesgo** | CRÍTICO — Server crash sin mensaje claro |
| **Impacto** | El servidor falla al iniciar sin indicar la causa |
| **Explotación** | Configurar `STORAGE_TYPE=firestore` sin credenciales válidas |
| **Mitigación** | Envolver `getDb()` en try/catch, fallar con mensaje claro |

### C04 — Sin reglas de seguridad en Firestore

| Campo | Detalle |
|-------|---------|
| **Archivo** | No existe `firestore.rules` |
| **Línea** | — |
| **Descripción** | Usando Admin SDK que bypassea reglas, pero no hay defensa en profundidad. Si la credencial admin se filtra, acceso total a la base de datos. |
| **Riesgo** | CRÍTICO — Sin defensa en profundidad |
| **Impacto** | Atacante con la clave de servicio tiene acceso total a Firestore |
| **Mitigación** | Crear `firestore.rules` denegando todo acceso desde clientes web |

---

## ALTO

### A01 — console.log expone stack traces internos

| Campo | Detalle |
|-------|---------|
| **Archivo** | `backend/src/storage/storageDebug.ts:39-56`, `backend/src/services/xmlParser.ts:211`, múltiples rutas |
| **Descripción** | `storageDebug.ts` logea cada operación de storage con stack trace del caller y timings. En Vercel estos logs son accesibles en el dashboard. |
| **Riesgo** | ALTO — Exposición de estructura interna del proyecto |
| **Impacto** | Atacante con acceso a logs de Vercel conoce rutas internas, patrones de acceso, tiempos de respuesta |
| **Mitigación** | Eliminar `storageDebug.ts`, reemplazar `console.error(e)` con logger estructurado sin stack traces completos |

### A02 — Sin validación de tipo MIME ni extensión en upload

| Campo | Detalle |
|-------|---------|
| **Archivo** | `backend/src/routes/facturas.ts` |
| **Línea** | 48-49 |
| **Descripción** | Backend no valida `file.mimetype` ni `file.originalname`. Solo el frontend tiene `accept=".xml"` (bypasseable). Cualquier archivo es parseado como UTF-8. |
| **Riesgo** | ALTO — Subida de archivos arbitrarios |
| **Impacto** | Atacante puede subir binarios, HTML, o XML malicioso |
| **Mitigación** | Validar `file.mimetype === 'text/xml'`, extensión `.xml`, pre-validación de contenido |

### A03 — Caché en memoria sin aislamiento entre requests (Vercel)

| Campo | Detalle |
|-------|---------|
| **Archivo** | `backend/src/storage/jsonStorage.ts` |
| **Línea** | 12-76 |
| **Descripción** | El `Map` de caché es global al proceso. En Vercel, una misma instancia Lambda puede atender múltiples requests. Datos de un usuario pueden servirse a otro. |
| **Riesgo** | ALTO — Fuga de datos entre sesiones/usuarios |
| **Impacto** | Datos del usuario A pueden ser devueltos al usuario B si comparten instancia Lambda |
| **Mitigación** | Eliminar caché persistente o asociarla a un identificador único de request |

### A04 — Sin rate limiting ni límite de concurrencia

| Campo | Detalle |
|-------|---------|
| **Archivo** | Todo el proyecto |
| **Línea** | — |
| **Descripción** | No hay rate limiting. `/conciliar` ejecutable repetidamente. `/importar` acepta hasta 200 archivos de 10MB (2GB por request). |
| **Riesgo** | ALTO — DoS por resource exhaustion |
| **Impacto** | Atacante puede saturar CPU/memoria con requests repetidos |
| **Mitigación** | Agregar `express-rate-limit` en rutas POST, validar concurrencia |

### A05 — Sin cabeceras de seguridad en Vercel (frontend estático)

| Campo | Detalle |
|-------|---------|
| **Archivo** | `vercel.json` |
| **Línea** | — |
| **Descripción** | No hay bloque `headers`. Helmet solo aplica a API. Assets estáticos servidos por CDN Vercel no tienen CSP, HSTS, X-Frame-Options, X-Content-Type-Options. |
| **Riesgo** | ALTO — Clickjacking, MIME-sniffing, XSS en browsers antiguos |
| **Impacto** | App puede ser embebida en iframe malicioso. Navegadores pueden interpretar archivos incorrectamente. |
| **Mitigación** | Agregar bloque `"headers"` en `vercel.json` con CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Permissions-Policy, Referrer-Policy |

---

## MEDIO

### M01 — Puerto hardcodeado

| Campo | Detalle |
|-------|---------|
| **Archivo** | `backend/src/index.ts:14` |
| **Descripción** | `const PORT = 3001` debería ser `process.env.PORT \|\| 3001` |
| **Riesgo** | MEDIO — Inflexibilidad en deployments |
| **Mitigación** | Usar variable de entorno |

### M02 — Catch-all en backend sin 404

| Campo | Detalle |
|-------|---------|
| **Archivo** | `backend/src/index.ts:30-32` |
| **Descripción** | `app.get('*', ...)` sirve index.html para cualquier ruta, incluyendo `/config.json`, `/secret`. No hay error 404. |
| **Riesgo** | MEDIO — Enmascara intentos de acceso a rutas internas |
| **Mitigación** | Retornar 404 para rutas API no definidas |

### M03 — Sin sanitización de parámetros query

| Campo | Detalle |
|-------|---------|
| **Archivo** | `backend/src/routes/reportes.ts:72-76`, `backend/src/routes/datos.ts:8-9` |
| **Descripción** | `mes`, `anio`, `proveedor`, `cliente` sin validación. `Number()` produce NaN, strings sin maxLength. |
| **Riesgo** | MEDIO — NaN causa filtros silenciosamente vacíos |
| **Mitigación** | Validar `mes` entero 1-12, `anio` 4 dígitos, strings con `maxLength` |

### M04 — Errores tragados silenciosamente

| Campo | Detalle |
|-------|---------|
| **Archivo** | `jsonStorage.ts:62-65`, `facturas.ts:61-63`, `xmlParser.ts:210-213` |
| **Descripción** | `catch {}` o `catch { return defaultValue }` retorna datos vacíos sin alertar. Datos corruptos pasan desapercibidos. |
| **Riesgo** | MEDIO — Datos corruptos no detectados |
| **Mitigación** | Loggear warnings, devolver errores 500 cuando corresponda |

### M05 — Dependencia xlsx-js-style desactualizada

| Campo | Detalle |
|-------|---------|
| **Archivo** | `backend/package.json:20` |
| **Descripción** | `xlsx-js-style@1.2.0` (fork SheetJS 0.18.5) sin updates desde 2022. Hereda CVE-2023-30533 (Prototype Pollution) y CVE-2024-22363 (ReDoS). |
| **Riesgo** | MEDIO — Prototype Pollution al procesar XLSX malicioso |
| **Mitigación** | Migrar a `xlsx@0.20.3` + librería de estilos aparte |

### M06 — Sin validación de fechas

| Campo | Detalle |
|-------|---------|
| **Archivo** | `reconciliationService.ts:16`, `reportes.ts:46`, múltiples |
| **Descripción** | `new Date(invalidString)` produce `Invalid Date`, `getTime()` retorna `NaN`. Comparaciones con `NaN` siempre false. |
| **Riesgo** | MEDIO — Datos con fechas inválidas se filtran silenciosamente |
| **Mitigación** | Validar con `isNaN(d.getTime())` antes de usar |

### M07 — Dependencia xlsx via CDN directo

| Campo | Detalle |
|-------|---------|
| **Archivo** | `backend/package.json:19`, `frontend/package.json:16` |
| **Descripción** | `xlsx` se instala desde tarball URL directo (`cdn.sheetjs.com`). No pasa por npm registry ni audit. |
| **Riesgo** | MEDIO — Supply chain risk: el CDN podría servir versión maliciosa |
| **Mitigación** | Mirror interno o usar npm registry |

---

## BAJO

### B01 — Sin autenticación ni autorización

| Campo | Detalle |
|-------|---------|
| **Descripción** | Cualquiera con la URL puede importar facturas, conciliar, acceder a datos |
| **Riesgo** | BAJO (alcance auditoría actual), ALTO (producción) |
| **Mitigación** | Agregar auth (JWT/sesión) y RBAC |

### B02 — CORS con origins de desarrollo

| Campo | Detalle |
|-------|---------|
| **Archivo** | `backend/src/index.ts:17-20` |
| **Descripción** | `origin: ['http://localhost:5173', 'http://localhost:3001']`. No incluye dominio de producción. |
| **Riesgo** | BAJO — En Vercel frontend y API mismo dominio, CORS no aplica |
| **Mitigación** | Variable de entorno para origin de producción |

### B03 — Código de depuración temporal (TEMPORARY flags)

| Campo | Detalle |
|-------|---------|
| **Archivo** | `jsonStorage.ts:5,77`, `storageDebug.ts` |
| **Descripción** | Código marcado como TEMPORARY que logea operaciones con emojis y stack traces |
| **Riesgo** | BAJO — Fuga de información interna, impacto en rendimiento |
| **Mitigación** | Eliminar antes de producción |

### B04 — .gitignore incompleto

| Campo | Detalle |
|-------|---------|
| **Archivo** | `.gitignore` |
| **Descripción** | No excluye `.env` ni `.env.*` |
| **Riesgo** | BAJO — Riesgo de commit accidental de `.env` real |
| **Mitigación** | Agregar `.env` y `.env.*` al `.gitignore` |

### B05 — Express 4.x con CVE-2024-10491

| Campo | Detalle |
|-------|---------|
| **Archivo** | `backend/package.json:14` |
| **Descripción** | CVE-2024-10491 (MEDIUM 4.0) — Resource injection en `res.links()`. No parcheado en 4.x. |
| **Riesgo** | BAJO — Solo explotable si se usa `res.links()`. No se usa en el proyecto. |
| **Mitigación** | Migrar a Express 5.x |

### B06 — Firebase privateKey con replace frágil

| Campo | Detalle |
|-------|---------|
| **Archivo** | `firebaseStorage.ts:21` |
| **Descripción** | `privateKey.replace(/\\n/g, '\n')` frágil si el formato de la env var cambia. |
| **Riesgo** | BAJO — Key malformada si el escaping es inconsistente |
| **Mitigación** | Usar `GOOGLE_APPLICATION_CREDENTIALS` apuntando a archivo JSON |

---

## INFORMATIVO

### I01 — 12x console.error(e) esparcidos

| Archivos | `facturas.ts:19`, `datos.ts:13`, `reportes.ts:23`, `conciliacion.ts:19` y más |
|----------|---------|
| **Detalle** | Cada catch imprime error completo con stack trace |

### I02 — Helmet usa defaults sin CSP personalizado

| Archivo | `backend/src/index.ts:16` |
|---------|--------------------------|
| **Detalle** | `app.use(helmet())` con configuración default. CSP no adaptado a recursos de la app. |

### I03 — Multer sin fieldNestingDepth

| Archivo | `routes/facturas.ts:10-17` |
|---------|----------------------------|
| **Detalle** | Multer 2.2.0 soporta `limits.fieldNestingDepth`. No configurado, default permite nesting profundo. |

---

## Resumen de hallazgos

| Severidad | Cantidad |
|-----------|----------|
| CRÍTICO | 4 |
| ALTO | 5 |
| MEDIO | 7 |
| BAJO | 6 |
| INFORMATIVO | 3 |
| **Total** | **25** |

## Nivel de seguridad por ámbito

| Ámbito | Puntaje | Riesgo |
|--------|---------|--------|
| **Producción real** | 30/100 | ALTO |
| **Auditoría actual** | 60/100 | MEDIO |
| **Vercel** | 50/100 | MEDIO |
| **Firebase futuro** | 35/100 | ALTO |
| **Datos sensibles** | 20/100 | CRÍTICO |

## Principales riesgos

1. Datos PII de pacientes (nombres + cédulas) ya están en git público
2. Sin autenticación — cualquiera con la URL accede a todo
3. Credenciales Firebase pueden filtrarse fácilmente
4. Sin cabeceras de seguridad en Vercel
5. Sin rate limiting — DoS factible
6. Caché global en Vercel puede mezclar datos entre usuarios