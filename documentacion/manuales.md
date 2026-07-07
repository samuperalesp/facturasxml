# Manual de Usuario

## Requisitos

- Node.js 18+
- Navegador web moderno (Chrome, Edge, Firefox)
- (Opcional) Proyecto Firebase con Firestore habilitado

## Instalación

```bash
# Instalar dependencias del frontend (desde la raíz del proyecto)
cd frontend && npm install && cd ..

# Instalar dependencias del backend
cd backend && npm install && cd ..

# Instalar dependencias raíz (concurrently para orquestación)
npm install
```

## Configuración Firebase (Opcional)

Por defecto el sistema usa almacenamiento JSON local. Para usar Firebase Firestore:

1. Obtén un archivo de service account desde Firebase Console → Configuración → Cuentas de servicio
2. Colócalo en `backend/service-account-key.json`
3. Configura la variable de entorno o crea `backend/config.json`:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json
export FIREBASE_PROJECT_ID=tu-proyecto-id
```

O crea `backend/config.json`:
```json
{
  "storageType": "firestore",
  "firebase": {
    "projectId": "tu-proyecto-id",
    "serviceAccountPath": "./service-account-key.json"
  }
}
```

Sin Firebase configurado, el sistema funciona con JSON local en `storage/` automáticamente. El `storageType` default es `"json"`. No requiere configuración adicional.

Para verificar qué almacenamiento está activo, revisar `backend/config.json` o la variable `STORAGE_TYPE`. Si no existe `config.json` y `STORAGE_TYPE` no está definida, se usa JSON local.

## Estructura Firestore

Cuando se usa Firebase, los datos se almacenan en estas colecciones:

| Colección | Descripción | Lectura |
|-----------|-------------|---------|
| `invoices/{id}` | Facturas individuales | Bajo demanda |
| `conciliaciones/{id}` | Conciliaciones | Bajo demanda |
| `summaries/{periodo}` | KPIs pre-calculados | **1 lectura para el dashboard** |
| `reports/{periodo}` | Reportes pre-calculados | **1 lectura para reportes** |
| `config/app` | Configuración | 1 lectura |

Los documentos `summaries` y `reports` se recalculan automáticamente al importar o conciliar datos.

## Ejecución

**Siempre ejecutar los comandos desde la raíz del proyecto**
(`/home/samuel/Documentos/Proyectos/Facturas Xml/`).

### Desarrollo (frontend + backend simultáneamente)
```bash
npm run dev
```
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

### Solo backend
```bash
npm run dev:back
```

### Solo frontend
```bash
npm run dev:front
```

### Producción
```bash
npm run build   # Compila frontend + backend
npm run dev:back   # Sirve el frontend compilado desde el backend en :3001
```
- Abrir http://localhost:3001

### Nota importante
No ejecutar `npm run dev` desde `frontend/` o `backend/` por separado (solo arrancan un lado). Usar siempre los comandos desde la raíz.

## Interfaz de Usuario

### Layout

```
─────────────────────────────────────────────────
Conciliador de Facturas XML
─────────────────────────────────────────────────
Período: [Mes] [Año]     [Cargar Compras] [Cargar Ventas] [Conciliar]
─────────────────────────────────────────────────
[Compras: $] [Ventas: $] [Conciliadas: $] [Pendientes: $]   ← KPIs
─────────────────────────────────────────────────
[Compras] [Ventas] [Conciliación] [Lista Maestra] [Reportes]  ← Pestañas
─────────────────────────────────────────────────
Contenido de la pestaña activa
```

### KPIs (Tarjetas)
Cada tarjeta muestra el **valor monetario total** como dato principal y la cantidad de facturas como secundario:
- **COMPRAS** → Valor total + icono FileText + conteo
- **VENTAS** → Valor total + icono Receipt + conteo
- **CONCILIADAS** → Valor total conciliado + icono BadgeCheck + conteo
- **PENDIENTES** → Valor pendiente + icono TriangleAlert + conteo

### Reportes
La pestaña Reportes tiene botones que funcionan como **sub-pestañas** o filtros internos. Al hacer clic en uno, cambia el contenido de la tabla inferior sin recargar la página:

| Botón | Muestra |
|---|---|
| Compras sin Venta | Compras sin venta asociada (Factura, Fecha, Proveedor, Paciente, Valor) |
| Ventas sin Compra | Ventas sin compra relacionada (Factura, Fecha, Cliente, Paciente, Valor) |
| Conciliadas | Conciliaciones completadas del período (detalle completo) |
| Pendientes | Facturas pendientes con Estado, Puntaje y Motivo |
| Informe Mensual | Vista previa del informe ejecutivo con 4 secciones + botón Exportar a Excel |

El botón "Informe Mensual" abre una vista previa en la misma página con:
- DATOS GLOBALES DE COMPRAS
- DATOS GLOBALES DE VENTAS
- RESUMEN FINANCIERO (utilidad, margen)
- RESUMEN DE CONCILIACIÓN
Desde ahí se puede exportar a Excel con formato profesional.

## Flujo de Trabajo (5 Pasos)

### 1. Seleccionar Período
En la barra superior izquierda, selecciona el mes y año. Todos los indicadores y tablas se filtran automáticamente.

### 2. Importar XML Compras
1. Haz clic en **"Cargar XML Compras"** (barra superior derecha)
2. Selecciona uno o varios archivos XML de facturas de compra
3. El sistema extrae automáticamente los datos (nombre y documento del paciente desde la nota del XML)

### 3. Importar XML Ventas
1. Haz clic en **"Cargar XML Ventas"** (barra superior derecha)
2. Selecciona uno o varios archivos XML de facturas de venta

### 4. Conciliar Automáticamente
1. Haz clic en **"Conciliar Información"** (barra superior derecha)
2. El motor cruza compras vs ventas por **documento del paciente** (único criterio)
3. Si el documento coincide → se concilia automáticamente
4. Las conciliaciones aparecen en la pestaña **Conciliación**

### 5. Exportar
- **Lista Maestra**: Revisa y exporta a Excel
- **Reportes**: Botones de exportación directa con contadores de registros

## Funcionalidades por Pestaña

### Compras / Ventas
- Tabla con todas las facturas importadas
- Buscador en tiempo real
- Ordenamiento por columnas (clic en encabezado)
- Filtro por período (mes/año)
- Columnas: Factura, Fecha, Proveedor/Cliente, NIT, **Paciente**, **Documento**, Valor, Médico

### Conciliación
- Cruce automático de compras vs ventas por documento del paciente
- Estados: ✅ Conciliada, 🔴 Pendiente
- Columnas: Factura Compra, Factura Venta, Paciente, Documento, Proveedor, Cliente, Valor Compra, Valor Venta, Diferencia, Estado, **Puntaje**, **Motivo**
- La columna **Motivo** explica por qué se concilió o por qué está pendiente
- Búsqueda y ordenamiento

### Lista Maestra
- Reporte principal con todas las columnas
- Exportación a Excel con:
  - Encabezados con colores
  - Autoajuste de columnas
  - Fila de totales
  - Columnas Puntaje y Motivo incluidas

### Reportes (sub-pestañas)
- **Compras sin Venta**: compras sin venta asociada (vista previa en tabla)
- **Ventas sin Compra**: ventas sin compra relacionada (vista previa en tabla)
- **Conciliadas**: conciliaciones completadas del período (vista previa en tabla)
- **Pendientes**: facturas pendientes con Puntaje y Motivo (vista previa en tabla)
- **Informe Mensual**: vista previa del informe ejecutivo con 4 secciones + botón Exportar a Excel
- Diferencia Compra vs Venta visible siempre en el resumen superior
- Todos los cambios son instantáneos (estado React, sin recargas)
- El período seleccionado se conserva siempre

## Entendiendo los Resultados

### Estados
| Estado | Significado |
|--------|-------------|
| ✅ Conciliada | Se encontró una venta con el mismo documento de paciente |
| 🔴 Pendiente | No se encontró compra/venta con el mismo documento |

### Columna Motivo
La columna **Motivo** explica cada resultado:
- `"Documento paciente 1121923249 coincide"` — conciliación exitosa
- `"Documento: 1121923249. Paciente: JUAN PEREZ. No se encontró venta coincidente con estos datos"` — compra sin venta correspondiente
- `"Venta sin compra con el mismo documento"` — venta sin compra correspondiente
- `"No se pudo extraer información del paciente del XML"` — la nota del XML estaba vacía

### Columna Puntaje
- **100**: Conciliada (documento coincide)
- **0**: Pendiente (sin coincidencia)

## Importación de XML

### Límites
- Máximo 200 archivos por carga
- Máximo 10MB por archivo
- Solo archivos XML en formato DIAN UBL 2.1

### Detección de duplicados
- El sistema detecta automáticamente facturas ya importadas por su número
- Las facturas duplicadas se omiten y se reportan en el mensaje de resultado

## Solución de Problemas

| Problema | Solución |
|----------|----------|
| No se importan XML | Verificar que el XML sea válido y esté en formato DIAN UBL 2.1 |
| Factura duplicada | El sistema no permite importar la misma factura dos veces |
| No concilia | Debes importar al menos una compra y una venta |
| Documento de paciente no extraído | Verificar que la nota del XML tenga el formato `PAC: NOMBRE - ID DOCUMENTO-` |
| Error de conexión / 502 Bad Gateway | El backend no está corriendo. Ejecutar `npm run dev` desde la raíz |
| `vite: not found` | Ejecutar `npm run dev` desde la raíz, no desde frontend/ |
| Puerto ocupado | `npx kill-port 3001 5173` y volver a iniciar |

## Notas Técnicas

### Formato de Nota Esperado
La nota (`cbc:Note`) del XML debe contener el paciente en uno de estos formatos:
```
PAC: NOMBRE DEL PACIENTE - ID 123456789- DR: ...
PAC: NOMBRE DEL PACIENTE- ID PT 123456789-\nDR: ...
PACIENTE: NOMBRE - ID: 123456789- ...
Paciente: NOMBRE- ID: 123456789- DR: ...
```

El documento se limpia automáticamente (solo dígitos). Los prefijos como `PT`, `CC`, etc. se eliminan.

### Estructura de Carpetas
```
Facturas Xml/
├── package.json          ← orquestación (npm run dev)
├── frontend/             ← React + Vite (puerto 5173)
├── backend/              ← Express + TypeScript (puerto 3001)
└── storage/              ← datos JSON
```
