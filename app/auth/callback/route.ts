import { NextResponse } from 'next/server'
import { auth0 } from '@/lib/auth0'

export async function GET() {
  // Auth0 handles the callback automatically
  // Redirect to the post-login endpoint which will handle user creation
  const session = await auth0.getSession()

  if (session) {
    return NextResponse.redirect(new URL('/api/auth/post-login', process.env.APP_BASE_URL || 'http://localhost:3000'))
  }

  return NextResponse.redirect(new URL('/', process.env.APP_BASE_URL || 'http://localhost:3000'))
}
