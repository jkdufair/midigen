import { prisma } from '@/lib/db'

const { gearLibrary } = require('@midigen/core')

interface BuiltinGear {
  key: string
  name: string
  midiChannel: number
  color: string
  eventTypes: unknown[]
}

/** Load built-in gear presets from @midigen/core into the gear template library */
export async function POST() {
  const created: string[] = []

  for (const entry of gearLibrary as BuiltinGear[]) {
    // Skip if a template with same name already exists
    const existing = await prisma.gearTemplate.findFirst({
      where: { name: entry.name },
    })
    if (existing) continue

    await prisma.gearTemplate.create({
      data: {
        name: entry.name,
        midiChannel: entry.midiChannel,
        color: entry.color,
        eventTypes: entry.eventTypes,
      },
    })
    created.push(entry.name)
  }

  return Response.json({ loaded: created })
}
