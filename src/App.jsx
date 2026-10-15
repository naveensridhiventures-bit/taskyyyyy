import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, ListTodo, HeartPulse, Sprout, Wallet, RefreshCw, CloudOff, Cloud, HardDrive, Bell, Timer } from 'lucide-react'
import { useStore, dstr, isTrue } from './store'
import { TimerProvider, useTimer } from './timer'
import { spring } from './ui'
import Today from './pages/Today'
import Tasks from './pages/Tasks'
import Health from './pages/Health'
import Grow from './pages/Grow'
import Money from './pages/Money'

const TABS = [
  { k: 'today', label: 'Today', Icon: Home },
  { k: 'tasks', label: 'Tasks', Icon: ListTodo },
  { k: 'health', label: 'Health', Icon: HeartPulse },
  { k: 'grow', label: 'Grow', Icon: Sprout },
  { k: 'money', label: 'Money', Icon: Wallet }
]

function SyncPill() {
  const { status, sync } = useStore()
  const map = {
    local: { Icon: HardDrive, text: 'On device', cls: '' },
    syncing: { Icon: RefreshCw, text: 'Syncing', cls: 'spin' },
    synced: { Icon: Cloud, text: 'Synced', cls: 'ok' },
    offline: { Icon: CloudOff, text: 'Offline', cls: 'bad' }
  }[status]
  return <motion.button layout className={`pill ${map.cls}`} onClick={sync} whileTap={{ scale: 0.92 }}><map.Icon size={14} /> {map.text}</motion.button>
}

function TimerPill({ go }) {
  const T = useTimer()
  if (!T.running) return null
  const mm = String(Math.floor(T.left / 60)).padStart(2, '0'), ss = String(T.left % 60).padStart(2, '0')
  return (
    <motion.button className="pill timer-pill" initial={{ scale: 0 }} animate={{ scale: 1 }} onClick={() => go('grow', 'focus')}>
      <motion.span style={{ display: 'flex' }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}><Timer size={14} /></motion.span> {mm}:{ss}
    </motion.button>
  )
}

function Shell() {
  const [tab, setTab] = useState('today')
  const [subs, setSubs] = useState({ health: 'diet', grow: 'learn', money: 'overview' })
  const { db } = useStore()
  const [perm, setPerm] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'denied')
  const go = (t, s) => { if (s) setSubs(x => ({ ...x, [t]: s })); setTab(t) }
  const setSub = t => s => setSubs(x => ({ ...x, [t]: s }))

  // reminder: once per day, notify about unfinished items from earlier days
  const today = dstr()
  const pending = db.tasks.filter(t => t.date < today && !isTrue(t.done)).length + db.learning.filter(l => l.date < today && !isTrue(l.done)).length
  useEffect(() => {
    if (perm !== 'granted' || !pending || localStorage.getItem('df-notified') === today) return
    localStorage.setItem('df-notified', today)
    navigator.serviceWorker?.ready.then(reg => reg.showNotification('DailyFlow reminder', { body: `${pending} pending item${pending > 1 ? 's' : ''} from earlier. Finish them first today.`, icon: '/pwa-192.png' }))
  }, [perm, pending, today])
  const askPerm = async () => { if (typeof Notification !== 'undefined') setPerm(await Notification.requestPermission()) }

  const view = {
    today: <Today go={go} />,
    tasks: <Tasks />,
    health: <Health sub={subs.health} setSub={setSub('health')} />,
    grow: <Grow sub={subs.grow} setSub={setSub('grow')} />,
    money: <Money sub={subs.money} setSub={setSub('money')} />
  }[tab]

  return (
    <>
      <div className="bg"><div className="blob b1" /><div className="blob b2" /><div className="blob b3" /></div>
      <div className="shell">
        <div className="topbar">
          <div className="brand"><b><span style={{ fontSize: 15 }}>✓</span></b> DailyFlow</div>
          <div className="tools">
            <TimerPill go={go} />
            {perm === 'default' && <motion.button className="pill" whileTap={{ scale: 0.9 }} onClick={askPerm}><Bell size={14} /> Reminders</motion.button>}
            <SyncPill />
          </div>
        </div>
        <motion.div key={tab} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}>{view}</motion.div>
      </div>

      <nav className="nav">
        {TABS.map(({ k, label, Icon }) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            {tab === k && <motion.div layoutId="navbg" className="navbg" transition={spring} />}
            <motion.span animate={tab === k ? { y: [0, -6, 0], scale: [1, 1.2, 1] } : {}} transition={{ duration: 0.4 }} style={{ display: 'flex' }}><Icon size={21} /></motion.span>
            {label}
          </button>
        ))}
      </nav>
    </>
  )
}

export default function App() {
  return <TimerProvider><Shell /></TimerProvider>
}
