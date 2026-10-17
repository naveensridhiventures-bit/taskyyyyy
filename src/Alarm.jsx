import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Check, AlarmClockOff, Clock } from 'lucide-react'
import { useStore, isTrue, num, fmtTime, remindLabel } from './store'
import { startAlarm, stopAlarm } from './alarm'
import { spring } from './ui'

const load = k => { try { return JSON.parse(localStorage.getItem(k)) || {} } catch { return {} } }
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v))
const dueMs = t => { const [y, m, d] = t.date.split('-').map(Number); const [hh, mm] = t.time.split(':').map(Number); return new Date(y, m - 1, d, hh, mm).getTime() }

// rings at (due time - "remind me" lead time) while the app is open.
// Google Calendar + email cover the times when the app is closed.
export default function Alarm() {
  const { db, upsert } = useStore()
  const [ring, setRing] = useState(null)
  const tasks = useRef(db.tasks); tasks.current = db.tasks
  const ringing = useRef(null); ringing.current = ring

  useEffect(() => {
    const check = () => {
      if (ringing.current) return
      const now = Date.now()
      const alerted = load('df-alerted'), snooze = load('df-snooze')
      for (const k of Object.keys(alerted)) if (now - alerted[k] > 3 * 86400000) delete alerted[k]
      for (const t of tasks.current) {
        if (isTrue(t.done) || !t.time || t.remind === undefined || t.remind === null || String(t.remind) === '') continue
        const due = dueMs(t), at = due - num(t.remind) * 60000
        const key = `${t.id}|${t.date}|${t.time}|${t.remind}`
        const sn = snooze[t.id]
        const was = alerted[key]
        if (was && !(sn && now >= sn)) continue
        if (!was && !(now >= at && now <= due + 2 * 3600000)) continue
        if (sn) { delete snooze[t.id]; save('df-snooze', snooze) }
        alerted[key] = now; save('df-alerted', alerted)
        setRing(t); startAlarm()
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          navigator.serviceWorker?.ready.then(r => r.showNotification(`⏰ ${t.title}`, { body: `Due at ${fmtTime(t.time)}`, tag: key, icon: '/pwa-192.png', vibrate: [200, 100, 200], requireInteraction: true })).catch(() => {})
        }
        return
      }
    }
    check()
    const id = setInterval(check, 5000)
    return () => clearInterval(id)
  }, [])

  const close = () => { stopAlarm(); setRing(null) }
  const done = () => { upsert('tasks', { ...ring, done: true }); close() }
  const snoozeIt = () => { const s = load('df-snooze'); s[ring.id] = Date.now() + 10 * 60000; save('df-snooze', s); close() }

  return createPortal(
    <AnimatePresence>
      {ring && (
        <motion.div className="alarm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="alarm-card" initial={{ scale: 0.7, y: 40 }} animate={{ scale: 1, y: 0 }} transition={spring}>
            <div className="alarm-rings"><i /><i /><i /></div>
            <motion.div className="alarm-bell" animate={{ rotate: [0, 18, -16, 14, -10, 0] }} transition={{ repeat: Infinity, duration: 0.9 }}><Bell size={44} /></motion.div>
            <small>Reminder · {remindLabel(ring.remind)}</small>
            <h2>{ring.title}</h2>
            <p><Clock size={15} style={{ verticalAlign: -2 }} /> Due at {fmtTime(ring.time)}</p>
            <div className="alarm-btns">
              <motion.button className="btn" whileTap={{ scale: 0.96 }} onClick={done}><Check size={18} style={{ verticalAlign: -3 }} /> Done</motion.button>
              <div className="two">
                <motion.button className="ghost" whileTap={{ scale: 0.96 }} onClick={snoozeIt}>Snooze 10 min</motion.button>
                <motion.button className="ghost" whileTap={{ scale: 0.96 }} onClick={close}><AlarmClockOff size={16} style={{ verticalAlign: -3 }} /> Dismiss</motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
