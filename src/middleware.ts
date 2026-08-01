import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { isIdleExpired, ACTIVITY_COOKIE } from '@/lib/auth/idle-timeout'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  // Fast path: if there's no Supabase auth cookie, there is no session to
  // refresh, no idle window to slide, and no owner-preview to enable — so skip
  // the supabase.auth.getUser() network round-trip entirely. This is the
  // common case for anonymous guests viewing a public invitation, and the
  // matcher now covers /<template>/<slug>. Page-level guards still redirect
  // unauthenticated users away from /profile, /dashboard, etc.
  const hasAuthCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith('sb-') && c.name.includes('auth-token'))
  if (!hasAuthCookie) return response

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Refreshes the session (also keeps Supabase tokens fresh — there was no
  // middleware before, so this is the canonical place for it).
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const now = Date.now()
    const last = Number(request.cookies.get(ACTIVITY_COOKIE)?.value ?? '0')

    if (isIdleExpired(last, now)) {
      await supabase.auth.signOut() // clears auth cookies onto `response` via setAll
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      const redirect = NextResponse.redirect(url)
      response.cookies.getAll().forEach((c) => redirect.cookies.set(c)) // carry the cleared auth cookies
      redirect.cookies.set(ACTIVITY_COOKIE, '', { maxAge: 0, path: '/' })
      return redirect
    }

    // Slide the window forward.
    response.cookies.set(ACTIVITY_COOKIE, String(now), {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24,
    })
  }

  return response
}

export const config = {
  // Names the four route families that actually consult a user session, rather
  // than trying to describe "everything except assets" — the old inverted form
  // silently matched nearly the whole site (see the matcher regression test for
  // the `(.json)?` parsing collision) and its folder-exclusion list had drifted
  // out of date with public/ anyway.
  //
  // Each :param carries an explicit inline pattern or a modifier. That is
  // load-bearing: a BARE trailing :param absorbs the `(.json)?` that Next
  // appends at build time and turns its own segment optional.
  //
  // NOTE: template ids are hardcoded because Next statically analyses this
  // export at build time — templateIndex.js cannot be imported here. Adding a
  // third template requires editing this list too (see tutorial-multi.md).
  matcher: [
    '/profile',
    '/onboarding',
    // Admin keeps middleware on purpose: the idle-timeout auto-logout lives
    // ONLY here, and /admin can suspend invitations, issue refunds and delete
    // user data. That protection is worth the duplicate getUser() that
    // requireAdmin() in admin/layout.tsx also performs.
    '/admin/:path*',
    '/:template(lovebirds|solary)/:slug/dashboard/:path*',
    // Public invitation page — needed so the Supabase server client can refresh
    // the session and the owner-preview bypass works.
    '/:template(lovebirds|solary)/:slug([^/]+)',
  ],
}
