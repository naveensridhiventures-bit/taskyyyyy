import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { configured, fetchAll, send } from './api'

const Ctx = createContext(null)
export const useStore = () => useContext(Ctx)

const EMPTY = { tasks: [], diet: [], learning: [], gym: [], daily: [], habits: [], finance: [], debts: [], accounts: [], goals: [], settings: [] }
const load = (k, f) => { try { return JSON.parse(localStorage.getItem(k)) ?? f } catch { return f } }

/* ---------- small helpers used everywhere ---------- */
const pad = n => String(n).padStart(2, '0')
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
export const num = v => Number(v) || 0
export const csv = s => (s === undefined || s === null || s === '' ? [] : String(s).split(',').filter(Boolean))
export const ym = d => d.slice(0, 7)
export const addMonths = (m, n) => { const [y, mo] = m.split('-').map(Number); const d = new Date(y, mo - 1 + n, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}` }
export const monthLabel = m => { const [y, mo] = m.split('-').map(Number); return new Date(y, mo - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) }
export const shortMonth = m => { const [y, mo] = m.split('-').map(Number); return new Date(y, mo - 1, 1).toLocaleDateString('en-IN', { month: 'short' }) }
export const dayDefault = d => ({ id: `day-${d}`, date: d, water: 0, sleep: '', weight: '', win: '', top3: '', focus: 0, habits: '' })
export const dayRow = (db, d) => db.daily.find(r => r.id === `day-${d}`) || dayDefault(d)
export const isTrue = v => v === true || String(v).toLowerCase() === 'true'

export const DEFAULT_SETTINGS = { kcal: 2000, protein: 80, water: 8, sleep: 8, morningHour: 7, reportHour: 21, email: '', mailMorning: true, mailReport: true }
export function settingsOf(db) {
  const r = (db.settings || []).find(x => x.id === 'main') || {}
  const n = (v, d) => (v === undefined || v === '' || isNaN(Number(v)) ? d : Number(v))
  const b = (v, d) => (v === undefined || v === '' ? d : isTrue(v))
  const D = DEFAULT_SETTINGS
  return { kcal: n(r.kcal, D.kcal), protein: n(r.protein, D.protein), water: n(r.water, D.water), sleep: n(r.sleep, D.sleep), morningHour: n(r.morningHour, D.morningHour), reportHour: n(r.reportHour, D.reportHour), email: r.email || '', mailMorning: b(r.mailMorning, D.mailMorning), mailReport: b(r.mailReport, D.mailReport) }
}
export const remindLabel = m => ({ '0': 'At time', '10': '10 min before', '30': '30 min before', '60': '1 hour before', '1440': '1 day before' }[String(m)] || `${m} min before`)
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
  const dbRef = useRef(db)
  const commit = next => { dbRef.current = next; setDb(next) }
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
      if (!queue.current.length) commit({ ...EMPTY, ...data })
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
    const cur = dbRef.current
    const list = cur[table] || []
    const i = list.findIndex(r => r.id === row.id)
    commit({ ...cur, [table]: i >= 0 ? list.map((r, j) => (j === i ? row : r)) : [...list, row] })
    queue.current = queue.current.filter(o => !(o.op === 'upsert' && o.table === table && o.row.id === row.id))
    queue.current.push({ op: 'upsert', table, row })
    saveQ()
    if (configured) { setStatus('syncing'); flush().then(ok => ok && setStatus('synced')) }
  }

  const remove = (table, id) => {
    const cur = dbRef.current
    commit({ ...cur, [table]: (cur[table] || []).filter(r => r.id !== id) })
    queue.current = queue.current.filter(o => !(o.table === table && o.row?.id === id))
    queue.current.push({ op: 'delete', table, id })
    saveQ()
    if (configured) flush().then(ok => ok && setStatus('synced'))
  }

  // one row per day holds water, sleep, weight, win, top3, focus minutes and habit ticks
  const patchDay = (d, patch) => { const cur = dayRow(dbRef.current, d); upsert('daily', { ...cur, ...(typeof patch === 'function' ? patch(cur) : patch) }) }

  const saveSettings = patch => upsert('settings', { id: 'main', ...settingsOf(dbRef.current), ...patch })
  const settings = settingsOf(db)

  return <Ctx.Provider value={{ db, status, upsert, remove, sync, patchDay, settings, saveSettings }}>{children}</Ctx.Provider>
}
