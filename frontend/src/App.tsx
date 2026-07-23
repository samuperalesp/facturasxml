import { useState, useEffect, useMemo, useCallback } from 'react'
import { FileText, Receipt, BadgeCheck, TriangleAlert } from 'lucide-react'
import type { Invoice, Conciliation } from './models/invoice'
import type { AppConfig } from './models/config'
import { api } from './services/api'
import { getMonthName } from './utils/formatters'
import { Sidebar } from './Sidebar'
import type { SidebarView } from './Sidebar'
import { ReportLayout } from './ReportLayout'
import { ContabilidadView } from './ContabilidadView'
import { FacturacionView } from './FacturacionView'

type Tab = 'compras' | 'ventas' | 'conciliacion' | 'lista-maestra' | 'reportes'
type SortDir = 'asc' | 'desc'

function useApp() {
  const [config, setConfig] = useState<AppConfig>({ nitEmpresa: '901957952', nombreEmpresa: 'CONSULTORIOS SAN FELIPE BENICIO S.A.S.' })
  const [compras, setCompras] = useState<Invoice[]>([])
  const [ventas, setVentas] = useState<Invoice[]>([])
  const [conciliaciones, setConciliaciones] = useState<Conciliation[]>([])
  const [resumen, setResumen] = useState({ comprasCargadas: 0, ventasCargadas: 0, conciliadas: 0, pendientes: 0 })
  const [activeTab, setActiveTab] = useState<Tab>('reportes')
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)

  const loadData = useCallback(async (m: number, a: number) => {
    try {
      const data = await api.getDashboard(m, a)
      setCompras(data.compras)
      setVentas(data.ventas)
      setConciliaciones(data.conciliaciones)
      setResumen(data.resumen)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    api.getConfig().then(setConfig).catch(console.error)
  }, [])

  useEffect(() => {
    loadData(mes, anio)
  }, [mes, anio, loadData])

  const handleImport = async (files: FileList, tipo: 'compra' | 'venta') => {
    setImporting(true)
    try {
      const result = await api.uploadFiles(files, tipo)
      if (result.importados > 0) {
        await loadData(mes, anio)
      }
      return result
    } finally {
      setImporting(false)
    }
  }

  const handleReconcile = async () => {
    if (compras.length === 0 || ventas.length === 0) {
      return { error: 'Debes importar compras y ventas antes de conciliar' }
    }
    const result = await api.reconciliar()
    await loadData(mes, anio)
    return result
  }

  const conciliadas = conciliaciones.filter(c => c.estado === 'conciliada')
  const pendientes = conciliaciones.filter(c => c.estado !== 'conciliada')

  const totalCompras = useMemo(() => compras.reduce((s, i) => s + i.valor, 0), [compras])
  const totalVentas = useMemo(() => ventas.reduce((s, i) => s + i.valor, 0), [ventas])
  const totalConciliado = useMemo(() => conciliadas.reduce((s, c) => s + c.valorCompra, 0), [conciliadas])
  const totalPendiente = useMemo(() => pendientes.reduce((s, c) => s + Math.max(c.valorCompra, c.valorVenta), 0), [pendientes])

  return {
    config, compras, ventas, conciliaciones, resumen,
    conciliadas, pendientes,
    totalCompras, totalVentas, totalConciliado, totalPendiente,
    activeTab, setActiveTab, mes, setMes, anio, setAnio,
    loading, importing, loadData, handleImport, handleReconcile,
  }
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button className={`tab ${active ? 'active' : ''}`} onClick={onClick}>
      {label}
    </button>
  )
}

type TableColumn<T> = {
  key: string
  label: string
  render: (item: T) => React.ReactNode
  sortValue?: (item: T) => string | number
}

function DataTable<T extends object>({
  data, columns, searchPlaceholder = 'Buscar...', emptyMessage = 'No hay datos',
}: {
  data: T[]
  columns: TableColumn<T>[]
  searchPlaceholder?: string
  emptyMessage?: string
}) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const sorted = useMemo(() => {
    let items = data
    if (search.trim()) {
      const q = search.toLowerCase()
      items = data.filter(item =>
        columns.some(col => String(col.render(item)).toLowerCase().includes(q))
      )
    }
    if (!sortKey) return items
    const col = columns.find(c => c.key === sortKey)
    if (!col?.sortValue) return items
    return [...items].sort((a, b) => {
      const va = col.sortValue!(a)
      const vb = col.sortValue!(b)
      const cmp = typeof va === 'string' ? va.localeCompare(String(vb)) : (va as number) - (vb as number)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data, search, sortKey, sortDir, columns])

  return (
    <div className="table-container">
      <div className="table-header">
        <div className="table-header-left">
          <input className="search-input" placeholder={searchPlaceholder} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>
      {sorted.length === 0 ? (
        <div className="empty-state">
          <p>{emptyMessage}</p>
          <span className="sub">Importa XML para comenzar</span>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                {columns.map(col => (
                  <th key={col.key} className={sortKey === col.key ? 'sorted' : ''} onClick={() => handleSort(col.key)}>
                    {col.label} {sortKey === col.key ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((item, i) => (
                <tr key={i}>
                  {columns.map(col => (<td key={col.key}>{col.render(item)}</td>))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const fmt = (v: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v)

const invoiceColumns: TableColumn<Invoice>[] = [
  { key: 'factura', label: 'Factura', render: i => i.factura, sortValue: i => i.factura },
  { key: 'fecha', label: 'Fecha', render: i => i.fecha, sortValue: i => i.fecha },
  { key: 'contraparte', label: 'Proveedor/Cliente', render: i => i.proveedor || i.cliente || '-', sortValue: i => i.proveedor || i.cliente || '' },
  { key: 'nit', label: 'NIT', render: i => i.nitProveedor || i.nitCliente || '-', sortValue: i => i.nitProveedor || i.nitCliente || '' },
  { key: 'paciente', label: 'Paciente', render: i => i.paciente, sortValue: i => i.paciente },
  { key: 'documentoPaciente', label: 'Documento', render: i => i.documentoPaciente, sortValue: i => i.documentoPaciente },
  { key: 'valor', label: 'Valor', render: i => fmt(i.valor), sortValue: i => i.valor },
  { key: 'medico', label: 'Médico', render: i => i.medico || '-', sortValue: i => i.medico || '' },
]

const conciliationColumns: TableColumn<Conciliation>[] = [
  { key: 'facturaCompra', label: 'Factura Compra', render: c => c.facturaCompra || '-', sortValue: c => c.facturaCompra },
  { key: 'facturaVenta', label: 'Factura Venta', render: c => c.facturaVenta || '-', sortValue: c => c.facturaVenta },
  { key: 'paciente', label: 'Paciente', render: c => c.paciente, sortValue: c => c.paciente },
  { key: 'documento', label: 'Documento', render: c => c.documentoPaciente, sortValue: c => c.documentoPaciente },
  { key: 'proveedor', label: 'Proveedor', render: c => c.proveedor || '-', sortValue: c => c.proveedor },
  { key: 'cliente', label: 'Cliente', render: c => c.cliente || '-', sortValue: c => c.cliente },
  { key: 'valorCompra', label: 'Valor Compra', render: c => fmt(c.valorCompra), sortValue: c => c.valorCompra },
  { key: 'valorVenta', label: 'Valor Venta', render: c => fmt(c.valorVenta), sortValue: c => c.valorVenta },
  {
    key: 'diferencia', label: 'Diferencia', render: c => {
      const cls = c.diferencia === 0 ? '' : c.diferencia > 0 ? 'text-red' : 'text-green'
      return <span className={cls}>{fmt(c.diferencia)}</span>
    }, sortValue: c => c.diferencia
  },
  {
    key: 'estado', label: 'Estado', render: c => {
      const labels = { conciliada: '✅ Conciliada', revisar: '🟡 Revisar', pendiente: '🔴 Pendiente' }
      return <span className={`status-badge ${c.estado}`}>{labels[c.estado]}</span>
    }, sortValue: c => c.estado
  },
  {
    key: 'puntaje', label: 'Puntaje', render: c => {
      const cls = c.puntaje >= 50 ? 'text-green' : c.puntaje >= 25 ? 'text-orange' : 'text-gray'
      return <span className={cls}>{c.puntaje}</span>
    }, sortValue: c => c.puntaje
  },
  {
    key: 'motivo', label: 'Motivo', render: c => {
      return <span title={c.motivo} className="motivo-cell">{c.motivo || '-'}</span>
    }, sortValue: c => c.motivo
  },
]

const masterColumns: TableColumn<Conciliation>[] = [
  { key: 'fechaCompra', label: 'Fecha Compra', render: c => c.fechaCompra || '-', sortValue: c => c.fechaCompra },
  { key: 'facturaCompra', label: 'Factura Compra', render: c => c.facturaCompra || '-', sortValue: c => c.facturaCompra },
  { key: 'proveedor', label: 'Proveedor', render: c => c.proveedor || '-', sortValue: c => c.proveedor },
  { key: 'paciente', label: 'Paciente', render: c => c.paciente, sortValue: c => c.paciente },
  { key: 'documento', label: 'Documento', render: c => c.documentoPaciente, sortValue: c => c.documentoPaciente },
  { key: 'valorCompra', label: 'Valor Compra', render: c => fmt(c.valorCompra), sortValue: c => c.valorCompra },
  { key: 'fechaVenta', label: 'Fecha Venta', render: c => c.fechaVenta || '-', sortValue: c => c.fechaVenta },
  { key: 'facturaVenta', label: 'Factura Venta', render: c => c.facturaVenta || '-', sortValue: c => c.facturaVenta },
  { key: 'cliente', label: 'Cliente', render: c => c.cliente || '-', sortValue: c => c.cliente },
  { key: 'valorVenta', label: 'Valor Venta', render: c => fmt(c.valorVenta), sortValue: c => c.valorVenta },
  {
    key: 'diferencia', label: 'Diferencia', render: c => {
      const cls = c.diferencia === 0 ? '' : c.diferencia > 0 ? 'text-red' : 'text-green'
      return <span className={cls}>{fmt(c.diferencia)}</span>
    }, sortValue: c => c.diferencia
  },
  {
    key: 'estado', label: 'Estado', render: c => {
      const labels = { conciliada: '✅ Conciliada', revisar: '🟡 Revisar', pendiente: '🔴 Pendiente' }
      return <span className={`status-badge ${c.estado}`}>{labels[c.estado]}</span>
    }, sortValue: c => c.estado
  },
  {
    key: 'puntaje', label: 'Puntaje', render: c => {
      const cls = c.puntaje >= 50 ? 'text-green' : c.puntaje >= 25 ? 'text-orange' : 'text-gray'
      return <span className={cls}>{c.puntaje}</span>
    }, sortValue: c => c.puntaje
  },
  {
    key: 'motivo', label: 'Motivo', render: c => {
      return <span title={c.motivo} className="motivo-cell">{c.motivo || '-'}</span>
    }, sortValue: c => c.motivo
  },
]

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24,
      background: type === 'success' ? 'var(--color-green-500)' : 'var(--color-red-500)',
      color: 'white', padding: '12px 20px', borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-md)', fontSize: 13, zIndex: 9999,
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      {type === 'success' ? '✓' : '✕'} {message}
    </div>
  )
}

export default function App() {
  const {
    config, compras, ventas, conciliaciones, resumen,
    totalCompras, totalVentas, totalConciliado, totalPendiente,
    activeTab, setActiveTab,
    mes, setMes, anio, setAnio, loading, importing, handleImport, handleReconcile,
  } = useApp()

  const [sidebarView, setSidebarView] = useState<SidebarView>('conciliacion')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const showToast = (message: string, type: 'success' | 'error' = 'success') => setToast({ message, type })

  const onImport = async (files: FileList, tipo: 'compra' | 'venta') => {
    try {
      const result = await handleImport(files, tipo)
      if (result.importados > 0) {
        const msg = `${result.importados} de ${result.total} factura(s) de ${tipo === 'compra' ? 'compra' : 'venta'} importada(s)`
        showToast(msg, 'success')
      } else if (result.errores && result.errores.length > 0) {
        showToast(`0 importadas. ${result.errores.length} archivo(s) con errores`, 'error')
      } else {
        showToast('No se encontraron facturas nuevas (ya estaban importadas)', 'error')
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error al importar', 'error')
    }
  }

  const onReconcile = async () => {
    const result = await handleReconcile()
    if ('error' in result) {
      showToast(result.error, 'error')
    } else {
      showToast(`Conciliación completada: ${result.conciliadas} conciliadas de ${result.total}`)
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'compras', label: 'Compras' },
    { key: 'ventas', label: 'Ventas' },
    { key: 'conciliacion', label: 'Conciliación' },
    { key: 'lista-maestra', label: 'Lista Maestra' },
    { key: 'reportes', label: 'Reportes' },
  ]

  if (loading) {
    return <div className="app" style={{ textAlign: 'center', paddingTop: 80, color: 'var(--color-gray-400)', maxWidth: 1600, margin: '0 auto' }}>Cargando...</div>
  }

  return (
    <div className="app">
      <ReportLayout sidebar={<Sidebar activeView={sidebarView} onViewChange={setSidebarView} />}>
        {sidebarView === 'conciliacion' && (
          <>
            <div className="header">
              <div>
                <h1>Conciliador de Facturas XML</h1>
                <div className="header-subtitle">{config.nombreEmpresa}</div>
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
              <div className="toolbar-right">
                <label className={`btn btn-primary ${importing ? 'disabled' : ''}`} style={{ cursor: importing ? 'not-allowed' : 'pointer', opacity: importing ? 0.6 : 1 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  {importing ? 'Importando...' : 'Cargar XML Compras'}
                  <input type="file" accept=".xml" multiple style={{ display: 'none' }} disabled={importing} onChange={e => { if (e.target.files) { onImport(e.target.files, 'compra'); e.target.value = '' } }} />
                </label>
                <label className={`btn btn-primary ${importing ? 'disabled' : ''}`} style={{ cursor: importing ? 'not-allowed' : 'pointer', opacity: importing ? 0.6 : 1 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  {importing ? 'Importando...' : 'Cargar XML Ventas'}
                  <input type="file" accept=".xml" multiple style={{ display: 'none' }} disabled={importing} onChange={e => { if (e.target.files) { onImport(e.target.files, 'venta'); e.target.value = '' } }} />
                </label>
                <button className="btn btn-success" onClick={onReconcile} disabled={importing}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                  Conciliar Información
                </button>
              </div>
            </div>

            <div className="cards-row">
              <div className="card">
                <div className="card-label">COMPRAS</div>
                <div className="card-value">{fmt(totalCompras)}</div>
                <div className="card-footer">
                  <FileText size={14} />
                  <span>{resumen.comprasCargadas} {resumen.comprasCargadas === 1 ? 'factura' : 'facturas'}</span>
                </div>
              </div>
              <div className="card">
                <div className="card-label">VENTAS</div>
                <div className="card-value">{fmt(totalVentas)}</div>
                <div className="card-footer">
                  <Receipt size={14} />
                  <span>{resumen.ventasCargadas} {resumen.ventasCargadas === 1 ? 'factura' : 'facturas'}</span>
                </div>
              </div>
              <div className="card">
                <div className="card-label">CONCILIADAS</div>
                <div className="card-value green">{fmt(totalConciliado)}</div>
                <div className="card-footer">
                  <BadgeCheck size={14} />
                  <span>{resumen.conciliadas} {resumen.conciliadas === 1 ? 'factura' : 'facturas'}</span>
                </div>
              </div>
              <div className="card">
                <div className="card-label">PENDIENTES</div>
                <div className="card-value orange">{fmt(totalPendiente)}</div>
                <div className="card-footer">
                  <TriangleAlert size={14} />
                  <span>{resumen.pendientes} {resumen.pendientes === 1 ? 'factura' : 'facturas'}</span>
                </div>
              </div>
            </div>

            <div className="tabs">
              {tabs.map(tab => <TabButton key={tab.key} label={tab.label} active={activeTab === tab.key} onClick={() => setActiveTab(tab.key)} />)}
            </div>

            {activeTab === 'compras' && <DataTable data={compras} columns={invoiceColumns} searchPlaceholder="Buscar en compras..." emptyMessage={`No hay compras para ${getMonthName(mes)} ${anio}`} />}
            {activeTab === 'ventas' && <DataTable data={ventas} columns={invoiceColumns} searchPlaceholder="Buscar en ventas..." emptyMessage={`No hay ventas para ${getMonthName(mes)} ${anio}`} />}
            {activeTab === 'conciliacion' && <DataTable data={conciliaciones} columns={conciliationColumns} searchPlaceholder="Buscar en conciliaciones..." emptyMessage="No hay conciliaciones. Importa XML y concilia." />}
            {activeTab === 'lista-maestra' && (
              <div>
                <div style={{ marginBottom: 14 }}>
                  <button className="btn btn-success" onClick={() => api.exportListaMaestra(mes, anio)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Exportar Excel
                  </button>
                </div>
                <DataTable data={conciliaciones} columns={masterColumns} searchPlaceholder="Buscar en lista maestra..." emptyMessage="No hay datos para la lista maestra" />
              </div>
            )}
            {activeTab === 'reportes' && <ReportsView conciliaciones={conciliaciones} compras={compras} ventas={ventas} mes={mes} anio={anio} />}
          </>
        )}

        {sidebarView === 'contabilidad' && <ContabilidadView />}
        {sidebarView === 'facturacion' && <FacturacionView />}

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </ReportLayout>
    </div>
  )
}

const reportColumns: TableColumn<Conciliation>[] = [
  { key: 'facturaCompra', label: 'Factura Compra', render: c => c.facturaCompra || '-', sortValue: c => c.facturaCompra },
  { key: 'facturaVenta', label: 'Factura Venta', render: c => c.facturaVenta || '-', sortValue: c => c.facturaVenta },
  { key: 'paciente', label: 'Paciente', render: c => c.paciente, sortValue: c => c.paciente },
  { key: 'documento', label: 'Documento', render: c => c.documentoPaciente, sortValue: c => c.documentoPaciente },
  { key: 'proveedor', label: 'Proveedor', render: c => c.proveedor || '-', sortValue: c => c.proveedor },
  { key: 'cliente', label: 'Cliente', render: c => c.cliente || '-', sortValue: c => c.cliente },
  { key: 'valorCompra', label: 'Valor Compra', render: c => fmt(c.valorCompra), sortValue: c => c.valorCompra },
  { key: 'valorVenta', label: 'Valor Venta', render: c => fmt(c.valorVenta), sortValue: c => c.valorVenta },
  {
    key: 'diferencia', label: 'Diferencia', render: c => {
      const cls = c.diferencia === 0 ? '' : c.diferencia > 0 ? 'text-red' : 'text-green'
      return <span className={cls}>{fmt(c.diferencia)}</span>
    }, sortValue: c => c.diferencia
  },
  {
    key: 'estado', label: 'Estado', render: c => {
      const labels = { conciliada: '✅ Conciliada', revisar: '🟡 Revisar', pendiente: '🔴 Pendiente' }
      return <span className={`status-badge ${c.estado}`}>{labels[c.estado]}</span>
    }, sortValue: c => c.estado
  },
  { key: 'motivo', label: 'Motivo', render: c => <span title={c.motivo} className="motivo-cell">{c.motivo || '-'}</span>, sortValue: c => c.motivo },
]

type ReportSubTab = 'todas' | 'compras-sin-venta' | 'ventas-sin-compra' | 'conciliadas' | 'pendientes' | 'informe-mensual'

const subTabLabels: Record<ReportSubTab, string> = {
  'todas': 'Todas',
  'compras-sin-venta': 'Compras sin Venta',
  'ventas-sin-compra': 'Ventas sin Compra',
  'conciliadas': 'Conciliadas',
  'pendientes': 'Pendientes',
  'informe-mensual': 'Informe Mensual',
}

const subTabButtons: ReportSubTab[] = [
  'compras-sin-venta',
  'ventas-sin-compra',
  'conciliadas',
  'pendientes',
  'informe-mensual',
]

function ReportsView({ conciliaciones, compras, ventas, mes, anio, initialSubTab }: { conciliaciones: Conciliation[]; compras: Invoice[]; ventas: Invoice[]; mes: number; anio: number; initialSubTab?: ReportSubTab }) {
  const [subTab, setSubTab] = useState<ReportSubTab>(initialSubTab || 'todas')

  const filtered = useMemo(() => {
    return conciliaciones.filter(c => {
      const fecha = c.fechaCompra || c.fechaVenta
      if (!fecha) return false
      const d = new Date(fecha)
      return d.getMonth() + 1 === mes && d.getFullYear() === anio
    })
  }, [conciliaciones, mes, anio])

  const comprasSinVenta = filtered.filter(c => !c.facturaVenta && c.facturaCompra)
  const ventasSinCompra = filtered.filter(c => !c.facturaCompra && c.facturaVenta)
  const conciliadas = filtered.filter(c => c.estado === 'conciliada')
  const pendientes = filtered.filter(c => c.estado !== 'conciliada')
  const totalCompra = filtered.reduce((s, c) => s + c.valorCompra, 0)
  const totalVenta = filtered.reduce((s, c) => s + c.valorVenta, 0)

  const totalComprasGlobal = compras.reduce((s, i) => s + i.valor, 0)
  const totalVentasGlobal = ventas.reduce((s, i) => s + i.valor, 0)
  const utilidad = totalVentasGlobal - totalComprasGlobal
  const margen = totalVentasGlobal > 0 ? (utilidad / totalVentasGlobal) * 100 : 0

  let data: Conciliation[] = filtered
  let columns: TableColumn<Conciliation>[] = reportColumns
  let emptyMessage = 'No hay datos para el período seleccionado'
  let searchPlaceholder = 'Buscar en reportes...'

  switch (subTab) {
    case 'compras-sin-venta':
      data = comprasSinVenta
      columns = [
        { key: 'facturaCompra', label: 'Factura Compra', render: c => c.facturaCompra || '-', sortValue: c => c.facturaCompra },
        { key: 'fechaCompra', label: 'Fecha Compra', render: c => c.fechaCompra || '-', sortValue: c => c.fechaCompra },
        { key: 'proveedor', label: 'Proveedor', render: c => c.proveedor || '-', sortValue: c => c.proveedor },
        { key: 'paciente', label: 'Paciente', render: c => c.paciente, sortValue: c => c.paciente },
        { key: 'valorCompra', label: 'Valor Compra', render: c => fmt(c.valorCompra), sortValue: c => c.valorCompra },
      ]
      emptyMessage = 'No hay compras sin venta para este período'
      searchPlaceholder = 'Buscar en compras sin venta...'
      break
    case 'ventas-sin-compra':
      data = ventasSinCompra
      columns = [
        { key: 'facturaVenta', label: 'Factura Venta', render: c => c.facturaVenta || '-', sortValue: c => c.facturaVenta },
        { key: 'fechaVenta', label: 'Fecha Venta', render: c => c.fechaVenta || '-', sortValue: c => c.fechaVenta },
        { key: 'cliente', label: 'Cliente', render: c => c.cliente || '-', sortValue: c => c.cliente },
        { key: 'paciente', label: 'Paciente', render: c => c.paciente, sortValue: c => c.paciente },
        { key: 'valorVenta', label: 'Valor Venta', render: c => fmt(c.valorVenta), sortValue: c => c.valorVenta },
      ]
      emptyMessage = 'No hay ventas sin compra para este período'
      searchPlaceholder = 'Buscar en ventas sin compra...'
      break
    case 'conciliadas':
      data = conciliadas
      emptyMessage = 'No hay conciliaciones para este período'
      searchPlaceholder = 'Buscar en conciliadas...'
      break
    case 'pendientes':
      data = pendientes
      columns = [
        { key: 'facturaCompra', label: 'Factura Compra', render: c => c.facturaCompra || '-', sortValue: c => c.facturaCompra },
        { key: 'facturaVenta', label: 'Factura Venta', render: c => c.facturaVenta || '-', sortValue: c => c.facturaVenta },
        { key: 'paciente', label: 'Paciente', render: c => c.paciente, sortValue: c => c.paciente },
        { key: 'estado', label: 'Estado', render: c => {
          const labels = { conciliada: '✅ Conciliada', revisar: '🟡 Revisar', pendiente: '🔴 Pendiente' }
          return <span className={`status-badge ${c.estado}`}>{labels[c.estado]}</span>
        }, sortValue: c => c.estado },
        { key: 'puntaje', label: 'Puntaje', render: c => {
          const cls = c.puntaje >= 50 ? 'text-green' : c.puntaje >= 25 ? 'text-orange' : 'text-gray'
          return <span className={cls}>{c.puntaje}</span>
        }, sortValue: c => c.puntaje },
        { key: 'motivo', label: 'Motivo', render: c => <span title={c.motivo} className="motivo-cell">{c.motivo || '-'}</span>, sortValue: c => c.motivo },
      ]
      emptyMessage = 'No hay pendientes para este período'
      searchPlaceholder = 'Buscar en pendientes...'
      break
    case 'informe-mensual':
      break
  }

  return (
    <div>
      <div className="report-toolbar">
        <div className="report-toolbar-left">
          {subTabButtons.map(key => (
            <button
              key={key}
              className={`btn btn-outline${subTab === key ? ' active' : ''}`}
              disabled={key !== 'informe-mensual' && key !== 'todas' && (() => {
                switch (key) {
                  case 'compras-sin-venta': return comprasSinVenta.length === 0
                  case 'ventas-sin-compra': return ventasSinCompra.length === 0
                  case 'conciliadas': return conciliadas.length === 0
                  case 'pendientes': return pendientes.length === 0
                  default: return false
                }
              })()}
              onClick={() => setSubTab(key)}>
              {subTabLabels[key]}
              {key !== 'informe-mensual' && key !== 'todas' && (() => {
                switch (key) {
                  case 'compras-sin-venta': return ` (${comprasSinVenta.length})`
                  case 'ventas-sin-compra': return ` (${ventasSinCompra.length})`
                  case 'conciliadas': return ` (${conciliadas.length})`
                  case 'pendientes': return ` (${pendientes.length})`
                  default: return ''
                }
              })()}
            </button>
          ))}
        </div>
        <div className="report-toolbar-right">
          <div className="report-summary">
            <span>Compras: <strong>{fmt(totalCompra)}</strong></span>
            <span className="sep">|</span>
            <span>Ventas: <strong>{fmt(totalVenta)}</strong></span>
            <span className="sep">|</span>
            <span>Dif: <strong className={totalCompra > totalVenta ? 'text-red' : 'text-green'}>{fmt(totalCompra - totalVenta)}</strong></span>
          </div>
        </div>
      </div>

      {subTab === 'informe-mensual' ? (
        <div className="informe-preview">
          <div className="informe-header">
            <h2>Informe Mensual - {getMonthName(mes)} {anio}</h2>
            <button className="btn btn-success" onClick={() => api.exportInformeMensual(mes, anio)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Exportar a Excel
            </button>
          </div>

          <div className="informe-section">
            <h3>DATOS GLOBALES DE COMPRAS</h3>
            <div className="informe-grid">
              <div className="informe-row">
                <span className="informe-key">Número de facturas</span>
                <span className="informe-val">{compras.length}</span>
              </div>
              <div className="informe-row">
                <span className="informe-key">Valor total facturado</span>
                <span className="informe-val">{fmt(totalComprasGlobal)}</span>
              </div>
              <div className="informe-row">
                <span className="informe-key">Descuento</span>
                <span className="informe-val">$ 0</span>
              </div>
              <div className="informe-row informe-row-total">
                <span className="informe-key">Total a pagar</span>
                <span className="informe-val">{fmt(totalComprasGlobal)}</span>
              </div>
            </div>
          </div>

          <div className="informe-section">
            <h3>DATOS GLOBALES DE VENTAS</h3>
            <div className="informe-grid">
              <div className="informe-row">
                <span className="informe-key">Número de facturas</span>
                <span className="informe-val">{ventas.length}</span>
              </div>
              <div className="informe-row">
                <span className="informe-key">Valor total facturado</span>
                <span className="informe-val">{fmt(totalVentasGlobal)}</span>
              </div>
              <div className="informe-row">
                <span className="informe-key">Promedio por factura</span>
                <span className="informe-val">{ventas.length > 0 ? fmt(totalVentasGlobal / ventas.length) : '$ 0'}</span>
              </div>
              <div className="informe-row informe-row-total">
                <span className="informe-key">Total a cobrar</span>
                <span className="informe-val">{fmt(totalVentasGlobal)}</span>
              </div>
            </div>
          </div>

          <div className="informe-section">
            <h3>RESUMEN FINANCIERO</h3>
            <div className="informe-grid">
              <div className="informe-row">
                <span className="informe-key">Total Compras</span>
                <span className="informe-val">{fmt(totalComprasGlobal)}</span>
              </div>
              <div className="informe-row">
                <span className="informe-key">Total Ventas</span>
                <span className="informe-val">{fmt(totalVentasGlobal)}</span>
              </div>
              <div className="informe-row">
                <span className="informe-key">Utilidad Bruta</span>
                <span className="informe-val">{fmt(utilidad)}</span>
              </div>
              <div className="informe-row">
                <span className="informe-key">Margen</span>
                <span className="informe-val">{margen.toFixed(1)}%</span>
              </div>
              <div className="informe-row">
                <span className="informe-key">Facturas conciliadas</span>
                <span className="informe-val">{conciliadas.length}</span>
              </div>
              <div className="informe-row informe-row-total">
                <span className="informe-key">Facturas pendientes</span>
                <span className="informe-val">{pendientes.length}</span>
              </div>
            </div>
          </div>

          <div className="informe-section">
            <h3>RESUMEN DE CONCILIACIÓN</h3>
            <div className="informe-grid">
              <div className="informe-row">
                <span className="informe-key">Compras conciliadas</span>
                <span className="informe-val">{filtered.filter(c => c.facturaCompra && c.estado === 'conciliada').length}</span>
              </div>
              <div className="informe-row">
                <span className="informe-key">Compras pendientes</span>
                <span className="informe-val">{filtered.filter(c => c.facturaCompra && c.estado !== 'conciliada').length}</span>
              </div>
              <div className="informe-row">
                <span className="informe-key">Ventas sin compra</span>
                <span className="informe-val">{ventasSinCompra.length}</span>
              </div>
              <div className="informe-row informe-row-total">
                <span className="informe-key">Compras sin venta</span>
                <span className="informe-val">{comprasSinVenta.length}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <DataTable data={data} columns={columns} searchPlaceholder={searchPlaceholder} emptyMessage={emptyMessage} />
      )}
    </div>
  )
}
