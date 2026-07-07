import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import { loadConfig } from '../config.js'
import type { Invoice, Conciliation, AppConfig, PeriodSummary, PeriodReport } from '../models/invoice.js'

let db: Firestore | null = null

function getDb(): Firestore {
  if (db) return db

  const cfg = loadConfig()
  if (getApps().length === 0) {
    const opts: Record<string, unknown> = { projectId: cfg.firebase.projectId }

    if (cfg.firebase.serviceAccountPath) {
      opts.credential = cert(cfg.firebase.serviceAccountPath)
    } else if (cfg.firebase.clientEmail && cfg.firebase.privateKey) {
      opts.credential = cert({
        projectId: cfg.firebase.projectId,
        clientEmail: cfg.firebase.clientEmail,
        privateKey: cfg.firebase.privateKey?.replace(/\\n/g, '\n'),
      })
    }

    initializeApp(opts)
  }

  db = getFirestore()
  return db
}

function periodoKey(fecha: string): string {
  const d = new Date(fecha)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// ─── Invoices ──────────────────────────────────────────────────────────

export async function getInvoicesByPeriod(tipo: 'compra' | 'venta', mes?: number, anio?: number): Promise<Invoice[]> {
  let query = getDb().collection('invoices').where('tipo', '==', tipo) as FirebaseFirestore.Query<FirebaseFirestore.DocumentData>

  if (mes && anio) {
    const start = `${anio}-${String(mes).padStart(2, '0')}`
    query = query.where('periodo', '==', start)
  }

  const snapshot = await query.get()
  return snapshot.docs.map(d => d.data() as Invoice)
}

export async function getAllInvoices(): Promise<Invoice[]> {
  const snapshot = await getDb().collection('invoices').get()
  return snapshot.docs.map(d => d.data() as Invoice)
}

export async function getCompras(): Promise<Invoice[]> {
  return getInvoicesByPeriod('compra')
}

export async function getVentas(): Promise<Invoice[]> {
  return getInvoicesByPeriod('venta')
}

export async function saveInvoices(invoices: Invoice[]): Promise<void> {
  const batch = getDb().batch()
  const collection = getDb().collection('invoices')

  for (const inv of invoices) {
    const docRef = collection.doc(inv.id)
    batch.set(docRef, { ...inv, periodo: periodoKey(inv.fecha) }, { merge: true })
  }

  await batch.commit()
}

// ─── Conciliaciones ────────────────────────────────────────────────────

export async function getConciliaciones(mes?: number, anio?: number): Promise<Conciliation[]> {
  let query = getDb().collection('conciliaciones') as FirebaseFirestore.Query<FirebaseFirestore.DocumentData>

  if (mes && anio) {
    const start = `${anio}-${String(mes).padStart(2, '0')}`
    query = query.where('periodo', '==', start)
  }

  const snapshot = await query.get()
  return snapshot.docs.map(d => d.data() as Conciliation)
}

export async function getAllConciliaciones(): Promise<Conciliation[]> {
  const snapshot = await getDb().collection('conciliaciones').get()
  return snapshot.docs.map(d => d.data() as Conciliation)
}

export async function saveConciliaciones(items: Conciliation[]): Promise<void> {
  const batch = getDb().batch()
  const collection = getDb().collection('conciliaciones')

  for (const c of items) {
    const docRef = collection.doc(c.id)
    const fecha = c.fechaCompra || c.fechaVenta
    batch.set(docRef, { ...c, periodo: fecha ? periodoKey(fecha) : '' }, { merge: true })
  }

  await batch.commit()
}

// ─── Config ────────────────────────────────────────────────────────────

export async function getConfig(): Promise<AppConfig> {
  const docRef = getDb().collection('config').doc('app')
  const doc = await docRef.get()
  if (!doc.exists) {
    return { nitEmpresa: '901957952', nombreEmpresa: 'CONSULTORIOS SAN FELIPE BENICIO S.A.S.' }
  }
  return doc.data() as AppConfig
}

export async function saveConfig(cfg: AppConfig): Promise<void> {
  await getDb().collection('config').doc('app').set(cfg, { merge: true })
}

// ─── Summaries (Read-Optimized KPIs) ──────────────────────────────────

export async function getSummary(mes: number, anio: number): Promise<PeriodSummary | null> {
  const periodo = `${anio}-${String(mes).padStart(2, '0')}`
  const docRef = getDb().collection('summaries').doc(periodo)
  const doc = await docRef.get()
  return doc.exists ? (doc.data() as PeriodSummary) : null
}

export async function saveSummary(summary: PeriodSummary): Promise<void> {
  await getDb().collection('summaries').doc(summary.periodo).set(summary, { merge: true })
}

// ─── Reports (Read-Optimized per period) ──────────────────────────────

export async function getPeriodReport(mes: number, anio: number): Promise<PeriodReport | null> {
  const periodo = `${anio}-${String(mes).padStart(2, '0')}`
  const docRef = getDb().collection('reports').doc(periodo)
  const doc = await docRef.get()
  return doc.exists ? (doc.data() as PeriodReport) : null
}

export async function savePeriodReport(report: PeriodReport): Promise<void> {
  await getDb().collection('reports').doc(report.periodo).set(report, { merge: true })
}
