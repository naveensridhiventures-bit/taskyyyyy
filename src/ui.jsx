import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'

export const spring = { type: 'spring', stiffness: 420, damping: 30 }
const SPARK = ['#ffc531', '#ff5d73', '#3ddc97', '#8b6cff', '#4cc9f0']

/* page container: staggers its children in once when the page opens */
export const stagger = { show: { transition: { staggerChildren: 0.07 } } }
export const rise = {
  hidden: { opacity: 0, y: 26, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: spring }
}

export function Page({ children }) {
  return (
    <motion.div className="page" variants={stagger} initial="hidden" animate="show">
      {children}
    </motion.div>
  )
}

export function Card({ children, className = '', style, ...p }) {
  return (
    <motion.div variants={rise} className={`card ${className}`} style={style} {...p}>
      {children}
    </motion.div>
  )
}

export function Title({ emoji, title, sub, right }) {
  return (
    <motion.div variants={rise} className="title">
      <div>
        <h1>
          <motion.span className="wave" animate={{ rotate: [0, 14, -8, 14, 0] }} transition={{ duration: 1.6, delay: 0.4 }}>
            {emoji}
          </motion.span>{' '}
          {title}
        </h1>
        {sub && <p>{sub}</p>}
      </div>
      {right}
    </motion.div>
  )
}

function Burst() {
  const n = 12
  return (
    <>
      {Array.from({ length: n }).map((_, i) => {
        const a = (i / n) * Math.PI * 2
        return (
          <motion.i
            key={i}
            className="spark"
            style={{ background: SPARK[i % SPARK.length] }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(a) * 38, y: Math.sin(a) * 38, opacity: 0, scale: 0.2 }}
            transition={{ duration: 0.65, ease: 'easeOut' }}
          />
        )
      })}
    </>
  )
}

export function CheckBtn({ done, onChange, size = 30 }) {
  const [burst, setBurst] = useState(0)
  return (
    <motion.button
      className={`check ${done ? 'on' : ''}`}
      style={{ width: size, height: size }}
      whileTap={{ scale: 0.78 }}
      animate={done ? { scale: [1, 1.25, 1] } : { scale: 1 }}
      transition={{ duration: 0.35 }}
      onClick={() => { if (!done) setBurst(b => b + 1); onChange(!done) }}
      aria-label={done ? 'Mark as not done' : 'Mark as done'}
    >
      <AnimatePresence>
        {done && (
          <motion.span key="c" initial={{ scale: 0, rotate: -120 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={spring}>
            <Check size={size * 0.58} strokeWidth={3.4} />
          </motion.span>
        )}
      </AnimatePresence>
      {burst > 0 && <Burst key={burst} />}
    </motion.button>
  )
}

export function Ring({ value, size = 132, stroke = 11, children }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const v = Math.max(0, Math.min(1, value || 0))
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <defs>
          <linearGradient id="ringg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffc531" />
            <stop offset="1" stopColor="#ff5d73" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,244,224,.12)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#ringg)" strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - v) }}
          transition={{ duration: 1.2, ease: [0.2, 0.8, 0.2, 1] }}
        />
      </svg>
      <div className="ring-in">{children}</div>
    </div>
  )
}

export function Sheet({ open, onClose, title, children }) {
  return (
    <AnimatePresence>
      {open && [
        <motion.div key="s" className="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />,
        <motion.div
          key="p" className="sheet"
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 320 }}
          drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.7 }}
          onDragEnd={(e, i) => { if (i.offset.y > 110) onClose() }}
        >
          <div className="grab" />
          <h3>{title}</h3>
          {children}
        </motion.div>
      ]}
    </AnimatePresence>
  )
}

export function Empty({ emoji, text }) {
  return (
    <motion.div variants={rise} className="empty">
      <motion.div className="empty-e" animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}>{emoji}</motion.div>
      <p>{text}</p>
    </motion.div>
  )
}
