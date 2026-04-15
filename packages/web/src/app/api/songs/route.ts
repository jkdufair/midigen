import { prisma } from '@/lib/db'
import { NextRequest } from 'next/server'

export async function GET() {
  const songs = await prisma.song.findMany({
    select: { id: true, title: true, tempo: true, timeSignature: true, createdAt: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
  })
  return Response.json(songs)
}

export async function DELETE(req: NextRequest) {
  const { ids } = await req.json()
  if (!Array.isArray(ids) || ids.length === 0) {
    return Response.json({ error: 'ids array required' }, { status: 400 })
  }
  const { count } = await prisma.song.deleteMany({ where: { id: { in: ids } } })
  return Response.json({ deleted: count })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { title, tempo, timeSignature, sections, notes } = body
  if (!title || !tempo || !timeSignature || !sections) {
    return Response.json({ error: 'title, tempo, timeSignature, and sections required' }, { status: 400 })
  }
  const song = await prisma.song.create({
    data: { title, tempo: Number(tempo), timeSignature, sections, notes: notes ?? null },
  })
  return Response.json(song, { status: 201 })
}
