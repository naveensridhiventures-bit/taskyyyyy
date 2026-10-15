import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Salad, GraduationCap, Dumbbell, Plus } from 'lucide-react'
import { useStore, dstr, isTrue, prettyDate } from '../store'
import { Page, Card, Title, Ring, Empty, rise, spring } from '../ui'
import { TaskRow, TaskForm } from './Tasks'
import { LearnRow, PendingCard } from './Learn'
import { MEALS } from '../foods'
import { dietId, splitItems } from './Diet'
import { gymId } from './Gym'

export default function Today({ go }) {
  const { db } = useStore()
  const [open, setOpen] = useState(false)
  const today = dstr()
  const hour = new Date().getHours()
  const hello = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const byTime = (a, b) => (a.time || '99:99').localeCompare(b.time || '99:99')
  const tasksToday = db.tasks.filter(t => t.date === today).sort(byTime)
  const learnToday = db.learning.filter(l => l.date === today)
  const lateTasks = db.tasks.filter(t => t.date < today && !isTrue(t.done)).sort((a, b) => a.date.localeCompare(b.date))
  const lateLearn = db.learning.filter(l => l.date < today && !isTrue(l.done)).sort((a, b) => a.date.localeCompare(b.date))

  const mealsLogged = MEALS.filter(m => splitItems(db.diet.find(r => r.id === dietId(today, m.key))?.items).length).length
  const g = db.gym.find(r => r.id === gymId(today))
  const gymDone = (g && isTrue(g.cardio) ? 1 : 0) + (g && isTrue(g.strength) ? 1 : 0)

  const all = [...tasksToday, ...lateTasks]
  const allLearn = [...learnToday, ...lateLearn]
  const done = all.filter(t => isTrue(t.done)).length + allLearn.filter(l => isTrue(l.done)).length + mealsLogged + gymDone
  const total = all.length + allLearn.length + 4 + 2
  const pct = total ? done / total : 0
  const pendingCount = lateTasks.length + lateLearn.length

  const msg = pct === 1 ? 'Perfect day. Everything is done.' : pendingCount ? `${pendingCount} pending from earlier. Clear them first.` : pct > 0.5 ? 'More than halfway. Keep going.' : 'A fresh day. Start with one small win.'

  const tiles = [
    { tab: 'diet', label: 'Meals', val: `${mealsLogged}/4`, p: mealsLogged / 4, color: '#ffc531', Icon: Salad },
    { tab: 'learn', label: 'Learning', val: `${allLearn.filter(l => isTrue(l.done)).length}/${allLearn.length}`, p: allLearn.length ? allLearn.filter(l => isTrue(l.done)).length / allLearn.length : 0, color: '#8b6cff', Icon: GraduationCap },
    { tab: 'gym', label: 'Workout', val: `${gymDone}/2`, p: gymDone / 2, color: '#3ddc97', Icon: Dumbbell }
  ]

  return (
    <Page>
      <Title emoji="👋" title={hello} sub={prettyDate(today)} />

      <Card className="hero">
        <Ring value={pct}>
          <b>{Math.round(pct * 100)}%</b>
          <small>{done} of {total} done</small>
        </Ring>
        <div>
          <h2>Today's score</h2>
          <p>{msg}</p>
        </div>
      </Card>

      {pendingCount > 0 && (
        <PendingCard title={`${pendingCount} pending - do these first`} sub="Unfinished tasks and lessons from earlier days">
          <div className="rows">
            <AnimatePresence>
              {lateTasks.map((t, i) => <TaskRow key={t.id} t={t} i={i} />)}
              {lateLearn.map((l, i) => <LearnRow key={l.id} l={l} i={i} />)}
            </AnimatePresence>
          </div>
        </PendingCard>
      )}

      <div className="tiles">
        {tiles.map(t => (
          <motion.button key={t.tab} variants={rise} whileTap={{ scale: 0.94 }} whileHover={{ y: -4 }} className="card tile" onClick={() => go(t.tab)}>
            <div className="ic" style={{ background: t.color + '2e', color: t.color }}><t.Icon size={18} /></div>
            <b>{t.val}</b>
            <span>{t.label}</span>
            <div className="bar"><motion.i initial={{ width: 0 }} animate={{ width: `${t.p * 100}%` }} transition={{ duration: 1, delay: 0.4 }} style={{ background: t.color }} /></div>
          </motion.button>
        ))}
      </div>

      <div className="sec">📅 Today's schedule</div>
      <div className="rows">
        <AnimatePresence mode="popLayout">{tasksToday.map((t, i) => <TaskRow key={t.id} t={t} i={i} />)}</AnimatePresence>
        <AnimatePresence mode="popLayout">{learnToday.map((l, i) => <LearnRow key={l.id} l={l} i={i} />)}</AnimatePresence>
      </div>
      {tasksToday.length + learnToday.length === 0 && <Empty emoji="☕" text="No schedule yet. Tap + to plan your day." />}

      <motion.button className="fab" whileTap={{ scale: 0.85, rotate: 90 }} whileHover={{ scale: 1.08 }} onClick={() => setOpen(true)} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring}><Plus size={28} /></motion.button>
      <TaskForm open={open} onClose={() => setOpen(false)} date={today} />
    </Page>
  )
}
