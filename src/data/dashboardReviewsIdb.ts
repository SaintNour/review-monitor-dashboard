/** Large review lists are stored in IndexedDB to avoid localStorage size limits. */
const DB_NAME = 'feedback-dashboard-reviews-v1'
const STORE = 'kv'
const KEY = 'dashboard-reviews-snapshot'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function putDashboardReviewsSnapshot(rows: unknown[]): Promise<void> {
  const db = await openDb()
  const payload = JSON.stringify(rows)
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.objectStore(STORE).put(payload, KEY)
  })
  db.close()
}

export async function getDashboardReviewsSnapshot(): Promise<unknown[] | null> {
  try {
    const db = await openDb()
    const raw = await new Promise<string | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      tx.onerror = () => reject(tx.error)
      const r = tx.objectStore(STORE).get(KEY)
      r.onsuccess = () => resolve(r.result as string | undefined)
      r.onerror = () => reject(r.error)
    })
    db.close()
    if (!raw || typeof raw !== 'string') return null
    const parsed = JSON.parse(raw) as unknown[]
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

export async function clearDashboardReviewsIdb(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
    req.onblocked = () => resolve()
  })
}
