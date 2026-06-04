/**
 * scripts/diag-cascade.mjs — end-to-end proof that deleting an auth user
 * cascades to their invitation. Creates a throwaway user + invitation,
 * deletes the user, asserts the invitation is gone, and cleans up.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
function loadDotEnv(file){try{const t=readFileSync(resolve(file),'utf8');for(const l of t.split(/\r?\n/)){const m=l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);if(!m)continue;const[,k,raw]=m;if(process.env[k])continue;let v=raw.trim();if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1);process.env[k]=v;}}catch{}}
loadDotEnv('.env.local')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} })

const TEST_EMAIL = `zz-cascade-test-${Date.now()}@example.com`
const TEST_SLUG = `zz-cascade-${Date.now().toString().slice(-8)}`

function clean(s){ return s.replace(/[^a-z0-9-]/g,'').slice(0,40) }

// 1. create user
const { data: created, error: cErr } = await supabase.auth.admin.createUser({ email: TEST_EMAIL, password: 'Test12345!', email_confirm: true })
if (cErr) { console.error('create user failed:', cErr.message); process.exit(1) }
const uid = created.user.id
console.log(`1. created test user ${uid}`)

// 2. create invitation owned by them
const { data: inv, error: iErr } = await supabase.from('invitations').insert({
  slug: clean(TEST_SLUG), owner_user_id: uid, email: TEST_EMAIL,
  password_hash: 'supabase-auth-migrated', plan: 'basic', template_id: 'lovebirds',
  is_paid: false, is_published: false, config: {},
}).select('id').single()
if (iErr) { console.error('insert invitation failed:', iErr.message); await supabase.auth.admin.deleteUser(uid); process.exit(1) }
console.log(`2. created invitation ${inv.id} owned by test user`)

// 3. delete the auth user
const { error: dErr } = await supabase.auth.admin.deleteUser(uid)
if (dErr) { console.error('delete user failed:', dErr.message); process.exit(1) }
console.log('3. deleted the auth user')

// 4. did the invitation cascade away?
const { data: after } = await supabase.from('invitations').select('id, owner_user_id').eq('id', inv.id).maybeSingle()
if (!after) {
  console.log('\n✅ CASCADE WORKS — invitation was deleted automatically with the user.')
} else {
  console.log(`\n❌ CASCADE NOT ACTIVE — invitation still exists (owner_user_id=${after.owner_user_id}).`)
  console.log('   → The owner_cascade migration is NOT applied. Run migrations/2026-06-03_owner_cascade.sql')
  await supabase.from('invitations').delete().eq('id', inv.id) // cleanup
  console.log('   (cleaned up the leftover test invitation)')
}
