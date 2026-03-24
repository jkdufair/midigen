import { prisma } from '@/lib/db'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const gearId = req.nextUrl.searchParams.get('gearId')
  const eventTypes = await prisma.eventType.findMany({
    where: gearId ? { gearId } : undefined,
    include: { gear: true },
    orderBy: [{ gear: { name: 'asc' } }, { label: 'asc' }],
  })
  return Response.json(eventTypes)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { slug, label, gearId, messageType, ccNumber, ccValue, valueOffset, instrumentOffset, hasParameter } = body
  if (!slug || !label || !gearId || !messageType) {
    return Response.json({ error: 'slug, label, gearId, and messageType required' }, { status: 400 })
  }
  const et = await prisma.eventType.create({
    data: {
      slug, label, gearId, messageType,
      ccNumber: ccNumber != null ? Number(ccNumber) : null,
      ccValue: ccValue != null ? Number(ccValue) : null,
      valueOffset: valueOffset != null ? Number(valueOffset) : null,
      instrumentOffset: instrumentOffset != null ? Number(instrumentOffset) : null,
      hasParameter: Boolean(hasParameter),
    },
    include: { gear: true },
  })
  return Response.json(et, { status: 201 })
}
