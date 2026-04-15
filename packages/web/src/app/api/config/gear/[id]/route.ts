import { prisma } from '@/lib/db'
import { NextRequest } from 'next/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const gear = await prisma.gear.findUnique({ where: { id }, include: { eventTypes: true } })
  if (!gear) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json(gear)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { name, midiChannel, color } = body
  const gear = await prisma.gear.update({
    where: { id },
    data: { name, midiChannel: Number(midiChannel), color },
  })
  return Response.json(gear)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.gear.delete({ where: { id } })
  return new Response(null, { status: 204 })
}
