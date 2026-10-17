// loud repeating alarm for task reminders (works while the app is open)
let ctx = null, timer = null, stopper = null

// vibrate only after the user has tapped the page (browsers block it before that)
export const vib = p => { try { if (!navigator.vibrate) return; if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return; navigator.vibrate(p) } catch { /* ignore */ } }

export function unlockAudio() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
    if (ctx.state === 'suspended') ctx.resume()
  } catch { /* audio not available */ }
}

function tone(freq, at, dur) {
  const o = ctx.createOscillator(), g = ctx.createGain()
  o.type = 'sine'; o.frequency.value = freq
  g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.35, at + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  o.connect(g); g.connect(ctx.destination); o.start(at); o.stop(at + dur + 0.02)
}

export function startAlarm(maxMs = 45000) {
  stopAlarm()
  const ring = () => {
    try { if (ctx) { const t = ctx.currentTime; [784, 988, 784, 988].forEach((f, i) => tone(f, t + i * 0.2, 0.16)) } } catch { /* ignore */ }
    vib([300, 120, 300, 120, 300])
  }
  ring()
  timer = setInterval(ring, 1500)
  stopper = setTimeout(stopAlarm, maxMs)
}

export function stopAlarm() {
  clearInterval(timer); clearTimeout(stopper); timer = null; stopper = null
  vib(0)
}
