import { prisma } from '@/lib/db'
import { NextRequest } from 'next/server'

interface SongEvent {
  event: string
  [key: string]: unknown
}

interface Section {
  events?: SongEvent[]
  [key: string]: unknown
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { title, tempo, timeSignature, sections } = body

  if (!title || !tempo || !timeSignature || !sections) {
    return Response.json({ error: 'title, tempo, timeSignature, and sections required' }, { status: 400 })
  }

  const existing = await prisma.song.findFirst({ where: { title } })
  if (existing) {
    return Response.json({ error: `Song "${title}" already exists` }, { status: 409 })
  }

  // Collect all event slugs referenced in sections
  const referencedSlugs = new Set<string>()
  for (const section of sections as Section[]) {
    for (const ev of section.events ?? []) {
      if (ev.event) referencedSlugs.add(ev.event)
    }
  }

  const warnings: string[] = []

  if (referencedSlugs.size > 0) {
    const existing = await prisma.eventType.findMany({
      where: { slug: { in: [...referencedSlugs] } },
      select: { slug: true },
    })
    const existingSlugs = new Set(existing.map(e => e.slug))

    for (const slug of referencedSlugs) {
      if (!existingSlugs.has(slug)) {
        warnings.push(`Unknown event type "${slug}" — configure gear first`)
      }
    }
  }

  if (warnings.length > 0) {
    return Response.json({ error: warnings.join('; ') }, { status: 422 })
  }

  const song = await prisma.song.create({
    data: { title, tempo: Number(tempo), timeSignature, sections },
  })
  return Response.json(song, { status: 201 })
}
