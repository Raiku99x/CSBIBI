// Simple module-level cache with TTL (time-to-live)
const store = {}

export function getCache(key) {
  const entry = store[key]
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    delete store[key]
    return null
  }
  return entry.data
}

export function setCache(key, data, ttlMs = 60_000) {
  store[key] = { data, expiresAt: Date.now() + ttlMs }
}

export function clearCache(key) {
  delete store[key]
}
