import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Salad, GraduationCap, Dumbbell, Droplet, Flame, Star, Plus, Landmark } from 'lucide-react'
import { useStore, uid, dstr, isTrue, prettyDate, csv, dayRow, num } from '../store'
import { habitsFor, allStats } from '../stats'
import { balances, debtTotals, inr } from '../fin'
import { Page, Card, Title, Ring, Empty, Fab, Sheet, CheckBtn, Num, rise, spring } from '../ui'
import { TaskRow, TaskForm } from './Tasks'
import { LearnRow, PendingCard } from './Learn'
import { toggleHabit } from './Habits'
import { MEALS } from '../foods'
import { dietId, splitItems } from './Diet'
import { gymId } from './Gym'

function Top3({ open: pend }) {
  const { db, upsert, patchDay } = useStore()
  const today = dstr()
  const ids = csv(dayRow(db, today).top3).slice(0, 3)
  const [pick, setPick] = useState(false)
  const [text, setText] = useState('')
  const set = list => patchDay(today, { top3: list.join(',') })
  const choose = id => { set([...ids.filter(x => x !== id), id].slice(0, 3)); setPick(false) }
  const addNew = () => {
    if (!text.trim()) return
    const id = uid()
    upsert('tasks', { id, title: text.trim(), type: 'work', date: today, time: '', done: false, notes: '', createdAt: new Date().toISOString() })
    set([...ids, id].slice(0, 3)); setText(''); setPick(false)
  }
  const slots = [0, 1, 2].map(i => db.tasks.find(t => t.id === ids[i]))
  return (
    <Card className="top3">
      <div className="card-h"><h4><Star size={16} style={{ verticalAlign: -2, color: '#ffc531' }} fill="#ffc531" /> Top 3 priorities</h4><small className="hint">Win these first</small></div>
      <div className="rows">
        {slots.map((t, i) => t ? (
          <motion.div key={t.id} layout className={`slot filled ${isTrue(t.done) ? 'done' : ''}`}>
            <CheckBtn size={26} done={isTrue(t.done)} onChange={v => upsert('tasks', { ...t, done: v })} />
            <div className="row-main"><div className="row-title">{t.title}</div></div>
            <button className="x" onClick={() => set(ids.filter(x => x !== t.id))} aria-label="Remove">×</button>
          </motion.div>
        ) : (
          <motion.button key={`e${i}`} className="slot empty" whileTap={{ scale: 0.97 }} onClick={() => setPick(true)}><span>{i + 1}</span> Pick a priority</motion.button>
        ))}
      </div>
      <Sheet open={pick} onClose={() => setPick(false)} title="Choose a priority">
        <div className="field"><label>Add a new one</label>
          <div className="weight-in"><input className="input" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && addNew()} placeholder="Most important thing today" /><motion.button className="mini big" whileTap={{ scale: 0.9 }} onClick={addNew}>Add</motion.button></div>
        </div>
        <div className="field"><label>Or pick from your tasks</label>
          <div className="rows">{pend.filter(t => !ids.includes(t.id)).slice(0, 8).map(t => <button key={t.id} className="pickrow" onClick={() => choose(t.id)}>{t.title}</button>)}
            {pend.filter(t => !ids.includes(t.id)).length === 0 && <small className="hint">No open tasks yet.</small>}</div>
        </div>
      </Sheet>
    </Card>
  )
}

function Win() {
  const { db, patchDay } = useStore()
  const today = dstr()
  const saved = dayRow(db, today).win || ''
  const [v, setV] = useState(saved)
  useEffect(() => { setV(saved) }, [saved])
  useEffect(() => { if (v === saved) return; const id = setTimeout(() => patchDay(today, { win: v }), 700); return () => clearTimeout(id) }, [v]) // eslint-disable-line
  return (
    <Card>
      <div className="card-h"><h4>🏅 Win of the day</h4><small className="hint">Saved automatically</small></div>
      <textarea className="input" rows={2} value={v} onChange={e => setV(e.target.value)} placeholder="One thing you are proud of today..." />
    </Card>
  )
}

export default function Today({ go }) {
  const { db, patchDay } = useStore()
  const [open, setOpen] = useState(false)
  const today = dstr()
  const hour = new Date().getHours()
  const hello = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const row = dayRow(db, today)

  const byTime = (a, b) => (a.time || '99:99').localeCompare(b.time || '99:99')
  const tasksToday = db.tasks.filter(t => t.date === today).sort(byTime)
  const learnToday = db.learning.filter(l => l.date === today)
  const lateTasks = db.tasks.filter(t => t.date < today && !isTrue(t.done)).sort((a, b) => a.date.localeCompare(b.date))
  const lateLearn = db.learning.filter(l => l.date < today && !isTrue(l.done)).sort((a, b) => a.date.localeCompare(b.date))
  const habits = habitsFor(db, today)
  const habitsDone = habits.filter(h => csv(row.habits).includes(h.id))

  const mealsLogged = MEALS.filter(m => splitItems(db.diet.find(r => r.id === dietId(today, m.key))?.items).length).length
  const g = db.gym.find(r => r.id === gymId(today))
  const gymDone = (g && isTrue(g.cardio) ? 1 : 0) + (g && isTrue(g.strength) ? 1 : 0)

  const all = [...tasksToday, ...lateTasks]
  const allLearn = [...learnToday, ...lateLearn]
  const learnDone = allLearn.filter(l => isTrue(l.done)).length
  const done = all.filter(t => isTrue(t.done)).length + learnDone + habitsDone.length + mealsLogged + gymDone
  const total = all.length + allLearn.length + habits.length + 4 + 2
  const pct = total ? done / total : 0
  const pendingCount = lateTasks.length + lateLearn.length
  const streak = allStats(db).active
  const water = num(row.water)
  const pend = [...lateTasks, ...tasksToday.filter(t => !isTrue(t.done))]

  const { list, total: cash } = balances(db)
  const dt = debtTotals(db)

  const msg = pct === 1 ? 'Perfect day. Everything is done.' : pendingCount ? `${pendingCount} pending from earlier. Clear them first.` : pct > 0.5 ? 'More than halfway. Keep going.' : 'A fresh day. Start with one small win.'

  const tiles = [
    { to: ['health', 'diet'], label: 'Meals', val: `${mealsLogged}/4`, p: mealsLogged / 4, color: '#ffc531', Icon: Salad },
    { to: ['grow', 'learn'], label: 'Learning', val: `${learnDone}/${allLearn.length}`, p: allLearn.length ? learnDone / allLearn.length : 0, color: '#8b6cff', Icon: GraduationCap },
    { to: ['health', 'gym'], label: 'Workout', val: `${gymDone}/2`, p: gymDone / 2, color: '#3ddc97', Icon: Dumbbell },
    { to: ['health', 'body'], label: 'Water', val: `${water}/8`, p: water / 8, color: '#4cc9f0', Icon: Droplet }
  ]

  return (
    <Page>
      <Title emoji="👋" title={hello} sub={prettyDate(today)} right={<div className="pill" style={{ color: 'var(--turmeric)' }}><motion.span style={{ display: 'flex' }} animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 1.4 }}><Flame size={15} /></motion.span> {streak} day streak</div>} />

      <Card className="hero">
        <Ring value={pct}><b>{Math.round(pct * 100)}%</b><small>{done} of {total} done</small></Ring>
        <div><h2>Today's score</h2><p>{msg}</p></div>
      </Card>

      {pendingCount > 0 && (
        <PendingCard title={`${pendingCount} pending - do these first`} sub="Unfinished tasks and lessons from earlier days">
          <div className="rows"><AnimatePresence>{lateTasks.map((t, i) => <TaskRow key={t.id} t={t} i={i} />)}{lateLearn.map((l, i) => <LearnRow key={l.id} l={l} i={i} />)}</AnimatePresence></div>
        </PendingCard>
      )}

      <Top3 open={pend} />

      {habits.length > 0 && (
        <>
          <div className="sec">🔁 Habits today</div>
          <div className="hab-scroll">
            {habits.map((h, i) => {
              const on = csv(row.habits).includes(h.id)
              return (
                <motion.button key={h.id} className={`hab ${on ? 'on' : ''}`} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring, delay: 0.1 + i * 0.06 }} whileTap={{ scale: 0.9 }} onClick={() => toggleHabit(patchDay, h.id, today)}>
                  <motion.span animate={on ? { scale: [1, 1.5, 1], rotate: [0, 15, 0] } : {}} className="hab-e">{h.emoji}</motion.span>
                  <small>{h.title}</small>
                </motion.button>
              )
            })}
          </div>
        </>
      )}

      <div className="tiles two-col">
        {tiles.map(t => (
          <motion.button key={t.label} variants={rise} whileTap={{ scale: 0.94 }} whileHover={{ y: -4 }} className="card tile" onClick={() => go(...t.to)}>
            <div className="ic" style={{ background: t.color + '2e', color: t.color }}><t.Icon size={18} /></div>
            <b>{t.val}</b><span>{t.label}</span>
            <div className="bar"><motion.i initial={{ width: 0 }} animate={{ width: `${t.p * 100}%` }} transition={{ duration: 1, delay: 0.4 }} style={{ background: t.color }} /></div>
          </motion.button>
        ))}
      </div>

      <motion.button variants={rise} className="card money-strip" whileTap={{ scale: 0.97 }} onClick={() => go('money', list.length ? 'overview' : 'overview')}>
        <div className="ic" style={{ background: '#ffc5312e', color: '#ffc531' }}><Landmark size={18} /></div>
        {list.length ? (
          <div className="ms"><div><small>Available</small><b><Num value={cash} prefix="₹" /></b></div><div><small>To receive</small><b style={{ color: '#3ddc97' }}>{inr(dt.receive)}</b></div><div><small>To pay</small><b style={{ color: '#ff8fa0' }}>{inr(dt.pay)}</b></div></div>
        ) : <div><b>Add your bank and cash balance</b><br /><small>Start tracking income and expenses</small></div>}
      </motion.button>

      <div className="sec">📅 Today's schedule</div>
      <div className="rows">
        <AnimatePresence>{tasksToday.map((t, i) => <TaskRow key={t.id} t={t} i={i} />)}</AnimatePresence>
        <AnimatePresence>{learnToday.map((l, i) => <LearnRow key={l.id} l={l} i={i} />)}</AnimatePresence>
      </div>
      {tasksToday.length + learnToday.length === 0 && <Empty emoji="☕" text="No schedule yet. Tap + to plan your day." />}

      <Win />
      <Fab onClick={() => setOpen(true)} />
      <TaskForm open={open} onClose={() => setOpen(false)} date={today} />
    </Page>
  )
}
