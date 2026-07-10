'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { validateReview } from '@/lib/testimonials/validate'

export interface SubmitReviewResult { ok: boolean; error?: string }

/**
 * Upsert (one per invitation) the caller's review. The invitation must be
 * owned by the session user AND paid. Every write forces is_visible=false so a
 * new or edited review re-enters admin moderation (spec batasan #2 & #3).
 */
export async function submitReview(input: {
  invitationId: string
  rating: number
  body: string
  authorName: string
  isAnonymous: boolean
}): Promise<SubmitReviewResult> {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: 'Kamu harus masuk dulu.' }

    const admin = createSupabaseAdminClient()
    const { data: inv } = (await admin
      .from('invitations')
      .select('id, owner_user_id, is_paid, template_id')
      .eq('id', input.invitationId)
      .maybeSingle()) as {
      data: { id: string; owner_user_id: string | null; is_paid: boolean; template_id: string | null } | null
    }
    if (!inv || inv.owner_user_id !== user.id) return { ok: false, error: 'Undangan tidak ditemukan.' }
    if (!inv.is_paid) return { ok: false, error: 'Ulasan hanya bisa diberikan setelah undangan dibayar.' }

    const v = validateReview(input)
    if (!v.ok) return v

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin.from('testimonials') as any).upsert(
      {
        invitation_id: inv.id,
        user_id: user.id,
        rating: v.value.rating,
        body: v.value.body,
        author_name: v.value.authorName,
        is_anonymous: v.value.isAnonymous,
        template_id: inv.template_id ?? 'classic',
        is_visible: false, // always back to the moderation queue
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'invitation_id' },
    )
    if (error) {
      console.error('[submitReview]', error)
      return { ok: false, error: 'Gagal menyimpan ulasan. Coba lagi sebentar lagi.' }
    }

    revalidatePath('/profile')
    revalidatePath('/')
    return { ok: true }
  } catch (e) {
    console.error('[submitReview]', e)
    return { ok: false, error: 'Terjadi kesalahan tak terduga. Coba lagi.' }
  }
}
