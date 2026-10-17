import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HandCoins, ArrowDownLeft, ArrowUpRight, CheckCheck, CalendarClock } from 'lucide-react'
import { useStore, uid, dstr, num, prettyDate } from '../store'
import { remaining, debtTotals, inr } from '../fin'
import { Page, Card, Sheet, Swipe, Num, Empty, rise } from '../ui'
import { useEdit } from '../editctx'
import { AccountChips } from './Txns'

const COLORS = ['#ff8a4c', '#4cc9f0', '#8b6cff', '#3ddc97', '#ff5d73', '#ffc531']
const colorOf = n => COLORS[[...n].reduce((s, c) => s + c.charCodeAt(0), 0) % COLORS.length]

export function DebtForm({ open, onClose, edit }) {
  const { db, upsert, remove } = useStore()
  const [dir, setDir] = useState('receive')
  const [person, setPerson] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(dstr())
  const [due, setDue] = useState('')
  const [note, setNote] = useState('')
  const [acc, setAcc] = useState('')
  useEffect(() => {
    if (!open) return
    if (edit) { setDir(edit.direction); setPerson(edit.person); setAmount(String(edit.amount)); setDate(edit.date || dstr()); setDue(edit.due || ''); setNote(edit.note || ''); setAcc('') }
    else { setDir('receive'); setPerson(''); setAmount(''); setDate(dstr()); setDue(''); setNote(''); setAcc('') }
  }, [open, edit?.id]) // eslint-disable-line
  const names = [...new Set(db.debts.map(d => d.person))].slice(0, 8)
  const amt = parseFloat(amount)
  const valid = person.trim() && amt > 0

  const save = () => {
    if (!valid) return
    upsert('debts', { ...(edit || {}), id: edit ? edit.id : uid(), person: person.trim(), direction: dir, amount: amt, paid: edit ? edit.paid : 0, date, due, note: note.trim() })
    if (!edit && acc) upsert('finance', { id: uid(), date, type: dir === 'receive' ? 'expense' : 'income', category: dir === 'receive' ? 'Lent money' : 'Borrowed money', amount: amt, account: acc, toAccount: '', note: `${dir === 'receive' ? 'Lent to' : 'Borrowed from'} ${person.trim()}` })
    onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title={edit ? 'Edit entry' : 'Add money to track'}>
      <div className="typeseg">
        <button className={dir === 'receive' ? 'on' : ''} style={dir === 'receive' ? { background: '#3ddc97' } : {}} onClick={() => setDir('receive')}>They owe me</button>
        <button className={dir === 'pay' ? 'on' : ''} style={dir === 'pay' ? { background: '#ff5d73' } : {}} onClick={() => setDir('pay')}>I owe them</button>
      </div>
      <div className="amt" style={{ color: dir === 'receive' ? '#3ddc97' : '#ff5d73' }}><span>₹</span><input inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0" /></div>
      <div className="field">
        <label>Person</label>
        <input className="input" value={person} onChange={e => setPerson(e.target.value)} placeholder="Name" />
        {!edit && names.length > 0 && <div className="chips" style={{ marginTop: 6 }}>{names.map(n => <button key={n} className="chip" onClick={() => setPerson(n)}>{n}</button>)}</div>}
      </div>
      <div className="two">
        <div className="field"><label>Given on</label><input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} /></div>
        <div className="field"><label>Due date</label><input type="date" className="input" value={due} onChange={e => setDue(e.target.value)} /></div>
      </div>
      <div className="field"><label>Note</label><input className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="Reason (optional)" /></div>
      {!edit && db.accounts.length > 0 && (
        <div className="field">
          <label>{dir === 'receive' ? 'Take this money out of' : 'Add this money to'}</label>
          <AccountChips value={acc} onChange={setAcc} allowNone />
        </div>
      )}
      <motion.button className="btn" whileTap={{ scale: 0.97 }} disabled={!valid} onClick={save}>{edit ? 'Save changes' : 'Save'}</motion.button>
      {edit && <button className="linkbtn" onClick={() => { remove('debts', edit.id); onClose() }}>Delete entry</button>}
    </Sheet>
  )
}

function PayForm({ debt, onClose }) {
  const { db, upsert } = useStore()
  const [amount, setAmount] = useState('')
  const [acc, setAcc] = useState('')
  const [date, setDate] = useState(dstr())
  useEffect(() => { if (debt) { setAmount(String(remaining(debt))); setAcc(db.accounts[0]?.id || ''); setDate(dstr()) } }, [debt]) // eslint-disable-line
  if (!debt) return null
  const rec = debt.direction === 'receive'
  const amt = Math.min(parseFloat(amount) || 0, remaining(debt))
  const save = () => {
    if (!(amt > 0)) return
    upsert('debts', { ...debt, paid: num(debt.paid) + amt })
    if (acc) upsert('finance', { id: uid(), date, type: rec ? 'income' : 'expense', category: rec ? 'Debt received' : 'Debt paid', amount: amt, account: acc, toAccount: '', note: `${rec ? 'From' : 'To'} ${debt.person}` })
    onClose()
  }
  return (
    <>
      <p className="hint" style={{ marginTop: -6 }}>{debt.person} · {inr(remaining(debt))} pending</p>
      <div className="amt" style={{ color: rec ? '#3ddc97' : '#ff5d73' }}><span>₹</span><input autoFocus inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} /></div>
      {db.accounts.length > 0 && <div className="field"><label>{rec ? 'Received in' : 'Paid from'}</label><AccountChips value={acc} onChange={setAcc} allowNone /></div>}
      <div className="field"><label>Date</label><input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} /></div>
      <motion.button className="btn" whileTap={{ scale: 0.97 }} disabled={!(amt > 0)} onClick={save}>{rec ? 'Mark received' : 'Mark paid'}</motion.button>
    </>
  )
}

function DebtCard({ d }) {
  const { remove } = useStore()
  const edit = useEdit()
  const rem = remaining(d)
  const [paying, setPaying] = useState(null)
  const rec = d.direction === 'receive'
  const pct = num(d.amount) ? num(d.paid) / num(d.amount) : 0
  const late = rem > 0 && d.due && d.due < dstr()
  return (
    <Swipe onDelete={() => remove('debts', d.id)} className="row debt">
      <div className="avatar" style={{ background: colorOf(d.person) }}>{d.person[0]?.toUpperCase()}</div>
      <motion.div className="row-main tappable" onTap={() => edit('debt', d)}>
        <div className="debt-top"><div className="row-title" style={{ '--x': 0 }}>{d.person}</div><b style={{ color: rem ? (rec ? '#3ddc97' : '#ff8fa0') : 'var(--muted)' }}>{inr(rem)}</b></div>
        <div className="meta">
          <span className="tag">of {inr(num(d.amount))}</span>
          {d.due ? <span className={`tag ${late ? 'late' : 'time'}`}><CalendarClock size={11} /> {late ? 'Overdue · ' : 'Due '}{prettyDate(d.due)}</span> : <span className="tag">No due date</span>}
          {d.note && <span className="tag">{d.note}</span>}
        </div>
        <div className="bar" style={{ marginTop: 9 }}><motion.i initial={{ width: 0 }} animate={{ width: `${pct * 100}%` }} transition={{ duration: 0.9 }} style={{ background: rec ? '#3ddc97' : '#ff8fa0' }} /></div>
        {rem > 0 && <div className="debt-actions"><button className="mini" onPointerDown={e => e.stopPropagation()} onClick={() => setPaying(d)}>{rec ? 'Received' : 'Paid'}</button></div>}
      </motion.div>
      <Sheet open={!!paying} onClose={() => setPaying(null)} title={rec ? 'Record money received' : 'Record payment'}>
        <PayForm debt={paying} onClose={() => setPaying(null)} />
      </Sheet>
    </Swipe>
  )
}

export default function People() {
  const { db } = useStore()
  const t = debtTotals(db)
  const open = db.debts.filter(d => remaining(d) > 0).sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'))
  const receive = open.filter(d => d.direction === 'receive')
  const pay = open.filter(d => d.direction === 'pay')
  const settled = db.debts.filter(d => remaining(d) <= 0)

  return (
    <Page>
      <div className="tiles two-col">
        <Card className="tile glow-green"><div className="ic" style={{ background: '#3ddc9733', color: '#3ddc97' }}><ArrowDownLeft size={18} /></div><span>To receive</span><b style={{ color: '#3ddc97' }}><Num value={t.receive} prefix="₹" /></b></Card>
        <Card className="tile glow-red"><div className="ic" style={{ background: '#ff5d7333', color: '#ff8fa0' }}><ArrowUpRight size={18} /></div><span>To pay</span><b style={{ color: '#ff8fa0' }}><Num value={t.pay} prefix="₹" /></b></Card>
      </div>

      <div className="sec"><HandCoins size={16} /> People who owe me</div>
      <div className="rows"><AnimatePresence>{receive.map(d => <DebtCard key={d.id} d={d} />)}</AnimatePresence></div>
      {receive.length === 0 && <motion.p variants={rise} className="hint">Nobody owes you money right now.</motion.p>}

      <div className="sec"><ArrowUpRight size={16} /> People I owe</div>
      <div className="rows"><AnimatePresence>{pay.map(d => <DebtCard key={d.id} d={d} />)}</AnimatePresence></div>
      {pay.length === 0 && <motion.p variants={rise} className="hint">You don't owe anyone. Nice.</motion.p>}

      {settled.length > 0 && (<><div className="sec"><CheckCheck size={16} /> Settled</div><div className="rows">{settled.map(d => <DebtCard key={d.id} d={d} />)}</div></>)}
      {db.debts.length === 0 && <Empty emoji="🤝" text="Tap + to track money you lent or borrowed." />}
    </Page>
  )
}
