import { Router } from 'express'
import multer from 'multer'
import * as storage from '../storage/index.js'
import { parseXMLFile } from '../services/xmlParser.js'
import { recalculateAllForInvoices } from '../services/summaryService.js'
import type { Invoice } from '../models/invoice.js'

const router = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 200,
    fileSize: 10 * 1024 * 1024,
    fieldSize: 10 * 1024 * 1024,
  },
})

router.post('/importar', (req, res, next) => {
  upload.array('files', 200)(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      const messages: Record<string, string> = {
        LIMIT_FILE_COUNT: 'Demasiados archivos. Máximo 200 por carga.',
        LIMIT_FILE_SIZE: 'Archivo demasiado grande. Máximo 10MB por archivo.',
        LIMIT_UNEXPECTED_FILE: 'Campo de archivo inesperado.',
      }
      return res.status(400).json({ error: messages[err.code] || `Error de upload: ${err.code}` })
    }
    if (err) return res.status(500).json({ error: 'Error al subir archivos' })
    next()
  })
}, async (req, res) => {
  try {
    const tipo = req.query.tipo as string
    if (tipo !== 'compra' && tipo !== 'venta') {
      return res.status(400).json({ error: 'Tipo debe ser compra o venta' })
    }

    const config = await storage.getConfig()
    const existing = await storage.getInvoicesByPeriod(tipo as 'compra' | 'venta')
    const files = req.files as Express.Multer.File[]
    const nuevos: Invoice[] = []
    const errores: string[] = []
    const existingFacturas = new Set(existing.map(e => e.factura))

    for (const file of files) {
      try {
        const content = file.buffer.toString('utf-8')
        const invoice = parseXMLFile(content, file.originalname, config.nitEmpresa)
        if (!invoice) {
          errores.push(`${file.originalname}: no se pudo parsear`)
          continue
        }

        if (existingFacturas.has(invoice.factura)) {
          errores.push(`${file.originalname}: ya importada`)
          continue
        }

        nuevos.push(invoice)
      } catch {
        errores.push(`${file.originalname}: error al procesar`)
      }
    }

    if (nuevos.length > 0) {
      await storage.saveInvoices(nuevos)
      await recalculateAllForInvoices(nuevos)
    }

    res.json({
      importados: nuevos.length,
      total: files.length,
      errores: errores.length > 0 ? errores : undefined,
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Error al importar XML' })
  }
})

export default router
