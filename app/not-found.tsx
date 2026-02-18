import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-primary">
      <div className="text-center">
        <h1 className="font-lora text-6xl font-bold text-secondary mb-4">404</h1>
        <p className="text-secondary/70 mb-6">Page not found</p>
        <Link
          href="/dashboard"
          className="bg-accent-orange text-white px-6 py-3 rounded-full hover:bg-accent-orange/90 transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  )
}
