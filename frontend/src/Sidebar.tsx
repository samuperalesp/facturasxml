import { ArrowLeftRight, ChartNoAxesColumnIncreasing, Receipt } from 'lucide-react'

export type SidebarView = 'conciliacion' | 'contabilidad' | 'facturacion'

interface SidebarProps {
  activeView: SidebarView
  onViewChange: (view: SidebarView) => void
}

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <ChartNoAxesColumnIncreasing size={22} />
        <span className="sidebar-brand">Centro de Reportes</span>
      </div>

      <nav className="sidebar-nav">
        <button
          className={`sidebar-item ${activeView === 'conciliacion' ? 'active' : ''}`}
          onClick={() => onViewChange('conciliacion')}
        >
          <ArrowLeftRight size={20} />
          <span>Conciliación</span>
        </button>

        <button
          className={`sidebar-item ${activeView === 'contabilidad' ? 'active' : ''}`}
          onClick={() => onViewChange('contabilidad')}
        >
          <ChartNoAxesColumnIncreasing size={20} />
          <span>Reportes Contables</span>
        </button>

        <button
          className={`sidebar-item ${activeView === 'facturacion' ? 'active' : ''}`}
          onClick={() => onViewChange('facturacion')}
        >
          <Receipt size={20} />
          <span>Reportes de Facturación</span>
        </button>
      </nav>
    </aside>
  )
}
