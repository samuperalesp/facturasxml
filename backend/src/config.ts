import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'

export interface AppConfig {
  storageType: 'firestore' | 'json'
  firebase: {
    projectId?: string
    clientEmail?: string
    privateKey?: string
    serviceAccountPath?: string
  }
}

let config: AppConfig | null = null

export function loadConfig(): AppConfig {
  if (config) return config

  const configPath = path.resolve(process.cwd(), 'config.json')
  const envPath = path.resolve(process.cwd(), '.env')

  if (existsSync(configPath)) {
    const raw = JSON.parse(readFileSync(configPath, 'utf-8'))
    config = raw as AppConfig
    return config
  }

  config = {
    storageType: (process.env.STORAGE_TYPE as 'firestore' | 'json') || 'json',
    firebase: {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY,
      serviceAccountPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    },
  }
  return config
}
