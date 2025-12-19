import { auth0 } from './auth0'
import { prisma } from './prisma'

/**
 * Get the current authenticated user from the database
 * Requires Auth0 session to exist
 */
export async function getCurrentUser() {
  try {
    const session = await auth0.getSession()
    if (!session?.user) return null

    const auth0Id = session.user.sub
    const email = session.user.email

    if (!auth0Id || !email) return null

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { auth0_id: auth0Id },
      include: { Profile: true },
    })

    if (!user) {
      // Create user on first login
      user = await prisma.user.create({
        data: {
          auth0_id: auth0Id,
          email: email,
        },
        include: { Profile: true },
      })
    }

    return user
  } catch (error) {
    // Handle JSON parsing errors from malformed sessions gracefully
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
      console.debug('Auth: Malformed session cookie detected, user not authenticated')
      return null
    }

    console.error('getCurrentUser error:', error)
    return null
  }
}

/**
 * Get session for API routes (compatible with getSession pattern)
 */
export async function getSession() {
  try {
    const session = await auth0.getSession()
    if (!session?.user) return null

    const user = await getCurrentUser()
    if (!user) return null

    return {
      user: {
        id: user.id,
        auth0_id: user.auth0_id,
        email: user.email,
      },
    }
  } catch (error) {
    console.error('getSession error:', error)
    return null
  }
}
