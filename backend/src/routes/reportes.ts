import { Router } from 'express'
import * as storage from '../storage/jsonStorage.js'
import { generateMasterListXLSX, generateReportXLSX } from '../services/excelExportService.js'

const router = Router()

router.get('/lista-maestra', async (req, res) => {
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

    const exportar = req.query.exportar === 'true'
    if (exportar) {
      const buffer = generateMasterListXLSX(filtered)
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', `attachment; filename=Lista_Maestra_${new Date().toISOString().slice(0, 10)}.xlsx`)
      return res.send(buffer)
    }

    res.json(filtered)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Error al generar lista maestra' })
  }
})

router.get('/reportes/:tipo', async (req, res) => {
  try {
    const conciliaciones = await storage.getConciliaciones()
    const tipo = req.params.tipo
    const mes = req.query.mes ? Number(req.query.mes) : undefined
    const anio = req.query.anio ? Number(req.query.anio) : undefined
    const proveedor = req.query.proveedor as string | undefined
    const cliente = req.query.cliente as string | undefined
    const paciente = req.query.paciente as string | undefined
    const estado = req.query.estado as string | undefined

    let filtered = conciliaciones
    if (mes || anio || proveedor || cliente || paciente || estado) {
      filtered = conciliaciones.filter(c => {
        const fecha = c.fechaCompra || c.fechaVenta
        if (!fecha) return false
        const d = new Date(fecha)
        if (mes && d.getMonth() + 1 !== mes) return false
        if (anio && d.getFullYear() !== anio) return false
        if (proveedor && !c.proveedor.toLowerCase().includes(proveedor.toLowerCase())) return false
        if (cliente && !c.cliente.toLowerCase().includes(cliente.toLowerCase())) return false
        if (paciente && !c.paciente.toLowerCase().includes(paciente.toLowerCase())) return false
        if (estado && c.estado !== estado) return false
        return true
      })
    }

    let data: Record<string, unknown>[] = []

    switch (tipo) {
      case 'compras-sin-venta': {
        const items = filtered.filter(c => !c.facturaVenta && c.facturaCompra)
        data = items.map(c => ({ Factura: c.facturaCompra, Proveedor: c.proveedor, Paciente: c.paciente, Valor: c.valorCompra }))
        break
      }
      case 'ventas-sin-compra': {
        const items = filtered.filter(c => !c.facturaCompra && c.facturaVenta)
        data = items.map(c => ({ Factura: c.facturaVenta, Cliente: c.cliente, Paciente: c.paciente, Valor: c.valorVenta }))
        break
      }
      case 'conciliadas': {
        const items = filtered.filter(c => c.estado === 'conciliada')
        data = items.map(c => ({ Compra: c.facturaCompra, Venta: c.facturaVenta, Paciente: c.paciente, Diferencia: c.diferencia, Puntaje: c.puntaje }))
        break
      }
      case 'pendientes': {
        const items = filtered.filter(c => c.estado !== 'conciliada')
        data = items.map(c => ({
          'Factura Compra': c.facturaCompra || '-',
          'Factura Venta': c.facturaVenta || '-',
          Paciente: c.paciente,
          Estado: c.estado,
          Puntaje: c.puntaje,
          Motivo: c.motivo || '',
        }))
        break
      }
      case 'resumen': {
        const grouped = new Map<string, { mes: number; anio: number; compras: number; ventas: number; conciliadas: number; pendientes: number }>()
        for (const c of filtered) {
          const fecha = c.fechaCompra || c.fechaVenta
          if (!fecha) continue
          const d = new Date(fecha)
          const key = `${d.getFullYear()}-${d.getMonth() + 1}`
          if (!grouped.has(key)) {
            grouped.set(key, { mes: d.getMonth() + 1, anio: d.getFullYear(), compras: 0, ventas: 0, conciliadas: 0, pendientes: 0 })
          }
          const g = grouped.get(key)!
          if (c.facturaCompra) g.compras += c.valorCompra
          if (c.facturaVenta) g.ventas += c.valorVenta
          if (c.estado === 'conciliada') g.conciliadas++
          else g.pendientes++
        }
        data = Array.from(grouped.values())
          .sort((a, b) => a.anio - b.anio || a.mes - b.mes)
          .map(g => ({ Mes: g.mes, Año: g.anio, Compras: g.compras, Ventas: g.ventas, Conciliadas: g.conciliadas, Pendientes: g.pendientes }))
        break
      }
      default:
        return res.status(400).json({ error: 'Tipo de reporte inválido' })
    }

    const exportar = req.query.exportar === 'true'
    if (exportar) {
      const buffer = generateReportXLSX(data, tipo)
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', `attachment; filename=${tipo}_${new Date().toISOString().slice(0, 10)}.xlsx`)
      return res.send(buffer)
    }

    res.json(data)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Error al generar reporte' })
  }
})

export default router
