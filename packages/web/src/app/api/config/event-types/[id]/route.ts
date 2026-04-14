import { prisma } from '@/lib/db'
import { NextRequest } from 'next/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const et = await prisma.eventType.findUnique({ where: { id }, include: { gear: true } })
  if (!et) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json(et)
}

interface SongEvent { position: string; event: string; parameter?: number }
interface Section { name: string; length: string; events?: SongEvent[] }

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { slug, label, gearId, messageType, ccNumber, ccValue, valueOffset, instrumentOffset, hasParameter, onSectionChange, onSongEnd, isTimeSignatureCarrier } = body

  const data = {
    slug, label, gearId, messageType,
    ccNumber: ccNumber != null ? Number(ccNumber) : null,
    ccValue: ccValue != null ? Number(ccValue) : null,
    valueOffset: valueOffset != null ? Number(valueOffset) : null,
    instrumentOffset: instrumentOffset != null ? Number(instrumentOffset) : null,
    hasParameter: Boolean(hasParameter),
    onSectionChange: Boolean(onSectionChange),
    onSongEnd: Boolean(onSongEnd),
    isTimeSignatureCarrier: Boolean(isTimeSignatureCarrier),
  }

  const current = await prisma.eventType.findUnique({ where: { id } })
  if (!current) return Response.json({ error: 'Not found' }, { status: 404 })

  const slugChanged = slug != null && slug !== current.slug

  if (!slugChanged) {
    const et = await prisma.eventType.update({ where: { id }, data, include: { gear: true } })
    return Response.json(et)
  }

  // Slug changed: update event type + cascade to songs in a transaction
  const et = await prisma.$transaction(async (tx) => {
    const updated = await tx.eventType.update({ where: { id }, data, include: { gear: true } })

    const songs = await tx.song.findMany()
    for (const song of songs) {
      const sections = song.sections as Section[]
      let modified = false
      for (const section of sections) {
        for (const ev of section.events ?? []) {
          if (ev.event === current.slug) {
            ev.event = slug
            modified = true
          }
        }
      }
      if (modified) {
        await tx.song.update({ where: { id: song.id }, data: { sections } })
      }
    }

    return updated
  })

  return Response.json(et)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.eventType.delete({ where: { id } })
  return new Response(null, { status: 204 })
}
