import * as XLSX from 'xlsx-js-style'
import type { Conciliation } from '../models/invoice.js'

function autoFitColumns(ws: XLSX.WorkSheet) {
  const range = XLSX.utils.decode_range(ws['!ref'] || '')
  const cols: { wch: number }[] = []
  for (let c = range.s.c; c <= range.e.c; c++) {
    let maxLen = 0
    for (let r = range.s.r; r <= range.e.r; r++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })]
      if (cell && cell.v) {
        const len = String(cell.v).length
        maxLen = Math.max(maxLen, len)
      }
    }
    cols.push({ wch: Math.min(maxLen + 3, 30) })
  }
  ws['!cols'] = cols
}

function styleHeader(ws: XLSX.WorkSheet, row: number, count: number) {
  for (let c = 0; c < count; c++) {
    const addr = XLSX.utils.encode_cell({ r: row, c })
    if (ws[addr]) {
      ws[addr].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' }, size: 11 },
        fill: { fgColor: { rgb: '2563EB' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: 'CCCCCC' } },
          bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
          left: { style: 'thin', color: { rgb: 'CCCCCC' } },
          right: { style: 'thin', color: { rgb: 'CCCCCC' } },
        },
      }
    }
  }
}

function formatDate(d: string): string {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('es-CO')
}

function formatCurrency(v: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(v)
}

export function generateMasterListXLSX(conciliaciones: Conciliation[]): Buffer {
  const data = conciliaciones.map(c => ({
    'Fecha Compra': formatDate(c.fechaCompra),
    'Factura Compra': c.facturaCompra,
    'Proveedor': c.proveedor,
    'Paciente': c.paciente,
    'Documento': c.documentoPaciente,
    'Valor Compra': c.valorCompra,
    'Fecha Venta': formatDate(c.fechaVenta),
    'Factura Venta': c.facturaVenta,
    'Cliente': c.cliente,
    'Valor Venta': c.valorVenta,
    'Diferencia': c.diferencia,
    'Estado': c.estado === 'conciliada' ? 'Conciliada' : c.estado === 'revisar' ? 'Revisar' : 'Pendiente',
    'Puntaje': c.puntaje,
    'Motivo': c.motivo || '',
  }))

  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  styleHeader(ws, 0, 14)

  const totalCompra = conciliaciones.reduce((s, c) => s + c.valorCompra, 0)
  const totalVenta = conciliaciones.reduce((s, c) => s + c.valorVenta, 0)
  const totalDiff = totalCompra - totalVenta

  const totalRow = data.length + 1
  XLSX.utils.sheet_add_aoa(ws, [
    ['', '', '', '', 'Totales', formatCurrency(totalCompra), '', '', '', formatCurrency(totalVenta), formatCurrency(totalDiff), '', '', ''],
  ], { origin: totalRow })

  autoFitColumns(ws)
  XLSX.utils.book_append_sheet(wb, ws, 'Lista Maestra')

  return Buffer.from(XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }))
}

export function generateReportXLSX(data: Record<string, unknown>[], sheetName: string = 'Reporte'): Buffer {
  if (data.length === 0) return Buffer.from([])

  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  styleHeader(ws, 0, Object.keys(data[0]).length)
  autoFitColumns(ws)
  XLSX.utils.book_append_sheet(wb, ws, sheetName)

  return Buffer.from(XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }))
}
