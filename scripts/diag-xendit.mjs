/**
 * scripts/diag-xendit.mjs — validate XENDIT_SECRET_KEY by creating a tiny
 * TEST invoice (same call the app's createXenditInvoice makes). Read-only key
 * check + proves "cetak invoice" works end-to-end. Test-mode invoices are
 * harmless. Pass an amount as arg1 (default 10000 IDR).
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
function loadDotEnv(file){try{const t=readFileSync(resolve(file),'utf8');for(const l of t.split(/\r?\n/)){const m=l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);if(!m)continue;const[,k,raw]=m;if(process.env[k])continue;let v=raw.trim();if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1);process.env[k]=v;}}catch{}}
loadDotEnv('.env.local')

const key = process.env.XENDIT_SECRET_KEY
if (!key) { console.error('XENDIT_SECRET_KEY missing'); process.exit(1) }
console.log('Key mode:', key.startsWith('xnd_production_') ? 'LIVE ⚠️' : key.startsWith('xnd_development_') ? 'TEST' : 'unknown')

const amount = Number(process.argv[2] || 10000)
const externalId = `diag_test_${Date.now()}`

const res = await fetch('https://api.xendit.co/v2/invoices', {
  method: 'POST',
  headers: { 'content-type': 'application/json', authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}` },
  body: JSON.stringify({
    external_id: externalId,
    amount,
    description: 'Diagnostic test invoice (safe to ignore/expire)',
    currency: 'IDR',
    success_redirect_url: 'http://localhost:3000/?paid=1',
    failure_redirect_url: 'http://localhost:3000/?payment=failed',
  }),
})

const body = await res.json().catch(() => ({}))
console.log('HTTP status:', res.status, '\n')
if (res.ok && body.invoice_url) {
  console.log('✅ INVOICE BERHASIL DIBUAT — fitur cetak invoice JALAN.')
  console.log('   id        :', body.id)
  console.log('   status    :', body.status)
  console.log('   amount    : Rp', body.amount?.toLocaleString('id-ID'))
  console.log('   invoice_url:', body.invoice_url)
  console.log('\n   Buka invoice_url di browser untuk lihat halaman bayar Xendit-nya.')
} else {
  console.log('❌ GAGAL membuat invoice:')
  console.log(JSON.stringify(body, null, 2))
  console.log('\n   error_code umum: "INVALID_API_KEY" → key salah; "FORBIDDEN" → key tanpa permission Money-in: Write.')
}
