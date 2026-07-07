import { loadConfig } from '../config.js'
import type { Invoice, Conciliation, AppConfig, PeriodSummary, PeriodReport } from '../models/invoice.js'
import * as jsonStorage from './jsonStorage.js'

let firebaseStorage: typeof import('./firebaseStorage.js') | null = null

async function getFirebase() {
  if (!firebaseStorage) {
    firebaseStorage = await import('./firebaseStorage.js')
  }
  return firebaseStorage
}

function isFirestore(): boolean {
  return loadConfig().storageType === 'firestore'
}

// ─── Invoices ──────────────────────────────────────────────────────────

function filterByPeriod<T extends { fecha?: string }>(items: T[], mes?: number, anio?: number): T[] {
  if (!mes && !anio) return items
  return items.filter(i => {
    if (!i.fecha) return false
    const d = new Date(i.fecha)
    if (mes && d.getMonth() + 1 !== mes) return false
    if (anio && d.getFullYear() !== anio) return false
    return true
  })
}

export async function getInvoicesByPeriod(tipo: 'compra' | 'venta', mes?: number, anio?: number): Promise<Invoice[]> {
  if (isFirestore()) {
    const fb = await getFirebase()
    return fb.getInvoicesByPeriod(tipo, mes, anio)
  }
  const items = tipo === 'compra' ? await jsonStorage.getCompras() : await jsonStorage.getVentas()
  return filterByPeriod(items, mes, anio)
}

export async function getAllInvoices(): Promise<Invoice[]> {
  if (isFirestore()) {
    const fb = await getFirebase()
    return fb.getAllInvoices()
  }
  const [compras, ventas] = await Promise.all([jsonStorage.getCompras(), jsonStorage.getVentas()])
  return [...compras, ...ventas]
}

export async function getCompras(): Promise<Invoice[]> {
  if (isFirestore()) {
    const fb = await getFirebase()
    return fb.getCompras()
  }
  return jsonStorage.getCompras()
}

export async function getVentas(): Promise<Invoice[]> {
  if (isFirestore()) {
    const fb = await getFirebase()
    return fb.getVentas()
  }
  return jsonStorage.getVentas()
}

export async function saveInvoices(invoices: Invoice[]): Promise<void> {
  if (isFirestore()) {
    const fb = await getFirebase()
    return fb.saveInvoices(invoices)
  }
  for (const inv of invoices) {
    if (inv.tipo === 'compra') {
      const existing = await jsonStorage.getCompras()
      existing.push(inv)
      await jsonStorage.saveCompras(existing)
    } else {
      const existing = await jsonStorage.getVentas()
      existing.push(inv)
      await jsonStorage.saveVentas(existing)
    }
  }
}

// ─── Conciliaciones ────────────────────────────────────────────────────

export async function getConciliaciones(mes?: number, anio?: number): Promise<Conciliation[]> {
  if (isFirestore()) {
    const fb = await getFirebase()
    return fb.getConciliaciones(mes, anio)
  }
  const items = await jsonStorage.getConciliaciones()
  if (!mes && !anio) return items
  return items.filter(c => {
    const fecha = c.fechaCompra || c.fechaVenta
    if (!fecha) return false
    const d = new Date(fecha)
    if (mes && d.getMonth() + 1 !== mes) return false
    if (anio && d.getFullYear() !== anio) return false
    return true
  })
}

export async function getAllConciliaciones(): Promise<Conciliation[]> {
  if (isFirestore()) {
    const fb = await getFirebase()
    return fb.getAllConciliaciones()
  }
  return jsonStorage.getConciliaciones()
}

export async function saveConciliaciones(items: Conciliation[]): Promise<void> {
  if (isFirestore()) {
    const fb = await getFirebase()
    return fb.saveConciliaciones(items)
  }
  return jsonStorage.saveConciliaciones(items)
}

// ─── Config ────────────────────────────────────────────────────────────

export async function getConfig(): Promise<AppConfig> {
  if (isFirestore()) {
    const fb = await getFirebase()
    return fb.getConfig()
  }
  return jsonStorage.getConfig()
}

export async function saveConfig(cfg: AppConfig): Promise<void> {
  if (isFirestore()) {
    const fb = await getFirebase()
    return fb.saveConfig(cfg)
  }
  return jsonStorage.saveConfig(cfg)
}

// ─── Summaries (Read-Optimized) ────────────────────────────────────────

export async function getSummary(mes: number, anio: number): Promise<PeriodSummary | null> {
  if (isFirestore()) {
    const fb = await getFirebase()
    return fb.getSummary(mes, anio)
  }
  return null
}

export async function saveSummary(summary: PeriodSummary): Promise<void> {
  if (isFirestore()) {
    const fb = await getFirebase()
    return fb.saveSummary(summary)
  }
}

// ─── Reports (Read-Optimized) ──────────────────────────────────────────

export async function getPeriodReport(mes: number, anio: number): Promise<PeriodReport | null> {
  if (isFirestore()) {
    const fb = await getFirebase()
    return fb.getPeriodReport(mes, anio)
  }
  return null
}

export async function savePeriodReport(report: PeriodReport): Promise<void> {
  if (isFirestore()) {
    const fb = await getFirebase()
    return fb.savePeriodReport(report)
  }
}
