import { prisma } from '@/lib/db'
import { NextRequest } from 'next/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const et = await prisma.eventType.findUnique({ where: { id }, include: { gear: true } })
  if (!et) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json(et)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { slug, label, gearId, messageType, ccNumber, ccValue, valueOffset, instrumentOffset, hasParameter, onSectionChange, onSongEnd } = body
  const et = await prisma.eventType.update({
    where: { id },
    data: {
      slug, label, gearId, messageType,
      ccNumber: ccNumber != null ? Number(ccNumber) : null,
      ccValue: ccValue != null ? Number(ccValue) : null,
      valueOffset: valueOffset != null ? Number(valueOffset) : null,
      instrumentOffset: instrumentOffset != null ? Number(instrumentOffset) : null,
      hasParameter: Boolean(hasParameter),
      onSectionChange: Boolean(onSectionChange),
      onSongEnd: Boolean(onSongEnd),
    },
    include: { gear: true },
  })
  return Response.json(et)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.eventType.delete({ where: { id } })
  return new Response(null, { status: 204 })
}
