'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/is-admin'

type Result = { ok: boolean; error?: string }

async function guard(): Promise<boolean> {
  try { await requireAdmin(); return true } catch { return false }
}

export async function setTestimonialVisible(id: string, visible: boolean): Promise<Result> {
  if (!(await guard())) return { ok: false, error: 'Akses ditolak' }
  const db = createSupabaseAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db.from('testimonials') as any).update({ is_visible: visible }).eq('id', id)
  if (error) { console.error('[setTestimonialVisible]', error); return { ok: false, error: 'Gagal menyimpan.' } }
  revalidatePath('/admin/testimonials')
  revalidatePath('/')
  return { ok: true }
}

export async function deleteTestimonial(id: string): Promise<Result> {
  if (!(await guard())) return { ok: false, error: 'Akses ditolak' }
  const db = createSupabaseAdminClient()
  const { error } = await db.from('testimonials').delete().eq('id', id)
  if (error) { console.error('[deleteTestimonial]', error); return { ok: false, error: 'Gagal menghapus.' } }
  revalidatePath('/admin/testimonials')
  revalidatePath('/')
  return { ok: true }
}
