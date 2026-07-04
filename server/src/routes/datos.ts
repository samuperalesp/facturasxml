import { Router } from 'express'
import * as storage from '../storage/jsonStorage.js'

const router = Router()

router.get('/', async (_req, res) => {
  try {
    const [compras, ventas] = await Promise.all([
      storage.getCompras(),
      storage.getVentas(),
    ])
    res.json({ compras, ventas })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Error al obtener datos' })
  }
})

router.get('/compras', async (req, res) => {
  try {
    const compras = await storage.getCompras()
    const mes = req.query.mes ? Number(req.query.mes) : undefined
    const anio = req.query.anio ? Number(req.query.anio) : undefined
    let filtered = compras
    if (mes || anio) {
      filtered = compras.filter(c => {
        const d = new Date(c.fecha)
        if (mes && d.getMonth() + 1 !== mes) return false
        if (anio && d.getFullYear() !== anio) return false
        return true
      })
    }
    res.json(filtered)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Error al obtener compras' })
  }
})

router.get('/ventas', async (req, res) => {
  try {
    const ventas = await storage.getVentas()
    const mes = req.query.mes ? Number(req.query.mes) : undefined
    const anio = req.query.anio ? Number(req.query.anio) : undefined
    let filtered = ventas
    if (mes || anio) {
      filtered = ventas.filter(v => {
        const d = new Date(v.fecha)
        if (mes && d.getMonth() + 1 !== mes) return false
        if (anio && d.getFullYear() !== anio) return false
        return true
      })
    }
    res.json(filtered)
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
    const [compras, ventas, conciliaciones] = await Promise.all([
      storage.getCompras(),
      storage.getVentas(),
      storage.getConciliaciones(),
    ])
    const mes = req.query.mes ? Number(req.query.mes) : undefined
    const anio = req.query.anio ? Number(req.query.anio) : undefined

    const filterByPeriod = <T extends { fecha: string }>(items: T[]) => {
      if (!mes && !anio) return items
      return items.filter(i => {
        const d = new Date(i.fecha)
        if (mes && d.getMonth() + 1 !== mes) return false
        if (anio && d.getFullYear() !== anio) return false
        return true
      })
    }

    const comprasFiltradas = filterByPeriod(compras)
    const ventasFiltradas = filterByPeriod(ventas)

    const conciliadas = conciliaciones.filter(c => c.estado === 'conciliada')
    const pendientes = conciliaciones.filter(c => c.estado !== 'conciliada')

    res.json({
      comprasCargadas: comprasFiltradas.length,
      ventasCargadas: ventasFiltradas.length,
      conciliadas: conciliadas.length,
      pendientes: pendientes.length,
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Error al obtener resumen' })
  }
})

export default router
