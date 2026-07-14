/**
 * scripts/diag-midtrans.mjs — validate MIDTRANS_SERVER_KEY by querying the
 * status of a transaction that doesn't exist (`ping_test_order`). Read-only:
 * creates nothing. A 404-shaped body (`status_code: '404'`) PROVES the key +
 * base URL are valid — Midtrans authenticated us, then said "no such order".
 * A 401 means the key is wrong (or a sandbox key against production, or vice
 * versa — check MIDTRANS_IS_PRODUCTION).
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
function loadDotEnv(file){try{const t=readFileSync(resolve(file),'utf8');for(const l of t.split(/\r?\n/)){const m=l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);if(!m)continue;const[,k,raw]=m;if(process.env[k])continue;let v=raw.trim();if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1);process.env[k]=v;}}catch{}}
loadDotEnv('.env.local')

const key = process.env.MIDTRANS_SERVER_KEY
if (!key) { console.log('MIDTRANS_SERVER_KEY not set in .env.local — nothing to check.'); process.exit(0) }
console.log('Key mode:', key.startsWith('Mid-server-') ? 'LIVE ⚠️' : key.startsWith('SB-Mid-server-') ? 'SANDBOX' : 'unknown')

const isProd = process.env.MIDTRANS_IS_PRODUCTION === 'true'
const coreBase = isProd ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com'
console.log('API base:', coreBase, isProd ? '(production)' : '(sandbox)')

const res = await fetch(`${coreBase}/v2/ping_test_order/status`, {
  headers: { accept: 'application/json', authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}` },
})

const body = await res.json().catch(() => ({}))
console.log('HTTP status:', res.status, '\n')
if (body.status_code === '404') {
  console.log('✅ KEY VALID — Midtrans menerima autentikasi (order dummy memang tidak ada).')
  console.log('   Fitur checkout Snap siap dipakai dengan key + base URL ini.')
} else if (res.status === 401 || body.status_code === '401') {
  console.log('❌ KEY DITOLAK (401):')
  console.log(JSON.stringify(body, null, 2))
  console.log('\n   Cek: key salah ketik, atau key/base tidak cocok — key LIVE (Mid-server-) butuh')
  console.log('   MIDTRANS_IS_PRODUCTION=true; key SANDBOX (SB-Mid-server-) butuh selain itu.')
} else {
  console.log('⚠️  Respons tak terduga:')
  console.log(JSON.stringify(body, null, 2))
}
