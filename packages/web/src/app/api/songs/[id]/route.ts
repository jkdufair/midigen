import { prisma } from '@/lib/db'
import { NextRequest } from 'next/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const song = await prisma.song.findUnique({ where: { id } })
  if (!song) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json(song)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { title, tempo, timeSignature, tuning, sections, notes } = body
  const normalizedNotes = (typeof notes === 'string' && notes.trim() !== '' && notes.trim() !== '<p></p>')
    ? notes
    : null
  const song = await prisma.song.update({
    where: { id },
    data: { title, tempo: Number(tempo), timeSignature, tuning: tuning ?? null, sections, notes: normalizedNotes },
  })
  return Response.json(song)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.song.delete({ where: { id } })
  return new Response(null, { status: 204 })
}
