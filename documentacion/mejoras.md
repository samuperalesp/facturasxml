# Mejoras Futuras

## Pendientes para próximas versiones

### Almacenamiento
- [ ] Migrar de JSON a Firebase Firestore
  - Solo reemplazar `server/src/storage/jsonStorage.ts`
  - La interfaz `StorageService` ya está desacoplada
  - Ningún otro módulo necesita modificarse

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
- [ ] Backup automático de JSON

## Completado en v1.1.0
- ✅ Parser de pacientes robusto: soporta `ID`, `ID:`, `ID `, `PAC`, `PAC:`, `Paciente:`, `PACIENTE:`
- ✅ Manejo de prefijos en documentos: `ID PT 5039013` → extrae `5039013`
- ✅ Limpieza de caracteres no numéricos en documentos
- ✅ Sistema de conciliación simplificado: solo por documento del paciente
- ✅ Diagnóstico en conciliaciones: columna "Motivo" explica cada resultado
- ✅ Puntaje visible en UI y exportación

## Notas de Arquitectura

El sistema está diseñado para que el cambio de JSON a Firebase requiera únicamente:

1. Crear `server/src/storage/firebaseStorage.ts` implementando la misma interfaz
2. Cambiar la importación en los routes
3. Configurar credenciales de Firebase

No es necesario modificar:
- Interfaz de usuario
- Motor de conciliación
- Parseo de XML
- Generación de reportes
- Exportación a Excel
