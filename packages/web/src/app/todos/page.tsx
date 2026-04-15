'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import RichTextEditor from '@/app/_components/RichTextEditor'

interface SongWithNotes {
  id: string
  title: string
  notes: string | null
}

export default function TodosPage() {
  const [songs, setSongs] = useState<SongWithNotes[]>([])
  const [globalContent, setGlobalContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/songs?withNotes=1').then(r => r.json()),
      fetch('/api/global-note').then(r => r.json()),
    ]).then(([songsData, noteData]) => {
      setSongs(songsData)
      setGlobalContent(noteData.content ?? '')
      setLoading(false)
    })
  }, [])

  const saveGlobal = useCallback(async () => {
    setSaving(true)
    await fetch('/api/global-note', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: globalContent }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [globalContent])

  const songsWithNotes = songs.filter(s => s.notes && s.notes.trim() !== '' && s.notes !== '<p></p>')

  if (loading) {
    return <p className="text-gray-400">Loading…</p>
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold mb-6">Todos</h1>

        {/* Global todos section */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-200">Global Notes</h2>
            <button
              onClick={saveGlobal}
              disabled={saving}
              className="rounded bg-indigo-600 px-4 py-1.5 text-sm font-medium hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : saved ? 'Saved' : 'Save'}
            </button>
          </div>
          <RichTextEditor value={globalContent} onChange={setGlobalContent} />
        </section>

        {/* Song todos section */}
        <section>
          <h2 className="text-lg font-semibold text-gray-200 mb-3">Song Notes</h2>
          {songsWithNotes.length === 0 ? (
            <p className="text-sm text-gray-500">No song notes yet. Add notes to a song to see them here.</p>
          ) : (
            <div className="space-y-4">
              {songsWithNotes.map(song => (
                <div key={song.id} className="rounded-lg border border-gray-800 bg-gray-900">
                  <div className="flex items-center justify-between border-b border-gray-800 px-4 py-2.5">
                    <Link
                      href={`/songs/${song.id}`}
                      className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      {song.title}
                    </Link>
                    <Link
                      href={`/songs/${song.id}`}
                      className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      Edit →
                    </Link>
                  </div>
                  <div
                    className="px-4 py-3 text-sm text-gray-300 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_strong]:font-semibold [&_em]:italic [&_p]:mb-1 last:[&_p]:mb-0"
                    dangerouslySetInnerHTML={{ __html: song.notes! }}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
