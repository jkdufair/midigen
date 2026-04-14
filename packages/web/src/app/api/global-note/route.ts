import { prisma } from '@/lib/db'
import { NextRequest } from 'next/server'

export async function GET() {
  const note = await prisma.globalNote.upsert({
    where: { id: 'global' },
    update: {},
    create: { id: 'global', content: '' },
  })
  return Response.json(note)
}

export async function PUT(req: NextRequest) {
  const { content } = await req.json()
  const note = await prisma.globalNote.upsert({
    where: { id: 'global' },
    update: { content: content ?? '' },
    create: { id: 'global', content: content ?? '' },
  })
  return Response.json(note)
}
