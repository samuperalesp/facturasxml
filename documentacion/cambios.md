# Registro de Cambios

## v2.0.3 — Caché en memoria para JSON storage

### Optimización: reducción de 7 lecturas a 4 en carga inicial
- Implementado caché en memoria en `jsonStorage.ts` con deduplicación de lecturas concurrentes
- En frio: cada archivo se lee 1 sola vez (4 lecturas) en lugar de 7
- En caliente: 0 lecturas (todo servido desde caché)
- Las escrituras actualizan tanto el archivo como la caché atómicamente
- Se retorna copia de los datos para evitar mutaciones accidentales del caché

## v2.0.2 — Sub-pestañas en Reportes + Informe Ejecutivo

### UI: Botones ahora son filtros internos (sub-pestañas)
- Los botones "Compras sin Venta", "Ventas sin Compra", "Conciliadas", "Pendientes" e "Informe Mensual" ya no descargan Excel al hacer clic
- Ahora cambian dinámicamente el contenido de la tabla inferior usando estado React (`useState`)
- Cada sub-pestaña muestra columnas específicas según el tipo de datos
- El botón activo se resalta con fondo azul (`btn-outline.active`)
- No se recarga la aplicación, no cambia la URL, no abre nuevas pestañas
- El período seleccionado se conserva siempre

### Informe Mensual con vista previa en la app
- Al hacer clic en "Informe Mensual" se muestra una vista previa del reporte ejecutivo dentro de la aplicación
- La vista previa incluye las 4 secciones: Compras, Ventas, Resumen Financiero, Resumen de Conciliación
- Diseño profesional con colores corporativos (#1F4E79), filas de totales destacadas
- Botón "Exportar a Excel" que descarga el archivo generado por ExcelJS

### Nuevo executiveReportService.ts
- Creado `backend/src/services/executiveReportService.ts` con ExcelJS
- Genera informe ejecutivo profesional con:
  - DATOS GLOBALES DE COMPRAS: número facturas, valor total, descuento, total a pagar
  - DATOS GLOBALES DE VENTAS: número facturas, valor total, promedio, total a cobrar
  - RESUMEN FINANCIERO: total compras, total ventas, utilidad bruta, margen, conciliadas, pendientes
  - RESUMEN DE CONCILIACIÓN: compras conciliadas, compras pendientes, ventas sin compra, compras sin venta
- Diseño modular: cada sección es una función independiente registrada en array `SECTIONS`
- Formato: encabezados corporativos azules, bordes, formato moneda COP, porcentajes, autoajuste
- Nuevo endpoint `GET /api/reportes/informe-mensual?mes=X&anio=Y`
- Nombre de archivo: `Informe_Mensual_Mayo_2026.xlsx`

### Depuración temporal
- Creado `backend/src/storage/storageDebug.ts` con contador global de operaciones
- Muestra en consola: 📖 READ #N -> archivo (tiempo ms) + función solicitante
- Muestra en consola: ✍️ WRITE #N -> archivo (tiempo ms) + función solicitante
- Resumen automático después de cada operación
- Código marcado como TEMPORARY para fácil eliminación antes de producción

## v2.0.1 — Storage Facade (Firebase opcional)

### Corrección: Firebase no bloquea el arranque sin configuración
- Creado `backend/src/storage/index.ts` como fachada (facade) que selecciona automáticamente entre JSON y Firestore según `config.storageType`
- Si no hay credenciales Firebase, el sistema usa JSON local sin necesidad de configuración
- Las rutas importan desde `../storage/index.js` en vez de `firebaseStorage.js` directamente
- `loadConfig().storageType` default es `"json"` cuando no hay `config.json` ni `STORAGE_TYPE` env

## v2.0.0 — Arquitectura Read-Optimized + Firebase Firestore

### Almacenamiento
- Migrado de JSON local a **Firebase Firestore** como sistema de persistencia principal
- Creado `backend/src/storage/firebaseStorage.ts` con operaciones CRUD optimizadas
- Creado `backend/src/config.ts` para cargar credenciales Firebase desde env/config.json
- Creado `backend/.env.example` con template de configuración

### Documentos Resumen por Período (Read-Optimized)
- Nueva colección `summaries/{periodo}` con KPIs pre-calculados por mes-año
  - `totalCompras`, `totalVentas`, `totalConciliado`, `totalPendiente`
  - `countCompras`, `countVentas`, `countConciliadas`, `countPendientes`
- Nueva colección `reports/{periodo}` con reportes pre-calculados por mes-año
  - `conciliaciones`, `comprasSinVenta`, `ventasSinCompra`, `conciliadas`, `pendientes`
  - `totalCompra`, `totalVenta`, `diferencia`
- Los summaries se actualizan automáticamente al importar o conciliar datos
- El endpoint `/api/resumen` lee 1 documento en vez de recalcular desde 3 colecciones

### Nuevos Servicios
- `backend/src/services/summaryService.ts` — Lógica de pre-cálculo:
  - `recalculateSummary(periodo)` — Recalcula KPIs para un período
  - `recalculateReport(periodo)` — Recalcula reportes para un período
  - `recalculateAllForConciliaciones(items)` — Actualiza todos los períodos afectados
  - `recalculateAllForInvoices(items)` — Actualiza summaries de facturas nuevas

### Modelos
- Agregado campo `periodo?: string` a `Invoice` y `Conciliation`
- Agregadas interfaces `PeriodSummary` y `PeriodReport`

### Dashboard (1 consulta vs 3+)
- Antes: `/resumen` leía 3 archivos JSON y filtraba en memoria
- Ahora: `/resumen` lee 1 documento `summaries/{periodo}` pre-calculado

### Flujo de Datos
```
Importar XML → parseInvoice() → saveInvoices() → recalculateAllForInvoices()
Conciliar    → reconcile() → saveConciliaciones() → recalculateAllForConciliaciones()
Dashboard    → getSummary(periodo) → 1 lectura Firestore
```

## v1.3.0 — Corrección de Período en KPIs y Reportes

### Bug fix: indicadores mezclaban datos de todos los períodos
- Las tarjetas "Conciliadas" y "Pendientes" mostraban totales históricos sin filtrar por mes/año
- Corregido en backend `routes/datos.ts`: las conciliaciones ahora se filtran por período en `/resumen`
- Corregido en frontend `App.tsx`: `getConciliaciones()` ahora recibe `(m, a)` para filtrar desde la consulta

## v1.2.1 — Mejoras de Interfaz (UI)

### Reubicación de botones de acción
- Los botones "Cargar XML Compras", "Cargar XML Ventas" y "Conciliar Información" movidos a la misma línea que el selector de Período
- Distribución: Período a la izquierda, botones a la derecha con Flexbox `justify-between`

### Pestaña inicial cambiada a Reportes
- La aplicación ahora abre siempre en la pestaña "Reportes" en vez de "Compras"

### Eliminada barra de filtros de Reportes
- Eliminados los filtros de estado, proveedor, cliente y paciente
- Reemplazados por botones de exportación directa con contadores

### Tarjetas KPI rediseñadas
- Ahora muestran valor monetario total como dato principal y cantidad de facturas como secundario
- Iconos Lucide React: `FileText` (Compras), `Receipt` (Ventas), `BadgeCheck` (Conciliadas), `TriangleAlert` (Pendientes)
- Tarjetas más compactas con sombras suaves

### Reportes rediseñados
- Botones de exportación en fila horizontal con contadores por tipo
- Tabla única con todos los datos del período debajo de los botones
- Resumen visual de compras/ventas/diferencia a la derecha

### Espaciado optimizado
- Reducido el espacio vertical entre secciones
- Aumentado el ancho máximo del contenedor de 1400px a 1600px

## v1.2.0 — Reestructuración del Proyecto (frontend/ + backend/)

### Cambios en la Estructura
- Creada carpeta `frontend/` con todos los archivos del frontend:
  - Movido `src/`, `public/`, `index.html`, `vite.config.ts`, `tsconfig*.json`, `package.json`, `node_modules/`
  - Movido `.oxlintrc.json`
- Renombrado `server/` → `backend/` (todo el backend)
- Creado `package.json` raíz con scripts de orquestación:
  ```json
  "dev": "concurrently -n front,back -c blue,green \"npm run dev --prefix frontend\" \"npm run dev --prefix backend\""
  ```
- Eliminados archivos huérfanos: `dist/` raíz, `server.log`

### Corrección de Scripts
- Los scripts de orquestación usan `--prefix` en vez de `cd <dir> && <comando>` para resolver correctamente los binarios locales (evita errores `vite: not found`, `tsx: not found`)
- `npm run dev` desde la raíz arranca ambos servidores simultáneamente
- `npm run dev:front` arranca solo el frontend (Vite, puerto 5173)
- `npm run dev:back` arranca solo el backend (Express, puerto 3001)
- `npm run build` compila ambos proyectos

### Actualización de Referencias Internas
- `backend/src/index.ts`: la ruta a `frontend/dist` sigue igual (`../../frontend/dist`) porque `__dirname` cambió de `server/` a `backend/` pero la profundidad es la misma
- `backend/src/storage/jsonStorage.ts`: `STORAGE_DIR` usa `process.cwd()` que al ejecutarse desde `backend/` resuelve `../storage` → raíz/storage/ correctamente

## v1.1.0 — Corrección del Motor de Conciliación y Extracción de Pacientes

### Cambios en el Parser de Pacientes (`patientParser.ts`)
- Corregido regex de `ID:` a `ID:?` (colon opcional) — las notas reales usan `ID ` sin dos puntos
- Agregado soporte para prefijos alfabéticos en documentos: `ID PT 5039013` → documento `5039013`
- Agregado soporte para `PAC` sin dos puntos: `PAC DEINNA...` además de `PAC: DEINNA...`
- Agregado fallback para `I D` con espacio (typo común: `I D1029987544` en vez de `ID1029987544`)
- Agregado `replace(/\D/g, '')` en todos los documentos extraídos
- Agregada extracción de nombre cuando el patrón principal falla pero el documento se encuentra por fallback
- Aumentado mínimo de dígitos en fallback de 5 a 6

### Cambios en el Motor de Conciliación (`reconciliationService.ts`)
- Eliminado sistema de puntajes
- Reemplazado por regla única: si el documento del paciente coincide → `conciliada`

### Nuevos campos
- `puntaje: number` y `motivo: string` en modelo Conciliation
- Columnas **Puntaje** y **Motivo** en UI y exportación Excel

### Resultados de Prueba (63 compras + 63 ventas)
- **0** documentos sin extraer, **62/63** compras conciliadas

## v1.0.0 — MVP Inicial

### Implementado
- Proyecto inicial con React + Vite + TypeScript
- Backend con Express + TypeScript
- Parseo de XML DIAN UBL 2.1
- Extracción automática de paciente desde notas del XML
- Almacenamiento en archivos JSON
- Interfaz con pestañas, tablas, exportación Excel, reportes
- Diseño minimalista tipo Notion/Linear
