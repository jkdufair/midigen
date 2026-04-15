import { prisma } from '@/lib/db'
import { NextRequest } from 'next/server'

export async function GET() {
  const templates = await prisma.gearTemplate.findMany({
    orderBy: { name: 'asc' },
  })
  return Response.json(templates)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, midiChannel, color, eventTypes } = body

  if (!name || !midiChannel || !Array.isArray(eventTypes)) {
    return Response.json({ error: 'name, midiChannel, and eventTypes required' }, { status: 400 })
  }

  const template = await prisma.gearTemplate.create({
    data: { name, midiChannel: Number(midiChannel), color: color ?? null, eventTypes },
  })
  return Response.json(template, { status: 201 })
}
