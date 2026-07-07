import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import facturasRouter from './routes/facturas.js'
import conciliacionRouter from './routes/conciliacion.js'
import reportesRouter from './routes/reportes.js'
import datosRouter from './routes/datos.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
const PORT = 3001

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

const frontendDist = path.resolve(__dirname, '../../frontend/dist')
app.use(express.static(frontendDist))
app.get('*', (_req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'))
})

app.listen(PORT, () => {
  console.log(`Servidor iniciado en http://localhost:${PORT}`)
})
