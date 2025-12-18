import Link from 'next/link'
import Image from 'next/image'

/**
 * Adzuna TOS Compliance Attribution
 *
 * Displays "Jobs by Adzuna" with logo as required by Adzuna TOS.
 * Logo will be added in Phase 7.
 */
export function AdzunaAttribution() {
  return (
    <div className="flex items-center gap-2 text-sm text-secondary/70">
      <span>Jobs by</span>
      <Link
        href="https://www.adzuna.com"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:opacity-80 transition-opacity"
      >
        {/* Placeholder - logo will be added in Phase 7 */}
        <span className="font-semibold text-accent-teal">Adzuna</span>
        {/* TODO Phase 7: Replace with actual logo */}
        {/* <Image
          src="/images/adzuna-logo.png"
          alt="Adzuna"
          width={80}
          height={24}
          className="h-6 w-auto"
        /> */}
      </Link>
    </div>
  )
}
