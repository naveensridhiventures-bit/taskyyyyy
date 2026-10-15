import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { useStore, dstr, addDays, prettyDate } from '../store'
import { Page, Card, Title, Sheet, Num, spring } from '../ui'
import { MEALS, FOODS, nutrition, KCAL_GOAL, PROTEIN_GOAL } from '../foods'

export const dietId = (date, meal) => `diet-${date}-${meal}`
export const splitItems = s => (s ? String(s).split('|').filter(Boolean) : [])

function FoodPicker({ meal, date, onClose }) {
  const { db, upsert } = useStore()
  const [q, setQ] = useState('')
  const id = dietId(date, meal.key)
  const row = db.diet.find(r => r.id === id)
  const chosen = splitItems(row?.items)
  const save = items => upsert('diet', { id, date, meal: meal.key, items: items.join('|') })
  const toggle = f => save(chosen.includes(f) ? chosen.filter(x => x !== f) : [...chosen, f])

  const base = FOODS[meal.key]
  const extras = chosen.filter(c => !base.includes(c))
  const shown = [...extras, ...base].filter(f => f.toLowerCase().includes(q.trim().toLowerCase()))
  const canAdd = q.trim() && ![...base, ...chosen].some(f => f.toLowerCase() === q.trim().toLowerCase())

  return (
    <>
      <div className="field">
        <input className="input" value={q} onChange={e => setQ(e.target.value)} placeholder="Search or type your own food" />
      </div>
      <div className="food-list">
        <div className="chips">
          {canAdd && (
            <motion.button initial={{ scale: 0.6 }} animate={{ scale: 1 }} className="chip on" style={{ '--c': meal.color }} onClick={() => { toggle(q.trim()); setQ('') }}>
              <Plus size={14} /> Add "{q.trim()}"
            </motion.button>
          )}
          {shown.map(f => {
            const on = chosen.includes(f)
            return (
              <motion.button key={f} layout whileTap={{ scale: 0.88 }} className={`chip ${on ? 'on' : ''}`} style={{ '--c': meal.color }} onClick={() => toggle(f)}>
                {on && <Check size={14} strokeWidth={3} />} {f}
              </motion.button>
            )
          })}
        </div>
      </div>
      <div className="sheet-actions"><motion.button className="btn" whileTap={{ scale: 0.97 }} onClick={onClose}>Done · {chosen.length} selected</motion.button></div>
    </>
  )
}

export default function Diet() {
  const { db, upsert } = useStore()
  const today = dstr()
  const [date, setDate] = useState(today)
  const [pick, setPick] = useState(null)

  const logged = MEALS.filter(m => splitItems(db.diet.find(r => r.id === dietId(date, m.key))?.items).length).length
  const all = MEALS.flatMap(m => splitItems(db.diet.find(r => r.id === dietId(date, m.key))?.items))
  const total = nutrition(all)

  return (
    <Page>
      <Title emoji="🍛" title="Diet" sub={`${logged} of 4 meals logged`} />
      <Card className="" style={{ padding: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <motion.button whileTap={{ scale: 0.8 }} className="add" onClick={() => setDate(addDays(date, -1))}><ChevronLeft /></motion.button>
          <AnimatePresence mode="wait">
            <motion.b key={date} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} transition={{ duration: 0.18 }}>
              {date === today ? 'Today' : prettyDate(date)}
            </motion.b>
          </AnimatePresence>
          <motion.button whileTap={{ scale: 0.8 }} className="add" disabled={date >= today} style={{ opacity: date >= today ? 0.25 : 1 }} onClick={() => setDate(addDays(date, 1))}><ChevronRight /></motion.button>
        </div>
      </Card>

      <Card className="nutri">
        <div className="nutri-col">
          <small>Calories (approx)</small>
          <b><Num value={total.kcal} /> <em>/ {KCAL_GOAL}</em></b>
          <div className="bar big"><motion.i initial={{ width: 0 }} animate={{ width: `${Math.min(100, (total.kcal / KCAL_GOAL) * 100)}%` }} transition={{ duration: 1 }} style={{ background: total.kcal > KCAL_GOAL ? '#ff5d73' : 'linear-gradient(90deg,#ffc531,#ff8a4c)' }} /></div>
        </div>
        <div className="nutri-col">
          <small>Protein</small>
          <b><Num value={total.protein} /> g <em>/ {PROTEIN_GOAL}</em></b>
          <div className="bar big"><motion.i initial={{ width: 0 }} animate={{ width: `${Math.min(100, (total.protein / PROTEIN_GOAL) * 100)}%` }} transition={{ duration: 1, delay: 0.1 }} style={{ background: 'linear-gradient(90deg,#3ddc97,#4cc9f0)' }} /></div>
        </div>
      </Card>

      {MEALS.map(m => {
        const items = splitItems(db.diet.find(r => r.id === dietId(date, m.key))?.items)
        const n = nutrition(items)
        return (
          <Card key={m.key} className="meal" style={{ borderColor: items.length ? m.color + '88' : undefined }}>
            <div className="meal-h">
              <div className="meal-e" style={{ background: m.color + '33' }}>{m.emoji}</div>
              <div><h4>{m.label}</h4><small>{m.time}{items.length > 0 && n.kcal > 0 ? ` · ${n.kcal} kcal · ${n.protein} g protein` : ''}</small></div>
              <motion.button className="add" style={{ background: m.color }} whileTap={{ scale: 0.8, rotate: 90 }} onClick={() => setPick(m)}><Plus size={20} strokeWidth={3} /></motion.button>
            </div>
            {items.length > 0 ? (
              <div className="chips">
                <AnimatePresence>
                  {items.map(f => (
                    <motion.span key={f} layout initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} transition={spring} className="chip on" style={{ '--c': m.color }}>
                      {f}
                      <button onClick={() => upsert('diet', { id: dietId(date, m.key), date, meal: m.key, items: items.filter(x => x !== f).join('|') })} aria-label={`Remove ${f}`}><X size={14} strokeWidth={3} /></button>
                    </motion.span>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <small style={{ color: 'var(--muted)' }}>Tap + to add what you ate</small>
            )}
          </Card>
        )
      })}

      <Sheet open={!!pick} onClose={() => setPick(null)} title={pick ? `${pick.emoji} What did you have for ${pick.label.toLowerCase()}?` : ''}>
        {pick && <FoodPicker meal={pick} date={date} onClose={() => setPick(null)} />}
      </Sheet>
    </Page>
  )
}
