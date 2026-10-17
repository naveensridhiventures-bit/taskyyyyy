import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Target, CalendarClock } from 'lucide-react'
import { useStore, uid, dstr, num, prettyDate } from '../store'
import { inr } from '../fin'
import { Page, Card, Title, Ring, Num, Sheet, Empty, rise } from '../ui'
import { AccountChips } from './Txns'
import { useEdit } from '../editctx'

const EMOJI = ['💻', '✈️', '🏍️', '🚗', '🏠', '📱', '🎓', '💍', '🏖️', '🎁', '🛡️', '💰']

// whole months left until the deadline (0 = deadline already passed)
export function monthsLeft(deadline) {
  if (!deadline) return null
  const [y, m, d] = deadline.split('-').map(Number)
  const ms = new Date(y, m - 1, d) - new Date()
  return ms <= 0 ? 0 : Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24 * 30.4375)))
}
export function goalNeed(g) {
  const left = Math.max(0, num(g.target) - num(g.saved))
  const mo = monthsLeft(g.deadline)
  return { left, mo, perMonth: mo ? Math.ceil(left / mo) : 0 }
}
function hint(g) {
  const { left, mo, perMonth } = goalNeed(g)
  if (left <= 0) return '🎉 Goal reached'
  if (mo === null) return `${inr(left)} to go. Add a deadline for a monthly plan.`
  if (mo === 0) return `Deadline passed. ${inr(left)} still needed.`
  return `Save ${inr(perMonth)} / month for ${mo} month${mo > 1 ? 's' : ''}`
}

export function GoalForm({ open, onClose, edit }) {
  const { upsert, remove } = useStore()
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('💰')
  const [target, setTarget] = useState('')
  const [saved, setSaved] = useState('')
  const [deadline, setDeadline] = useState('')
  useEffect(() => {
    if (!open) return
    if (edit) { setName(edit.name); setEmoji(edit.emoji || '💰'); setTarget(String(edit.target)); setSaved(String(num(edit.saved))); setDeadline(edit.deadline || '') }
    else { setName(''); setEmoji('💰'); setTarget(''); setSaved(''); setDeadline('') }
  }, [open, edit?.id]) // eslint-disable-line
  const valid = name.trim() && parseFloat(target) > 0
  const save = () => {
    if (!valid) return
    upsert('goals', { ...(edit || {}), id: edit ? edit.id : uid(), name: name.trim(), emoji, target: parseFloat(target), saved: parseFloat(saved) || 0, deadline, note: edit?.note || '' })
    onClose()
  }
  const live = goalNeed({ target: parseFloat(target) || 0, saved: parseFloat(saved) || 0, deadline })
  return (
    <Sheet open={open} onClose={onClose} title={edit ? 'Edit goal' : 'New savings goal'}>
      <div className="field"><label>What are you saving for?</label><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Laptop, Goa trip, Emergency fund..." /></div>
      <div className="field"><label>Icon</label><div className="chips">{EMOJI.map(e => <button key={e} className={`chip ${emoji === e ? 'on' : ''}`} onClick={() => setEmoji(e)}>{e}</button>)}</div></div>
      <div className="two">
        <div className="field"><label>Target (₹)</label><input className="input" inputMode="decimal" value={target} onChange={e => setTarget(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="80000" /></div>
        <div className="field"><label>Saved so far (₹)</label><input className="input" inputMode="decimal" value={saved} onChange={e => setSaved(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0" /></div>
      </div>
      <div className="field"><label>Reach it by</label><input type="date" className="input" value={deadline} onChange={e => setDeadline(e.target.value)} /></div>
      {valid && deadline && live.mo > 0 && live.left > 0 && <p className="hint plan">📈 Save <b>{inr(live.perMonth)}</b> every month for {live.mo} month{live.mo > 1 ? 's' : ''}.</p>}
      <motion.button className="btn" whileTap={{ scale: 0.97 }} disabled={!valid} onClick={save}>{edit ? 'Save changes' : 'Create goal'}</motion.button>
      {edit && <button className="linkbtn" onClick={() => { remove('goals', edit.id); onClose() }}>Delete goal</button>}
    </Sheet>
  )
}

function AddMoney({ goal, onClose }) {
  const { db, upsert } = useStore()
  const [amount, setAmount] = useState('')
  const [acc, setAcc] = useState('')
  if (!goal) return null
  const amt = parseFloat(amount)
  const save = () => {
    if (!(amt > 0)) return
    upsert('goals', { ...goal, saved: num(goal.saved) + amt })
    if (acc) upsert('finance', { id: uid(), date: dstr(), type: 'expense', category: 'Investments', amount: amt, account: acc, toAccount: '', note: `Goal: ${goal.name}` })
    onClose()
  }
  return (
    <>
      <p className="hint" style={{ marginTop: -6 }}>{goal.emoji} {goal.name} · {inr(Math.max(0, num(goal.target) - num(goal.saved)))} to go</p>
      <div className="amt" style={{ color: '#3ddc97' }}><span>₹</span><input inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0" /></div>
      {db.accounts.length > 0 && <div className="field"><label>Take it from</label><AccountChips value={acc} onChange={setAcc} allowNone /></div>}
      <motion.button className="btn" whileTap={{ scale: 0.97 }} disabled={!(amt > 0)} onClick={save}>Add to goal</motion.button>
    </>
  )
}

function GoalCard({ g, i }) {
  const edit = useEdit()
  const [adding, setAdding] = useState(null)
  const target = num(g.target), saved = num(g.saved)
  const pct = target ? Math.min(1, saved / target) : 0
  const done = pct >= 1
  return (
    <Card className={`goal ${done ? 'goal-done' : ''}`}>
      <motion.div className="goal-top tappable" onTap={() => edit('goal', g)}>
        <Ring size={92} stroke={9} value={pct}><b style={{ fontSize: 20 }}>{Math.round(pct * 100)}%</b></Ring>
        <div className="goal-info">
          <h4>{g.emoji} {g.name}</h4>
          <div className="goal-amt"><b>{inr(saved)}</b> <span>of {inr(target)}</span></div>
          <p className="hint" style={{ margin: '4px 0 0' }}>{hint(g)}</p>
          {g.deadline && <span className="tag time" style={{ marginTop: 8 }}><CalendarClock size={11} /> {prettyDate(g.deadline)}</span>}
        </div>
      </motion.div>
      {!done && <motion.button className="mini big" style={{ alignSelf: 'flex-start' }} whileTap={{ scale: 0.92 }} onClick={() => setAdding(g)}>+ Add money</motion.button>}
      <Sheet open={!!adding} onClose={() => setAdding(null)} title="Add money to goal"><AddMoney goal={adding} onClose={() => setAdding(null)} /></Sheet>
    </Card>
  )
}

export default function Goals() {
  const { db } = useStore()
  const goals = [...db.goals].sort((a, b) => (a.deadline || '9999').localeCompare(b.deadline || '9999'))
  const totalSaved = goals.reduce((s, g) => s + num(g.saved), 0)
  const totalTarget = goals.reduce((s, g) => s + num(g.target), 0)
  const perMonth = goals.reduce((s, g) => s + goalNeed(g).perMonth, 0)
  return (
    <Page>
      <Title emoji="🎯" title="Savings goals" sub="Small amounts, big plans" />
      {goals.length > 0 && (
        <Card className="hero goals-hero">
          <div style={{ flex: 1 }}>
            <small>Saved across goals</small>
            <div className="big"><Num value={totalSaved} prefix="₹" /></div>
            <small>of {inr(totalTarget)}</small>
          </div>
          <div className="need"><small>Needed per month</small><b><Num value={perMonth} prefix="₹" /></b></div>
        </Card>
      )}
      {goals.map((g, i) => <GoalCard key={g.id} g={g} i={i} />)}
      {goals.length === 0 && <Empty emoji="🎯" text="Tap + to set your first goal, like a laptop or a trip." />}
    </Page>
  )
}
