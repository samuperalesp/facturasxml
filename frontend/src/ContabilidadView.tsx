import { useState } from 'react'
import {
  Landmark, TrendingUp, BookOpen, BookMarked, FileText,
  HandCoins, Wallet, Package, CircleDollarSign, Download,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { getMonthName } from './utils/formatters'

interface AccountingReport {
  title: string
  value: string
  secondary: string
  isMonetary: boolean
  icon: React.ComponentType<{ size?: number }>
  exportFn: (mes: number, anio: number) => void
}

interface ReportSection {
  title: string
  items: AccountingReport[]
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
    title: 'INFORMACIÓN FINANCIERA',
    items: [
      { title: 'Balance General', value: '$ 1.245.650.000', secondary: '132 cuentas', isMonetary: true, icon: Landmark, exportFn: buildExportFn('Balance General') },
      { title: 'Estado de Resultados', value: '$ 352.120.000', secondary: 'Utilidad del período', isMonetary: true, icon: TrendingUp, exportFn: buildExportFn('Estado de Resultados') },
    ],
  },
  {
    title: 'LIBROS CONTABLES',
    items: [
      { title: 'Libro Diario', value: '8.542', secondary: 'Movimientos', isMonetary: false, icon: BookOpen, exportFn: buildExportFn('Libro Diario') },
      { title: 'Libro Mayor', value: '154', secondary: 'Cuentas con movimiento', isMonetary: false, icon: BookMarked, exportFn: buildExportFn('Libro Mayor') },
      { title: 'Auxiliares', value: '328', secondary: 'Subcuentas', isMonetary: false, icon: FileText, exportFn: buildExportFn('Auxiliares') },
    ],
  },
  {
    title: 'INDICADORES',
    items: [
      { title: 'Cuentas por Cobrar', value: '$ 145.000.000', secondary: '26 clientes', isMonetary: true, icon: HandCoins, exportFn: buildExportFn('Cuentas por Cobrar') },
      { title: 'Cuentas por Pagar', value: '$ 82.000.000', secondary: '15 proveedores', isMonetary: true, icon: Wallet, exportFn: buildExportFn('Cuentas por Pagar') },
      { title: 'Inventarios', value: '$ 568.000.000', secondary: '214 referencias', isMonetary: true, icon: Package, exportFn: buildExportFn('Inventarios') },
      { title: 'Costos', value: '$ 128.000.000', secondary: 'Centro de costos', isMonetary: true, icon: CircleDollarSign, exportFn: buildExportFn('Costos') },
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
        <div className="report-section" key={section.title}>
          <h2 className="report-section-title">{section.title}</h2>
          <div className="report-section-grid">
            {section.items.map(card => (
              <ReportCard key={card.title} card={card} mes={mes} anio={anio} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function ReportCard({ card, mes, anio }: { card: AccountingReport; mes: number; anio: number }) {
  const Icon = card.icon
  return (
    <div className="card report-card-dash">
      <div className="card-label report-card-dash-label">
        <span className="report-card-dash-icon"><Icon size={16} /></span>
        {card.title}
      </div>
      <div className={`report-card-dash-value ${card.isMonetary ? '' : 'report-card-dash-value--sm'}`}>
        {card.value}
      </div>
      <div className="card-footer report-card-dash-footer">
        <span className="report-card-dash-secondary">{card.secondary}</span>
        <button className="report-card-export" onClick={() => card.exportFn(mes, anio)}>
          <Download size={12} />
          Exportar
        </button>
      </div>
    </div>
  )
}
