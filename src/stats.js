import { dstr, addDays, isTrue, csv, num, dayRow } from './store'

export const dow = d => { const [y, m, dd] = d.split('-').map(Number); return new Date(y, m - 1, dd).getDay() }

export const habitsFor = (db, d) =>
  db.habits.filter(h => String(h.active) !== 'false' && csv(h.days).includes(String(dow(d))) && (h.start || '0000') <= d)

export function activity(db, d) {
  const row = dayRow(db, d)
  const tasks = db.tasks.filter(t => t.date === d && isTrue(t.done)).length
  const learn = db.learning.filter(l => l.date === d && isTrue(l.done)).length
  const g = db.gym.find(r => r.id === `gym-${d}`)
  const gym = !!g && (isTrue(g.cardio) || isTrue(g.strength))
  const habits = csv(row.habits).length
  const meals = db.diet.filter(r => r.date === d && r.items).length
  return { tasks, learn, gym, habits, meals, water: num(row.water), focus: num(row.focus), total: tasks + learn + (gym ? 1 : 0) + habits }
}

// consecutive days where test(day) is true; today may still be open
export function streak(test) {
  const today = dstr()
  let i = test(today) ? 0 : 1, n = 0
  while (i < 400 && test(addDays(today, -i))) { n++; i++ }
  return n
}

export function habitStreak(db, h) {
  const today = dstr()
  const done = d => csv(dayRow(db, d).habits).includes(h.id)
  const scheduled = d => csv(h.days).includes(String(dow(d)))
  let n = 0
  for (let i = done(today) ? 0 : 1; i < 400; i++) {
    const d = addDays(today, -i)
    if (d < (h.start || '0000')) break
    if (!scheduled(d)) continue
    if (done(d)) n++; else break
  }
  return n
}

export function allStats(db) {
  const active = streak(d => activity(db, d).total > 0)
  const gym = streak(d => activity(db, d).gym)
  const focusMin = db.daily.reduce((s, r) => s + num(r.focus), 0)
  const lessons = db.learning.filter(l => isTrue(l.done)).length
  const water8 = db.daily.some(r => num(r.water) >= 8)
  return { active, gym, focusMin, lessons, water8, txns: db.finance.length }
}

export function badges(db) {
  const s = allStats(db)
  return [
    { id: 'a3', e: '🔥', t: '3-day streak', d: 'Active 3 days in a row', ok: s.active >= 3 },
    { id: 'a7', e: '⚡', t: 'One full week', d: '7 active days in a row', ok: s.active >= 7 },
    { id: 'a21', e: '🏆', t: '21-day habit', d: '21 active days in a row', ok: s.active >= 21 },
    { id: 'a30', e: '👑', t: '30-day legend', d: '30 active days in a row', ok: s.active >= 30 },
    { id: 'g7', e: '💪', t: 'Gym week', d: '7 workout days in a row', ok: s.gym >= 7 },
    { id: 'f5', e: '⏱️', t: 'Deep focus', d: '5 hours of focus time', ok: s.focusMin >= 300 },
    { id: 'l10', e: '📚', t: 'Curious mind', d: '10 lessons completed', ok: s.lessons >= 10 },
    { id: 'w8', e: '💧', t: 'Hydrated', d: '8 glasses in one day', ok: s.water8 },
    { id: 'm20', e: '💰', t: 'Money aware', d: '20 transactions logged', ok: s.txns >= 20 }
  ]
}
