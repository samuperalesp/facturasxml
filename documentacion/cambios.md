# Registro de Cambios

## v1.1.0 — Corrección del Motor de Conciliación y Extracción de Pacientes

### Cambios en el Parser de Pacientes (`patientParser.ts`)
- Corregido regex de `ID:` a `ID:?` (colon opcional) — las notas reales usan `ID ` sin dos puntos
- Agregado soporte para prefijos alfabéticos en documentos: `ID PT 5039013` → documento `5039013`
- Agregado soporte para `PAC` sin dos puntos: `PAC DEINNA...` además de `PAC: DEINNA...`
- Agregado fallback para `I D` con espacio (typo común: `I D1029987544` en vez de `ID1029987544`)
- Agregado `replace(/\D/g, '')` en todos los documentos extraídos para eliminar cualquier caracter no numérico
- Agregado patrón independiente `/ID\s*(\d{6,})/i` en los fallbacks
- Agregada extracción de nombre cuando el patrón principal falla pero el documento se encuentra por fallback
- Aumentado mínimo de dígitos en fallback de 5 a 6 para evitar falsos positivos

### Cambios en el Motor de Conciliación (`reconciliationService.ts`)
- Eliminado sistema de puntajes (puntos por documento, nombre, fecha, valor)
- Reemplazado por reglas directas:
  1. Si el documento del paciente coincide → `conciliada` automáticamente
  2. Si no hay coincidencia → `pendiente` con explicación
- Ya no se usan fechas, nombres ni valores para determinar el estado
- Se eliminó el umbral mínimo de 25 puntos

### Nuevos campos en Conciliation
- `puntaje: number` — siempre 100 si concilia, 0 si pendiente
- `motivo: string` — explica textualmente por qué se concilió o no (ej: "Documento paciente 1121923249 coincide")

### Cambios en Frontend
- Nuevas columnas **Puntaje** y **Motivo** en las tablas de Conciliación y Lista Maestra
- Columna motivo con tooltip al hacer hover (texto truncado con ellipsis)
- Colores: verde (≥50), naranja (≥25), gris (<25) para el puntaje
- Estilo `.motivo-cell` y `.text-gray` agregados

### Cambios en Exportación
- Columnas `Puntaje` y `Motivo` agregadas al Excel de Lista Maestra
- Reportes "Pendientes" y "Conciliadas" ahora incluyen Puntaje/Motivo

### Reportes
- Reporte "Pendientes" ahora exporta Puntaje y Motivo
- Reporte "Conciliadas" ahora exporta Puntaje

### Resultados de Prueba (63 compras + 63 ventas)
- **0** documentos sin extraer en compras
- **62 de 63** compras conciliadas exitosamente (98.4%)
- **2 pendientes** justificados: 1 venta sin nota de paciente (FV384) y 1 compra sin venta correspondiente (FERP10000)
- Todos los documentos extraídos correctamente incluso con formatos complejos

## v1.0.0 — MVP Inicial

### Implementado
- Proyecto inicial con React + Vite + TypeScript
- Backend con Express + TypeScript
- Parseo de XML de facturación electrónica colombiana (DIAN UBL 2.1)
- Extracción automática de paciente desde notas del XML
- Almacenamiento en archivos JSON
- Motor de conciliación basado en puntajes (eliminado en v1.1.0)
- Interfaz con pestañas: Compras, Ventas, Conciliación, Lista Maestra, Reportes
- Tablas con búsqueda, filtros y ordenamiento de columnas
- Tarjetas de resumen (Compras, Ventas, Conciliadas, Pendientes)
- Exportación a Excel con formato profesional (Lista Maestra y reportes)
- Reportes: Compras sin Venta, Ventas sin Compra, Conciliadas, Pendientes, Diferencia, Resumen Mensual
- Diseño minimalista tipo Notion/Linear (tema claro)

### Arquitectura
- Frontend: React + Vite (puerto 5173)
- Backend: Express + TypeScript (puerto 3001)
- Persistencia: Archivos JSON en `/storage`
- Proxy de Vite para comunicación frontend-backend
