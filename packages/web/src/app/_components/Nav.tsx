'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/', label: 'Songs', match: (p: string) => p === '/' || p.startsWith('/songs') },
  { href: '/config/gear', label: 'Gear', match: (p: string) => p.startsWith('/config/gear') },
  { href: '/config/events', label: 'Events', match: (p: string) => p.startsWith('/config/events') },
]

export default function Nav() {
  const pathname = usePathname()

  return (
    <nav className="border-b border-gray-800 bg-gray-900">
      <div className="mx-auto max-w-6xl px-4 flex items-center gap-6 h-14">
        <Link href="/" className="text-lg font-bold tracking-tight text-white">midigen</Link>
        {links.map(link => {
          const active = link.match(pathname)
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm transition-colors ${active ? 'text-white border-b-2 border-indigo-500 pb-[15px] pt-[17px]' : 'text-gray-400 hover:text-white'}`}
            >
              {link.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
