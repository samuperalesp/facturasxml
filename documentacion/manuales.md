# Manual de Usuario

## Requisitos

- Node.js 18+
- Navegador web moderno (Chrome, Edge, Firefox)

## Instalación

```bash
# Instalar dependencias del frontend
npm install

# Instalar dependencias del backend
cd server && npm install && cd ..
```

## Ejecución

### Desarrollo (frontend + backend simultáneamente)
```bash
npm run dev
```
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

### Solo backend
```bash
npm run dev:server
```

### Solo frontend
```bash
npm run dev:front
```

### Producción
```bash
npm run build
npm run dev:server   # Sirve el frontend compilado desde el backend
```
- Abrir http://localhost:3001

## Flujo de Trabajo (5 Pasos)

### 1. Seleccionar Período
En la parte superior, selecciona el mes y año que deseas consultar.

### 2. Importar XML Compras
1. Haz clic en **"Cargar XML Compras"**
2. Selecciona uno o varios archivos XML de facturas de compra
3. El sistema extrae automáticamente los datos (nombre y documento del paciente desde la nota del XML)

### 3. Importar XML Ventas
1. Haz clic en **"Cargar XML Ventas"**
2. Selecciona uno o varios archivos XML de facturas de venta

### 4. Conciliar Automáticamente
1. Haz clic en **"Conciliar Información"**
2. El motor cruza compras vs ventas por **documento del paciente** (único criterio)
3. Si el documento coincide → se concilia automáticamente
4. Las conciliaciones aparecen en la pestaña **Conciliación**

### 5. Exportar
- **Lista Maestra**: Revisa y exporta a Excel
- **Reportes**: Filtra por estado/proveedor/cliente/paciente y exporta

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

### Reportes
- Compras sin Venta
- Ventas sin Compra
- Conciliadas
- Pendientes (incluye Puntaje y Motivo en exportación)
- Diferencia Compra vs Venta
- Resumen Mensual
- Filtros por estado, proveedor, cliente, paciente
- Todos exportables a Excel

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
| Error de conexión | Verificar que el backend esté corriendo en el puerto 3001 |

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
