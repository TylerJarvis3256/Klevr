import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import puppeteer from 'puppeteer-core'

const IS_PRODUCTION = process.env.NODE_ENV === 'production'

/**
 * Downloads the Chromium tar from S3 using the AWS SDK, extracts it,
 * then passes the extracted directory to @sparticuz/chromium-min.
 * This bypasses follow-redirects (which can't handle presigned URLs).
 */
async function getProductionChromiumPath(): Promise<string> {
  const chromium = (await import('@sparticuz/chromium-min')).default

  // If already extracted from a previous invocation, return cached path
  const cachedBinary = join(tmpdir(), 'chromium')
  if (existsSync(cachedBinary)) {
    return cachedBinary
  }

  // @ts-expect-error -- tar-fs has no type declarations
  const { extract } = await import('tar-fs')
  const { downloadFile } = await import('@/lib/s3')

  const s3Key = process.env.CHROMIUM_S3_KEY || 'chromium-v143.0.4-pack.x64.tar'
  const destDir = join(tmpdir(), 'chromium-pack')

  if (!existsSync(destDir)) {
    // Download tar from S3 as a buffer
    const buffer = await downloadFile(s3Key)

    // Extract tar to temp directory
    mkdirSync(destDir, { recursive: true })
    const readable = Readable.from(buffer)
    await pipeline(readable, extract(destDir))
  }

  // Pass the extracted directory — chromium-min inflates the .br files inside
  return chromium.executablePath(destDir)
}

/**
 * Resolves the Chromium/Chrome executable path.
 * - Production (serverless): downloads from S3, extracts, uses @sparticuz/chromium-min
 * - Development (local): uses locally installed Chrome
 */
async function getChromiumPath(): Promise<string> {
  if (IS_PRODUCTION) {
    return getProductionChromiumPath()
  }

  // Local dev: find Chrome installation
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
  ].filter(Boolean) as string[]

  const found = candidates.find(p => existsSync(p))
  if (!found) {
    throw new Error('Chrome not found. Install Chrome or set CHROME_PATH env variable.')
  }
  return found
}

/**
 * Returns Chromium launch args appropriate for the environment.
 */
async function getChromiumArgs(): Promise<string[]> {
  if (IS_PRODUCTION) {
    const chromium = (await import('@sparticuz/chromium-min')).default
    return chromium.args
  }
  return ['--no-sandbox', '--disable-setuid-sandbox']
}

/**
 * Converts an HTML string to a PDF buffer using headless Chromium.
 * Uses locally installed Chrome in dev, @sparticuz/chromium-min in production.
 */
export async function htmlToPdf(html: string): Promise<Buffer> {
  const [executablePath, args] = await Promise.all([getChromiumPath(), getChromiumArgs()])

  const browser = await puppeteer.launch({
    executablePath,
    args,
    defaultViewport: { width: 1920, height: 1080 },
    headless: true,
  })

  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '40px',
        right: '40px',
        bottom: '40px',
        left: '40px',
      },
    })

    return Buffer.from(pdfBuffer)
  } finally {
    await browser.close()
  }
}
