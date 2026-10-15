import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { configured, fetchAll, send } from './api'

const Ctx = createContext(null)
export const useStore = () => useContext(Ctx)

const EMPTY = { tasks: [], diet: [], learning: [], gym: [] }
const load = (k, f) => { try { return JSON.parse(localStorage.getItem(k)) ?? f } catch { return f } }

/* ---------- small helpers used everywhere ---------- */
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
export const isTrue = v => v === true || String(v).toLowerCase() === 'true'
const pad = n => String(n).padStart(2, '0')
export const dstr = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const toDate = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
export const addDays = (s, n) => { const d = toDate(s); d.setDate(d.getDate() + n); return dstr(d) }
export const prettyDate = s => toDate(s).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
export const weekday = s => toDate(s).toLocaleDateString('en-IN', { weekday: 'short' })
export const dayNum = s => toDate(s).getDate()
export const fmtTime = t => {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${pad(m)} ${h >= 12 ? 'PM' : 'AM'}`
}

export function StoreProvider({ children }) {
  const [db, setDb] = useState(() => ({ ...EMPTY, ...load('df-db', EMPTY) }))
  const [status, setStatus] = useState(configured ? 'syncing' : 'local')
  const queue = useRef(load('df-queue', []))
  const busy = useRef(false)

  useEffect(() => { localStorage.setItem('df-db', JSON.stringify(db)) }, [db])
  const saveQ = () => localStorage.setItem('df-queue', JSON.stringify(queue.current))

  // push queued changes to Google Sheet
  const flush = useCallback(async () => {
    if (!configured || busy.current || !queue.current.length) return true
    busy.current = true
    const batch = [...queue.current]
    try {
      await send(batch)
      queue.current = queue.current.filter(o => !batch.includes(o))
      saveQ()
      busy.current = false
      return true
    } catch {
      busy.current = false
      setStatus('offline')
      return false
    }
  }, [])

  // push local changes, then pull the latest from the sheet
  const sync = useCallback(async () => {
    if (!configured) return
    setStatus('syncing')
    if (!(await flush())) return
    try {
      const data = await fetchAll()
      if (!queue.current.length) setDb({ ...EMPTY, ...data })
      setStatus('synced')
    } catch { setStatus('offline') }
  }, [flush])

  useEffect(() => {
    sync()
    const onVis = () => document.visibilityState === 'visible' && sync()
    window.addEventListener('online', sync)
    document.addEventListener('visibilitychange', onVis)
    return () => { window.removeEventListener('online', sync); document.removeEventListener('visibilitychange', onVis) }
  }, [sync])

  const upsert = (table, row) => {
    setDb(d => {
      const list = d[table]
      const i = list.findIndex(r => r.id === row.id)
      return { ...d, [table]: i >= 0 ? list.map((r, j) => (j === i ? row : r)) : [...list, row] }
    })
    queue.current = queue.current.filter(o => !(o.op === 'upsert' && o.table === table && o.row.id === row.id))
    queue.current.push({ op: 'upsert', table, row })
    saveQ()
    if (configured) { setStatus('syncing'); flush().then(ok => ok && setStatus('synced')) }
  }

  const remove = (table, id) => {
    setDb(d => ({ ...d, [table]: d[table].filter(r => r.id !== id) }))
    queue.current = queue.current.filter(o => !(o.table === table && (o.row?.id === id)))
    queue.current.push({ op: 'delete', table, id })
    saveQ()
    if (configured) flush().then(ok => ok && setStatus('synced'))
  }

  return <Ctx.Provider value={{ db, status, upsert, remove, sync }}>{children}</Ctx.Provider>
}
