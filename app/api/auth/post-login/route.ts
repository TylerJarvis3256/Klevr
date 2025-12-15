import { NextResponse } from 'next/server'
import { auth0 } from '@/lib/auth0'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Get the current session
    const session = await auth0.getSession()

    if (!session?.user) {
      return NextResponse.redirect(new URL('/auth/login', process.env.APP_BASE_URL!))
    }

    const auth0Id = session.user.sub
    const email = session.user.email

    if (!auth0Id || !email) {
      return NextResponse.redirect(new URL('/auth/login', process.env.APP_BASE_URL!))
    }

    // Find or create user in database
    let user = await prisma.user.findUnique({
      where: { auth0_id: auth0Id },
      include: { Profile: true },
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          auth0_id: auth0Id,
          email: email,
        },
        include: { Profile: true },
      })
    }

    // Redirect based on onboarding status
    if (!user.Profile?.parsed_resume_confirmed_at) {
      // New user - redirect to onboarding
      return NextResponse.redirect(new URL('/onboarding/basics', process.env.APP_BASE_URL!))
    } else {
      // Returning user - redirect to dashboard
      return NextResponse.redirect(new URL('/dashboard', process.env.APP_BASE_URL!))
    }
  } catch (error) {
    console.error('Post-login error:', error)
    return NextResponse.redirect(new URL('/', process.env.APP_BASE_URL!))
  }
}
