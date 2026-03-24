import SongEditor from '@/app/_components/SongEditor'

export default async function EditSongPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Edit Song</h1>
      <SongEditor songId={id} />
    </div>
  )
}
