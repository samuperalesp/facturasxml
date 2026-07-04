import { useState, useEffect, useMemo, useCallback } from 'react'
import type { Invoice, Conciliation } from './models/invoice'
import type { AppConfig } from './models/config'
import { api } from './services/api'
import { getMonthName } from './utils/formatters'

type Tab = 'compras' | 'ventas' | 'conciliacion' | 'lista-maestra' | 'reportes'
type SortDir = 'asc' | 'desc'

function useApp() {
  const [config, setConfig] = useState<AppConfig>({ nitEmpresa: '901957952', nombreEmpresa: 'CONSULTORIOS SAN FELIPE BENICIO S.A.S.' })
  const [compras, setCompras] = useState<Invoice[]>([])
  const [ventas, setVentas] = useState<Invoice[]>([])
  const [conciliaciones, setConciliaciones] = useState<Conciliation[]>([])
  const [resumen, setResumen] = useState({ comprasCargadas: 0, ventasCargadas: 0, conciliadas: 0, pendientes: 0 })
  const [activeTab, setActiveTab] = useState<Tab>('compras')
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)

  const loadData = useCallback(async (m: number, a: number) => {
    try {
      const [cfg, comp, vent, conc, res] = await Promise.all([
        api.getConfig(),
        api.getCompras(m, a),
        api.getVentas(m, a),
        api.getConciliaciones(),
        api.getResumen(m, a),
      ])
      setConfig(cfg)
      setCompras(comp)
      setVentas(vent)
      setConciliaciones(conc)
      setResumen(res)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
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

  return {
    config, compras, ventas, conciliaciones, resumen,
    conciliadas, pendientes,
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
    activeTab, setActiveTab,
    mes, setMes, anio, setAnio, loading, importing, handleImport, handleReconcile,
  } = useApp()

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
    return <div className="app" style={{ textAlign: 'center', paddingTop: 80, color: 'var(--color-gray-400)' }}>Cargando...</div>
  }

  return (
    <div className="app">
      <div className="header">
        <div>
          <h1>Conciliador de Facturas XML</h1>
          <div className="header-subtitle">{config.nombreEmpresa}</div>
        </div>
      </div>

      <div className="period-row">
        <label>Período</label>
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

      <div className="cards-row">
        <div className="card">
          <div className="card-label">Compras Cargadas</div>
          <div className="card-value">{resumen.comprasCargadas}</div>
        </div>
        <div className="card">
          <div className="card-label">Ventas Cargadas</div>
          <div className="card-value">{resumen.ventasCargadas}</div>
        </div>
        <div className="card">
          <div className="card-label">Conciliadas</div>
          <div className="card-value green">{resumen.conciliadas}</div>
        </div>
        <div className="card">
          <div className="card-label">Pendientes</div>
          <div className="card-value orange">{resumen.pendientes}</div>
        </div>
      </div>

      <div className="actions-row">
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

      <div className="tabs">
        {tabs.map(tab => <TabButton key={tab.key} label={tab.label} active={activeTab === tab.key} onClick={() => setActiveTab(tab.key)} />)}
      </div>

      {activeTab === 'compras' && <DataTable data={compras} columns={invoiceColumns} searchPlaceholder="Buscar en compras..." emptyMessage={`No hay compras para ${getMonthName(mes)} ${anio}`} />}
      {activeTab === 'ventas' && <DataTable data={ventas} columns={invoiceColumns} searchPlaceholder="Buscar en ventas..." emptyMessage={`No hay ventas para ${getMonthName(mes)} ${anio}`} />}
      {activeTab === 'conciliacion' && <DataTable data={conciliaciones} columns={conciliationColumns} searchPlaceholder="Buscar en conciliaciones..." emptyMessage="No hay conciliaciones. Importa XML y concilia." />}
      {activeTab === 'lista-maestra' && (
        <div>
          <div className="actions-row">
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
      {activeTab === 'reportes' && <ReportsView conciliaciones={conciliaciones} mes={mes} anio={anio} />}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

function ReportsView({ conciliaciones, mes, anio }: { conciliaciones: Conciliation[]; mes: number; anio: number }) {
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroProveedor, setFiltroProveedor] = useState('')
  const [filtroCliente, setFiltroCliente] = useState('')
  const [filtroPaciente, setFiltroPaciente] = useState('')

  const filtered = useMemo(() => {
    return conciliaciones.filter(c => {
      const fecha = c.fechaCompra || c.fechaVenta
      if (!fecha) return false
      const d = new Date(fecha)
      if (d.getMonth() + 1 !== mes || d.getFullYear() !== anio) return false
      if (filtroEstado && c.estado !== filtroEstado) return false
      if (filtroProveedor && !c.proveedor.toLowerCase().includes(filtroProveedor.toLowerCase())) return false
      if (filtroCliente && !c.cliente.toLowerCase().includes(filtroCliente.toLowerCase())) return false
      if (filtroPaciente && !c.paciente.toLowerCase().includes(filtroPaciente.toLowerCase())) return false
      return true
    })
  }, [conciliaciones, mes, anio, filtroEstado, filtroProveedor, filtroCliente, filtroPaciente])

  const comprasSinVenta = filtered.filter(c => !c.facturaVenta && c.facturaCompra)
  const ventasSinCompra = filtered.filter(c => !c.facturaCompra && c.facturaVenta)
  const conciliadas = filtered.filter(c => c.estado === 'conciliada')
  const pendientes = filtered.filter(c => c.estado !== 'conciliada')
  const totalCompra = filtered.reduce((s, c) => s + c.valorCompra, 0)
  const totalVenta = filtered.reduce((s, c) => s + c.valorVenta, 0)

  const exportFiltros = () => {
    const params: Record<string, string> = {}
    if (filtroEstado) params.estado = filtroEstado
    if (filtroProveedor) params.proveedor = filtroProveedor
    if (filtroCliente) params.cliente = filtroCliente
    if (filtroPaciente) params.paciente = filtroPaciente
    return params
  }

  return (
    <div>
      <div className="report-filters">
        <select onChange={e => setFiltroEstado(e.target.value)} value={filtroEstado}>
          <option value="">Todos los estados</option>
          <option value="conciliada">Conciliadas</option>
          <option value="revisar">Revisar</option>
          <option value="pendiente">Pendientes</option>
        </select>
        <input placeholder="Proveedor" value={filtroProveedor} onChange={e => setFiltroProveedor(e.target.value)} />
        <input placeholder="Cliente" value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)} />
        <input placeholder="Paciente" value={filtroPaciente} onChange={e => setFiltroPaciente(e.target.value)} />
      </div>

      <div className="reports-grid">
        <div className="report-card">
          <h3>Compras sin Venta</h3>
          <p style={{ fontSize: 13, color: 'var(--color-gray-500)', marginBottom: 8 }}>{comprasSinVenta.length} registros</p>
          <button className="btn btn-outline" disabled={comprasSinVenta.length === 0}
            onClick={() => api.exportReporte('compras-sin-venta', mes, anio, exportFiltros())}>
            Exportar
          </button>
        </div>
        <div className="report-card">
          <h3>Ventas sin Compra</h3>
          <p style={{ fontSize: 13, color: 'var(--color-gray-500)', marginBottom: 8 }}>{ventasSinCompra.length} registros</p>
          <button className="btn btn-outline" disabled={ventasSinCompra.length === 0}
            onClick={() => api.exportReporte('ventas-sin-compra', mes, anio, exportFiltros())}>
            Exportar
          </button>
        </div>
        <div className="report-card">
          <h3>Conciliadas</h3>
          <p style={{ fontSize: 13, color: 'var(--color-gray-500)', marginBottom: 8 }}>{conciliadas.length} registros</p>
          <button className="btn btn-outline" disabled={conciliadas.length === 0}
            onClick={() => api.exportReporte('conciliadas', mes, anio, exportFiltros())}>
            Exportar
          </button>
        </div>
        <div className="report-card">
          <h3>Pendientes</h3>
          <p style={{ fontSize: 13, color: 'var(--color-gray-500)', marginBottom: 8 }}>{pendientes.length} registros</p>
          <button className="btn btn-outline" disabled={pendientes.length === 0}
            onClick={() => api.exportReporte('pendientes', mes, anio, exportFiltros())}>
            Exportar
          </button>
        </div>
        <div className="report-card">
          <h3>Diferencia Compra vs Venta</h3>
          <div style={{ fontSize: 13, lineHeight: 2 }}>
            <div>Total Compras: <strong>{fmt(totalCompra)}</strong></div>
            <div>Total Ventas: <strong>{fmt(totalVenta)}</strong></div>
            <div style={{ marginTop: 4 }}>
              Diferencia: <strong className={totalCompra > totalVenta ? 'text-red' : 'text-green'}>{fmt(totalCompra - totalVenta)}</strong>
            </div>
          </div>
        </div>
        <div className="report-card">
          <h3>Resumen Mensual</h3>
          <button className="btn btn-outline" style={{ marginTop: 8 }}
            onClick={() => api.exportReporte('resumen', mes, anio, exportFiltros())}>
            Exportar Excel
          </button>
        </div>
      </div>
    </div>
  )
}
