# Mejoras Futuras

## Pendientes para próximas versiones

### Almacenamiento
- [x] Migrar de JSON a Firebase Firestore (v2.0.0)
  - Creado `backend/src/storage/firebaseStorage.ts`
  - Creado `backend/src/config.ts` para credenciales
  - Estrategia Read-Optimized con `summaries/{periodo}` y `reports/{periodo}`
  - Las rutas se actualizaron para usar Firestore
  - El JSON legacy sigue disponible como fallback

### Interfaz
- [ ] Modo oscuro
- [ ] Panel de configuración de empresa desde la UI
- [ ] Notificaciones en tiempo real
- [ ] Barra de progreso al importar múltiples XML
- [ ] Vista previa del XML antes de importar
- [ ] Edición manual de datos del paciente (casos donde no se detecte automáticamente)

### Motor de Conciliación
- [ ] Reglas de conciliación configurables por el usuario
- [ ] Conciliación manual (arrastrar y soltar)
- [ ] Historial de cambios en conciliaciones
- [ ] Deshacer conciliación

### Reportes
- [ ] Reportes gráficos (barras, líneas)
- [ ] Dashboard ejecutivo
- [ ] Programación de exportaciones automáticas
- [ ] Reporte de IVA
- [ ] Reporte de retenciones
- [ ] PDF del informe mensual (actualmente solo Excel)

### Técnicas
- [ ] Pruebas unitarias (Jest/Vitest)
- [ ] Pruebas de integración
- [ ] Dockerizar la aplicación
- [ ] CI/CD
- [ ] Manejo de errores más robusto
- [ ] Logging estructurado
- [ ] Validación de esquemas XML contra XSD

### UX
- [ ] Atajos de teclado
- [ ] Vista de detalles de factura al hacer clic
- [ ] Corrección manual de datos extraídos
- [ ] Importación por carpeta completa
- [ ] Arrastrar y soltar archivos

### Seguridad
- [ ] Autenticación de usuarios
- [ ] Roles y permisos
- [ ] Auditoría de cambios
- [ ] Backup automático
- [x] ~~xlsx (SheetJS)~~ → Reemplazado por `xlsx-js-style` (fork mantenido)
- [x] ~~multer v1~~ → Actualizado a v2.2.0 (corrige 6 CVEs)
- [x] ~~fast-xml-parser v4~~ → Actualizado a v5.9.3
- [x] Headers de seguridad HTTP con `helmet`

## Completado en v2.0.3
- ✅ Caché en memoria para JSON storage: 4 lecturas en frío, 0 en caliente
- ✅ Deduplicación de lecturas concurrentes con promesas compartidas
- ✅ Las escrituras actualizan archivo + caché atómicamente

## Completado en v2.0.2
- ✅ Botones de Reportes convertidos a sub-pestañas (cambio instantáneo sin recarga)
- ✅ Vista previa del Informe Mensual dentro de la aplicación
- ✅ Generación de informe ejecutivo con ExcelJS (formato profesional)
- ✅ Módulo de depuración temporal con contador de operaciones

## Completado en v1.1.0
- ✅ Parser de pacientes robusto: soporta `ID`, `ID:`, `ID `, `PAC`, `PAC:`, `Paciente:`, `PACIENTE:`
- ✅ Manejo de prefijos en documentos: `ID PT 5039013` → extrae `5039013`
- ✅ Limpieza de caracteres no numéricos en documentos
- ✅ Sistema de conciliación simplificado: solo por documento del paciente
- ✅ Diagnóstico en conciliaciones: columna "Motivo" explica cada resultado
- ✅ Puntaje visible en UI y exportación

## Completado en v2.0.0
- ✅ Migración a Firebase Firestore con documentos resumen por período
- ✅ Estrategia Read-Optimized: summaries y reports pre-calculados
- ✅ Dashboard: 1 lectura para KPIs vs 3+ lecturas antes
- ✅ Pre-cálculo automático al importar o conciliar datos

## Completado en v1.3.0
- ✅ KPIs de conciliadas/pendientes ahora respetan el período seleccionado
- ✅ Filtro global por mes-año aplica a toda la aplicación

## Completado en v1.2.1
- ✅ Botones de acción movidos a la barra de período (alineación derecha)
- ✅ Pestaña inicial ahora es Reportes
- ✅ Barra de filtros eliminada de Reportes
- ✅ KPIs rediseñados: valor monetario como dato principal + iconos Lucide
- ✅ Reportes: botones de exportación con contadores + tabla única
- ✅ Espaciado optimizado, contenedor más ancho (1600px)
- ✅ Dependencias de seguridad actualizadas (helmet, xlsx-js-style, multer v2, fast-xml-parser v5)

## Completado en v1.2.0
- ✅ Reestructuración del proyecto: `frontend/` y `backend/` separados
- ✅ Renombrado `server/` → `backend/`
- ✅ Scripts de orquestación con `--prefix` para resolución correcta de binarios
- ✅ Documentación actualizada con nueva estructura

## Notas de Arquitectura

El sistema está diseñado para que el cambio de JSON a Firebase requiera únicamente:

1. Crear `backend/src/storage/firebaseStorage.ts` implementando la misma interfaz
2. Cambiar la importación en los routes
3. Configurar credenciales de Firebase

No es necesario modificar:
- Interfaz de usuario
- Motor de conciliación
- Parseo de XML
- Generación de reportes
- Exportación a Excel

### Flujo de Desarrollo
```
Raíz del proyecto
  ├── npm run dev    → frontend (5173) + backend (3001)
  ├── npm run build  → compila ambos
  └── npm run dev:back → solo backend para pruebas
```
