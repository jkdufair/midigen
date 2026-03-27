'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface SongSummary {
  id: string
  title: string
  tempo: number
  timeSignature: string
  updatedAt: string
}

export default function SongsPage() {
  const [songs, setSongs] = useState<SongSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [publishingId, setPublishingId] = useState<string | null>(null)
  const [publishStatus, setPublishStatus] = useState<{ id: string; ok: boolean; message: string } | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/songs').then(r => r.json()).then(data => { setSongs(data); setLoading(false) })
  }, [])

  async function deleteSong(id: string, title: string) {
    if (!confirm(`Delete "${title}"?`)) return
    await fetch(`/api/songs/${id}`, { method: 'DELETE' })
    setSongs(s => s.filter(x => x.id !== id))
  }

  async function generateMidi(id: string, title: string) {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songId: id }),
    })
    if (!res.ok) { alert('Generation failed'); return }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title}.mid`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function publishToOnsong(id: string) {
    setPublishingId(id)
    setPublishStatus(null)
    const res = await fetch('/api/publish/onsong', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songId: id }),
    })
    setPublishingId(null)
    const data = await res.json()
    if (res.ok) {
      setPublishStatus({ id, ok: true, message: 'Sent!' })
      setTimeout(() => setPublishStatus(null), 3000)
    } else {
      setPublishStatus({ id, ok: false, message: data.error ?? 'Publish failed' })
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Songs</h1>
        <Link href="/songs/new" className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500 transition-colors">
          + New Song
        </Link>
      </div>

      {loading ? (
        <p className="text-gray-400">Loading…</p>
      ) : songs.length === 0 ? (
        <p className="text-gray-400">No songs yet. <Link href="/songs/new" className="text-indigo-400 hover:underline">Create one.</Link></p>
      ) : (
        <div className="divide-y divide-gray-800 rounded-lg border border-gray-800 bg-gray-900">
          {songs.map(song => (
            <div key={song.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <span className="font-medium">{song.title}</span>
                <span className="ml-3 text-sm text-gray-400">{song.tempo} BPM · {song.timeSignature}</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => generateMidi(song.id, song.title)}
                  className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  ↓ MIDI
                </button>
                <button
                  onClick={() => publishToOnsong(song.id)}
                  disabled={publishingId === song.id}
                  className="text-sm text-sky-400 hover:text-sky-300 disabled:opacity-50 transition-colors"
                >
                  {publishingId === song.id ? 'Publishing…' : '→ OnSong'}
                </button>
                {publishStatus?.id === song.id && (
                  <span className={`text-sm ${publishStatus.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                    {publishStatus.message}
                  </span>
                )}
                <button
                  onClick={() => router.push(`/songs/${song.id}`)}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteSong(song.id, song.title)}
                  className="text-sm text-red-500 hover:text-red-400 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
