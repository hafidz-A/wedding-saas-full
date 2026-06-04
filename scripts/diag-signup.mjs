/**
 * scripts/diag-signup.mjs — replicate the BROWSER signup exactly (anon key)
 * to see what supabase.auth.signUp() returns for a brand-new email:
 *   - identities length (the field SignupForm uses to decide redirect)
 *   - session presence
 * Then clean up the throwaway user via the admin key.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
function loadDotEnv(file){try{const t=readFileSync(resolve(file),'utf8');for(const l of t.split(/\r?\n/)){const m=l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);if(!m)continue;const[,k,raw]=m;if(process.env[k])continue;let v=raw.trim();if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1);process.env[k]=v;}}catch{}}
loadDotEnv('.env.local')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const service = process.env.SUPABASE_SERVICE_ROLE_KEY

const browser = createClient(url, anon, { auth: { persistSession: false } })
const TEST_EMAIL = process.argv[2] || `zz-signup-${Date.now()}@example.com`

console.log(`Signing up brand-new email: ${TEST_EMAIL}\n`)
const { data, error } = await browser.auth.signUp({ email: TEST_EMAIL, password: 'Test12345!' })

console.log('RAW data :', JSON.stringify(data, null, 2))
console.log('RAW error:', JSON.stringify(error, null, 2))
console.log('')
if (error) {
  console.log('signUp ERROR:', error.message)
} else {
  const idLen = data.user?.identities?.length ?? 0
  console.log('data.user present :', !!data.user)
  console.log('identities length :', idLen)
  console.log('session present   :', !!data.session)
  console.log('email_confirmed_at:', data.user?.email_confirmed_at ?? null)
  console.log('')
  if (idLen > 0) {
    console.log('✅ NEW signup → identities populated → SignupForm WOULD redirect to /verify-signup.')
  } else {
    console.log('❌ NEW signup → identities EMPTY → SignupForm treats it as "already used" → NO redirect.')
    console.log('   This is the bug you are hitting. Cause: project setting returns obfuscated user even for new emails.')
  }
}

// cleanup
const admin = createClient(url, service, { auth: { persistSession: false } })
const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
const hit = (list?.users || []).find((u) => u.email?.toLowerCase() === TEST_EMAIL.toLowerCase())
if (hit) { await admin.auth.admin.deleteUser(hit.id); console.log(`\n(cleaned up test user ${TEST_EMAIL})`) }
