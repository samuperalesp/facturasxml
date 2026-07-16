import { Coins } from 'lucide-react'

export function ContabilidadView() {
  return (
    <div className="contabilidad-view">
      <div className="contabilidad-placeholder">
        <div className="contabilidad-placeholder-icon">
          <Coins size={48} />
        </div>
        <h2>Próximamente</h2>
        <p>Módulo de Reportes Contables</p>
      </div>
    </div>
  )
}
