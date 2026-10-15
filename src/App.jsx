import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, ListTodo, Salad, GraduationCap, Dumbbell, RefreshCw, CloudOff, Cloud, HardDrive, Bell } from 'lucide-react'
import { useStore, dstr, isTrue } from './store'
import { spring } from './ui'
import Today from './pages/Today'
import Tasks from './pages/Tasks'
import Diet from './pages/Diet'
import Learn from './pages/Learn'
import Gym from './pages/Gym'

const TABS = [
  { k: 'today', label: 'Today', Icon: Home },
  { k: 'tasks', label: 'Tasks', Icon: ListTodo },
  { k: 'diet', label: 'Diet', Icon: Salad },
  { k: 'learn', label: 'Learn', Icon: GraduationCap },
  { k: 'gym', label: 'Gym', Icon: Dumbbell }
]

function SyncPill() {
  const { status, sync } = useStore()
  const map = {
    local: { Icon: HardDrive, text: 'Saved on device', cls: '' },
    syncing: { Icon: RefreshCw, text: 'Syncing', cls: 'spin' },
    synced: { Icon: Cloud, text: 'Synced', cls: 'ok' },
    offline: { Icon: CloudOff, text: 'Offline - tap to retry', cls: 'bad' }
  }[status]
  return (
    <motion.button layout className={`pill ${map.cls}`} onClick={sync} whileTap={{ scale: 0.92 }}>
      <map.Icon size={14} /> {map.text}
    </motion.button>
  )
}

export default function App() {
  const [tab, setTab] = useState('today')
  const { db } = useStore()
  const [perm, setPerm] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'denied')

  // reminder: once per day, notify about unfinished items from earlier days
  const today = dstr()
  const pending = db.tasks.filter(t => t.date < today && !isTrue(t.done)).length + db.learning.filter(l => l.date < today && !isTrue(l.done)).length
  useEffect(() => {
    if (perm !== 'granted' || !pending || localStorage.getItem('df-notified') === today) return
    localStorage.setItem('df-notified', today)
    navigator.serviceWorker?.ready.then(reg => reg.showNotification('DailyFlow reminder', { body: `${pending} pending item${pending > 1 ? 's' : ''} from earlier. Finish them first today.`, icon: '/pwa-192.png' }))
  }, [perm, pending, today])

  const askPerm = async () => { if (typeof Notification !== 'undefined') setPerm(await Notification.requestPermission()) }

  const Page = { today: <Today go={setTab} />, tasks: <Tasks />, diet: <Diet />, learn: <Learn />, gym: <Gym /> }[tab]

  return (
    <>
      <div className="bg"><div className="blob b1" /><div className="blob b2" /><div className="blob b3" /></div>
      <div className="shell">
        <div className="topbar">
          <div className="brand"><b><span style={{ fontSize: 15 }}>✓</span></b> DailyFlow</div>
          <div className="tools">
            {perm === 'default' && <motion.button className="pill" whileTap={{ scale: 0.9 }} onClick={askPerm}><Bell size={14} /> Reminders</motion.button>}
            <SyncPill />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.22 }}>
            {Page}
          </motion.div>
        </AnimatePresence>
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
