import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame } from 'lucide-react'
import { useStore, uid, dstr, addDays, csv, dayRow, weekday } from '../store'
import { habitsFor, habitStreak, dow } from '../stats'
import { Page, Card, Title, CheckBtn, Sheet, Swipe, Empty, Fab, spring } from '../ui'
import { useEdit } from '../editctx'

const EMOJI = ['💧', '📖', '🧘', '🚶', '🍎', '😴', '✍️', '🧹', '🙏', '💊', '🏃', '🎯', '💰', '🎸']
const PRESETS = [['Drink 3L water', '💧'], ['Read 20 minutes', '📖'], ['Meditate 10 min', '🧘'], ['Walk 8000 steps', '🚶'], ['No sugar', '🍎'], ['Sleep by 11 PM', '😴'], ['Write journal', '✍️'], ['Check finances', '💰']]
const DAYS = [['M', 1], ['T', 2], ['W', 3], ['T', 4], ['F', 5], ['S', 6], ['S', 0]]

export const toggleHabit = (patchDay, id, d) =>
  patchDay(d, r => { const ids = csv(r.habits); return { habits: (ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]).join(',') } })

export function HabitForm({ open, onClose, edit }) {
  const { upsert, remove } = useStore()
  const [title, setTitle] = useState('')
  const [emoji, setEmoji] = useState('🎯')
  const [days, setDays] = useState([0, 1, 2, 3, 4, 5, 6])
  const [time, setTime] = useState('')
  useEffect(() => {
    if (!open) return
    if (edit) { setTitle(edit.title); setEmoji(edit.emoji || '🎯'); setDays(csv(edit.days).map(Number)); setTime(edit.time || '') }
    else { setTitle(''); setEmoji('🎯'); setDays([0, 1, 2, 3, 4, 5, 6]); setTime('') }
  }, [open, edit?.id]) // eslint-disable-line
  const toggle = n => setDays(d => (d.includes(n) ? d.filter(x => x !== n) : [...d, n]))
  const save = () => {
    if (!title.trim() || !days.length) return
    upsert('habits', { ...(edit || {}), id: edit ? edit.id : uid(), title: title.trim(), emoji, days: days.join(','), time, start: edit?.start || dstr(), active: true })
    onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title={edit ? 'Edit habit' : 'New repeating habit'}>
      {!edit && <div className="field"><label>Quick picks</label><div className="chips">{PRESETS.map(([t, e]) => <button key={t} className="chip" onClick={() => { setTitle(t); setEmoji(e) }}>{e} {t}</button>)}</div></div>}
      <div className="field"><label>Habit</label><input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="What will you repeat?" /></div>
      <div className="field"><label>Icon</label><div className="chips">{EMOJI.map(e => <button key={e} className={`chip ${emoji === e ? 'on' : ''}`} onClick={() => setEmoji(e)}>{e}</button>)}</div></div>
      <div className="field"><label>Repeat on</label><div className="daypick">{DAYS.map(([l, n], i) => <button key={i} className={days.includes(n) ? 'on' : ''} onClick={() => toggle(n)}>{l}</button>)}</div></div>
      <div className="field"><label>Time (optional)</label><input type="time" className="input" value={time} onChange={e => setTime(e.target.value)} /></div>
      <motion.button className="btn" whileTap={{ scale: 0.97 }} disabled={!title.trim() || !days.length} onClick={save}>{edit ? 'Save changes' : 'Add habit'}</motion.button>
      {edit && <button className="linkbtn" onClick={() => { remove('habits', edit.id); onClose() }}>Delete habit</button>}
    </Sheet>
  )
}

export default function Habits() {
  const { db, patchDay, remove } = useStore()
  const edit = useEdit()
  const [open, setOpen] = useState(false)
  const today = dstr()
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6))
  const todays = habitsFor(db, today)
  const doneToday = todays.filter(h => csv(dayRow(db, today).habits).includes(h.id)).length
  const others = db.habits.filter(h => !todays.includes(h))

  const card = h => {
    const done = csv(dayRow(db, today).habits).includes(h.id)
    const st = habitStreak(db, h)
    return (
      <Swipe key={h.id} onDelete={() => remove('habits', h.id)} className={`row habit ${done ? 'done' : ''}`}>
        <CheckBtn done={done} onChange={() => toggleHabit(patchDay, h.id, today)} />
        <motion.div className="row-main tappable" onTap={() => edit('habit', h)}>
          <div className="row-title">{h.emoji} {h.title}</div>
          <div className="dots">
            {week.map(d => {
              const sched = csv(h.days).includes(String(dow(d))) && d >= (h.start || '0')
              const dn = csv(dayRow(db, d).habits).includes(h.id)
              return <motion.span key={d} title={weekday(d)} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring} className={`dot7 ${dn ? 'on' : sched ? 'miss' : ''}`} />
            })}
          </div>
        </motion.div>
        <div className={`flame ${st ? 'hot' : ''}`}><motion.span animate={st ? { scale: [1, 1.25, 1] } : {}} transition={{ repeat: Infinity, duration: 1.6 }}><Flame size={18} /></motion.span><b>{st}</b></div>
      </Swipe>
    )
  }

  return (
    <Page>
      <Title emoji="🔁" title="Habits" sub={todays.length ? `${doneToday} of ${todays.length} done today` : 'Build routines that repeat'} />
      <div className="rows"><AnimatePresence>{todays.map(card)}</AnimatePresence></div>
      {todays.length === 0 && db.habits.length === 0 && <Empty emoji="🌱" text="Add a habit once and it shows up on every day you choose." />}
      {others.length > 0 && <><div className="sec">Not scheduled today</div><div className="rows">{others.map(card)}</div></>}
      <Fab onClick={() => setOpen(true)} />
      <HabitForm open={open} onClose={() => setOpen(false)} />
    </Page>
  )
}
