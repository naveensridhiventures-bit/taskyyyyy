import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { useStore, uid, dstr, num, ym, addMonths, monthLabel, prettyDate } from '../store'
import { INCOME_CATS, EXPENSE_CATS, catEmoji, inr, monthSummary, kindOf } from '../fin'
import { Page, Card, Sheet, Swipe, Num, Empty, spring } from '../ui'
import { useEdit } from '../editctx'

export function AccountChips({ value, onChange, allowNone, exclude }) {
  const { db } = useStore()
  return (
    <div className="chips">
      {allowNone && <button className={`chip ${value === '' ? 'on' : ''}`} onClick={() => onChange('')}>Don't record</button>}
      {db.accounts.filter(a => a.id !== exclude).map(a => (
        <button key={a.id} className={`chip ${value === a.id ? 'on' : ''}`} onClick={() => onChange(a.id)}>{kindOf(a.kind).e} {a.name}</button>
      ))}
    </div>
  )
}

export function TxnForm({ open, onClose, edit }) {
  const { db, upsert, remove } = useStore()
  const [type, setType] = useState('expense')
  const [amount, setAmount] = useState('')
  const [cat, setCat] = useState('')
  const [acc, setAcc] = useState('')
  const [to, setTo] = useState('')
  const [date, setDate] = useState(dstr())
  const [note, setNote] = useState('')
  useEffect(() => {
    if (!open) return
    if (edit) { setType(edit.type); setAmount(String(edit.amount)); setCat(edit.type === 'transfer' ? '' : edit.category); setAcc(edit.account || ''); setTo(edit.toAccount || ''); setDate(edit.date); setNote(edit.note || '') }
    else { setType('expense'); setAmount(''); setCat(''); setAcc(''); setTo(''); setDate(dstr()); setNote('') }
  }, [open, edit?.id]) // eslint-disable-line

  const from = acc || db.accounts[0]?.id || ''
  const toId = to && to !== from ? to : db.accounts.find(a => a.id !== from)?.id || ''
  const cats = type === 'income' ? INCOME_CATS : EXPENSE_CATS
  const amt = parseFloat(amount)
  const valid = amt > 0 && (type !== 'transfer' || (from && toId && from !== toId))

  const save = () => {
    if (!valid) return
    upsert('finance', {
      ...(edit || {}), id: edit ? edit.id : uid(), date, type, amount: amt, account: from, toAccount: type === 'transfer' ? toId : '', note: note.trim(),
      category: type === 'transfer' ? 'Transfer' : cat || (type === 'income' ? 'Other income' : 'Other expense')
    })
    onClose()
  }
  const col = type === 'income' ? '#3ddc97' : type === 'expense' ? '#ff5d73' : '#4cc9f0'

  return (
    <Sheet open={open} onClose={onClose} title={edit ? 'Edit transaction' : 'Add transaction'}>
      <div className="typeseg">
        {[['expense', 'Expense'], ['income', 'Income'], ['transfer', 'Transfer']].map(([k, l]) => (
          <button key={k} className={type === k ? 'on' : ''} style={type === k ? { background: k === 'income' ? '#3ddc97' : k === 'expense' ? '#ff5d73' : '#4cc9f0' } : {}} onClick={() => { setType(k); setCat('') }}>{l}</button>
        ))}
      </div>
      <div className="amt" style={{ color: col }}>
        <span>₹</span>
        <input inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0" />
      </div>

      {type !== 'transfer' && (
        <div className="field">
          <label>Category</label>
          <div className="chips">
            {cats.map(c => <button key={c.k} className={`chip ${cat === c.k ? 'on' : ''}`} style={{ '--c': col }} onClick={() => setCat(c.k)}>{c.e} {c.k}</button>)}
          </div>
        </div>
      )}
      {db.accounts.length > 0 && (
        <div className="field">
          <label>{type === 'transfer' ? 'From' : type === 'income' ? 'Received in' : 'Paid from'}</label>
          <AccountChips value={from} onChange={setAcc} />
        </div>
      )}
      {type === 'transfer' && db.accounts.length > 1 && (
        <div className="field"><label>To</label><AccountChips value={toId} onChange={setTo} exclude={from} /></div>
      )}
      {db.accounts.length === 0 && <p className="hint">Tip: add your bank and cash balance on the Overview tab so balances update automatically.</p>}
      <div className="two">
        <div className="field"><label>Date</label><input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} /></div>
        <div className="field"><label>Note</label><input className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="Optional" /></div>
      </div>
      <motion.button className="btn" whileTap={{ scale: 0.97 }} disabled={!valid} onClick={save}>{edit ? 'Save changes' : `Save ${type}`}</motion.button>
      {edit && <button className="linkbtn" onClick={() => { remove('finance', edit.id); onClose() }}>Delete transaction</button>}
    </Sheet>
  )
}

export default function Txns() {
  const { db, remove } = useStore()
  const edit = useEdit()
  const [month, setMonth] = useState(ym(dstr()))
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const sum = monthSummary(db, month)
  const accName = id => db.accounts.find(a => a.id === id)?.name

  const rows = db.finance
    .filter(t => t.date.startsWith(month) && (filter === 'all' || t.type === filter) && (!q || `${t.category} ${t.note}`.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => b.date.localeCompare(a.date))
  const groups = rows.reduce((g, t) => { (g[t.date] = g[t.date] || []).push(t); return g }, {})
  const sign = t => (t.type === 'income' ? 1 : t.type === 'expense' ? -1 : 0)

  return (
    <Page>
      <Card style={{ padding: 10 }}>
        <div className="monthnav">
          <motion.button whileTap={{ scale: 0.8 }} className="add arrow" onClick={() => setMonth(addMonths(month, -1))}><ChevronLeft /></motion.button>
          <AnimatePresence mode="wait"><motion.b key={month} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} transition={{ duration: 0.18 }}>{monthLabel(month)}</motion.b></AnimatePresence>
          <motion.button whileTap={{ scale: 0.8 }} className="add arrow" disabled={month >= ym(dstr())} style={{ opacity: month >= ym(dstr()) ? 0.25 : 1 }} onClick={() => setMonth(addMonths(month, 1))}><ChevronRight /></motion.button>
        </div>
      </Card>
      <div className="tiles">
        <Card className="tile"><span>Income</span><b style={{ color: '#3ddc97' }}><Num value={sum.income} prefix="₹" /></b></Card>
        <Card className="tile"><span>Expense</span><b style={{ color: '#ff8fa0' }}><Num value={sum.expense} prefix="₹" /></b></Card>
        <Card className="tile"><span>Saved</span><b><Num value={sum.income - sum.expense} prefix="₹" /></b></Card>
      </div>
      <Card style={{ padding: 12 }}>
        <div className="search"><Search size={16} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search category or note" /></div>
        <div className="filters" style={{ marginTop: 10 }}>
          {[['all', 'All'], ['income', 'Income'], ['expense', 'Expense'], ['transfer', 'Transfer']].map(([k, l]) => <button key={k} className={`chip ${filter === k ? 'on' : ''}`} onClick={() => setFilter(k)}>{l}</button>)}
        </div>
      </Card>

      {Object.keys(groups).map(d => {
        const net = groups[d].reduce((s, t) => s + sign(t) * num(t.amount), 0)
        return (
          <div key={d}>
            <div className="sec" style={{ justifyContent: 'space-between', margin: '4px 4px 8px' }}><span>{d === dstr() ? 'Today' : prettyDate(d)}</span><span style={{ color: net >= 0 ? '#3ddc97' : '#ff8fa0' }}>{inr(net)}</span></div>
            <div className="rows">
              <AnimatePresence>
                {groups[d].map(t => (
                  <Swipe key={t.id} onDelete={() => remove('finance', t.id)}>
                    <div className="cat-e">{catEmoji(t.type, t.category)}</div>
                    <motion.div className="row-main tappable" onTap={() => edit('txn', t)}>
                      <div className="row-title" style={{ '--x': 0 }}>{t.category}</div>
                      <div className="meta">
                        {t.type === 'transfer' ? <span className="tag">{accName(t.account) || '?'} → {accName(t.toAccount) || '?'}</span> : accName(t.account) && <span className="tag">{accName(t.account)}</span>}
                        {t.note && <span className="tag time">{t.note}</span>}
                      </div>
                    </motion.div>
                    <b className="amt-r" style={{ color: t.type === 'income' ? '#3ddc97' : t.type === 'expense' ? '#ff8fa0' : '#4cc9f0' }}>{t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''}{inr(num(t.amount)).replace('-', '')}</b>
                  </Swipe>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )
      })}
      {rows.length === 0 && <Empty emoji="🪙" text="No transactions here. Tap + to add income or an expense." />}
    </Page>
  )
}
