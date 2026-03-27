import type { Metadata } from 'next'
import Nav from './_components/Nav'
import './globals.css'

export const metadata: Metadata = {
  title: 'midigen',
  description: 'MIDI file generator for live performance',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-gray-950 text-gray-100">
        <Nav />
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  )
}
