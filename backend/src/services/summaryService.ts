import * as storage from '../storage/index.js'
import type { Invoice, Conciliation, PeriodSummary, PeriodReport } from '../models/invoice.js'

function getPeriodo(fecha: string): string {
  const d = new Date(fecha)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function getMes(fecha: string): number {
  return new Date(fecha).getMonth() + 1
}

function getAnio(fecha: string): number {
  return new Date(fecha).getFullYear()
}

export async function recalculateSummary(periodo: string): Promise<void> {
  const [anioStr, mesStr] = periodo.split('-')
  const anio = Number(anioStr)
  const mes = Number(mesStr)

  const [compras, ventas, conciliaciones] = await Promise.all([
    storage.getInvoicesByPeriod('compra', mes, anio),
    storage.getInvoicesByPeriod('venta', mes, anio),
    storage.getConciliaciones(mes, anio),
  ])

  const conciliadas = conciliaciones.filter(c => c.estado === 'conciliada')
  const pendientes = conciliaciones.filter(c => c.estado !== 'conciliada')

  const summary: PeriodSummary = {
    periodo,
    mes,
    anio,
    totalCompras: compras.reduce((s, i) => s + i.valor, 0),
    totalVentas: ventas.reduce((s, i) => s + i.valor, 0),
    totalConciliado: conciliadas.reduce((s, c) => s + c.valorCompra, 0),
    totalPendiente: pendientes.reduce((s, c) => s + Math.max(c.valorCompra, c.valorVenta), 0),
    countCompras: compras.length,
    countVentas: ventas.length,
    countConciliadas: conciliadas.length,
    countPendientes: pendientes.length,
    updatedAt: new Date().toISOString(),
  }

  await storage.saveSummary(summary)
}

export async function recalculateReport(periodo: string): Promise<void> {
  const [anioStr, mesStr] = periodo.split('-')
  const anio = Number(anioStr)
  const mes = Number(mesStr)

  const conciliaciones = await storage.getConciliaciones(mes, anio)

  const comprasSinVenta = conciliaciones.filter(c => !c.facturaVenta && c.facturaCompra)
  const ventasSinCompra = conciliaciones.filter(c => !c.facturaCompra && c.facturaVenta)
  const conciliadas = conciliaciones.filter(c => c.estado === 'conciliada')
  const pendientes = conciliaciones.filter(c => c.estado !== 'conciliada')

  const totalCompra = conciliaciones.reduce((s, c) => s + c.valorCompra, 0)
  const totalVenta = conciliaciones.reduce((s, c) => s + c.valorVenta, 0)

  const report: PeriodReport = {
    periodo,
    mes,
    anio,
    conciliaciones,
    comprasSinVenta,
    ventasSinCompra,
    conciliadas,
    pendientes,
    totalCompra,
    totalVenta,
    diferencia: totalCompra - totalVenta,
    updatedAt: new Date().toISOString(),
  }

  await storage.savePeriodReport(report)
}

export async function recalculateAllForConciliaciones(items: Conciliation[]): Promise<void> {
  const periodos = new Set<string>()
  for (const c of items) {
    const fecha = c.fechaCompra || c.fechaVenta
    if (fecha) periodos.add(getPeriodo(fecha))
  }

  await Promise.all(
    Array.from(periodos).map(p =>
      Promise.all([recalculateSummary(p), recalculateReport(p)])
    )
  )
}

export async function recalculateAllForInvoices(items: Invoice[]): Promise<void> {
  const periodos = new Set<string>()
  for (const inv of items) {
    periodos.add(getPeriodo(inv.fecha))
  }

  await Promise.all(
    Array.from(periodos).map(p => recalculateSummary(p))
  )
}
