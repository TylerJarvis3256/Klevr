import type { Metadata } from 'next'
import { Toaster } from 'sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'Klevr - AI Career Assistant',
  description: 'Get hired faster with an AI career copilot',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-primary">
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  )
}
