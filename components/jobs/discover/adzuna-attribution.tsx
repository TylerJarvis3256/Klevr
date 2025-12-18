import Link from 'next/link'
import Image from 'next/image'

/**
 * Adzuna TOS Compliance Attribution
 *
 * Displays "Jobs by Adzuna" with logo as required by Adzuna TOS.
 * Logo should be downloaded from: https://www.adzuna.com/about-us/press-office/
 * Save to: public/images/adzuna-logo.png
 */
export function AdzunaAttribution() {
  return (
    <div className="flex items-center gap-2 text-sm text-secondary/70">
      <span>Jobs by</span>
      <Link
        href="https://www.adzuna.com"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:opacity-80 transition-opacity inline-flex items-center"
      >
        <Image
          src="/images/adzuna-logo.png"
          alt="Adzuna"
          width={80}
          height={24}
          className="h-6 w-auto"
          unoptimized
        />
      </Link>
    </div>
  )
}
