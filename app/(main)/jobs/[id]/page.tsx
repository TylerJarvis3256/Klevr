import { notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { JobHeader } from '@/components/jobs/job-header'
import { JobDescription } from '@/components/jobs/job-description'
import { FitAssessment } from '@/components/jobs/fit-assessment'
import { CompanyResearch } from '@/components/jobs/company-research'
import { DocumentsList } from '@/components/jobs/documents-list'
import { NotesList } from '@/components/jobs/notes-list'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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

      <Tabs defaultValue="description" className="mt-8">
        <TabsList className="bg-white border border-secondary/10 p-1 rounded-xl">
          <TabsTrigger value="description">Description</TabsTrigger>
          <TabsTrigger value="fit">Fit & Insights</TabsTrigger>
          <TabsTrigger value="company">Company Research</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="description" className="mt-6">
          <JobDescription job={job} />
        </TabsContent>

        <TabsContent value="fit" className="mt-6">
          <FitAssessment application={application} aiTask={latestScoringTask} />
        </TabsContent>

        <TabsContent value="company" className="mt-6">
          <CompanyResearch
            application={application}
            company={job.company}
            researchTask={researchTask}
          />
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <DocumentsList
            documents={application.GeneratedDocument}
            applicationId={application.id}
            documentTasks={documentTasks}
          />
        </TabsContent>

        <TabsContent value="notes" className="mt-6">
          <NotesList notes={application.Note} applicationId={application.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
