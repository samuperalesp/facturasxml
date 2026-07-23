import { useState } from 'react'
import {
  CalendarRange, Users, UserRound, Building2, Stethoscope, LayoutDashboard, Download,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { getMonthName } from './utils/formatters'

interface FacturacionReport {
  title: string
  value: string
  secondary: string
  isMonetary: boolean
  icon: React.ComponentType<{ size?: number }>
  exportFn: (mes: number, anio: number) => void
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

const reports: FacturacionReport[] = [
  { title: 'Facturación por Período', value: '$ 0', secondary: '0 facturas', isMonetary: true, icon: CalendarRange, exportFn: buildExportFn('Facturacion por Periodo') },
  { title: 'Facturación por Cliente', value: '$ 0', secondary: '0 clientes', isMonetary: true, icon: Users, exportFn: buildExportFn('Facturacion por Cliente') },
  { title: 'Facturación por Paciente', value: '$ 0', secondary: '0 pacientes', isMonetary: true, icon: UserRound, exportFn: buildExportFn('Facturacion por Paciente') },
  { title: 'Facturación por Empresa', value: '$ 0', secondary: '0 empresas', isMonetary: true, icon: Building2, exportFn: buildExportFn('Facturacion por Empresa') },
  { title: 'Facturación por Servicio', value: '$ 0', secondary: '0 servicios', isMonetary: true, icon: Stethoscope, exportFn: buildExportFn('Facturacion por Servicio') },
  { title: 'Resumen General', value: '$ 0', secondary: 'Sin información', isMonetary: true, icon: LayoutDashboard, exportFn: buildExportFn('Resumen General') },
]

function ReportCard({ card, mes, anio }: { card: FacturacionReport; mes: number; anio: number }) {
  const Icon = card.icon
  return (
    <div className="card report-card-dash">
      <div className="card-label report-card-dash-label">
        <span className="report-card-dash-icon"><Icon size={16} /></span>
        {card.title}
      </div>
      <div className="report-card-dash-value">
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

export function FacturacionView() {
  const now = new Date()
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [anio, setAnio] = useState(now.getFullYear())

  return (
    <div className="contabilidad-view">
      <div className="header">
        <div>
          <h1>Reportes de Facturación</h1>
          <div className="header-subtitle">Indicadores y reportes relacionados con la facturación.</div>
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

      <div className="report-section-grid">
        {reports.map(r => (
          <ReportCard key={r.title} card={r} mes={mes} anio={anio} />
        ))}
      </div>
    </div>
  )
}
