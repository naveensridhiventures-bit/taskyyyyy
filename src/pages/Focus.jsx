import { motion } from 'framer-motion'
import { Play, Pause, RotateCcw } from 'lucide-react'
import { useStore, dstr, addDays, dayRow, num, isTrue, weekday } from '../store'
import { useTimer, MODES } from '../timer'
import { Page, Card, Title, Ring, spring } from '../ui'

export default function Focus() {
  const T = useTimer()
  const { db } = useStore()
  const today = dstr()
  const mm = String(Math.floor(T.left / 60)).padStart(2, '0')
  const ss = String(T.left % 60).padStart(2, '0')
  const open = db.tasks.filter(t => t.date <= today && !isTrue(t.done)).slice(0, 6)
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6))
  const mins = week.map(d => num(dayRow(db, d).focus))
  const max = Math.max(30, ...mins)
  const isBreak = T.mode === 'short' || T.mode === 'long'

  return (
    <Page>
      <Title emoji="⏱️" title="Focus" sub="One thing, no distractions" />
      <Card className={`hero focus-hero ${T.running ? 'running' : ''}`} style={{ flexDirection: 'column', textAlign: 'center' }}>
        <div className="chips" style={{ justifyContent: 'center' }}>
          {Object.entries(MODES).map(([k, m]) => <button key={k} className={`chip ${T.mode === k ? 'on' : ''}`} disabled={T.running} onClick={() => T.setMode(k)}>{m.label} {m.min}m</button>)}
        </div>
        <motion.div animate={T.running ? { scale: [1, 1.03, 1] } : { scale: 1 }} transition={{ repeat: Infinity, duration: 2 }}>
          <Ring size={230} stroke={14} value={1 - T.left / T.total}>
            <b style={{ fontSize: 54 }}>{mm}:{ss}</b>
            <small style={{ fontSize: 14 }}>{T.label ? T.label : isBreak ? 'Take a breather' : 'Stay with one task'}</small>
          </Ring>
        </motion.div>
        <div className="timer-btns">
          <motion.button className="roundbtn" whileTap={{ scale: 0.85 }} onClick={T.reset} aria-label="Reset"><RotateCcw size={22} /></motion.button>
          <motion.button className="roundbtn main" whileTap={{ scale: 0.9 }} onClick={T.running ? T.pause : T.start} aria-label={T.running ? 'Pause' : 'Start'}>{T.running ? <Pause size={30} /> : <Play size={30} style={{ marginLeft: 3 }} />}</motion.button>
        </div>
      </Card>

      {open.length > 0 && !isBreak && (
        <Card>
          <h4 style={{ marginBottom: 10 }}>What are you working on?</h4>
          <div className="chips">{open.map(t => <button key={t.id} className={`chip ${T.label === t.title ? 'on' : ''}`} onClick={() => T.setLabel(T.label === t.title ? '' : t.title)}>{t.title}</button>)}</div>
        </Card>
      )}

      <Card>
        <div className="card-h"><h4>Focused today</h4><b>{num(dayRow(db, today).focus)} min</b></div>
        <div className="chart">
          {week.map((d, i) => (
            <div key={d}><motion.i initial={{ height: 5 }} animate={{ height: 5 + (mins[i] / max) * 58 }} transition={{ ...spring, delay: 0.2 + i * 0.07 }} />{d === today ? 'Today' : weekday(d).slice(0, 2)}</div>
          ))}
        </div>
        <small className="hint">A finished focus session is added automatically. The timer keeps running if you switch tabs.</small>
      </Card>
    </Page>
  )
}
