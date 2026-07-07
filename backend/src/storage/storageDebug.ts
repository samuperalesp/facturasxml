// ============================================================
// TEMPORARY — Storage Debug Instrumentation
// Remove this file and all references to it before production.
// ============================================================

let readCount = 0
let writeCount = 0

function getCaller(): string {
  const stack = new Error().stack
  if (!stack) return 'unknown'
  const lines = stack.split('\n')
  // Skip Error, traceRead/traceWrite and jsonStorage internal frames
  for (const line of lines) {
    const clean = line.trim()
    if (!clean || clean.startsWith('Error')) continue
    if (clean.includes('storageDebug.ts')) continue
    if (clean.includes('jsonStorage.ts')) continue
    // Found first external caller — extract function name
    const match = clean.match(/at\s+(?:async\s+)?(\S+)\s+\(|at\s+(?:async\s+)?(\S+)\s/) || clean.match(/at\s+.+\((.+?):\d+:\d+\)/)
    if (match) {
      const name = match[1] || match[2]
      if (name && name !== '<anonymous>' && name !== 'traceRead' && name !== 'traceWrite') {
        return name
      }
    }
    return clean.replace(/^at\s+/, '').replace(/\(.*\)/, '').trim()
  }
  return 'unknown'
}

async function trace<T>(label: string, filename: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now()
  const caller = getCaller()
  try {
    const result = await fn()
    const elapsed = Math.round(performance.now() - start)
    const count = label === 'READ' ? ++readCount : ++writeCount
    console.log(`\n${label === 'READ' ? '📖' : '✍️'} ${label} #${count} -> ${filename} (${elapsed} ms)`)
    if (caller) {
      console.log(`Solicitado por:\n${caller}`)
    }
    console.log('')
    return result
  } catch (e) {
    const elapsed = Math.round(performance.now() - start)
    const count = label === 'READ' ? ++readCount : ++writeCount
    console.log(`\n${label === 'READ' ? '📖' : '✍️'} ${label} #${count} -> ${filename} (${elapsed} ms) [ERROR]`)
    if (caller) {
      console.log(`Solicitado por:\n${caller}`)
    }
    console.log('')
    throw e
  } finally {
    printSummary()
  }
}

export function traceRead<T>(filename: string, fn: () => Promise<T>): Promise<T> {
  return trace('READ', filename, fn)
}

export function traceWrite<T>(filename: string, fn: () => Promise<T>): Promise<T> {
  return trace('WRITE', filename, fn)
}

function printSummary() {
  const total = readCount + writeCount
  if (total === 0) return
  const bar = '='.repeat(Math.max(25, `Storage Debug`.length + 4))
  console.log(`\n${bar}`)
  console.log(`Storage Debug`)
  console.log(bar)
  console.log(`Reads : ${readCount}`)
  console.log(`Writes: ${writeCount}`)
  console.log(`${bar}\n`)
}
// ============================================================
// END TEMPORARY
// ============================================================
