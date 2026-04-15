import { prisma } from '@/lib/db'
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
    onSectionChange: et.onSectionChange,
    onSongEnd: et.onSongEnd,
    isTimeSignatureCarrier: et.isTimeSignatureCarrier,
  }))

  // generateMidi is a CommonJS module — import dynamically to avoid ESM/CJS conflict
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { generateMidi } = require('@midigen/core')
  const buffer: Buffer = generateMidi(spec, eventTypes)

  const filename = `${spec.title.replace(/[^a-z0-9]/gi, '_')}.mid`
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'audio/midi',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
