import { Router } from 'express'
import * as storage from '../storage/jsonStorage.js'
import { reconcile } from '../services/reconciliationService.js'

const router = Router()

router.post('/conciliar', async (_req, res) => {
  try {
    const compras = await storage.getCompras()
    const ventas = await storage.getVentas()
    const result = reconcile(compras, ventas)
    await storage.saveConciliaciones(result)
    res.json({ conciliadas: result.filter(r => r.estado === 'conciliada').length, total: result.length })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Error al conciliar' })
  }
})

router.get('/conciliaciones', async (req, res) => {
  try {
    const conciliaciones = await storage.getConciliaciones()
    const mes = req.query.mes ? Number(req.query.mes) : undefined
    const anio = req.query.anio ? Number(req.query.anio) : undefined

    let filtered = conciliaciones
    if (mes || anio) {
      filtered = conciliaciones.filter(c => {
        const fecha = c.fechaCompra || c.fechaVenta
        if (!fecha) return true
        const d = new Date(fecha)
        if (mes && d.getMonth() + 1 !== mes) return false
        if (anio && d.getFullYear() !== anio) return false
        return true
      })
    }

    res.json(filtered)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Error al obtener conciliaciones' })
  }
})

export default router
