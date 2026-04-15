import { prisma } from '@/lib/db'
import { NextRequest } from 'next/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const template = await prisma.gearTemplate.findUnique({ where: { id } })
  if (!template) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json(template)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { name, midiChannel, color, eventTypes } = body
  const template = await prisma.gearTemplate.update({
    where: { id },
    data: {
      ...(name != null && { name }),
      ...(midiChannel != null && { midiChannel: Number(midiChannel) }),
      ...(color !== undefined && { color }),
      ...(eventTypes != null && { eventTypes }),
    },
  })
  return Response.json(template)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.gearTemplate.delete({ where: { id } })
  return Response.json({ ok: true })
}
