import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const taskId = searchParams.get('taskId')

  if (!taskId) {
    return new Response('Missing taskId', { status: 400 })
  }

  // Verify task belongs to user
  const task = await prisma.aiTask.findFirst({
    where: {
      id: taskId,
      user_id: user.id,
    },
  })

  if (!task) {
    return new Response('Task not found', { status: 404 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      // Send initial state
      sendEvent({
        status: task.status,
        result_ref: task.result_ref,
        error_message: task.error_message,
      })

      // Poll for updates
      const interval = setInterval(async () => {
        try {
          const updatedTask = await prisma.aiTask.findUnique({
            where: { id: taskId },
          })

          if (!updatedTask) {
            clearInterval(interval)
            controller.close()
            return
          }

          sendEvent({
            status: updatedTask.status,
            result_ref: updatedTask.result_ref,
            error_message: updatedTask.error_message,
          })

          // Close stream when task is complete
          if (updatedTask.status === 'SUCCEEDED' || updatedTask.status === 'FAILED') {
            clearInterval(interval)
            controller.close()
          }
        } catch (error) {
          console.error('SSE error:', error)
          clearInterval(interval)
          controller.close()
        }
      }, 2000) // Poll every 2 seconds

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
