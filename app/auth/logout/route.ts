import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const logoutUrl = new URL(
      `https://${process.env.AUTH0_DOMAIN}/v2/logout`
    )

    logoutUrl.searchParams.append(
      'client_id',
      process.env.AUTH0_CLIENT_ID || ''
    )
    logoutUrl.searchParams.append(
      'returnTo',
      process.env.APP_BASE_URL || 'http://localhost:3000'
    )

    // Clear the session cookie
    const response = NextResponse.redirect(logoutUrl)
    response.cookies.set('appSession', '', {
      expires: new Date(0),
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.redirect(
      process.env.APP_BASE_URL || 'http://localhost:3000'
    )
  }
}
