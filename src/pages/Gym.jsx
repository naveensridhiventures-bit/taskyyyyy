import { motion } from 'framer-motion'
import { HeartPulse, Dumbbell, Check, Flame } from 'lucide-react'
import { useStore, dstr, addDays, isTrue, weekday } from '../store'
import { Page, Card, Title, Ring, spring } from '../ui'

export const gymId = d => `gym-${d}`

export default function Gym() {
  const { db, upsert } = useStore()
  const today = dstr()
  const row = db.gym.find(r => r.id === gymId(today)) || { id: gymId(today), date: today, cardio: false, strength: false }
  const cardio = isTrue(row.cardio)
  const strength = isTrue(row.strength)
  const set = patch => upsert('gym', { ...row, ...patch })

  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6))
  const state = d => {
    const r = db.gym.find(x => x.id === gymId(d))
    return r ? (isTrue(r.cardio) ? 1 : 0) + (isTrue(r.strength) ? 1 : 0) : 0
  }
  // streak = consecutive days (ending today or yesterday) with any workout
  let streak = 0
  for (let i = state(today) ? 0 : 1; i < 60 && state(addDays(today, -i)); i++) streak++

  const cards = [
    { k: 'cardio', on: cardio, title: 'Cardio', sub: 'Run, cycle, skip, walk', Icon: HeartPulse, color: '#ff5d73', toggle: () => set({ cardio: !cardio }) },
    { k: 'strength', on: strength, title: 'Strength training', sub: 'Weights, bodyweight, resistance', Icon: Dumbbell, color: '#ffc531', toggle: () => set({ strength: !strength }) }
  ]

  return (
    <Page>
      <Title emoji="💪" title="Gym" sub="Tick what you did today" right={
        <div className="pill" style={{ color: 'var(--turmeric)' }}><motion.span animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 1.4 }} style={{ display: 'flex' }}><Flame size={15} /></motion.span> {streak} day streak</div>
      } />

      {cards.map(c => (
        <motion.button key={c.k} variants={{ hidden: { opacity: 0, y: 26 }, show: { opacity: 1, y: 0, transition: spring } }} whileTap={{ scale: 0.96 }} className={`card gym-card ${c.on ? 'on' : ''}`} style={{ '--c': c.color }} onClick={c.toggle}>
          <motion.div className="gym-ic" animate={c.on ? { rotate: [0, -12, 12, 0], scale: [1, 1.2, 1] } : { rotate: 0 }} transition={{ duration: 0.5 }}>
            <c.Icon size={30} color={c.on ? '#14102b' : c.color} />
          </motion.div>
          <div style={{ flex: 1 }}><h4>{c.title}</h4><p>{c.on ? 'Done. Nice work!' : c.sub}</p></div>
          <motion.div className={`check ${c.on ? 'on' : ''}`} style={{ width: 36, height: 36, borderColor: c.on ? 'transparent' : undefined, background: c.on ? '#14102b' : undefined, boxShadow: 'none' }}>
            {c.on && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring} style={{ color: c.color, display: 'flex' }}><Check size={20} strokeWidth={3.5} /></motion.span>}
          </motion.div>
        </motion.button>
      ))}

      <Card style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Ring size={86} stroke={9} value={(Number(cardio) + Number(strength)) / 2}>
          <b style={{ fontSize: 22 }}>{Number(cardio) + Number(strength)}/2</b>
        </Ring>
        <div>
          <h4>{cardio && strength ? 'Full workout done' : cardio || strength ? 'Halfway there' : 'Not started yet'}</h4>
          <small style={{ color: 'var(--muted)' }}>{cardio && strength ? 'Rest well and eat well.' : 'Tick both to complete today.'}</small>
        </div>
      </Card>

      <Card>
        <h4 style={{ marginBottom: 14 }}>This week</h4>
        <div className="week">
          {week.map((d, i) => {
            const s = state(d)
            return (
              <div key={d} className={`wd ${s === 2 ? 'full' : s === 1 ? 'half' : ''} ${d === today ? 'today' : ''}`}>
                <motion.i initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ ...spring, delay: 0.25 + i * 0.06 }}>{s > 0 && <Check size={17} strokeWidth={3.5} />}</motion.i>
                {d === today ? 'Today' : weekday(d).slice(0, 3)}
              </div>
            )
          })}
        </div>
        <small style={{ display: 'block', marginTop: 12, color: 'var(--muted)' }}>Green = cardio + strength, yellow = one of them.</small>
      </Card>
    </Page>
  )
}
