import { Router } from 'express'
import * as storage from '../storage/index.js'
import { reconcile } from '../services/reconciliationService.js'
import { recalculateAllForConciliaciones } from '../services/summaryService.js'

const router = Router()

router.post('/conciliar', async (_req, res) => {
  try {
    const compras = await storage.getAllInvoices()
    const ventas = await storage.getAllInvoices()
    const comprasOnly = compras.filter(i => i.tipo === 'compra')
    const ventasOnly = ventas.filter(i => i.tipo === 'venta')
    const result = reconcile(comprasOnly, ventasOnly)
    await storage.saveConciliaciones(result)
    await recalculateAllForConciliaciones(result)
    res.json({ conciliadas: result.filter(r => r.estado === 'conciliada').length, total: result.length })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Error al conciliar' })
  }
})

router.get('/conciliaciones', async (req, res) => {
  try {
    const mes = req.query.mes ? Number(req.query.mes) : undefined
    const anio = req.query.anio ? Number(req.query.anio) : undefined
    const conciliaciones = await storage.getConciliaciones(mes, anio)
    res.json(conciliaciones)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Error al obtener conciliaciones' })
  }
})

export default router
