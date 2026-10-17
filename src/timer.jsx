import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { useStore, dstr, dayRow, num } from './store'
import { vib } from './alarm'

const Ctx = createContext(null)
export const useTimer = () => useContext(Ctx)

export const MODES = {
  focus: { label: 'Focus', min: 25 },
  short: { label: 'Short break', min: 5 },
  long: { label: 'Long break', min: 15 },
  deep: { label: 'Deep work', min: 50 }
}

const load = () => { try { return JSON.parse(localStorage.getItem('df-timer')) } catch { return null } }

function beep() {
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)()
    ;[0, 0.25, 0.5].forEach(t => {
      const o = ac.createOscillator(), g = ac.createGain()
      o.frequency.value = 880; o.connect(g); g.connect(ac.destination)
      g.gain.setValueAtTime(0.2, ac.currentTime + t); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + t + 0.2)
      o.start(ac.currentTime + t); o.stop(ac.currentTime + t + 0.22)
    })
  } catch { /* audio not available */ }
}

export function TimerProvider({ children }) {
  const { patchDay } = useStore()
  const [t, setT] = useState(() => load() || { mode: 'focus', total: 1500, left: 1500, endAt: null, label: '' })
  const [now, setNow] = useState(Date.now())
  const tRef = useRef(t)
  tRef.current = t

  useEffect(() => { localStorage.setItem('df-timer', JSON.stringify(t)) }, [t])

  const complete = useCallback(() => {
    const cur = tRef.current
    if (!cur.endAt) return
    const next = { ...cur, endAt: null, left: cur.total }
    tRef.current = next
    setT(next)
    if (cur.mode !== 'short' && cur.mode !== 'long') {
      const d = dstr()
      patchDay(d, r => ({ focus: num(r.focus) + Math.round(cur.total / 60) }))
    }
    beep()
    vib([200, 100, 200])
    navigator.serviceWorker?.ready.then(r => r.showNotification('DailyFlow timer', { body: cur.mode === 'focus' || cur.mode === 'deep' ? 'Focus session done. Take a short break.' : 'Break over. Back to it.', icon: '/pwa-192.png' })).catch(() => {})
  }, [patchDay])

  useEffect(() => {
    if (!t.endAt) return
    const id = setInterval(() => { const n = Date.now(); setNow(n); if (n >= tRef.current.endAt) complete() }, 250)
    return () => clearInterval(id)
  }, [t.endAt, complete])

  const left = t.endAt ? Math.max(0, Math.ceil((t.endAt - now) / 1000)) : t.left
  const api = {
    ...t, left, running: !!t.endAt,
    start: () => { setNow(Date.now()); setT(c => ({ ...c, endAt: Date.now() + c.left * 1000 })) },
    pause: () => setT(c => ({ ...c, left: Math.max(1, Math.ceil((c.endAt - Date.now()) / 1000)), endAt: null })),
    reset: () => setT(c => ({ ...c, endAt: null, left: c.total })),
    setMode: m => setT(c => ({ ...c, mode: m, total: MODES[m].min * 60, left: MODES[m].min * 60, endAt: null })),
    setLabel: label => setT(c => ({ ...c, label }))
  }
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}
