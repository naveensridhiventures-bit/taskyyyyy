import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Fingerprint, Delete, Lock } from 'lucide-react'
import { spring } from './ui'
import { vib } from './alarm'

const KEY = 'df-lock'
export const getLock = () => { try { return JSON.parse(localStorage.getItem(KEY)) } catch { return null } }
const put = c => localStorage.setItem(KEY, JSON.stringify(c))

async function sha(str) {
  if (window.crypto?.subtle) {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('')
  }
  let h = 5381; for (const ch of str) h = ((h << 5) + h + ch.charCodeAt(0)) >>> 0
  return `f${h}`
}
const rand = () => Array.from(crypto.getRandomValues(new Uint8Array(8))).map(x => x.toString(16)).join('')

export async function setPin(pin) {
  const salt = rand(), c = getLock() || {}
  put({ salt, hash: await sha(salt + pin), bio: c.bio || null, timeout: c.timeout ?? 60 })
}
export async function checkPin(pin) { const c = getLock(); return !!c && (await sha(c.salt + pin)) === c.hash }
export const clearLock = () => localStorage.removeItem(KEY)
export const setTimeoutSec = n => { const c = getLock(); if (c) put({ ...c, timeout: n }) }

/* ---- fingerprint / face / screen-lock through WebAuthn (needs https) ---- */
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)))
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0))
export async function bioSupported() {
  try { return !!(window.PublicKeyCredential && (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())) } catch { return false }
}
export async function enableBio() {
  try {
    const cred = await navigator.credentials.create({ publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: 'DailyFlow' },
      user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'dailyflow', displayName: 'DailyFlow' },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
      timeout: 60000, attestation: 'none'
    } })
    put({ ...getLock(), bio: b64(cred.rawId) })
    return true
  } catch { return false }
}
export const disableBio = () => { const c = getLock(); if (c) put({ ...c, bio: null }) }
export async function verifyBio() {
  const c = getLock()
  if (!c?.bio) return false
  try {
    await navigator.credentials.get({ publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [{ type: 'public-key', id: unb64(c.bio), transports: ['internal'] }],
      userVerification: 'required', timeout: 60000
    } })
    return true
  } catch { return false }
}

/* ---- keypad ---- */
export function PinPad({ title, sub, onComplete, shake = 0 }) {
  const [pin, setPin] = useState('')
  const cb = useRef(onComplete); cb.current = onComplete
  const press = d => setPin(p => {
    if (p.length >= 4) return p
    const n = p + d
    if (n.length === 4) setTimeout(() => { cb.current(n); setPin('') }, 150)
    return n
  })
  useEffect(() => {
    const h = e => { if (/^\d$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') setPin(p => p.slice(0, -1)) }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [])
  return (
    <div className="pinpad">
      <h3>{title}</h3>
      <p className="hint">{sub}</p>
      <motion.div key={shake} className="pin-dots" animate={shake ? { x: [0, -14, 14, -10, 10, 0] } : {}} transition={{ duration: 0.4 }}>
        {[0, 1, 2, 3].map(i => <motion.i key={i} className={i < pin.length ? 'on' : ''} animate={i < pin.length ? { scale: [1, 1.35, 1] } : { scale: 1 }} />)}
      </motion.div>
      <div className="keys">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => <motion.button key={n} whileTap={{ scale: 0.88 }} onClick={() => press(String(n))}>{n}</motion.button>)}
        <span />
        <motion.button whileTap={{ scale: 0.88 }} onClick={() => press('0')}>0</motion.button>
        <motion.button whileTap={{ scale: 0.88 }} onClick={() => setPin(p => p.slice(0, -1))} aria-label="Delete"><Delete size={22} /></motion.button>
      </div>
    </div>
  )
}

/* ---- gate that covers the whole app ---- */
export function LockGate({ children }) {
  const [locked, setLocked] = useState(() => !!getLock())
  const [shake, setShake] = useState(0)
  const [fails, setFails] = useState(0)
  const [until, setUntil] = useState(0)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const onVis = () => {
      const c = getLock(); if (!c) return
      if (document.visibilityState === 'hidden') localStorage.setItem('df-hidden-at', String(Date.now()))
      else { const at = Number(localStorage.getItem('df-hidden-at') || 0); if (at && Date.now() - at >= c.timeout * 1000) setLocked(true) }
    }
    const lockNow = () => setLocked(true)
    document.addEventListener('visibilitychange', onVis); window.addEventListener('df-lock-now', lockNow)
    return () => { document.removeEventListener('visibilitychange', onVis); window.removeEventListener('df-lock-now', lockNow) }
  }, [])
  useEffect(() => { if (!until) return; const id = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(id) }, [until])

  const bio = async () => { if (await verifyBio()) setLocked(false) }
  useEffect(() => { if (locked && getLock()?.bio) bio() }, [locked]) // eslint-disable-line

  const submit = async pin => {
    if (Date.now() < until) return
    if (await checkPin(pin)) { setFails(0); setLocked(false); return }
    const f = fails + 1; setFails(f); setShake(s => s + 1); vib(200)
    if (f >= 5) { setUntil(Date.now() + 30000); setFails(0) }
  }
  const wait = Math.max(0, Math.ceil((until - now) / 1000))

  return (
    <>
      {children}
      {createPortal(
        <AnimatePresence>
          {locked && (
            <motion.div className="lockscreen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.05 }} transition={{ duration: 0.25 }}>
              <motion.div className="lock-logo" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring}><Lock size={26} /></motion.div>
              <PinPad title="DailyFlow is locked" sub={wait ? `Too many tries. Wait ${wait}s` : 'Enter your PIN'} onComplete={submit} shake={shake} />
              {getLock()?.bio && <motion.button className="bio-btn" whileTap={{ scale: 0.9 }} onClick={bio}><Fingerprint size={30} /><span>Use fingerprint</span></motion.button>}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}
