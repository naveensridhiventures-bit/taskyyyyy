import { useState } from 'react'
import { motion } from 'framer-motion'
import { Landmark, Plus, SlidersHorizontal, TrendingUp, TrendingDown } from 'lucide-react'
import { useStore, uid, dstr, num, ym, addMonths, shortMonth } from '../store'
import { balances, debtTotals, monthSummary, catEmoji, kindOf, ACCOUNT_KINDS, inr, DEBT_CATS } from '../fin'
import { Page, Card, Title, Sheet, Seg, Num, Fab, rise, spring } from '../ui'
import Txns, { TxnForm } from './Txns'
import People, { DebtForm } from './People'

function SetupCard() {
  const { upsert } = useStore()
  const [bank, setBank] = useState('')
  const [cash, setCash] = useState('')
  const save = () => {
    upsert('accounts', { id: 'acc-bank', name: 'Bank', kind: 'bank', opening: parseFloat(bank) || 0 })
    upsert('accounts', { id: 'acc-cash', name: 'Cash', kind: 'cash', opening: parseFloat(cash) || 0 })
  }
  return (
    <Card className="setup">
      <div style={{ fontSize: 34 }}>🏦</div>
      <h3 style={{ margin: '6px 0 4px' }}>How much do you have right now?</h3>
      <p className="hint" style={{ marginBottom: 14 }}>Enter your current balances once. After that every income, expense and transfer updates them.</p>
      <div className="two">
        <div className="field"><label>🏦 In bank</label><input className="input" inputMode="decimal" value={bank} onChange={e => setBank(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="₹ 0" /></div>
        <div className="field"><label>💵 Cash in hand</label><input className="input" inputMode="decimal" value={cash} onChange={e => setCash(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="₹ 0" /></div>
      </div>
      <motion.button className="btn" whileTap={{ scale: 0.97 }} onClick={save}>Start tracking</motion.button>
    </Card>
  )
}

function AccountForm({ open, onClose, edit }) {
  const { upsert } = useStore()
  const [name, setName] = useState('')
  const [kind, setKind] = useState('wallet')
  const [bal, setBal] = useState('')
  const save = () => {
    if (!name.trim()) return
    upsert('accounts', { id: uid(), name: name.trim(), kind, opening: parseFloat(bal) || 0 })
    setName(''); setBal(''); onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title="Add account">
      <div className="field"><label>Name</label><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="HDFC Savings, GPay, Piggy bank..." /></div>
      <div className="field"><label>Type</label><div className="chips">{ACCOUNT_KINDS.map(k => <button key={k.k} className={`chip ${kind === k.k ? 'on' : ''}`} onClick={() => setKind(k.k)}>{k.e} {k.l}</button>)}</div></div>
      <div className="field"><label>Current balance</label><input className="input" inputMode="decimal" value={bal} onChange={e => setBal(e.target.value.replace(/[^0-9.-]/g, ''))} placeholder="₹ 0" /></div>
      <motion.button className="btn" disabled={!name.trim()} whileTap={{ scale: 0.97 }} onClick={save}>Add account</motion.button>
    </Sheet>
  )
}

function AdjustForm({ acc, onClose }) {
  const { upsert, remove } = useStore()
  const [val, setVal] = useState('')
  if (!acc) return null
  const save = () => {
    const actual = parseFloat(val)
    if (isNaN(actual)) return
    upsert('accounts', { id: acc.id, name: acc.name, kind: acc.kind, opening: actual - (acc.balance - num(acc.opening)) })
    onClose()
  }
  return (
    <>
      <p className="hint" style={{ marginTop: -6 }}>Shown balance: {inr(acc.balance)}. Enter what you really have and the difference is corrected.</p>
      <div className="amt"><span>₹</span><input autoFocus inputMode="decimal" value={val} onChange={e => setVal(e.target.value.replace(/[^0-9.-]/g, ''))} placeholder={String(Math.round(acc.balance))} /></div>
      <motion.button className="btn" whileTap={{ scale: 0.97 }} onClick={save}>Update balance</motion.button>
      <button className="linkbtn" onClick={() => { remove('accounts', acc.id); onClose() }}>Delete this account</button>
    </>
  )
}

function Overview({ go }) {
  const { db } = useStore()
  const [addAcc, setAddAcc] = useState(false)
  const [adj, setAdj] = useState(null)
  const { list, total } = balances(db)
  const { receive, pay } = debtTotals(db)
  const month = ym(dstr())
  const m = monthSummary(db, month)
  const maxCat = Math.max(1, ...m.cats.map(c => c[1]))
  const months = Array.from({ length: 6 }, (_, i) => addMonths(month, i - 5))
  const trend = months.map(k => ({ k, ...monthSummary(db, k) }))
  const maxT = Math.max(1, ...trend.map(t => Math.max(t.income, t.expense)))
  const rate = m.income ? Math.round(((m.income - m.expense) / m.income) * 100) : 0

  return (
    <Page>
      <Title emoji="💰" title="Money" sub="Know where every rupee goes" />
      {list.length === 0 ? <SetupCard /> : (
        <>
          <Card className="hero money-hero">
            <div className="coins"><span>🪙</span><span>💰</span><span>🪙</span><span>💵</span><span>🪙</span></div>
            <small>Available in accounts</small>
            <div className="big"><Num value={total} prefix="₹" /></div>
            <div className="net-row">
              <div><small>To receive</small><b style={{ color: '#3ddc97' }}><Num value={receive} prefix="₹" /></b></div>
              <div><small>To pay</small><b style={{ color: '#ffb3bf' }}><Num value={pay} prefix="₹" /></b></div>
              <div><small>Net worth</small><b><Num value={total + receive - pay} prefix="₹" /></b></div>
            </div>
          </Card>

          <div className="acc-scroll">
            {list.map((a, i) => (
              <motion.div key={a.id} className="acc" style={{ background: kindOf(a.kind).c }} initial={{ opacity: 0, x: 60, rotate: 4 }} animate={{ opacity: 1, x: 0, rotate: 0 }} transition={{ ...spring, delay: 0.15 + i * 0.1 }} whileTap={{ scale: 0.96 }}>
                <div className="acc-top"><span>{kindOf(a.kind).e} {a.name}</span><button onClick={() => setAdj(a)} aria-label="Adjust balance"><SlidersHorizontal size={16} /></button></div>
                <b><Num value={a.balance} prefix="₹" /></b>
                <small>{kindOf(a.kind).l}</small>
              </motion.div>
            ))}
            <motion.button className="acc add-acc" whileTap={{ scale: 0.95 }} onClick={() => setAddAcc(true)}><Plus /> Add account</motion.button>
          </div>
        </>
      )}

      <Card>
        <div className="card-h"><h4>This month</h4><span className="pill ok" style={{ color: rate >= 0 ? '#3ddc97' : '#ff8fa0' }}>{rate >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />} {m.income ? `${rate}% saved` : 'No income yet'}</span></div>
        {[['Income', m.income, '#3ddc97'], ['Expense', m.expense, '#ff5d73']].map(([l, v, c]) => (
          <div key={l} className="mbar"><div className="mbar-h"><span>{l}</span><b>{inr(v)}</b></div>
            <div className="bar big"><motion.i initial={{ width: 0 }} animate={{ width: `${Math.min(100, (v / Math.max(m.income, m.expense, 1)) * 100)}%` }} transition={{ duration: 1, ease: 'easeOut' }} style={{ background: c }} /></div></div>
        ))}
      </Card>

      {m.cats.length > 0 && (
        <Card>
          <h4 style={{ marginBottom: 12 }}>Where money went</h4>
          {m.cats.slice(0, 6).map(([k, v], i) => (
            <div key={k} className="catbar">
              <span className="cat-e sm">{catEmoji('expense', k)}</span>
              <div style={{ flex: 1 }}>
                <div className="mbar-h"><span>{k}</span><b>{inr(v)}</b></div>
                <div className="bar"><motion.i initial={{ width: 0 }} animate={{ width: `${(v / maxCat) * 100}%` }} transition={{ duration: 0.9, delay: 0.15 + i * 0.08 }} style={{ background: `hsl(${350 - i * 38} 90% 65%)` }} /></div>
              </div>
            </div>
          ))}
        </Card>
      )}

      <Card>
        <h4 style={{ marginBottom: 12 }}>Last 6 months</h4>
        <div className="chart" style={{ height: 110 }}>
          {trend.map((t, i) => (
            <div key={t.k}>
              <div className="pair">
                <motion.i initial={{ height: 4 }} animate={{ height: 4 + (t.income / maxT) * 80 }} transition={{ ...spring, delay: 0.2 + i * 0.07 }} style={{ background: '#3ddc97' }} />
                <motion.i initial={{ height: 4 }} animate={{ height: 4 + (t.expense / maxT) * 80 }} transition={{ ...spring, delay: 0.25 + i * 0.07 }} style={{ background: '#ff5d73' }} />
              </div>
              {shortMonth(t.k)}
            </div>
          ))}
        </div>
        <small className="hint">Green = income, red = expense. Lent and borrowed money is not counted here.</small>
      </Card>

      <AccountForm open={addAcc} onClose={() => setAddAcc(false)} />
      <Sheet open={!!adj} onClose={() => setAdj(null)} title={adj ? `Adjust ${adj.name}` : ''}><AdjustForm acc={adj} onClose={() => setAdj(null)} /></Sheet>
    </Page>
  )
}

export default function Money({ sub, setSub }) {
  const [tx, setTx] = useState(false)
  const [debt, setDebt] = useState(false)
  return (
    <>
      <Seg id="money" value={sub} onChange={setSub} options={[{ k: 'overview', label: 'Overview' }, { k: 'txns', label: 'Transactions' }, { k: 'people', label: 'People' }]} />
      {sub === 'overview' && <Overview />}
      {sub === 'txns' && <Txns />}
      {sub === 'people' && <People />}
      <Fab onClick={() => (sub === 'people' ? setDebt(true) : setTx(true))} />
      <TxnForm open={tx} onClose={() => setTx(false)} />
      <DebtForm open={debt} onClose={() => setDebt(false)} />
    </>
  )
}
