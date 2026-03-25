import { prisma } from '@/lib/db'
import { NextRequest } from 'next/server'

interface EventTypeDef {
  slug: string
  label: string
  messageType: string
  ccNumber?: number | null
  ccValue?: number | null
  valueOffset?: number | null
  instrumentOffset?: number | null
  hasParameter?: boolean
}

/** Create a Gear + EventTypes from a GearTemplate */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const channelOverride = body.midiChannel

  const template = await prisma.gearTemplate.findUnique({ where: { id } })
  if (!template) return Response.json({ error: 'Template not found' }, { status: 404 })

  const channel = channelOverride ?? template.midiChannel
  const eventTypes = template.eventTypes as EventTypeDef[]

  const gear = await prisma.gear.create({
    data: { name: template.name, midiChannel: channel, color: template.color },
  })

  // Skip slugs that already exist
  const existingSlugs = new Set(
    (await prisma.eventType.findMany({
      where: { slug: { in: eventTypes.map(et => et.slug) } },
      select: { slug: true },
    })).map(e => e.slug)
  )

  for (const et of eventTypes) {
    if (existingSlugs.has(et.slug)) continue
    await prisma.eventType.create({
      data: {
        slug: et.slug,
        label: et.label,
        gearId: gear.id,
        messageType: et.messageType,
        ccNumber: et.ccNumber ?? null,
        ccValue: et.ccValue ?? null,
        valueOffset: et.valueOffset ?? null,
        instrumentOffset: et.instrumentOffset ?? null,
        hasParameter: et.hasParameter ?? false,
        onSectionChange: et.onSectionChange ?? false,
        onSongEnd: et.onSongEnd ?? false,
      },
    })
  }

  const result = await prisma.gear.findUnique({
    where: { id: gear.id },
    include: { eventTypes: true },
  })
  return Response.json(result, { status: 201 })
}
