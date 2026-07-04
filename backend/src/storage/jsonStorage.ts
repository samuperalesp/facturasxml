import type { Invoice, Conciliation, AppConfig } from '../models/invoice.js'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const STORAGE_DIR = path.resolve(process.cwd(), '../storage')

function filePath(name: string): string {
  return path.join(STORAGE_DIR, name)
}

async function ensureDir() {
  if (!existsSync(STORAGE_DIR)) {
    await mkdir(STORAGE_DIR, { recursive: true })
  }
}

async function readJSON<T>(filename: string, defaultValue: T): Promise<T> {
  try {
    await ensureDir()
    const data = await readFile(filePath(filename), 'utf-8')
    return JSON.parse(data) as T
  } catch {
    return defaultValue
  }
}

async function writeJSON<T>(filename: string, data: T): Promise<void> {
  await ensureDir()
  await writeFile(filePath(filename), JSON.stringify(data, null, 2), 'utf-8')
}

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
