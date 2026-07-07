# Estructura del Proyecto

## Diagrama de Directorios

```
Facturas Xml/
│
├── package.json                     # Scripts de orquestación (raíz)
├── .gitignore
│
├── frontend/                        # Frontend (React + Vite + TypeScript)
│   ├── package.json                 # Dependencias y scripts del frontend
│   ├── vite.config.ts               # Configuración de Vite + proxy /api
│   ├── index.html
│   ├── tsconfig.json                # Referencias a tsconfig.app.json + tsconfig.node.json
│   ├── tsconfig.app.json
│   ├── tsconfig.node.json
│   ├── .oxlintrc.json
│   ├── public/
│   │   └── favicon.svg
│   ├── src/
│   │   ├── main.tsx                 # Entry point de React
│   │   ├── App.tsx                  # Componente principal
│   │   ├── index.css                # Estilos globales
│   │   ├── models/
│   │   │   ├── invoice.ts           # Interfaces Invoice, Conciliation
│   │   │   └── config.ts            # Interface AppConfig
│   │   ├── services/
│   │   │   └── api.ts               # Cliente HTTP para el backend
│   │   ├── utils/
│   │   │   └── formatters.ts        # Formateo de moneda/fechas
│   │   ├── components/              # (disponible para componentes)
│   │   ├── pages/                   # (disponible para páginas)
│   │   └── styles/                  # (disponible para estilos)
│   └── dist/                        # Build de producción (generado)
│
├── backend/                         # Backend (Express + TypeScript)
│   ├── package.json                 # Dependencias y scripts del backend
│   ├── tsconfig.json
│   ├── .env.example                 # Template de configuración Firebase
│   ├── src/
│   │   ├── config.ts                # Carga de configuración (Firebase / env)
│   │   ├── index.ts                 # Punto de entrada del servidor Express
│   │   ├── models/
│   │   │   └── invoice.ts           # Tipos: Invoice, Conciliation, AppConfig, PeriodSummary, PeriodReport
│   │   ├── routes/
│   │   │   ├── facturas.ts          # Importación de XML (Firestore + summary)
│   │   │   ├── conciliacion.ts      # Conciliación (Firestore + summary+report)
│   │   │   ├── reportes.ts          # Lista Maestra y Reportes (Firestore + period report)
│   │   │   └── datos.ts             # Consultas y resumen (lectura optimizada desde summaries)
│   │   ├── services/
│   │   │   ├── xmlParser.ts              # Parseo de XML DIAN
│   │   │   ├── reconciliationService.ts  # Motor de conciliación
│   │   │   ├── excelExportService.ts     # Exportación a Excel (xlsx-js-style)
│   │   │   ├── patientParser.ts          # Extracción de datos del paciente
│   │   │   ├── summaryService.ts         # Pre-cálculo de summaries y reports por período
│   │   │   └── executiveReportService.ts # Informe ejecutivo mensual (ExcelJS)
│   │   └── storage/
│   │       ├── index.ts             # Fachada: selecciona json o firebase según config
│   │       ├── jsonStorage.ts       # Persistencia en archivos JSON (fallback/default) + caché en memoria
│   │       ├── firebaseStorage.ts   # Persistencia en Firebase Firestore (producción)
│   │       └── storageDebug.ts      # Depuración temporal: contador de lecturas/escrituras
│   └── dist/                        # Compilación TypeScript (generado)
│
└── documentacion/                   # Documentación
    ├── cambios.md
    ├── estructuras.md
    ├── manuales.md
    └── mejoras.md
```

## Scripts de Orquestación (package.json raíz)

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Arranca frontend + backend simultáneamente |
| `npm run dev:front` | Solo frontend (Vite, puerto 5173) |
| `npm run dev:back` | Solo backend (Express, puerto 3001) |
| `npm run build` | Compila frontend y backend para producción |

Usan `--prefix` para ejecutar los scripts de cada subproyecto sin depender del PATH.

## Estructura de Datos

### Invoice (Factura)
```typescript
interface Invoice {
  id: string                    // factura_fecha
  factura: string               // Número de factura
  fecha: string                 // Fecha de emisión
  proveedor?: string            // Nombre del proveedor (compra)
  cliente?: string              // Nombre del cliente (venta)
  nitProveedor?: string         // NIT del proveedor
  nitCliente?: string           // NIT del cliente
  paciente: string              // Nombre del paciente (extraído de nota XML)
  documentoPaciente: string     // Documento de identidad (extraído de nota XML)
  medico?: string               // Médico tratante (extraído de nota XML)
  valor: number                 // Valor total
  tipo: 'compra' | 'venta'     // Tipo de factura
  cufe?: string                 // CUFE de la factura
  importada: string             // Fecha de importación
  periodo?: string              // "YYYY-MM" (para Firestore)
}
```

### Conciliation (Conciliación)
```typescript
interface Conciliation {
  id: string
  facturaCompra: string
  facturaVenta: string
  paciente: string
  documentoPaciente: string
  proveedor: string
  cliente: string
  valorCompra: number
  valorVenta: number
  diferencia: number
  estado: 'conciliada' | 'revisar' | 'pendiente'
  fechaCompra: string
  fechaVenta: string
  puntaje: number              // 100 si concilia, 0 si pendiente
  motivo: string               // Explicación textual del resultado
  periodo?: string              // "YYYY-MM" (para Firestore)
}
```

### PeriodSummary (Resumen pre-calculado por período)
```typescript
interface PeriodSummary {
  periodo: string               // "YYYY-MM"
  mes: number
  anio: number
  totalCompras: number          // Valor total de compras del período
  totalVentas: number           // Valor total de ventas del período
  totalConciliado: number       // Valor total conciliado del período
  totalPendiente: number        // Valor pendiente del período
  countCompras: number          // Cantidad de facturas de compra
  countVentas: number           // Cantidad de facturas de venta
  countConciliadas: number      // Conciliaciones completadas
  countPendientes: number       // Pendientes de conciliar
  updatedAt: string
}
```

### PeriodReport (Reporte pre-calculado por período)
```typescript
interface PeriodReport {
  periodo: string               // "YYYY-MM"
  mes: number
  anio: number
  conciliaciones: Conciliation[]
  comprasSinVenta: Conciliation[]
  ventasSinCompra: Conciliation[]
  conciliadas: Conciliation[]
  pendientes: Conciliation[]
  totalCompra: number
  totalVenta: number
  diferencia: number
  updatedAt: string
}
```

### AppConfig
```typescript
interface AppConfig {
  nitEmpresa: string            // NIT de la empresa
  nombreEmpresa: string         // Razón social
}
```

## Motor de Conciliación

Regla única: si el documento del paciente coincide entre una compra y una venta → `conciliada`. Si no → `pendiente` con motivo explicativo.

### Formato de Motivos
- `"Documento paciente 1121923249 coincide"`
- `"Documento: 20896004. Paciente: ANATILDE MALAVER PALACIOS. No se encontró venta con el mismo documento"`
- `"No se pudo extraer información del paciente del XML"`

## Arquitectura Read-Optimized (Firestore)

### Colecciones Firestore

| Colección | Documento | Propósito |
|-----------|-----------|-----------|
| `invoices/{id}` | `Invoice` | Facturas individuales |
| `conciliaciones/{id}` | `Conciliation` | Conciliaciones individuales |
| **`summaries/{periodo}`** | `PeriodSummary` | **KPIs pre-calculados por mes-año (1 lectura)** |
| **`reports/{periodo}`** | `PeriodReport` | **Reportes pre-calculados por mes-año (1 lectura)** |
| `config/app` | `AppConfig` | Configuración global |

### Estrategia

```
IMPORTAR → saveInvoices() → recalculateAllForInvoices() → summaries/{periodo}
CONCILIAR → saveConciliaciones() → recalculateAllForConciliaciones() → summaries/{periodo} + reports/{periodo}
DASHBOARD → getSummary(periodo) → 1 documento Firestore
```

### Configuración Firebase

Crear `backend/config.json` o usar variables de entorno:

```json
{
  "storageType": "firestore",
  "firebase": {
    "projectId": "tu-proyecto",
    "clientEmail": "firebase-adminsdk@...iam.gserviceaccount.com",
    "privateKey": "-----BEGIN PRIVATE KEY-----\n..."
  }
}
```

O usar `GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json`.

### Persistencia Legacy (JSON)

El directorio `storage/` contiene datos JSON del almacenamiento anterior. Ya no se usa si Firebase está configurado.

Desde v2.0.3, `jsonStorage.ts` incluye una **caché en memoria** con deduplicación de lecturas concurrentes:
- Cada archivo se lee del disco una sola vez y se almacena en un `Map<string, CacheEntry>`
- Escrituras actualizan archivo + caché atómicamente
- Se retornan copias (spread) para evitar mutaciones accidentales del caché
- En carga inicial: 4 lecturas (una por archivo) vs 7 antes de la caché

## API REST

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/facturas/importar?tipo=compra\|venta` | Importar XML |
| POST | `/api/conciliar` | Ejecutar conciliación |
| GET | `/api/compras?mes=&anio=` | Listar compras |
| GET | `/api/ventas?mes=&anio=` | Listar ventas |
| GET | `/api/conciliaciones?mes=&anio=` | Listar conciliaciones |
| GET | `/api/lista-maestra?mes=&anio=&exportar=true` | Lista Maestra (usa `reports/{periodo}` si existe) |
| GET | `/api/reportes/:tipo?mes=&anio=&exportar=true` | Reportes (filtrado en servidor) |
| GET | `/api/reportes/informe-mensual?mes=&anio=` | Informe ejecutivo mensual (ExcelJS) |
| GET | `/api/resumen?mes=&anio=` | Resumen de tarjetas (1 lectura `summaries/{periodo}`) |
| GET | `/api/config` | Configuración |

## Proxy de Vite

`frontend/vite.config.ts` redirige `/api/*` a `http://localhost:3001`:

```typescript
proxy: {
  '/api': {
    target: 'http://localhost:3001',
    changeOrigin: true,
  },
}
```

## Extracción de Paciente (patientParser.ts)

### Formatos Soportados
- `PAC: NOMBRE - ID 123456- DR: ...`
- `PAC: NOMBRE- ID: 123456-\nDR: ...`
- `PAC DEINNA...- ID 123456-\nDR: ...` (sin colon después de PAC)
- `PAC NOMBRE - ID PT 123456-\nDR: ...` (prefijo de letras en documento)
- `Paciente: NOMBRE- ID: 123456- DR: ...`
- `PACIENTE: NOMBRE- ID: 123456-\n...`
- `PAC:_ NOMBRE- ID 123456-\nDR:...` (underscore)
- `I D123456` (typo: espacio entre I y D)

### Limpieza
- Documento: `.replace(/\D/g, '')` elimina todo caracter no numérico
- Nombre: se limpian sufijos como `-ID`, `-I D`, `-DR` en el fallback

## Exportación a Excel

- Lista Maestra: 14 columnas (incluye Puntaje y Motivo)
- Reportes con filtros exportables
- Encabezados con color azul, autoajuste de columnas, fila de totales
- Formato moneda colombiana (COP), fechas en formato local `es-CO`
