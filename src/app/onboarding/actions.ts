'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { buildSeedConfig, validateSlug } from '@/lib/onboarding/seed-config'
import { isValidTemplate, getDefaultConfig, DEFAULT_TEMPLATE_ID } from '@/config/templateIndex'

export interface OnboardingInput {
  slug: string
  template: string
  brideName: string
  groomName: string
  weddingDate: string // ISO datetime e.g. "2026-11-15T16:00:00"
  venue: string
}

export interface OnboardingResult {
  ok: boolean
  slug?: string
  publicUrl?: string
  dashboardUrl?: string
  error?: string
}

/**
 * Create the invitation row for the currently-authenticated user.
 *
 *   - Validates the slug format (3–40 chars, lowercase + digits + hyphens).
 *   - Checks slug availability (rejects if taken by another invitation).
 *   - Refuses if this user already owns an invitation (1:1 enforcement).
 *   - Builds the full 14-section config with the couple's data substituted.
 *   - Inserts the row with is_published=true so the public URL works immediately.
 *
 * Returns a structured result object (not throws) so the client UI can
 * display the exact error message — Next.js sanitizes thrown errors in
 * production-like builds, masking the actual cause.
 */
export async function completeOnboarding(input: OnboardingInput): Promise<OnboardingResult> {
  try {
    // 1. Require an authenticated session.
    const server = createSupabaseServerClient()
    const { data: { user } } = await server.auth.getUser()
    if (!user) return { ok: false, error: 'Tidak ada sesi login — silakan daftar ulang' }

    // 2. Validate inputs.
    let slug: string
    try {
      slug = validateSlug(input.slug)
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Slug tidak valid' }
    }
    const template = isValidTemplate(input.template) ? input.template : DEFAULT_TEMPLATE_ID
    const brideName = input.brideName.trim()
    const groomName = input.groomName.trim()
    const venue = input.venue.trim()
    if (!brideName || !groomName) return { ok: false, error: 'Nama pengantin wajib diisi' }
    if (!venue) return { ok: false, error: 'Lokasi acara wajib diisi' }
    if (!input.weddingDate) return { ok: false, error: 'Tanggal acara wajib diisi' }
    const dateMs = Date.parse(input.weddingDate)
    if (isNaN(dateMs)) return { ok: false, error: 'Tanggal acara tidak valid' }

    const admin = createSupabaseAdminClient()

    // 3. One user owns at most one invitation.
    const { data: alreadyOwned } = (await admin
      .from('invitations')
      .select('slug, template_id')
      .eq('owner_user_id', user.id)
      .maybeSingle()) as { data: { slug: string; template_id: string | null } | null }
    if (alreadyOwned?.slug) {
      const ownedTemplate =
        alreadyOwned.template_id && isValidTemplate(alreadyOwned.template_id)
          ? alreadyOwned.template_id
          : DEFAULT_TEMPLATE_ID
      return {
        ok: true,
        slug: alreadyOwned.slug,
        publicUrl: `/${ownedTemplate}/${alreadyOwned.slug}`,
        dashboardUrl: `/${ownedTemplate}/${alreadyOwned.slug}/dashboard`,
      }
    }

    // 4. Slug availability check.
    const { data: taken } = (await admin
      .from('invitations')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()) as { data: { id: string } | null }
    if (taken) return { ok: false, error: 'Slug sudah dipakai. Pilih yang lain.' }

    // 5. Build the seeded config. Lovebirds substitutes the couple's data
    //    into its 14-section cinematic config; other templates seed from
    //    their bundled defaultConfig (couple edits content in the dashboard).
    const config =
      template === 'lovebirds'
        ? buildSeedConfig({
            brideName,
            groomName,
            weddingDate: input.weddingDate,
            venue,
          })
        : getDefaultConfig(template)

    // 6. Insert. Legacy NOT NULL columns (from the bcrypt-era schema) are
    //    set the same way scripts/create-invitation.mjs does it.
    const { error } = await (admin.from('invitations') as any).insert({
      slug,
      owner_user_id: user.id,
      email: user.email,
      password_hash: 'supabase-auth-migrated',
      plan: 'premium',
      template_id: template,
      is_published: true,
      config,
    })
    if (error) {
      console.error('Onboarding insert error:', error)
      return { ok: false, error: `DB error: ${error.message}` }
    }

    revalidatePath('/[template]/[slug]', 'page')
    revalidatePath('/[template]/[slug]/dashboard', 'page')

    return {
      ok: true,
      slug,
      publicUrl: `/${template}/${slug}`,
      dashboardUrl: `/${template}/${slug}/dashboard`,
    }
  } catch (e) {
    console.error('Onboarding unexpected error:', e)
    return { ok: false, error: e instanceof Error ? e.message : 'Unexpected error' }
  }
}

/**
 * Live slug availability probe — called by the OnboardingForm as the user
 * types so they get instant feedback before submitting.
 */
export async function checkSlugAvailable(slug: string): Promise<{ available: boolean; reason?: string }> {
  try {
    const cleaned = validateSlug(slug)
    const admin = createSupabaseAdminClient()
    const { data } = (await admin
      .from('invitations')
      .select('id')
      .eq('slug', cleaned)
      .maybeSingle()) as { data: { id: string } | null }
    return data ? { available: false, reason: 'Sudah dipakai' } : { available: true }
  } catch (e) {
    return { available: false, reason: e instanceof Error ? e.message : 'Format slug tidak valid' }
  }
}
