import { prisma } from '@/lib/db'
import { NextRequest } from 'next/server'

export async function GET() {
  const gear = await prisma.gear.findMany({
    include: { _count: { select: { eventTypes: true } } },
    orderBy: { name: 'asc' },
  })
  return Response.json(gear)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, midiChannel, color } = body
  if (!name || !midiChannel) {
    return Response.json({ error: 'name and midiChannel required' }, { status: 400 })
  }
  const gear = await prisma.gear.create({ data: { name, midiChannel: Number(midiChannel), color } })
  return Response.json(gear, { status: 201 })
}
