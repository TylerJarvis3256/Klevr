'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export type TemplateOption = 'classic-ats' | 'compact-ats'

interface TemplateInfo {
  id: TemplateOption
  name: string
  description: string
}

const TEMPLATES: TemplateInfo[] = [
  {
    id: 'classic-ats',
    name: 'Classic ATS',
    description: 'Fast generation, clean and professional. ATS-friendly single column layout.',
  },
  {
    id: 'compact-ats',
    name: 'Compact ATS',
    description:
      'Space-efficient layout optimized for one-page resumes. Auto-selected when compression needed.',
  },
]

interface TemplateSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (template: TemplateOption, allowTwoPages: boolean) => void
  defaultTemplate?: TemplateOption
  defaultAllowTwoPages?: boolean
}

export function TemplateSelector({
  open,
  onOpenChange,
  onSelect,
  defaultTemplate = 'classic-ats',
  defaultAllowTwoPages = false,
}: TemplateSelectorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateOption>(defaultTemplate)
  const [allowTwoPages, setAllowTwoPages] = useState(defaultAllowTwoPages)

  const handleSelect = () => {
    onSelect(selectedTemplate, allowTwoPages)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-primary max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-lora text-secondary text-2xl">
            Choose Resume Template
          </DialogTitle>
          <DialogDescription className="text-secondary/80">
            Select a template style and format for your resume generation.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
          {TEMPLATES.map(template => (
            <button
              key={template.id}
              onClick={() => setSelectedTemplate(template.id)}
              className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                selectedTemplate === template.id
                  ? 'border-accent-orange bg-accent-orange/10'
                  : 'border-secondary/20 bg-white hover:border-accent-orange/50'
              }`}
            >
              {/* Selection indicator */}
              {selectedTemplate === template.id && (
                <div className="absolute top-3 left-3">
                  <div className="w-6 h-6 rounded-full bg-accent-orange flex items-center justify-center">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                </div>
              )}

              {/* Content */}
              <div className={selectedTemplate === template.id ? 'mt-6' : ''}>
                <h3 className="font-lora font-semibold text-secondary text-lg mb-2">
                  {template.name}
                </h3>
                <p className="text-sm text-secondary/70 leading-relaxed">{template.description}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Two-page toggle */}
        <div className="border-t border-secondary/10 pt-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={allowTwoPages}
              onChange={e => setAllowTwoPages(e.target.checked)}
              className="mt-1 rounded border-secondary/30"
            />
            <div className="flex-1">
              <span className="text-sm font-medium text-secondary block">
                Allow two-page resume
              </span>
              <span className="text-xs text-secondary/60 mt-1 block">
                Most recruiters prefer one-page resumes for entry-level roles. Enable this for
                senior positions or academic CVs.
              </span>
            </div>
          </label>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-secondary/20"
          >
            Cancel
          </Button>
          <Button onClick={handleSelect} className="bg-accent-orange hover:bg-accent-orange/90">
            Generate Resume
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
