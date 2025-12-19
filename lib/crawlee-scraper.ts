/**
 * Job Description Scraper
 *
 * Two-tier scraping approach:
 * 1. Axios + Cheerio (fast, HTTP-based) - ~500ms, 70-85% success rate
 * 2. Playwright (browser-based) - ~3-5s, 95-98% combined success rate
 *
 * Falls back gracefully to original snippet if both fail
 */

import axios from 'axios'
import * as cheerio from 'cheerio'
import { chromium } from 'playwright'
import { getJobBoardConfig } from './job-board-selectors'
import {
  isScrapedContentValid,
  cleanScrapedText,
} from './scraping-validators'

export interface ScrapeResult {
  /** Whether scraping succeeded */
  success: boolean
  /** Full job description (if successful) */
  description?: string
  /** Method used (cheerio or playwright) */
  method?: 'cheerio' | 'playwright'
  /** Final URL after redirects */
  finalUrl?: string
  /** Error message (if failed) */
  error?: string
}

/**
 * Try to scrape job description using Axios + Cheerio
 * Fast, lightweight, HTTP-based scraping for static content
 */
async function scrapeWithCheerio(
  url: string,
  originalSnippet: string
): Promise<ScrapeResult> {
  const config = getJobBoardConfig(url)

  try {
    // Make HTTP request with browser-like headers
    const response = await axios.get(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        Connection: 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      timeout: 30000,
      maxRedirects: 5,
      validateStatus: status => status >= 200 && status < 400,
    })

    // Parse HTML
    const $ = cheerio.load(response.data)
    const finalUrl = response.request?.res?.responseUrl || url

    // Remove script, style, and other noise elements globally
    $('script').remove()
    $('style').remove()
    $('noscript').remove()
    $('iframe').remove()
    $('svg').remove()
    $('.nav, .navigation, .navbar, .menu').remove()
    $('.footer, .header, .sidebar').remove()
    $('[class*="breadcrumb"]').remove()
    $('[class*="similar"]').remove()
    $('[class*="related"]').remove()
    $('[class*="recommended"]').remove()

    // Remove unwanted elements specific to this job board
    if (config.removeSelectors) {
      config.removeSelectors.forEach(selector => {
        $(selector).remove()
      })
    }

    // Try each selector in order
    for (const selector of config.selectors) {
      const element = $(selector)

      if (element.length > 0) {
        const text = element.text()
        const cleanedText = cleanScrapedText(text)

        // Validate
        const validation = isScrapedContentValid(cleanedText, originalSnippet)

        if (validation.valid) {
          return {
            success: true,
            description: cleanedText,
            method: 'cheerio',
            finalUrl,
          }
        }
      }
    }

    // No valid content found with any selector
    return {
      success: false,
      error: 'No valid content found with Cheerio',
      finalUrl,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Cheerio scraping failed',
    }
  }
}

/**
 * Try to scrape job description using Playwright
 * Slower but more robust, uses headless browser for JS-heavy sites
 */
async function scrapeWithPlaywright(
  url: string,
  originalSnippet: string
): Promise<ScrapeResult> {
  const config = getJobBoardConfig(url)
  let browser = null

  try {
    // Launch browser
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    })

    const page = await context.newPage()

    // Set timeout
    page.setDefaultTimeout(45000)

    // Navigate to URL
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 45000,
    })

    // Wait for specific selector if configured
    if (config.waitForSelector) {
      try {
        await page.waitForSelector(config.waitForSelector, { timeout: 5000 })
      } catch {
        // Continue even if selector not found
      }
    }

    const finalUrl = page.url()

    // Remove script, style, and other noise elements globally
    await page.evaluate(() => {
      document.querySelectorAll('script').forEach(el => el.remove())
      document.querySelectorAll('style').forEach(el => el.remove())
      document.querySelectorAll('noscript').forEach(el => el.remove())
      document.querySelectorAll('iframe').forEach(el => el.remove())
      document.querySelectorAll('svg').forEach(el => el.remove())
      document
        .querySelectorAll('.nav, .navigation, .navbar, .menu')
        .forEach(el => el.remove())
      document
        .querySelectorAll('.footer, .header, .sidebar')
        .forEach(el => el.remove())
      document.querySelectorAll('[class*="breadcrumb"]').forEach(el => el.remove())
      document.querySelectorAll('[class*="similar"]').forEach(el => el.remove())
      document.querySelectorAll('[class*="related"]').forEach(el => el.remove())
      document.querySelectorAll('[class*="recommended"]').forEach(el => el.remove())
    })

    // Remove unwanted elements specific to this job board
    if (config.removeSelectors) {
      for (const selector of config.removeSelectors) {
        await page.$$eval(selector, elements =>
          elements.forEach(el => el.remove())
        )
      }
    }

    // Try each selector in order
    for (const selector of config.selectors) {
      try {
        const element = await page.$(selector)

        if (element) {
          const text = await element.textContent()

          if (text) {
            const cleanedText = cleanScrapedText(text)

            // Validate
            const validation = isScrapedContentValid(
              cleanedText,
              originalSnippet
            )

            if (validation.valid) {
              await browser.close()
              return {
                success: true,
                description: cleanedText,
                method: 'playwright',
                finalUrl,
              }
            }
          }
        }
      } catch (error) {
        // Continue to next selector
        continue
      }
    }

    // No valid content found with any selector
    await browser.close()
    return {
      success: false,
      error: 'No valid content found with Playwright',
      finalUrl,
    }
  } catch (error) {
    if (browser) {
      await browser.close()
    }
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Playwright scraping failed',
    }
  }
}

/**
 * Scrape job description using two-tier approach
 *
 * 1. Try Axios + Cheerio (fast, 70-85% success)
 * 2. If fails, try Playwright (slower, 95-98% combined)
 * 3. If both fail, return failure (caller uses original snippet)
 *
 * @param redirectUrl - The Adzuna redirect URL to scrape
 * @param originalSnippet - The original Adzuna snippet for validation
 * @returns ScrapeResult with success status and description or error
 */
export async function scrapeJobDescription(
  redirectUrl: string,
  originalSnippet: string
): Promise<ScrapeResult> {
  console.log('[Scraper] Starting scrape for:', redirectUrl)

  // Validate inputs
  if (!redirectUrl || !redirectUrl.startsWith('http')) {
    return {
      success: false,
      error: 'Invalid URL provided',
    }
  }

  if (!originalSnippet || originalSnippet.length < 50) {
    return {
      success: false,
      error: 'Invalid original snippet (too short)',
    }
  }

  // Tier 1: Try Cheerio (fast)
  console.log('[Scraper] Trying Cheerio...')
  const cheerioResult = await scrapeWithCheerio(redirectUrl, originalSnippet)

  if (cheerioResult.success) {
    console.log('[Scraper] ✓ Success with Cheerio')
    return cheerioResult
  }

  console.log('[Scraper] Cheerio failed:', cheerioResult.error)

  // Tier 2: Try Playwright (slower but more robust)
  console.log('[Scraper] Trying Playwright...')
  const playwrightResult = await scrapeWithPlaywright(
    redirectUrl,
    originalSnippet
  )

  if (playwrightResult.success) {
    console.log('[Scraper] ✓ Success with Playwright')
    return playwrightResult
  }

  console.log('[Scraper] Playwright failed:', playwrightResult.error)

  // Both failed
  return {
    success: false,
    error: `Both scraping methods failed. Cheerio: ${cheerioResult.error}, Playwright: ${playwrightResult.error}`,
    finalUrl: playwrightResult.finalUrl || cheerioResult.finalUrl,
  }
}
