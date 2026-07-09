import { Router } from 'express'
import * as storage from '../storage/index.js'

const router = Router()

router.get('/compras', async (req, res) => {
  try {
    const mes = req.query.mes ? Number(req.query.mes) : undefined
    const anio = req.query.anio ? Number(req.query.anio) : undefined
    const compras = await storage.getInvoicesByPeriod('compra', mes, anio)
    res.json(compras)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Error al obtener compras' })
  }
})

router.get('/ventas', async (req, res) => {
  try {
    const mes = req.query.mes ? Number(req.query.mes) : undefined
    const anio = req.query.anio ? Number(req.query.anio) : undefined
    const ventas = await storage.getInvoicesByPeriod('venta', mes, anio)
    res.json(ventas)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Error al obtener ventas' })
  }
})

router.get('/config', async (_req, res) => {
  try {
    const config = await storage.getConfig()
    res.json(config)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Error al obtener config' })
  }
})

router.get('/resumen', async (req, res) => {
  try {
    const mes = req.query.mes ? Number(req.query.mes) : undefined
    const anio = req.query.anio ? Number(req.query.anio) : undefined

    // Lectura optimizada: 1 documento de summary en lugar de recalcular
    if (mes && anio) {
      const summary = await storage.getSummary(mes, anio)
      if (summary) {
        res.json({
          comprasCargadas: summary.countCompras,
          ventasCargadas: summary.countVentas,
          conciliadas: summary.countConciliadas,
          pendientes: summary.countPendientes,
        })
        return
      }
    }

    // Fallback: calcular desde los datos crudos si no hay resumen pre-calculado
    if (mes && anio) {
      const [compras, ventas, conciliaciones] = await Promise.all([
        storage.getInvoicesByPeriod('compra', mes, anio),
        storage.getInvoicesByPeriod('venta', mes, anio),
        storage.getConciliaciones(mes, anio),
      ])
      res.json({
        comprasCargadas: compras.length,
        ventasCargadas: ventas.length,
        conciliadas: conciliaciones.filter(c => c.estado === 'conciliada').length,
        pendientes: conciliaciones.filter(c => c.estado !== 'conciliada').length,
      })
    } else {
      const [compras, ventas] = await Promise.all([
        storage.getCompras(),
        storage.getVentas(),
      ])
      res.json({
        comprasCargadas: compras.length,
        ventasCargadas: ventas.length,
        conciliadas: 0,
        pendientes: 0,
      })
    }
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Error al obtener resumen' })
  }
})

router.get('/dashboard', async (req, res) => {
  try {
    const mes = req.query.mes ? Number(req.query.mes) : undefined
    const anio = req.query.anio ? Number(req.query.anio) : undefined

    const [compras, ventas, conciliaciones] = await Promise.all([
      storage.getInvoicesByPeriod('compra', mes, anio),
      storage.getInvoicesByPeriod('venta', mes, anio),
      storage.getConciliaciones(mes, anio),
    ])

    const conciliadas = conciliaciones.filter(c => c.estado === 'conciliada').length
    const pendientes = conciliaciones.filter(c => c.estado !== 'conciliada').length

    res.json({
      compras,
      ventas,
      conciliaciones,
      resumen: {
        comprasCargadas: compras.length,
        ventasCargadas: ventas.length,
        conciliadas,
        pendientes,
      },
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Error al obtener dashboard' })
  }
})

export default router
