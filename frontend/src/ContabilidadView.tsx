import { useState } from 'react'
import {
  Building2, TrendingUp, FileSpreadsheet, BookOpen, BookMarked,
  FileText, ShoppingCart, Package, Users, CreditCard, Download,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { getMonthName } from './utils/formatters'

type ReportType = 'monetario' | 'cantidad'

interface ReportCardData {
  id: string
  titulo: string
  valorPrincipal: string
  valorSecundario: string
  tipoReporte: ReportType
  icon: React.ComponentType<{ size?: number }>
  exportFn: (mes: number, anio: number) => void
}

interface ReportSection {
  titulo: string
  items: ReportCardData[]
}

function buildExportFn(reportName: string) {
  return (mes: number, anio: number) => {
    const ws = XLSX.utils.json_to_sheet([
      { A: 'Reporte', B: reportName },
      { A: 'Mes', B: getMonthName(mes) },
      { A: 'Año', B: anio },
      { A: 'Fecha de generación', B: new Date().toLocaleDateString('es-CO') },
      { A: '', B: '' },
      { A: 'Mensaje', B: 'Reporte en desarrollo' },
    ])
    ws['!cols'] = [{ wch: 22 }, { wch: 30 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte')
    XLSX.writeFile(wb, `${reportName.replace(/\s+/g, '_')}_${mes}_${anio}.xlsx`)
  }
}

const sections: ReportSection[] = [
  {
    titulo: 'INFORMACIÓN FINANCIERA',
    items: [
      { id: 'balance-general', icon: Building2, titulo: 'Balance General', valorPrincipal: '$ 1.250.000.000', valorSecundario: '185 cuentas', tipoReporte: 'monetario', exportFn: buildExportFn('Balance General') },
      { id: 'estado-resultados', icon: TrendingUp, titulo: 'Estado de Resultados', valorPrincipal: '$ 235.520.000', valorSecundario: 'Utilidad del período', tipoReporte: 'monetario', exportFn: buildExportFn('Estado de Resultados') },
      { id: 'balance-prueba', icon: FileSpreadsheet, titulo: 'Balance de Prueba', valorPrincipal: '185 cuentas', valorSecundario: '100% conciliadas', tipoReporte: 'cantidad', exportFn: buildExportFn('Balance de Prueba') },
    ],
  },
  {
    titulo: 'LIBROS CONTABLES',
    items: [
      { id: 'libro-diario', icon: BookOpen, titulo: 'Libro Diario', valorPrincipal: '2.580 movimientos', valorSecundario: 'Período contable', tipoReporte: 'cantidad', exportFn: buildExportFn('Libro Diario') },
      { id: 'libro-mayor', icon: BookMarked, titulo: 'Libro Mayor', valorPrincipal: '185 cuentas', valorSecundario: 'Agrupación por cuenta', tipoReporte: 'cantidad', exportFn: buildExportFn('Libro Mayor') },
      { id: 'auxiliares', icon: FileText, titulo: 'Auxiliares Contables', valorPrincipal: '320 auxiliares', valorSecundario: 'Detalle de movimientos', tipoReporte: 'cantidad', exportFn: buildExportFn('Auxiliares Contables') },
    ],
  },
  {
    titulo: 'INDICADORES',
    items: [
      { id: 'ventas', icon: ShoppingCart, titulo: 'Ventas', valorPrincipal: '$ 125.450.320', valorSecundario: '1.285 facturas', tipoReporte: 'monetario', exportFn: buildExportFn('Ventas') },
      { id: 'compras', icon: Package, titulo: 'Compras', valorPrincipal: '$ 82.350.220', valorSecundario: '845 facturas', tipoReporte: 'monetario', exportFn: buildExportFn('Compras') },
      { id: 'cuentas-cobrar', icon: Users, titulo: 'Cuentas por Cobrar', valorPrincipal: '$ 52.320.000', valorSecundario: '85 documentos', tipoReporte: 'monetario', exportFn: buildExportFn('Cuentas por Cobrar') },
      { id: 'cuentas-pagar', icon: CreditCard, titulo: 'Cuentas por Pagar', valorPrincipal: '$ 28.500.000', valorSecundario: '42 documentos', tipoReporte: 'monetario', exportFn: buildExportFn('Cuentas por Pagar') },
    ],
  },
]

export function ContabilidadView() {
  const now = new Date()
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [anio, setAnio] = useState(now.getFullYear())

  return (
    <div className="contabilidad-view">
      <div className="header">
        <div>
          <h1>Reportes Contables</h1>
          <div className="header-subtitle">Exportación de información financiera y contable.</div>
        </div>
      </div>

      <div className="toolbar">
        <div className="toolbar-left">
          <label className="period-label">Período</label>
          <select value={mes} onChange={e => setMes(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{getMonthName(i + 1)}</option>)}
          </select>
          <select value={anio} onChange={e => setAnio(Number(e.target.value))}>
            {Array.from({ length: 5 }, (_, i) => {
              const year = new Date().getFullYear() - 2 + i
              return <option key={year} value={year}>{year}</option>
            })}
          </select>
        </div>
      </div>

      {sections.map(section => (
        <div className="report-section" key={section.titulo}>
          <h2 className="report-section-title">{section.titulo}</h2>
          <div className="report-section-grid">
            {section.items.map(card => (
              <ReportCard key={card.id} card={card} mes={mes} anio={anio} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function ReportCard({ card, mes, anio }: { card: ReportCardData; mes: number; anio: number }) {
  const Icon = card.icon
  return (
    <div className="card report-card-dash">
      <div className="card-label report-card-dash-label">
        <span className="report-card-dash-icon"><Icon size={14} /></span>
        {card.titulo}
      </div>
      <div className={`card-value ${card.tipoReporte === 'monetario' ? '' : 'card-value-md'}`}>
        {card.valorPrincipal}
      </div>
      <div className="card-footer report-card-dash-footer">
        <span>{card.valorSecundario}</span>
        <button className="report-card-export" onClick={() => card.exportFn(mes, anio)}>
          <Download size={12} />
          Exportar
        </button>
      </div>
    </div>
  )
}
