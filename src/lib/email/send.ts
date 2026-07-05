import 'server-only'

export interface AdminEmail { to: string; subject: string; html: string }

/** Send a branded email via Resend (fetch, no SDK). BEST-EFFORT: returns false
 *  and never throws when unconfigured or on failure, so a failed send never
 *  rolls back the action that triggered it. */
export async function sendAdminEmail(email: AdminEmail): Promise<boolean> {
  const key = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM
  if (!key || !from) {
    console.warn('[sendAdminEmail] RESEND not configured — skipped')
    return false
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from, to: email.to, subject: email.subject, html: email.html }),
    })
    if (!res.ok) {
      console.error('[sendAdminEmail] failed', res.status, await res.text())
      return false
    }
    return true
  } catch (e) {
    console.error('[sendAdminEmail] error', e)
    return false
  }
}
