import type { Invoice, Conciliation } from '../models/invoice'
import type { AppConfig } from '../models/config'

const API = '/api'

async function uploadFiles(files: FileList, tipo: 'compra' | 'venta'): Promise<{ importados: number; total: number; errores?: string[] }> {
  const formData = new FormData()
  for (let i = 0; i < files.length; i++) {
    formData.append('files', files[i])
  }
  const res = await fetch(`${API}/facturas/importar?tipo=${tipo}`, {
    method: 'POST',
    body: formData,
  })
  if (res.status === 400) {
    const err = await res.json()
    throw new Error(err.error || 'Error en la importación')
  }
  if (!res.ok) throw new Error('Error de conexión con el servidor')
  return res.json()
}

async function reconciliar(): Promise<{ conciliadas: number; total: number }> {
  const res = await fetch(`${API}/conciliar`, { method: 'POST' })
  if (!res.ok) throw new Error('Error al conciliar')
  return res.json()
}

async function getCompras(mes?: number, anio?: number): Promise<Invoice[]> {
  const params = new URLSearchParams()
  if (mes) params.set('mes', String(mes))
  if (anio) params.set('anio', String(anio))
  const res = await fetch(`${API}/compras?${params}`)
  if (!res.ok) throw new Error('Error al obtener compras')
  return res.json()
}

async function getVentas(mes?: number, anio?: number): Promise<Invoice[]> {
  const params = new URLSearchParams()
  if (mes) params.set('mes', String(mes))
  if (anio) params.set('anio', String(anio))
  const res = await fetch(`${API}/ventas?${params}`)
  if (!res.ok) throw new Error('Error al obtener ventas')
  return res.json()
}

async function getConciliaciones(mes?: number, anio?: number): Promise<Conciliation[]> {
  const params = new URLSearchParams()
  if (mes) params.set('mes', String(mes))
  if (anio) params.set('anio', String(anio))
  const res = await fetch(`${API}/conciliaciones?${params}`)
  if (!res.ok) throw new Error('Error al obtener conciliaciones')
  return res.json()
}

async function getListaMaestra(mes?: number, anio?: number): Promise<Conciliation[]> {
  const params = new URLSearchParams()
  if (mes) params.set('mes', String(mes))
  if (anio) params.set('anio', String(anio))
  const res = await fetch(`${API}/lista-maestra?${params}`)
  if (!res.ok) throw new Error('Error al obtener lista maestra')
  return res.json()
}

async function getResumen(mes?: number, anio?: number): Promise<{
  comprasCargadas: number
  ventasCargadas: number
  conciliadas: number
  pendientes: number
}> {
  const params = new URLSearchParams()
  if (mes) params.set('mes', String(mes))
  if (anio) params.set('anio', String(anio))
  const res = await fetch(`${API}/resumen?${params}`)
  if (!res.ok) throw new Error('Error al obtener resumen')
  return res.json()
}

async function getConfig(): Promise<AppConfig> {
  const res = await fetch(`${API}/config`)
  if (!res.ok) throw new Error('Error al obtener config')
  return res.json()
}

function downloadExport(url: string, filename: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
}

function exportListaMaestra(mes?: number, anio?: number) {
  const params = new URLSearchParams()
  params.set('exportar', 'true')
  if (mes) params.set('mes', String(mes))
  if (anio) params.set('anio', String(anio))
  downloadExport(`${API}/lista-maestra?${params}`, `Lista_Maestra_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

function exportReporte(tipo: string, mes?: number, anio?: number, filtros?: Record<string, string>) {
  const params = new URLSearchParams()
  params.set('exportar', 'true')
  if (mes) params.set('mes', String(mes))
  if (anio) params.set('anio', String(anio))
  if (filtros) {
    for (const [k, v] of Object.entries(filtros)) {
      if (v) params.set(k, v)
    }
  }
  downloadExport(`${API}/reportes/${tipo}?${params}`, `${tipo}_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

export const api = {
  uploadFiles,
  reconciliar,
  getCompras,
  getVentas,
  getConciliaciones,
  getListaMaestra,
  getResumen,
  getConfig,
  exportListaMaestra,
  exportReporte,
}
