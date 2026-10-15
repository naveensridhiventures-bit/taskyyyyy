import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Trash2, Plus, BookOpen, CalendarClock } from 'lucide-react'
import { useStore, uid, dstr, addDays, isTrue, prettyDate, weekday } from '../store'
import { Page, Card, Title, CheckBtn, Sheet, Empty, Fab, spring } from '../ui'
import { TOPICS } from '../foods'

export function LearnRow({ l, i = 0 }) {
  const { upsert, remove } = useStore()
  const today = dstr()
  const done = isTrue(l.done)
  const late = !done && l.date < today
  return (
    <motion.div
      layout className="row-wrap"
      initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -140, transition: { duration: 0.25 } }}
      transition={{ ...spring, delay: Math.min(i, 8) * 0.04 }}
    >
      <div className="row-del"><Trash2 size={20} /></div>
      <motion.div
        className={`row ${done ? 'done' : ''} ${late ? 'late' : ''}`}
        drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={{ left: 0.6, right: 0 }}
        onDragEnd={(e, info) => { if (info.offset.x < -90) remove('learning', l.id) }}
      >
        <CheckBtn done={done} onChange={v => upsert('learning', { ...l, done: v })} />
        <div className="row-main">
          <div className="row-title">{l.title}</div>
          <div className="meta">
            {l.topic && <span className="tag" style={{ background: 'rgba(139,108,255,.25)', color: '#b9a6ff' }}><BookOpen size={11} /> {l.topic}</span>}
            {late && <span className="tag late"><CalendarClock size={11} /> Planned {prettyDate(l.date)}</span>}
          </div>
        </div>
        {late && <button className="mini" onClick={() => upsert('learning', { ...l, date: today })}>Move to today</button>}
      </motion.div>
    </motion.div>
  )
}

export function LearnForm({ open, onClose }) {
  const { upsert } = useStore()
  const [title, setTitle] = useState('')
  const [topic, setTopic] = useState('')
  const [date, setDate] = useState(dstr())
  const save = () => {
    if (!title.trim()) return
    upsert('learning', { id: uid(), title: title.trim(), topic, date, done: false, createdAt: new Date().toISOString() })
    setTitle(''); onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title="Plan something to learn">
      <div className="field">
        <label>What will you learn?</label>
        <input className="input" autoFocus value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && save()} placeholder="React hooks, 20 English words..." />
      </div>
      <div className="field">
        <label>Topic</label>
        <div className="chips">
          {TOPICS.map(t => <button key={t} className={`chip ${topic === t ? 'on' : ''}`} style={{ '--c': '#b9a6ff' }} onClick={() => setTopic(topic === t ? '' : t)}>{t}</button>)}
        </div>
      </div>
      <div className="field"><label>Date</label><input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} /></div>
      <motion.button className="btn" whileTap={{ scale: 0.97 }} disabled={!title.trim()} onClick={save}>Add to learning plan</motion.button>
    </Sheet>
  )
}

export function PendingCard({ title, sub, children }) {
  return (
    <Card className="pending">
      <div className="pending-h">
        <div className="bell"><Bell size={19} color="white" /></div>
        <div><h4>{title}</h4><p>{sub}</p></div>
      </div>
      {children}
    </Card>
  )
}

export default function Learn() {
  const { db } = useStore()
  const today = dstr()
  const [open, setOpen] = useState(false)

  const pending = db.learning.filter(l => l.date < today && !isTrue(l.done)).sort((a, b) => a.date.localeCompare(b.date))
  const todays = db.learning.filter(l => l.date === today)
  const upcoming = db.learning.filter(l => l.date > today).sort((a, b) => a.date.localeCompare(b.date))
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6))
  const counts = week.map(d => db.learning.filter(l => l.date === d && isTrue(l.done)).length)
  const max = Math.max(1, ...counts)

  return (
    <Page>
      <Title emoji="🧠" title="Learning" sub="Finish what you missed first" />

      {pending.length > 0 && (
        <PendingCard title={`${pending.length} missed - finish these first`} sub="Carried over until you tick them off">
          <div className="rows"><AnimatePresence>{pending.map((l, i) => <LearnRow key={l.id} l={l} i={i} />)}</AnimatePresence></div>
        </PendingCard>
      )}

      <Card>
        <h4>Last 7 days</h4>
        <div className="chart">
          {week.map((d, i) => (
            <div key={d}>
              <motion.i initial={{ height: 5 }} animate={{ height: 5 + (counts[i] / max) * 58 }} transition={{ ...spring, delay: 0.2 + i * 0.07 }} />
              {d === today ? 'Today' : weekday(d).slice(0, 2)}
            </div>
          ))}
        </div>
      </Card>

      <div className="sec">Today · swipe left to delete</div>
      <div className="rows"><AnimatePresence>{todays.map((l, i) => <LearnRow key={l.id} l={l} i={i} />)}</AnimatePresence></div>
      {todays.length === 0 && <Empty emoji="📚" text="Nothing planned for today. Tap + to schedule a lesson." />}

      {upcoming.length > 0 && (
        <>
          <div className="sec">Coming up</div>
          <div className="rows">
            {upcoming.map((l, i) => (
              <div key={l.id}>
                <div className="sec" style={{ margin: '0 4px 6px', fontSize: 12.5 }}>{prettyDate(l.date)}</div>
                <LearnRow l={l} i={i} />
              </div>
            ))}
          </div>
        </>
      )}

      <Fab onClick={() => setOpen(true)} />
      <LearnForm open={open} onClose={() => setOpen(false)} />
    </Page>
  )
}
