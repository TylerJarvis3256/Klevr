import { useEffect, useState } from 'react'
import { AiTaskStatus } from '@prisma/client'

interface TaskUpdate {
  status: AiTaskStatus
  result_ref?: string | null
  error_message?: string | null
}

export function useSSETask(taskId: string | null, onComplete?: (result: string) => void) {
  const [status, setStatus] = useState<AiTaskStatus>('PENDING')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)

  useEffect(() => {
    if (!taskId) return

    const eventSource = new EventSource(`/api/ai-tasks/stream?taskId=${taskId}`)

    eventSource.onmessage = event => {
      const data: TaskUpdate = JSON.parse(event.data)
      setStatus(data.status)
      setError(data.error_message || null)
      setResult(data.result_ref || null)

      if (data.status === 'SUCCEEDED' && data.result_ref) {
        onComplete?.(data.result_ref)
        eventSource.close()
      } else if (data.status === 'FAILED') {
        eventSource.close()
      }
    }

    eventSource.onerror = () => {
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }, [taskId, onComplete])

  return { status, error, result, isLoading: status === 'PENDING' || status === 'RUNNING' }
}
