import { useState } from 'react'
import { motion } from 'framer-motion'
import { Droplet, Moon, Minus, Plus, Scale } from 'lucide-react'
import { useStore, dstr, dayRow, num, prettyDate } from '../store'
import { Page, Card, Title, Num, spring } from '../ui'

const GOAL = 8

function Weight() {
  const { db, patchDay } = useStore()
  const today = dstr()
  const [val, setVal] = useState('')
  const pts = db.daily.filter(r => r.weight !== '' && num(r.weight) > 0).sort((a, b) => a.date.localeCompare(b.date)).slice(-14)
  const W = 300, H = 90
  const min = Math.min(...pts.map(p => num(p.weight))) - 1
  const max = Math.max(...pts.map(p => num(p.weight))) + 1
  const xy = pts.map((p, i) => [pts.length > 1 ? (i / (pts.length - 1)) * (W - 20) + 10 : W / 2, H - 10 - ((num(p.weight) - min) / (max - min || 1)) * (H - 20)])
  const path = xy.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const first = pts[0] && num(pts[0].weight), last = pts.length && num(pts[pts.length - 1].weight)
  const save = () => { const v = parseFloat(val); if (v > 0) { patchDay(today, { weight: v }); setVal('') } }
  return (
    <Card>
      <div className="card-h"><h4><Scale size={16} style={{ verticalAlign: -2 }} /> Weight</h4>{pts.length > 1 && <span className="pill" style={{ color: last <= first ? '#3ddc97' : '#ff8fa0' }}>{last - first > 0 ? '+' : ''}{(last - first).toFixed(1)} kg</span>}</div>
      <div className="weight-in">
        <input className="input" inputMode="decimal" value={val} onChange={e => setVal(e.target.value.replace(/[^0-9.]/g, ''))} placeholder={num(dayRow(db, today).weight) ? `Today: ${dayRow(db, today).weight} kg` : 'Today in kg'} onKeyDown={e => e.key === 'Enter' && save()} />
        <motion.button className="mini big" whileTap={{ scale: 0.9 }} onClick={save}>Save</motion.button>
      </div>
      {pts.length > 1 ? (
        <svg viewBox={`0 0 ${W} ${H}`} className="spark-svg">
          <defs><linearGradient id="wl" x1="0" x2="1"><stop offset="0" stopColor="#8b6cff" /><stop offset="1" stopColor="#3ddc97" /></linearGradient></defs>
          <motion.path d={path} fill="none" stroke="url(#wl)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4 }} />
          {xy.map((p, i) => <motion.circle key={i} cx={p[0]} cy={p[1]} r="4" fill="#fff4e0" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.8 + i * 0.05 }} />)}
        </svg>
      ) : <small className="hint">Log your weight on a few days to see the trend.</small>}
      {pts.length > 0 && <small className="hint">Last entry: {prettyDate(pts[pts.length - 1].date)} · {pts[pts.length - 1].weight} kg</small>}
    </Card>
  )
}

export default function Body() {
  const { db, patchDay } = useStore()
  const today = dstr()
  const day = dayRow(db, today)
  const water = num(day.water)
  const sleep = day.sleep === '' ? 0 : num(day.sleep)
  const setWater = n => patchDay(today, { water: Math.max(0, n) })
  const setSleep = n => patchDay(today, { sleep: Math.max(0, Math.min(14, n)) })

  return (
    <Page>
      <Title emoji="🫀" title="Body" sub="Water, sleep and weight" />
      <Card className="water-card">
        <div className="card-h"><h4><Droplet size={16} style={{ verticalAlign: -2 }} /> Water</h4><b><Num value={water * 0.25} decimals={2} /> L</b></div>
        <div className="tank">
          <motion.div className="tank-fill" initial={{ height: '0%' }} animate={{ height: `${Math.min(100, (water / GOAL) * 100)}%` }} transition={{ type: 'spring', stiffness: 80, damping: 16 }}><div className="wave" /><div className="wave w2" /></motion.div>
          <div className="tank-text"><b>{water}</b><small>of {GOAL} glasses</small></div>
        </div>
        <div className="glasses">
          {Array.from({ length: GOAL }).map((_, i) => (
            <motion.button key={i} whileTap={{ scale: 0.8 }} animate={i < water ? { y: [0, -8, 0] } : {}} transition={{ duration: 0.4 }} className={i < water ? 'on' : ''} onClick={() => setWater(i + 1 === water ? i : i + 1)}><Droplet size={20} fill={i < water ? 'currentColor' : 'none'} /></motion.button>
          ))}
        </div>
        <div className="stepper"><motion.button whileTap={{ scale: 0.85 }} onClick={() => setWater(water - 1)}><Minus size={18} /></motion.button><span>{water > GOAL ? `${water - GOAL} extra` : water >= GOAL ? 'Goal reached' : `${GOAL - water} to go`}</span><motion.button whileTap={{ scale: 0.85 }} onClick={() => setWater(water + 1)}><Plus size={18} /></motion.button></div>
      </Card>

      <Card className="sleep-card">
        <div className="card-h"><h4><Moon size={16} style={{ verticalAlign: -2 }} /> Last night's sleep</h4></div>
        <div className="stepper big">
          <motion.button whileTap={{ scale: 0.85 }} onClick={() => setSleep(sleep - 0.5)}><Minus size={20} /></motion.button>
          <div><b><Num value={sleep} decimals={1} /> h</b><small>{sleep === 0 ? 'Tap + to log' : sleep < 6 ? 'Too little. Aim for 7 to 8 h' : sleep <= 9 ? 'Good recovery' : 'Plenty of rest'}</small></div>
          <motion.button whileTap={{ scale: 0.85 }} onClick={() => setSleep((sleep || 6) + 0.5)}><Plus size={20} /></motion.button>
        </div>
        <div className="bar big"><motion.i animate={{ width: `${Math.min(100, (sleep / 8) * 100)}%` }} transition={spring} style={{ background: 'linear-gradient(90deg,#8b6cff,#4cc9f0)' }} /></div>
      </Card>
      <Weight />
    </Page>
  )
}
