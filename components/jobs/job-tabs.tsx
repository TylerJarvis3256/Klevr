'use client'

import { useState } from 'react'
import type { Job, Application, AiTask, GeneratedDocument, Note } from '@prisma/client'
import { JobDescription } from './job-description'
import { FitAssessment } from './fit-assessment'
import { CompanyResearch } from './company-research'
import { DocumentsList } from './documents-list'
import { NotesList } from './notes-list'
import { ApplicationHistory } from './application-history'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

type TabValue = 'description' | 'fit' | 'company' | 'documents' | 'notes' | 'history'

interface JobTabsProps {
  job: Job & {
    Application: Array<
      Application & {
        GeneratedDocument: GeneratedDocument[]
        Note: Note[]
        AiTask: AiTask[]
      }
    >
  }
  application: Application & {
    GeneratedDocument: GeneratedDocument[]
    Note: Note[]
    AiTask: AiTask[]
  }
  latestScoringTask: AiTask | null
  researchTask?: AiTask | null
  documentTasks: AiTask[]
}

const tabs = [
  { value: 'description' as const, label: 'Description' },
  { value: 'fit' as const, label: 'Fit & Insights' },
  { value: 'company' as const, label: 'Company Research' },
  { value: 'documents' as const, label: 'Documents' },
  { value: 'notes' as const, label: 'Notes' },
  { value: 'history' as const, label: 'History' },
]

export function JobTabs({
  job,
  application,
  latestScoringTask,
  researchTask,
  documentTasks,
}: JobTabsProps) {
  const [activeTab, setActiveTab] = useState<TabValue>('description')

  return (
    <div className="mt-8">
      {/* Desktop: Horizontal tabs */}
      <div className="hidden md:flex gap-2 border-b border-secondary/10 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              'px-6 py-3 font-medium rounded-t-xl transition-all relative',
              activeTab === tab.value
                ? 'bg-white text-secondary shadow-sm border-b-2 border-accent-orange -mb-px'
                : 'text-secondary/60 hover:text-secondary hover:bg-primary/30'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Mobile: Dropdown menu */}
      <div className="md:hidden mb-6">
        <Select value={activeTab} onValueChange={(val) => setActiveTab(val as TabValue)}>
          <SelectTrigger className="w-full bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {tabs.map(tab => (
              <SelectItem key={tab.value} value={tab.value}>
                {tab.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tab content */}
      <div className="mt-6">
        {activeTab === 'description' && <JobDescription job={job} />}

        {activeTab === 'fit' && (
          <FitAssessment application={application} job={job} aiTask={latestScoringTask} />
        )}

        {activeTab === 'company' && (
          <CompanyResearch
            application={application}
            company={job.company}
            researchTask={researchTask}
          />
        )}

        {activeTab === 'documents' && (
          <DocumentsList
            documents={application.GeneratedDocument}
            applicationId={application.id}
            documentTasks={documentTasks}
          />
        )}

        {activeTab === 'notes' && (
          <NotesList notes={application.Note} applicationId={application.id} />
        )}

        {activeTab === 'history' && (
          <ApplicationHistory applicationId={application.id} />
        )}
      </div>
    </div>
  )
}
