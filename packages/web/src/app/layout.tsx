import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: 'midigen',
  description: 'MIDI file generator for live performance',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-gray-950 text-gray-100">
        <nav className="border-b border-gray-800 bg-gray-900">
          <div className="mx-auto max-w-6xl px-4 flex items-center gap-6 h-14">
            <Link href="/" className="text-lg font-bold tracking-tight text-white">midigen</Link>
            <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">Songs</Link>
            <Link href="/config/gear" className="text-sm text-gray-400 hover:text-white transition-colors">Gear</Link>
            <Link href="/config/events" className="text-sm text-gray-400 hover:text-white transition-colors">Events</Link>
          </div>
        </nav>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  )
}
