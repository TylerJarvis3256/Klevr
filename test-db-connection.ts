import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

// Prisma v7 uses driver adapters
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Testing Supabase connection...')

  // Count existing users
  const userCount = await prisma.user.count()
  console.log(`Current users in database: ${userCount}`)

  // List all tables by counting records
  const counts = {
    users: await prisma.user.count(),
    profiles: await prisma.profile.count(),
    jobs: await prisma.job.count(),
    applications: await prisma.application.count(),
    notes: await prisma.note.count(),
    aiTasks: await prisma.aiTask.count(),
    generatedDocuments: await prisma.generatedDocument.count(),
    usageTracking: await prisma.usageTracking.count(),
  }

  console.log('\nTable record counts:')
  console.log(JSON.stringify(counts, null, 2))
  console.log('\n✅ Database connection successful!')
  console.log('📊 All tables are accessible')
  console.log('🔍 Refresh Prisma Studio (http://localhost:51212) to see the tables')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
