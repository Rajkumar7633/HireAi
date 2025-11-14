// Lightweight Redis cache helper with safe fallbacks
// Requires: set ANALYTICS_CACHE=1 and provide REDIS_URL to enable.
// If ioredis is not installed or env is missing, functions become no-ops.

let cached: any = (globalThis as any).__redisClient || null

async function getClient() {
  if (cached !== null) return cached
  try {
    if (process.env.ANALYTICS_CACHE !== '1') {
      cached = null
      ;(globalThis as any).__redisClient = cached
      return cached
    }
    const url = process.env.REDIS_URL || process.env.REDIS_TLS_URL || ''
    if (!url) {
      cached = null
      ;(globalThis as any).__redisClient = cached
      return cached
    }
    // dynamic import to avoid hard dependency when flag is off
    const mod = await import('ioredis')
    const Redis = (mod as any).default || (mod as any)
    const client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      enableAutoPipelining: false,
      retryStrategy: () => null,
      reconnectOnError: () => false,
    })
    try {
      // prevent unhandled error events from crashing or spamming logs
      client.on?.('error', () => {})
    } catch {}
    try {
      await client.connect?.()
      // quick sanity ping with timeout guard
      const ping = new Promise((resolve, reject) => {
        let done = false
        const t = setTimeout(() => { if (!done) { done = true; reject(new Error('redis ping timeout')) } }, 1000)
        client.ping?.().then((r: any) => { if (!done) { done = true; clearTimeout(t); resolve(r) } }).catch((e: any) => { if (!done) { done = true; clearTimeout(t); reject(e) } })
      })
      await ping
      cached = client
    } catch {
      try { client.disconnect?.() } catch {}
      cached = null
    }
    ;(globalThis as any).__redisClient = cached
    return cached
  } catch {
    cached = null
    ;(globalThis as any).__redisClient = cached
    return cached
  }
}

export async function cacheGet(key: string): Promise<string | null> {
  const client = await getClient()
  if (!client) return null
  try { return await client.get(key) } catch { return null }
}

export async function cacheSet(key: string, value: string, ttlSeconds = 60): Promise<void> {
  const client = await getClient()
  if (!client) return
  try { await client.set(key, value, 'EX', ttlSeconds) } catch {}
}

export function cacheKey(parts: Record<string, any>): string {
  const sorted = Object.keys(parts).sort().reduce((acc, k) => { acc[k] = parts[k]; return acc }, {} as any)
  return 'analytics:' + Buffer.from(JSON.stringify(sorted)).toString('base64')
}
