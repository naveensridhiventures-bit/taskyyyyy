const URL = import.meta.env.VITE_SCRIPT_URL
const TOKEN = import.meta.env.VITE_TOKEN || ''

export const configured = !!URL && !URL.includes('XXXX')

export async function fetchAll() {
  const r = await fetch(`${URL}?token=${encodeURIComponent(TOKEN)}`)
  const j = await r.json()
  if (!j.ok) throw new Error(j.error || 'Sync failed')
  return j.data
}

// text/plain avoids the CORS preflight that Apps Script cannot answer
export async function send(ops) {
  const r = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ token: TOKEN, ops })
  })
  const j = await r.json()
  if (!j.ok) throw new Error(j.error || 'Save failed')
  return j
}
