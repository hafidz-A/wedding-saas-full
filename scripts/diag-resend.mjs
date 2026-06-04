/**
 * scripts/diag-resend.mjs — test the Resend API key directly (the same key
 * that should be in Supabase Dashboard → Auth → SMTP password) to see WHY
 * confirmation emails fail. Sends one test email to the address you pass.
 *
 * Usage: node scripts/diag-resend.mjs you@youremail.com
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
function loadDotEnv(file){try{const t=readFileSync(resolve(file),'utf8');for(const l of t.split(/\r?\n/)){const m=l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);if(!m)continue;const[,k,raw]=m;if(process.env[k])continue;let v=raw.trim();if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1);process.env[k]=v;}}catch{}}
loadDotEnv('.env.local')

const key = process.env.RESEND_API_KEY
const from = process.env.RESEND_FROM || 'onboarding@resend.dev'
const to = process.argv[2]

console.log('RESEND_FROM :', from)
console.log('API key     :', key ? key.slice(0, 8) + '…(' + key.length + ' chars)' : 'MISSING')
if (!to) { console.error('\nPass a recipient: node scripts/diag-resend.mjs you@email.com'); process.exit(1) }
console.log('Sending test to:', to, '\n')

const res = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ from, to, subject: 'Resend diagnostic', html: '<p>Test from diag-resend.mjs</p>' }),
})
const body = await res.json().catch(() => ({}))
console.log('HTTP status:', res.status)
console.log('Response   :', JSON.stringify(body, null, 2))
console.log('')
if (res.status === 200 && body.id) {
  console.log('✅ Resend ACCEPTED the email. Key + sender work. If Supabase still fails,')
  console.log('   the SMTP password in Supabase Dashboard → Auth → SMTP is a DIFFERENT/old key.')
} else {
  console.log('❌ Resend REJECTED it. The message above tells you why:')
  console.log('   - "API key is invalid"            → make a new Full-Access key, update Supabase SMTP + .env')
  console.log('   - "domain is not verified" (403)  → use onboarding@resend.dev OR verify your domain')
  console.log('   - "only send to your own email"   → Resend test mode; verify a domain to email anyone')
}
