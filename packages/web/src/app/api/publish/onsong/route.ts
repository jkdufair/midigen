import { prisma } from '@/lib/db'
import { publishMidi } from '@/lib/onsong-client'
import { NextRequest } from 'next/server'
import type { EventTypeConfig, SongSpec } from '@midigen/core'

export async function POST(req: NextRequest) {
  const body = await req.json()

  let spec: SongSpec
  if (body.songId) {
    const song = await prisma.song.findUnique({ where: { id: body.songId } })
    if (!song) return Response.json({ error: 'Song not found' }, { status: 404 })
    spec = {
      title: song.title,
      tempo: song.tempo,
      timeSignature: song.timeSignature,
      sections: song.sections as unknown as SongSpec['sections'],
    }
  } else {
    spec = body as SongSpec
  }

  const eventTypesRaw = await prisma.eventType.findMany({ include: { gear: true } })
  const eventTypes: EventTypeConfig[] = eventTypesRaw.map(et => ({
    slug: et.slug,
    label: et.label,
    midiChannel: et.gear.midiChannel,
    messageType: et.messageType as EventTypeConfig['messageType'],
    ccNumber: et.ccNumber,
    ccValue: et.ccValue,
    valueOffset: et.valueOffset,
    instrumentOffset: et.instrumentOffset,
    hasParameter: et.hasParameter,
  }))

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { generateMidi } = require('@midigen/core')
  const buffer: Buffer = generateMidi(spec, eventTypes)

  try {
    await publishMidi(spec.title, buffer)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return Response.json({ error: message }, { status: 502 })
  }

  return Response.json({ success: true })
}
