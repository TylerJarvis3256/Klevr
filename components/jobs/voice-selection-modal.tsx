'use client'

import { useState, useCallback } from 'react'
import { Check, Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  COVER_LETTER_VOICE_OPTIONS,
  VOICE_SELECTION_LABELS,
  VOICE_SELECTION_DESCRIPTIONS,
  type CoverLetterVoiceSelection,
} from '@/lib/cover-letter-types'

interface VoiceSelectionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (voice: CoverLetterVoiceSelection) => void
  isGenerating: boolean
}

export function VoiceSelectionModal({
  open,
  onOpenChange,
  onConfirm,
  isGenerating,
}: VoiceSelectionModalProps) {
  const [selectedVoice, setSelectedVoice] = useState<CoverLetterVoiceSelection>('auto')

  // Reset to 'auto' each time modal opens via onOpenChange wrapper
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        setSelectedVoice('auto')
      }
      onOpenChange(nextOpen)
    },
    [onOpenChange]
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-primary max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-lora text-secondary text-2xl">
            Choose Cover Letter Voice
          </DialogTitle>
          <DialogDescription className="text-secondary/80">
            Select a tone for your cover letter, or let the AI pick the best match.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 my-4">
          {COVER_LETTER_VOICE_OPTIONS.map(voice => (
            <button
              key={voice}
              onClick={() => setSelectedVoice(voice)}
              className={`relative w-full p-4 rounded-xl border-2 text-left transition-all ${
                selectedVoice === voice
                  ? 'border-accent-orange bg-accent-orange/10'
                  : 'border-secondary/20 bg-white hover:border-accent-orange/50'
              }`}
            >
              {selectedVoice === voice && (
                <div className="absolute top-3 right-3">
                  <div className="w-6 h-6 rounded-full bg-accent-orange flex items-center justify-center">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                {voice === 'auto' && (
                  <Sparkles className="h-5 w-5 text-accent-orange mt-0.5 shrink-0" />
                )}
                <div>
                  <h3 className="font-lora font-semibold text-secondary text-base">
                    {VOICE_SELECTION_LABELS[voice]}
                  </h3>
                  <p className="text-sm text-secondary/70 mt-1">
                    {VOICE_SELECTION_DESCRIPTIONS[voice]}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-secondary/20"
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm(selectedVoice)}
            className="bg-accent-orange hover:bg-accent-orange/90"
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Cover Letter'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
