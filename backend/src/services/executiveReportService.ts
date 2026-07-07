import ExcelJS from 'exceljs'
import type { Invoice, Conciliation } from '../models/invoice.js'
import * as storage from '../storage/index.js'

const CORPORATIVE_COLOR = '1F4E79'
const HEADER_BG = '1F4E79'
const HEADER_FG = 'FFFFFF'
const SECTION_BG = 'D6E4F0'
const BORDER_COLOR = 'B0B0B0'
const TOTAL_BG = 'E8F0FE'
const TITLE_SIZE = 16
const HEADER_SIZE = 11
const BODY_SIZE = 10

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function fmtCOP(v: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(v)
}

function fmtPct(v: number): string {
  return `${v.toFixed(1)}%`
}

function addTitle(ws: ExcelJS.Worksheet, row: number, text: string, cols: number): number {
  ws.mergeCells(row, 1, row, cols)
  const cell = ws.getCell(row, 1)
  cell.value = text
  cell.font = { name: 'Calibri', size: TITLE_SIZE, bold: true, color: { argb: CORPORATIVE_COLOR } }
  cell.alignment = { horizontal: 'left', vertical: 'middle' }
  ws.getRow(row).height = 30
  return row + 1
}

function addSectionHeader(ws: ExcelJS.Worksheet, row: number, text: string, cols: number): number {
  ws.mergeCells(row, 1, row, cols)
  const cell = ws.getCell(row, 1)
  cell.value = text
  cell.font = { name: 'Calibri', size: 13, bold: true, color: { argb: HEADER_FG } }
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } }
  cell.alignment = { horizontal: 'left', vertical: 'middle' }
  cell.border = {
    top: { style: 'thin', color: { argb: BORDER_COLOR } },
    bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
    left: { style: 'thin', color: { argb: BORDER_COLOR } },
    right: { style: 'thin', color: { argb: BORDER_COLOR } },
  }
  ws.getRow(row).height = 24
  return row + 1
}

function addKVIRow(ws: ExcelJS.Worksheet, row: number, key: string, value: string, cols: number): number {
  ws.mergeCells(row, 1, row, 2)
  const kCell = ws.getCell(row, 1)
  kCell.value = key
  kCell.font = { name: 'Calibri', size: BODY_SIZE, bold: true }
  kCell.alignment = { horizontal: 'left', vertical: 'middle' }
  kCell.border = {
    bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
    left: { style: 'thin', color: { argb: BORDER_COLOR } },
  }
  kCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SECTION_BG } }

  ws.mergeCells(row, 3, row, cols)
  const vCell = ws.getCell(row, 3)
  vCell.value = value
  vCell.font = { name: 'Calibri', size: BODY_SIZE }
  vCell.alignment = { horizontal: 'right', vertical: 'middle' }
  vCell.border = {
    bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
    right: { style: 'thin', color: { argb: BORDER_COLOR } },
  }
  ws.getRow(row).height = 20
  return row + 1
}

function addTotalRow(ws: ExcelJS.Worksheet, row: number, key: string, value: string, cols: number): number {
  ws.mergeCells(row, 1, row, 2)
  const kCell = ws.getCell(row, 1)
  kCell.value = key
  kCell.font = { name: 'Calibri', size: BODY_SIZE, bold: true }
  kCell.alignment = { horizontal: 'left', vertical: 'middle' }
  kCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_BG } }
  kCell.border = {
    top: { style: 'medium', color: { argb: CORPORATIVE_COLOR } },
    bottom: { style: 'medium', color: { argb: CORPORATIVE_COLOR } },
    left: { style: 'thin', color: { argb: BORDER_COLOR } },
  }

  ws.mergeCells(row, 3, row, cols)
  const vCell = ws.getCell(row, 3)
  vCell.value = value
  vCell.font = { name: 'Calibri', size: BODY_SIZE, bold: true }
  vCell.alignment = { horizontal: 'right', vertical: 'middle' }
  vCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_BG } }
  vCell.border = {
    top: { style: 'medium', color: { argb: CORPORATIVE_COLOR } },
    bottom: { style: 'medium', color: { argb: CORPORATIVE_COLOR } },
    right: { style: 'thin', color: { argb: BORDER_COLOR } },
  }
  ws.getRow(row).height = 22
  return row + 1
}

function skipRow(ws: ExcelJS.Worksheet, row: number): number {
  ws.getRow(row).height = 8
  return row + 1
}

function formatPeriod(mes: number, anio: number): string {
  return `${MONTHS[mes - 1]} ${anio}`
}

interface SectionData {
  compras: Invoice[]
  ventas: Invoice[]
  conciliaciones: Conciliation[]
}

function buildComprasSection(ws: ExcelJS.Worksheet, startRow: number, data: SectionData, cols: number): number {
  let row = startRow
  row = addSectionHeader(ws, row, 'DATOS GLOBALES DE COMPRAS', cols)

  const { compras } = data
  const total = compras.reduce((s, i) => s + i.valor, 0)
  const count = compras.length

  row = addKVIRow(ws, row, 'Número de facturas', String(count), cols)
  row = addKVIRow(ws, row, 'Valor total facturado', fmtCOP(total), cols)
  row = addKVIRow(ws, row, 'Descuento', '$ 0', cols)
  row = addTotalRow(ws, row, 'Total a pagar', fmtCOP(total), cols)

  return row
}

function buildVentasSection(ws: ExcelJS.Worksheet, startRow: number, data: SectionData, cols: number): number {
  let row = startRow
  row = addSectionHeader(ws, row, 'DATOS GLOBALES DE VENTAS', cols)

  const { ventas } = data
  const total = ventas.reduce((s, i) => s + i.valor, 0)
  const count = ventas.length
  const avg = count > 0 ? total / count : 0

  row = addKVIRow(ws, row, 'Número de facturas', String(count), cols)
  row = addKVIRow(ws, row, 'Valor total facturado', fmtCOP(total), cols)
  row = addKVIRow(ws, row, 'Promedio por factura', fmtCOP(avg), cols)
  row = addTotalRow(ws, row, 'Total a cobrar', fmtCOP(total), cols)

  return row
}

function buildResumenFinancieroSection(ws: ExcelJS.Worksheet, startRow: number, data: SectionData, cols: number): number {
  let row = startRow
  row = addSectionHeader(ws, row, 'RESUMEN FINANCIERO', cols)

  const { compras, ventas, conciliaciones } = data
  const totalCompras = compras.reduce((s, i) => s + i.valor, 0)
  const totalVentas = ventas.reduce((s, i) => s + i.valor, 0)
  const utilidad = totalVentas - totalCompras
  const margen = totalVentas > 0 ? (utilidad / totalVentas) * 100 : 0
  const conciliadas = conciliaciones.filter(c => c.estado === 'conciliada').length
  const pendientes = conciliaciones.filter(c => c.estado !== 'conciliada').length

  row = addKVIRow(ws, row, 'Total Compras', fmtCOP(totalCompras), cols)
  row = addKVIRow(ws, row, 'Total Ventas', fmtCOP(totalVentas), cols)
  row = addKVIRow(ws, row, 'Utilidad Bruta', fmtCOP(utilidad), cols)
  row = addKVIRow(ws, row, 'Margen', fmtPct(margen), cols)
  row = addKVIRow(ws, row, 'Facturas conciliadas', String(conciliadas), cols)
  row = addTotalRow(ws, row, 'Facturas pendientes', String(pendientes), cols)

  return row
}

function buildConciliacionSection(ws: ExcelJS.Worksheet, startRow: number, data: SectionData, cols: number): number {
  let row = startRow
  row = addSectionHeader(ws, row, 'RESUMEN DE CONCILIACIÓN', cols)

  const { conciliaciones } = data
  const comprasConciliadas = conciliaciones.filter(c => c.facturaCompra && c.estado === 'conciliada').length
  const comprasPendientes = conciliaciones.filter(c => c.facturaCompra && c.estado !== 'conciliada').length
  const ventasSinCompra = conciliaciones.filter(c => c.facturaVenta && !c.facturaCompra).length
  const comprasSinVentas = conciliaciones.filter(c => c.facturaCompra && !c.facturaVenta).length

  row = addKVIRow(ws, row, 'Compras conciliadas', String(comprasConciliadas), cols)
  row = addKVIRow(ws, row, 'Compras pendientes', String(comprasPendientes), cols)
  row = addKVIRow(ws, row, 'Ventas sin compra', String(ventasSinCompra), cols)
  row = addTotalRow(ws, row, 'Compras sin venta', String(comprasSinVentas), cols)

  return row
}

const SECTIONS = [
  buildComprasSection,
  buildVentasSection,
  buildResumenFinancieroSection,
  buildConciliacionSection,
]

export async function generateExecutiveReport(mes: number, anio: number): Promise<Buffer> {
  const [compras, ventas, conciliaciones] = await Promise.all([
    storage.getInvoicesByPeriod('compra', mes, anio),
    storage.getInvoicesByPeriod('venta', mes, anio),
    storage.getConciliaciones(mes, anio),
  ])

  const data: SectionData = { compras, ventas, conciliaciones }
  const COLS = 5
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Conciliador Facturas'
  wb.created = new Date()

  const ws = wb.addWorksheet(`Informe ${formatPeriod(mes, anio)}`)
  ws.pageSetup.orientation = 'portrait'
  ws.pageSetup.fitToPage = true
  ws.pageSetup.fitToWidth = 1

  let row = 1
  row = addTitle(ws, row, `Informe Mensual - ${formatPeriod(mes, anio)}`, COLS)
  row = skipRow(ws, row)

  for (const buildSection of SECTIONS) {
    row = buildSection(ws, row, data, COLS)
    row = skipRow(ws, row)
  }

  ws.getColumn(1).width = 30
  ws.getColumn(2).width = 5
  ws.getColumn(3).width = 20
  ws.getColumn(4).width = 15
  ws.getColumn(5).width = 15

  const buf = await wb.xlsx.writeBuffer()
  return Buffer.from(buf)
}
