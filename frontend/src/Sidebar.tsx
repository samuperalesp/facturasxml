import { GitCompareArrows, Coins } from 'lucide-react'

export type SidebarView = 'conciliacion' | 'contabilidad'

interface SidebarProps {
  activeView: SidebarView
  onViewChange: (view: SidebarView) => void
}

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <Coins size={22} />
        <span className="sidebar-brand">Centro de Reportes</span>
      </div>

      <nav className="sidebar-nav">
        <button
          className={`sidebar-item ${activeView === 'conciliacion' ? 'active' : ''}`}
          onClick={() => onViewChange('conciliacion')}
        >
          <GitCompareArrows size={18} />
          <span>Conciliación</span>
        </button>

        <button
          className={`sidebar-item ${activeView === 'contabilidad' ? 'active' : ''}`}
          onClick={() => onViewChange('contabilidad')}
        >
          <Coins size={18} />
          <span>Contabilidad</span>
        </button>
      </nav>
    </aside>
  )
}
