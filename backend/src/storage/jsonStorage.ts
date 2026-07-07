import type { Invoice, Conciliation, AppConfig } from '../models/invoice.js'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
// TEMPORARY debug — remove before production
import { traceRead, traceWrite } from './storageDebug.js'

const STORAGE_DIR = path.resolve(process.cwd(), '../storage')

interface CacheEntry<T> {
  data?: T
  promise?: Promise<T>
}

// Cache en memoria para evitar lecturas repetidas del mismo archivo JSON.
// Cada entrada almacena el dato parseado y/o una promesa pendiente para
// deduplicar lecturas concurrentes (ej: Promise.all del frontend).
const cache = new Map<string, CacheEntry<unknown>>()

function filePath(name: string): string {
  return path.join(STORAGE_DIR, name)
}

async function ensureDir() {
  if (!existsSync(STORAGE_DIR)) {
    await mkdir(STORAGE_DIR, { recursive: true })
  }
}

async function readJSON<T>(filename: string, defaultValue: T): Promise<T> {
  const entry = cache.get(filename) as CacheEntry<T> | undefined

  // Si ya hay un dato en caché, devolverlo sin leer el archivo
  if (entry?.data !== undefined) {
    // Devolver copia para evitar mutaciones accidentales del caché
    if (Array.isArray(entry.data)) return [...entry.data] as unknown as T
    if (typeof entry.data === 'object' && entry.data !== null) return { ...entry.data } as unknown as T
    return entry.data
  }

  // Si otra solicitud ya está leyendo este archivo, esperar su promesa
  if (entry?.promise) {
    return entry.promise
  }

  // Primera lectura: guardar la promesa para deduplicar concurrentes
  const promise = traceRead(filename, async () => {
    await ensureDir()
    const raw = await readFile(filePath(filename), 'utf-8')
    return JSON.parse(raw) as T
  })
  cache.set(filename, { promise })

  try {
    const data = await promise
    cache.set(filename, { data })
    return data
  } catch {
    cache.delete(filename)
    return defaultValue
  }
}

async function writeJSON<T>(filename: string, data: T): Promise<void> {
  return traceWrite(filename, async () => {
    await ensureDir()
    await writeFile(filePath(filename), JSON.stringify(data, null, 2), 'utf-8')
    // Actualizar caché inmediatamente para que las próximas lecturas
    // obtengan el dato nuevo sin releer el archivo
    cache.set(filename, { data })
  })
}
// TEMPORARY end

export async function getCompras(): Promise<Invoice[]> {
  return readJSON<Invoice[]>('compras.json', [])
}

export async function getVentas(): Promise<Invoice[]> {
  return readJSON<Invoice[]>('ventas.json', [])
}

export async function getConciliaciones(): Promise<Conciliation[]> {
  return readJSON<Conciliation[]>('conciliaciones.json', [])
}

export async function getConfig(): Promise<AppConfig> {
  return readJSON<AppConfig>('config.json', {
    nitEmpresa: '901957952',
    nombreEmpresa: 'CONSULTORIOS SAN FELIPE BENICIO S.A.S.',
  })
}

export async function saveCompras(items: Invoice[]): Promise<void> {
  await writeJSON('compras.json', items)
}

export async function saveVentas(items: Invoice[]): Promise<void> {
  await writeJSON('ventas.json', items)
}

export async function saveConciliaciones(items: Conciliation[]): Promise<void> {
  await writeJSON('conciliaciones.json', items)
}

export async function saveConfig(config: AppConfig): Promise<void> {
  await writeJSON('config.json', config)
}
