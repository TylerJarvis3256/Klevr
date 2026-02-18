import { vi } from 'vitest'

// ─── Prisma Mock ───────────────────────────────────────

function createModelMock() {
  return {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
  }
}

export function createMockPrisma() {
  return {
    user: createModelMock(),
    profile: createModelMock(),
    job: createModelMock(),
    application: createModelMock(),
    generatedDocument: createModelMock(),
    aiTask: createModelMock(),
    usageTracking: createModelMock(),
    note: createModelMock(),
    activityLog: createModelMock(),
    education: createModelMock(),
    jobExperience: createModelMock(),
    bullet: createModelMock(),
    project: createModelMock(),
    savedSearch: createModelMock(),
    savedSearchRun: createModelMock(),
    notification: createModelMock(),
    resumeUpload: createModelMock(),
    adzunaRequestLog: createModelMock(),
    adzunaSearchCache: createModelMock(),
    $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn(createMockPrisma())),
  }
}

// ─── Auth0 Mock ────────────────────────────────────────

export function createMockAuth0Session(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      sub: 'auth0|test-user-id',
      email: 'test@example.com',
      email_verified: true,
      name: 'Test User',
      picture: 'https://example.com/avatar.jpg',
      ...overrides,
    },
  }
}

// ─── OpenAI Mock ───────────────────────────────────────

export function createMockOpenAIResponse(content: string = '{"result": "test"}') {
  return {
    id: 'chatcmpl-test',
    object: 'chat.completion',
    created: 1700000000,
    model: 'gpt-4o-2024-05-13',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content,
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: 100,
      completion_tokens: 50,
      total_tokens: 150,
    },
  }
}

// ─── Anthropic Mock ──────────────────────────────────

export function createMockAnthropicResponse(content: string = '{"result": "test"}') {
  // The parseAnthropicJson function prepends '{' to the response,
  // so strip the leading '{' from content to simulate the prefilled assistant technique
  const strippedContent = content.startsWith('{') ? content.slice(1) : content
  return {
    id: 'msg_test',
    type: 'message' as const,
    role: 'assistant' as const,
    model: 'claude-sonnet-4-5-20250929',
    content: [{ type: 'text' as const, text: strippedContent }],
    stop_reason: 'end_turn' as const,
    stop_sequence: null,
    usage: { input_tokens: 100, output_tokens: 50 },
  }
}

// ─── S3 Mocks ──────────────────────────────────────────

export const mockS3Client = {
  send: vi.fn(),
}

export const mockGetSignedUrl = vi.fn().mockResolvedValue('https://s3.example.com/signed-url')

// ─── Inngest Mock ──────────────────────────────────────

export const mockInngest = {
  send: vi.fn().mockResolvedValue({ ids: ['test-event-id'] }),
  createFunction: vi.fn(),
}
