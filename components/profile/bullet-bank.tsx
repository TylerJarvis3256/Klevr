'use client'

import { BulletEditor } from './bullet-editor'
import type { Bullet } from '@prisma/client'

interface BulletBankProps {
  bullets: Bullet[]
  onAdd: (data: Partial<Bullet>) => Promise<void>
  onUpdate: (id: string, data: Partial<Bullet>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function BulletBank({ bullets, onAdd, onUpdate, onDelete }: BulletBankProps) {
  return (
    <div className="border border-secondary/20 rounded-2xl p-6 bg-white">
      <div className="mb-4">
        <h3 className="font-lora font-semibold text-lg">Bullet Bank</h3>
        <p className="text-sm text-secondary/60 mt-1">
          Reusable bullet points that can be used across different applications
        </p>
      </div>

      <BulletEditor
        bullets={bullets}
        onAdd={onAdd}
        onUpdate={onUpdate}
        onDelete={onDelete}
        contextType="profile"
      />
    </div>
  )
}
