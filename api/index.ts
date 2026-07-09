/*
 * ⚠️ VERSIÓN DE AUDITORÍA / DEMOSTRACIÓN
 *
 * Esta versión está configurada para desplegarse en Vercel con almacenamiento
 * mediante archivos JSON en /tmp/storage, el cual es EFÍMERO.
 *
 * En Vercel, el sistema de archivos es de solo lectura (excepto /tmp),
 * y /tmp se borra entre invocaciones en frío (cold starts).
 * CUALQUIER DATO SUBIDO O GENERADO SE PERDERÁ AL REINICIAR LA FUNCIÓN.
 *
 * Para un entorno productivo, debes migrar a Firebase Firestore
 * (configurando STORAGE_TYPE=firestore y las credenciales correspondientes).
 *
 * Esta versión es únicamente para AUDITORÍA y DEMOSTRACIÓN.
 */

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import facturasRouter from '../backend/src/routes/facturas.js'
import conciliacionRouter from '../backend/src/routes/conciliacion.js'
import reportesRouter from '../backend/src/routes/reportes.js'
import datosRouter from '../backend/src/routes/datos.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()

app.use(helmet())
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3001'],
  credentials: false,
}))
app.use(express.json({ limit: '50mb' }))

app.use('/api/facturas', facturasRouter)
app.use('/api', conciliacionRouter)
app.use('/api', reportesRouter)
app.use('/api', datosRouter)

const frontendDist = path.resolve(__dirname, '../frontend/dist')
app.use(express.static(frontendDist))
app.get('*', (_req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'))
})

export default app