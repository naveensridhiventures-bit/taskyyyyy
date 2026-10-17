import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Minus, Plus, ChevronLeft, Fingerprint, Mail, Bell, Send, ShieldCheck, Lock } from 'lucide-react'
import { useStore } from '../store'
import { runFn, configured } from '../api'
import { Page, Card, Title, Sheet, spring } from '../ui'
import { getLock, setPin, checkPin, clearLock, setTimeoutSec, bioSupported, enableBio, disableBio, PinPad } from '../lock'

const hourFmt = h => `${((h + 11) % 12) + 1}:00 ${h < 12 ? 'AM' : 'PM'}`

function Step({ label, sub, value, unit = '', step = 1, min, max, onChange, fmt }) {
  const dec = () => onChange(Math.max(min, +(value - step).toFixed(2)))
  const inc = () => onChange(Math.min(max, +(value + step).toFixed(2)))
  return (
    <div className="srow">
      <div><b>{label}</b>{sub && <small>{sub}</small>}</div>
      <div className="stp">
        <motion.button whileTap={{ scale: 0.8 }} onClick={dec} aria-label={`Decrease ${label}`}><Minus size={16} /></motion.button>
        <span>{fmt ? fmt(value) : value}{unit}</span>
        <motion.button whileTap={{ scale: 0.8 }} onClick={inc} aria-label={`Increase ${label}`}><Plus size={16} /></motion.button>
      </div>
    </div>
  )
}

function Switch({ on, onChange, label }) {
  return (
    <button className={`switch ${on ? 'on' : ''}`} onClick={() => onChange(!on)} role="switch" aria-checked={on} aria-label={label}>
      <motion.i animate={{ x: on ? 22 : 0 }} transition={spring} />
    </button>
  )
}

function PinFlow({ mode, onClose, onDone }) {
  const [step, setStep] = useState(mode === 'set' ? 'new' : 'current')
  const [first, setFirst] = useState('')
  const [shake, setShake] = useState(0)
  const [msg, setMsg] = useState('')
  const titles = { current: 'Enter your current PIN', new: 'Choose a 4-digit PIN', confirm: 'Enter it again to confirm' }
  const onPin = async pin => {
    if (step === 'current') {
      if (await checkPin(pin)) { if (mode === 'remove') { clearLock(); onDone(); onClose() } else { setStep('new'); setMsg('') } }
      else { setShake(s => s + 1); setMsg('Wrong PIN') }
    } else if (step === 'new') { setFirst(pin); setStep('confirm'); setMsg('') }
    else if (pin === first) { await setPin(pin); onDone(); onClose() }
    else { setShake(s => s + 1); setMsg("PINs didn't match. Start again."); setStep('new') }
  }
  return <PinPad title={titles[step]} sub={msg || ' '} onComplete={onPin} shake={shake} />
}

function LockSettings() {
  const [, bump] = useState(0)
  const refresh = () => bump(n => n + 1)
  const lock = getLock()
  const [bioOk, setBioOk] = useState(false)
  const [flow, setFlow] = useState(null)
  const [bioMsg, setBioMsg] = useState('')
  useEffect(() => { bioSupported().then(setBioOk) }, [])

  const toggleBio = async () => {
    setBioMsg('')
    if (lock.bio) disableBio()
    else if (!(await enableBio())) setBioMsg('Could not set up fingerprint. Check your phone has a fingerprint or screen lock set.')
    refresh()
  }
  const TIMEOUTS = [[0, 'Instantly'], [60, '1 min'], [300, '5 min'], [900, '15 min']]

  return (
    <Card>
      <div className="card-h"><h4><ShieldCheck size={16} style={{ verticalAlign: -2 }} /> App lock</h4>{lock && <span className="pill ok">On</span>}</div>
      {!lock ? (
        <>
          <p className="hint">Ask for a PIN (and your fingerprint) every time the app opens. Your money details stay private if someone borrows your phone.</p>
          <motion.button className="btn" whileTap={{ scale: 0.97 }} onClick={() => setFlow('set')}>Set a PIN</motion.button>
        </>
      ) : (
        <>
          {bioOk ? (
            <div className="srow"><div><b><Fingerprint size={15} style={{ verticalAlign: -2 }} /> Fingerprint unlock</b><small>Use your phone's fingerprint, face or screen lock</small></div><Switch on={!!lock.bio} onChange={toggleBio} label="Fingerprint unlock" /></div>
          ) : <p className="hint">Fingerprint unlock appears on phones that have a fingerprint or screen lock, when the app is opened over https.</p>}
          {bioMsg && <p className="hint" style={{ color: '#ff8fa0' }}>{bioMsg}</p>}
          <div className="field" style={{ marginTop: 12 }}>
            <label>Lock again after being away</label>
            <div className="chips">{TIMEOUTS.map(([s, l]) => <button key={s} className={`chip ${lock.timeout === s ? 'on' : ''}`} onClick={() => { setTimeoutSec(s); refresh() }}>{l}</button>)}</div>
          </div>
          <div className="chips">
            <button className="chip" onClick={() => window.dispatchEvent(new Event('df-lock-now'))}><Lock size={14} /> Lock now</button>
            <button className="chip" onClick={() => setFlow('change')}>Change PIN</button>
            <button className="chip" style={{ color: '#ff8fa0' }} onClick={() => setFlow('remove')}>Remove lock</button>
          </div>
        </>
      )}
      <Sheet open={!!flow} onClose={() => setFlow(null)} title={flow === 'remove' ? 'Remove app lock' : flow === 'change' ? 'Change PIN' : 'Set a PIN'}>
        {flow && <PinFlow key={flow} mode={flow} onClose={() => setFlow(null)} onDone={refresh} />}
      </Sheet>
    </Card>
  )
}

export default function Settings({ onBack }) {
  const { settings: s, saveSettings } = useStore()
  const [email, setEmail] = useState(s.email)
  const [sent, setSent] = useState('')
  const [perm, setPerm] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'denied')
  useEffect(() => { setEmail(s.email) }, [s.email])

  const test = async () => {
    setSent('sending')
    try { await runFn('sendDailyReport'); setSent('sent') } catch { setSent('fail') }
  }
  const askPerm = async () => { if (typeof Notification !== 'undefined') setPerm(await Notification.requestPermission()) }

  return (
    <Page>
      <Title emoji="⚙️" title="Settings" sub="Make DailyFlow yours" right={<motion.button className="pill" whileTap={{ scale: 0.9 }} onClick={onBack}><ChevronLeft size={14} /> Back</motion.button>} />

      <Card>
        <div className="card-h"><h4>🎯 Daily targets</h4></div>
        <Step label="Calories" sub="Shown in Diet and your daily report" value={s.kcal} step={50} min={800} max={6000} unit=" kcal" onChange={v => saveSettings({ kcal: v })} />
        <Step label="Protein" value={s.protein} step={5} min={20} max={300} unit=" g" onChange={v => saveSettings({ protein: v })} />
        <Step label="Water" sub="Glasses of 250 ml" value={s.water} step={1} min={1} max={20} unit=" glasses" onChange={v => saveSettings({ water: v })} />
        <Step label="Sleep" value={s.sleep} step={0.5} min={4} max={12} unit=" h" onChange={v => saveSettings({ sleep: v })} />
      </Card>

      <Card>
        <div className="card-h"><h4><Mail size={16} style={{ verticalAlign: -2 }} /> Email reports and reminders</h4></div>
        <div className="field">
          <label>Send to this email</label>
          <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} onBlur={() => email !== s.email && saveSettings({ email: email.trim() })} placeholder="you@gmail.com" />
        </div>
        <div className="srow"><div><b>Morning plan</b><small>Today's tasks, pending and money due</small></div><Switch on={s.mailMorning} onChange={v => saveSettings({ mailMorning: v })} label="Morning plan email" /></div>
        {s.mailMorning && <Step label="Send at" value={s.morningHour} min={0} max={23} fmt={hourFmt} onChange={v => saveSettings({ morningHour: v })} />}
        <div className="srow"><div><b>Daily progress report</b><small>Score, tasks, diet, gym, money and tomorrow</small></div><Switch on={s.mailReport} onChange={v => saveSettings({ mailReport: v })} label="Daily report email" /></div>
        {s.mailReport && <Step label="Send at" value={s.reportHour} min={0} max={23} fmt={hourFmt} onChange={v => saveSettings({ reportHour: v })} />}
        <motion.button className="btn" style={{ marginTop: 14 }} whileTap={{ scale: 0.97 }} disabled={!configured || sent === 'sending'} onClick={test}><Send size={16} style={{ verticalAlign: -2 }} /> {sent === 'sending' ? 'Sending...' : "Send today's report now"}</motion.button>
        {sent === 'sent' && <p className="hint" style={{ color: '#3ddc97' }}>Sent. Check your inbox in a minute.</p>}
        {sent === 'fail' && <p className="hint" style={{ color: '#ff8fa0' }}>Could not reach your Google Sheet script. Check the connection and that Code.gs is the latest version.</p>}
        <p className="hint">Times are used by your Google script, which checks every 15 minutes. Task reminders by email and calendar are set on each task.</p>
      </Card>

      <Card>
        <div className="card-h"><h4><Bell size={16} style={{ verticalAlign: -2 }} /> Alarms on this phone</h4></div>
        <p className="hint">Tasks with a time and "Remind me" ring an alarm here while the app is open. Calendar alerts ring even when it is closed.</p>
        {perm === 'granted' ? <span className="pill ok">Notifications on</span> : <motion.button className="chip on" style={{ '--c': '#ffc531' }} onClick={askPerm} whileTap={{ scale: 0.95 }}>Turn on notifications</motion.button>}
      </Card>

      <LockSettings />
    </Page>
  )
}
