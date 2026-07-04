# Estructura del Proyecto

## Diagrama de Directorios

```
Facturas Xml/
│
├── server/                          # Backend
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts                 # Punto de entrada del servidor Express
│       ├── models/
│       │   └── invoice.ts           # Tipos: Invoice, Conciliation, AppConfig
│       ├── routes/
│       │   ├── facturas.ts          # Importación de XML
│       │   ├── conciliacion.ts      # Conciliación
│       │   ├── reportes.ts          # Lista Maestra y Reportes
│       │   └── datos.ts             # Consultas y resumen
│       ├── services/
│       │   ├── xmlParser.ts         # Parseo de XML DIAN
│       │   ├── reconciliationService.ts  # Motor de conciliación
│       │   ├── excelExportService.ts     # Exportación a Excel
│       │   └── patientParser.ts     # Extracción de datos del paciente
│       └── storage/
│           └── jsonStorage.ts       # Persistencia en archivos JSON
│
├── src/                             # Frontend
│   ├── main.tsx                     # Entry point de React
│   ├── App.tsx                      # Componente principal
│   ├── index.css                    # Estilos globales
│   ├── models/
│   │   ├── invoice.ts               # Interfaces compartidas
│   │   └── config.ts                # Configuración
│   ├── services/
│   │   └── api.ts                   # Cliente HTTP para el backend
│   └── utils/
│       └── formatters.ts            # Formateo de moneda/fechas
│
├── storage/                         # Datos persistentes (JSON)
│   ├── compras.json
│   ├── ventas.json
│   ├── conciliaciones.json
│   └── config.json
│
├── documentacion/                   # Documentación
│   ├── cambios.md
│   ├── estructuras.md
│   ├── manuales.md
│   └── mejoras.md
│
├── package.json                     # Scripts del frontend
├── vite.config.ts                   # Configuración de Vite + proxy
├── tsconfig.json
└── index.html
```

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

El motor funciona con **reglas secuenciales** (en orden de prioridad):

1. **Documento del paciente coincide** → estado `conciliada`, motivo descriptivo
2. **Sin coincidencia de documento** → estado `pendiente` con explicación

Ya no utiliza puntajes, fechas, nombres ni valores para determinar el estado.

### Formato de Motivos
- Conciliada: `"Documento paciente 1121923249 coincide"`
- Pendiente (compra): `"Documento: 1121923249. Paciente: JUAN PEREZ. No se encontró venta con el mismo documento"`
- Pendiente (venta sin datos): `"No se pudo extraer información del paciente del XML"`

## API REST

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/facturas/importar?tipo=compra\|venta` | Importar XML |
| POST | `/api/conciliar` | Ejecutar conciliación |
| GET | `/api/compras?mes=&anio=` | Listar compras |
| GET | `/api/ventas?mes=&anio=` | Listar ventas |
| GET | `/api/conciliaciones?mes=&anio=` | Listar conciliaciones |
| GET | `/api/lista-maestra?mes=&anio=&exportar=true` | Lista Maestra |
| GET | `/api/reportes/:tipo?mes=&anio=&exportar=true` | Reportes |
| GET | `/api/resumen?mes=&anio=` | Resumen de tarjetas |
| GET | `/api/config` | Configuración |

## Extracción de Paciente (patientParser.ts)

El parser extrae nombre y documento del paciente desde la nota (`cbc:Note`) del XML DIAN.

### Formatos Soportados
- `PAC: NOMBRE - ID 123456- DR: ...`
- `PAC: NOMBRE- ID: 123456-\nDR: ...`
- `PAC DEINNA...- ID 123456-\nDR: ...`
- `PAC NOMBRE - ID PT 123456-\nDR: ...` (con prefijo de letras en documento)
- `Paciente: NOMBRE- ID: 123456- DR: ...`
- `PACIENTE: NOMBRE- ID: 123456-\n...`
- `PAC:_ NOMBRE- ID 123456-\nDR:...` (con underscore después de PAC)
- `I D123456` (typo común con espacio entre I y D)

### Limpieza
- El documento se limpia con `.replace(/\D/g, '')` para eliminar cualquier caracter no numérico
- El nombre se trima y se limpia de sufijos como `-ID`, `-I D`, `-DR` en el fallback
- Si ningún patrón coincide, se usa el texto de la nota como nombre

## Exportación a Excel

- Lista Maestra: 14 columnas (incluye Puntaje y Motivo)
- Reportes con filtros exportables
- Encabezados con color azul, autoajuste de columnas, fila de totales
- Formato de moneda colombiana (COP)
- Fechas en formato local `es-CO`
