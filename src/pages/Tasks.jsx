import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Briefcase, User, Clock, Trash2, Plus, CalendarClock, Bell } from 'lucide-react'
import { useStore, uid, dstr, addDays, isTrue, prettyDate, weekday, dayNum, fmtTime, remindLabel } from '../store'
import { useEdit } from '../editctx'
import { Page, Card, Title, CheckBtn, Sheet, Empty, Fab, spring } from '../ui'

export function TaskRow({ t, i = 0 }) {
  const { upsert, remove } = useStore()
  const edit = useEdit()
  const today = dstr()
  const done = isTrue(t.done)
  const late = !done && t.date < today
  return (
    <motion.div
      className="row-wrap"
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
        <motion.div className="row-main tappable" onTap={() => edit('task', t)}>
          <div className="row-title">{t.title}</div>
          <div className="meta">
            <span className={`tag ${t.type}`}>{t.type === 'work' ? <Briefcase size={11} /> : <User size={11} />} {t.type === 'work' ? 'Work' : 'Personal'}</span>
            {t.time && <span className="tag time"><Clock size={11} /> {fmtTime(t.time)}</span>}
            {t.time && t.remind !== undefined && String(t.remind) !== '' && <span className="tag bell"><Bell size={11} /> {remindLabel(t.remind)}</span>}
            {late && <span className="tag late"><CalendarClock size={11} /> {prettyDate(t.date)}</span>}
          </div>
          {late && <button className="mini" style={{ marginTop: 10 }} onPointerDown={e => e.stopPropagation()} onClick={() => upsert('tasks', { ...t, date: today })}>Move to today</button>}
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

const REMIND = [['', 'None'], ['0', 'At time'], ['10', '10 min before'], ['30', '30 min before'], ['60', '1 hour before'], ['1440', '1 day before']]

export function TaskForm({ open, onClose, date, edit }) {
  const { upsert, remove } = useStore()
  const [title, setTitle] = useState('')
  const [type, setType] = useState('personal')
  const [d, setD] = useState(date || dstr())
  const [time, setTime] = useState('')
  const [remind, setRemind] = useState('10')
  const [notify, setNotify] = useState(['cal', 'mail'])

  useEffect(() => {
    if (!open) return
    if (edit) {
      setTitle(edit.title); setType(edit.type || 'personal'); setD(edit.date); setTime(edit.time || '')
      setRemind(edit.remind === undefined || edit.remind === null ? '' : String(edit.remind))
      setNotify(String(edit.notify || 'cal,mail').split(',').filter(Boolean))
    } else { setTitle(''); setType('personal'); setD(date || dstr()); setTime(''); setRemind('10'); setNotify(['cal', 'mail']) }
  }, [open, edit?.id]) // eslint-disable-line

  const toggleN = k => setNotify(n => (n.includes(k) ? n.filter(x => x !== k) : [...n, k]))
  const save = () => {
    if (!title.trim()) return
    const rem = time ? remind : ''
    const changed = !edit || edit.date !== d || (edit.time || '') !== time || String(edit.remind ?? '') !== String(rem) || String(edit.notify || '') !== notify.join(',')
    upsert('tasks', {
      ...(edit || {}), id: edit ? edit.id : uid(), title: title.trim(), type, date: d, time,
      done: edit ? edit.done : false, notes: edit?.notes || '', createdAt: edit?.createdAt || new Date().toISOString(),
      remind: rem, notify: notify.join(','), reminded: changed ? false : (edit?.reminded ?? false)
    })
    onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title={edit ? 'Edit task' : 'New task'}>
      <div className="field">
        <label>What needs to be done?</label>
        <input className="input" value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && save()} placeholder="Call the client, pay bills..." />
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
      <div className="field remind-box">
        <label><Bell size={13} style={{ verticalAlign: -2 }} /> Remind me</label>
        {time ? (
          <>
            <div className="chips">{REMIND.map(([k, l]) => <button key={k} className={`chip ${remind === k ? 'on' : ''}`} style={{ '--c': '#ffc531' }} onClick={() => setRemind(k)}>{l}</button>)}</div>
            {remind !== '' && (
              <div className="chips" style={{ marginTop: 8 }}>
                <button className={`chip ${notify.includes('cal') ? 'on' : ''}`} style={{ '--c': '#4cc9f0' }} onClick={() => toggleN('cal')}>📅 Calendar alert</button>
                <button className={`chip ${notify.includes('mail') ? 'on' : ''}`} style={{ '--c': '#3ddc97' }} onClick={() => toggleN('mail')}>✉️ Email</button>
              </div>
            )}
            {remind !== '' && <small className="hint">An alarm also rings inside the app when it is open.</small>}
          </>
        ) : <small className="hint">Pick a time to turn on alarm, calendar and email reminders.</small>}
      </div>
      <motion.button className="btn" whileTap={{ scale: 0.97 }} disabled={!title.trim()} onClick={save}>{edit ? 'Save changes' : 'Add task'}</motion.button>
      {edit && <button className="linkbtn" onClick={() => { remove('tasks', edit.id); onClose() }}>Delete task</button>}
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
