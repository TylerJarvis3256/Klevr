import { notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { JobHeader } from '@/components/jobs/job-header'
import { JobTabs } from '@/components/jobs/job-tabs'

interface JobDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  const user = await getCurrentUser()
  if (!user) return null

  const { id } = await params

  const job = await prisma.job.findFirst({
    where: {
      id,
      user_id: user.id,
    },
    include: {
      Application: {
        include: {
          GeneratedDocument: {
            orderBy: { created_at: 'desc' },
          },
          Note: {
            orderBy: { created_at: 'desc' },
          },
          AiTask: {
            orderBy: {
              created_at: 'desc',
            },
          },
        },
      },
    },
  })

  if (!job) {
    notFound()
  }

  const application = job.Application[0]
  const latestScoringTask =
    application.AiTask.find(task => task.type === 'JOB_SCORING') || null
  const documentTasks = application.AiTask.filter(
    task => task.type === 'RESUME_GENERATION' || task.type === 'COVER_LETTER_GENERATION'
  )
  const researchTask = application.AiTask.find(
    task =>
      task.type === 'COMPANY_RESEARCH' && (task.status === 'PENDING' || task.status === 'RUNNING')
  )

  return (
    <div className="max-w-5xl">
      <JobHeader job={job} application={application} />

      <JobTabs
        job={job}
        application={application}
        latestScoringTask={latestScoringTask}
        researchTask={researchTask}
        documentTasks={documentTasks}
      />
    </div>
  )
}
