import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Briefcase, User, Clock, Trash2, Plus, CalendarClock } from 'lucide-react'
import { useStore, uid, dstr, addDays, isTrue, prettyDate, weekday, dayNum, fmtTime } from '../store'
import { Page, Card, Title, CheckBtn, Sheet, Empty, Fab, spring } from '../ui'

export function TaskRow({ t, i = 0 }) {
  const { upsert, remove } = useStore()
  const today = dstr()
  const done = isTrue(t.done)
  const late = !done && t.date < today
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
        onDragEnd={(e, info) => { if (info.offset.x < -90) remove('tasks', t.id) }}
      >
        <CheckBtn done={done} onChange={v => upsert('tasks', { ...t, done: v })} />
        <div className="row-main">
          <div className="row-title">{t.title}</div>
          <div className="meta">
            <span className={`tag ${t.type}`}>{t.type === 'work' ? <Briefcase size={11} /> : <User size={11} />} {t.type === 'work' ? 'Work' : 'Personal'}</span>
            {t.time && <span className="tag time"><Clock size={11} /> {fmtTime(t.time)}</span>}
            {late && <span className="tag late"><CalendarClock size={11} /> {prettyDate(t.date)}</span>}
          </div>
        </div>
        {late && <button className="mini" onClick={() => upsert('tasks', { ...t, date: today })}>Move to today</button>}
      </motion.div>
    </motion.div>
  )
}

export function TaskForm({ open, onClose, date }) {
  const { upsert } = useStore()
  const [title, setTitle] = useState('')
  const [type, setType] = useState('personal')
  const [d, setD] = useState(date || dstr())
  const [time, setTime] = useState('')

  const save = () => {
    if (!title.trim()) return
    upsert('tasks', { id: uid(), title: title.trim(), type, date: d, time, done: false, notes: '', createdAt: new Date().toISOString() })
    setTitle(''); setTime(''); onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title="New task">
      <div className="field">
        <label>What needs to be done?</label>
        <input className="input" autoFocus value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && save()} placeholder="Call the client, pay bills..." />
      </div>
      <div className="field">
        <label>Type</label>
        <div className="chips">
          <button className={`chip ${type === 'personal' ? 'on' : ''}`} style={{ '--c': '#ff8fa0' }} onClick={() => setType('personal')}><User size={14} /> Personal</button>
          <button className={`chip ${type === 'work' ? 'on' : ''}`} style={{ '--c': '#4cc9f0' }} onClick={() => setType('work')}><Briefcase size={14} /> Work</button>
        </div>
      </div>
      <div className="two">
        <div className="field"><label>Date</label><input type="date" className="input" value={d} onChange={e => setD(e.target.value)} /></div>
        <div className="field"><label>Time</label><input type="time" className="input" value={time} onChange={e => setTime(e.target.value)} /></div>
      </div>
      <motion.button className="btn" whileTap={{ scale: 0.97 }} disabled={!title.trim()} onClick={save}>Add task</motion.button>
    </Sheet>
  )
}

export default function Tasks() {
  const { db } = useStore()
  const today = dstr()
  const [sel, setSel] = useState(today)
  const [filter, setFilter] = useState('all')
  const [open, setOpen] = useState(false)

  const days = Array.from({ length: 16 }, (_, i) => addDays(today, i - 2))
  const ok = t => filter === 'all' || t.type === filter
  const byTime = (a, b) => (a.time || '99:99').localeCompare(b.time || '99:99')
  const list = db.tasks.filter(t => t.date === sel && ok(t)).sort(byTime)
  const overdue = sel === today ? db.tasks.filter(t => t.date < today && !isTrue(t.done) && ok(t)).sort((a, b) => a.date.localeCompare(b.date)) : []
  const has = d => db.tasks.some(t => t.date === d)

  return (
    <Page>
      <Title emoji="📋" title="Tasks" sub="Personal and work, one place" />
      <Card>
        <div className="filters">
          {[['all', 'All'], ['personal', 'Personal'], ['work', 'Work']].map(([k, l]) => (
            <button key={k} className={`chip ${filter === k ? 'on' : ''}`} onClick={() => setFilter(k)}>{l}</button>
          ))}
        </div>
      </Card>
      <div className="strip">
        {days.map(d => (
          <button key={d} className="day" onClick={() => setSel(d)}>
            {sel === d && <motion.div layoutId="daybg" className="pillbg" transition={spring} />}
            <small>{d === today ? 'Today' : weekday(d)}</small>
            <b>{dayNum(d)}</b>
            {has(d) && sel !== d && <span className="dot" />}
          </button>
        ))}
      </div>

      {overdue.length > 0 && (
        <>
          <div className="sec">🔥 Pending from earlier days</div>
          <div className="rows"><AnimatePresence>{overdue.map((t, i) => <TaskRow key={t.id} t={t} i={i} />)}</AnimatePresence></div>
        </>
      )}
      <div className="sec">{sel === today ? 'Today' : prettyDate(sel)} · swipe left to delete</div>
      <div className="rows">
        <AnimatePresence>{list.map((t, i) => <TaskRow key={t.id} t={t} i={i} />)}</AnimatePresence>
      </div>
      {list.length === 0 && overdue.length === 0 && <Empty emoji="🌴" text="Nothing planned for this day. Tap + to add a task." />}

      <Fab onClick={() => setOpen(true)} />
      <TaskForm open={open} onClose={() => setOpen(false)} date={sel} />
    </Page>
  )
}
