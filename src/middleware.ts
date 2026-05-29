import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { isIdleExpired, ACTIVITY_COOKIE } from '@/lib/auth/idle-timeout'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

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
  matcher: [
    '/profile',
    '/onboarding',
    '/my-templates',
    '/:template/:slug/dashboard/:path*',
  ],
}
