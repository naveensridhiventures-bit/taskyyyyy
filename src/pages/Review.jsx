import { motion } from 'framer-motion'
import { Flame } from 'lucide-react'
import { useStore, dstr, addDays, isTrue, csv, dayRow, num } from '../store'
import { habitsFor, activity, allStats, badges } from '../stats'
import { monthSummary, inr, DEBT_CATS } from '../fin'
import { Page, Card, Title, Ring, Num, spring } from '../ui'

export default function Review() {
  const { db, settings } = useStore()
  const today = dstr()
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6))

  let tp = 0, td = 0, lp = 0, ld = 0, hp = 0, hd = 0, gymDays = 0, mealDays = 0, water = 0, sleepSum = 0, sleepN = 0, focus = 0, inc = 0, exp = 0
  week.forEach(d => {
    const ts = db.tasks.filter(t => t.date === d); tp += ts.length; td += ts.filter(t => isTrue(t.done)).length
    const ls = db.learning.filter(l => l.date === d); lp += ls.length; ld += ls.filter(l => isTrue(l.done)).length
    const hs = habitsFor(db, d); const row = dayRow(db, d)
    hp += hs.length; hd += hs.filter(h => csv(row.habits).includes(h.id)).length
    const a = activity(db, d)
    if (a.gym) gymDays++
    if (a.meals >= 2) mealDays++
    water += a.water; focus += a.focus
    if (row.sleep !== '') { sleepSum += num(row.sleep); sleepN++ }
    db.finance.forEach(t => { if (t.date === d && !DEBT_CATS.includes(t.category)) { if (t.type === 'income') inc += num(t.amount); if (t.type === 'expense') exp += num(t.amount) } })
  })
  const planned = tp + lp + hp, done = td + ld + hd
  const score = planned ? done / planned : 0
  const areas = [
    ['tasks', tp ? td / tp : null], ['learning', lp ? ld / lp : null], ['habits', hp ? hd / hp : null],
    ['workouts', gymDays / 5], ['meal logging', mealDays / 7], ['water', water / 7 / settings.water]
  ].filter(a => a[1] !== null).sort((a, b) => a[1] - b[1])
  const weakest = areas[0]
  const st = allStats(db)
  const bs = badges(db)

  const stat = (label, val, extra) => <Card className="tile"><span>{label}</span><b>{val}</b>{extra && <small className="hint">{extra}</small>}</Card>

  return (
    <Page>
      <Title emoji="📊" title="Weekly review" sub="Last 7 days" right={<div className="pill" style={{ color: 'var(--turmeric)' }}><Flame size={15} /> {st.active} day streak</div>} />
      <Card className="hero">
        <Ring value={score}><b>{Math.round(score * 100)}%</b><small>consistency</small></Ring>
        <div>
          <h2>{done} of {planned} done</h2>
          <p>{!planned ? 'Plan tasks, lessons and habits to get a score.' : weakest && weakest[1] < 0.7 ? `Weakest area: ${weakest[0]}. Do it first tomorrow.` : 'Strong week. Keep the same rhythm.'}</p>
        </div>
      </Card>

      <div className="tiles">
        {stat('Workouts', `${gymDays}/7`, 'days')}
        {stat('Focus', `${focus}`, 'minutes')}
        {stat('Water', (water / 7 / 4).toFixed(1), 'L per day')}
        {stat('Sleep', sleepN ? (sleepSum / sleepN).toFixed(1) : '-', 'hours avg')}
        {stat('Income', inr(inc))}
        {stat('Spent', inr(exp))}
      </div>

      <Card>
        <h4 style={{ marginBottom: 12 }}>Badges · {bs.filter(b => b.ok).length}/{bs.length}</h4>
        <div className="badges">
          {bs.map((b, i) => (
            <motion.div key={b.id} className={`badge ${b.ok ? 'on' : ''}`} initial={{ opacity: 0, scale: 0.5, rotate: -10 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ ...spring, delay: 0.1 + i * 0.06 }}>
              <span>{b.e}</span><b>{b.t}</b><small>{b.d}</small>
            </motion.div>
          ))}
        </div>
      </Card>
    </Page>
  )
}
