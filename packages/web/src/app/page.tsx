'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface SongSummary {
  id: string
  title: string
  tempo: number
  timeSignature: string
  updatedAt: string
}

type SortDir = 'asc' | 'desc'

interface ImportResult {
  file: string
  status: 'ok' | 'skipped' | 'error'
  message: string
}

interface ImportSummary {
  imported: number
  skipped: number
  errors: number
  results: ImportResult[]
}

export default function SongsPage() {
  const [songs, setSongs] = useState<SongSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null)
  const router = useRouter()

  const displayed = useMemo(() => {
    const q = filter.toLowerCase()
    return songs
      .filter(s => s.title.toLowerCase().includes(q))
      .sort((a, b) => {
        const cmp = a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
        return sortDir === 'asc' ? cmp : -cmp
      })
  }, [songs, filter, sortDir])

  useEffect(() => {
    fetch('/api/songs').then(r => r.json()).then(data => { setSongs(data); setLoading(false) })
  }, [])

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    const displayedIds = displayed.map(s => s.id)
    const allSelected = displayedIds.every(id => selected.has(id))
    if (allSelected) {
      setSelected(prev => {
        const next = new Set(prev)
        for (const id of displayedIds) next.delete(id)
        return next
      })
    } else {
      setSelected(prev => new Set([...prev, ...displayedIds]))
    }
  }

  async function bulkDelete() {
    const count = selected.size
    if (!confirm(`Delete ${count} song${count !== 1 ? 's' : ''}?`)) return
    const res = await fetch('/api/songs', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [...selected] }),
    })
    if (res.ok) {
      setSongs(s => s.filter(x => !selected.has(x.id)))
      setSelected(new Set())
    } else {
      alert('Delete failed')
    }
  }

  async function uploadJson() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.multiple = true
    input.onchange = async () => {
      if (!input.files) return
      const results: ImportResult[] = []
      let imported = 0
      let skipped = 0
      let errors = 0

      const existingTitles = new Set(songs.map(s => s.title))

      for (const file of Array.from(input.files)) {
        try {
          const text = await file.text()
          const parsed = JSON.parse(text)
          const title = parsed.title || file.name.replace(/\.json$/, '')

          if (existingTitles.has(title)) {
            results.push({ file: file.name, status: 'skipped', message: `"${title}" already exists` })
            skipped++
            continue
          }

          const res = await fetch('/api/songs/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title,
              tempo: parsed.tempo ?? 120,
              timeSignature: parsed.timeSignature ?? '4/4',
              sections: parsed.sections ?? [],
            }),
          })
          if (res.ok) {
            const song = await res.json()
            setSongs(s => [{ ...song, updatedAt: song.updatedAt ?? new Date().toISOString() }, ...s])
            existingTitles.add(title)
            imported++
            results.push({ file: file.name, status: 'ok', message: 'Imported successfully' })
          } else {
            const err = await res.json().catch(() => ({ error: 'Unknown error' }))
            results.push({ file: file.name, status: 'error', message: err.error ?? 'Import failed' })
            errors++
          }
        } catch {
          results.push({ file: file.name, status: 'error', message: 'Invalid JSON' })
          errors++
        }
      }

      setImportSummary({ imported, skipped, errors, results })
    }
    input.click()
  }

  async function deleteSong(id: string, title: string) {
    if (!confirm(`Delete "${title}"?`)) return
    await fetch(`/api/songs/${id}`, { method: 'DELETE' })
    setSongs(s => s.filter(x => x.id !== id))
    setSelected(prev => { const next = new Set(prev); next.delete(id); return next })
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
    a.download = `${title.replace(/[^a-z0-9]/gi, '_')}.mid`
    a.click()
    URL.revokeObjectURL(url)
  }

  const allDisplayedSelected = displayed.length > 0 && displayed.every(s => selected.has(s.id))

  const statusIcon = { ok: '✓', skipped: '→', error: '✗' }
  const statusColor = { ok: 'text-emerald-400', skipped: 'text-gray-400', error: 'text-red-400' }

  return (
    <div>
      {/* Import summary modal */}
      {importSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-lg rounded-lg border border-gray-700 bg-gray-900 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
              <h2 className="text-lg font-semibold">Import Summary</h2>
              <button onClick={() => setImportSummary(null)} className="text-gray-400 hover:text-white text-xl leading-none">&times;</button>
            </div>
            <div className="px-5 py-4">
              <div className="flex gap-4 mb-4 text-sm">
                <span className="text-emerald-400">{importSummary.imported} imported</span>
                {importSummary.skipped > 0 && <span className="text-gray-400">{importSummary.skipped} skipped</span>}
                {importSummary.errors > 0 && <span className="text-red-400">{importSummary.errors} failed</span>}
              </div>
              <div className="max-h-64 overflow-y-auto space-y-1.5">
                {importSummary.results.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className={`shrink-0 font-mono ${statusColor[r.status]}`}>{statusIcon[r.status]}</span>
                    <div className="min-w-0">
                      <span className="font-medium text-gray-200">{r.file}</span>
                      {r.status !== 'ok' && <span className="ml-2 text-gray-400">{r.message}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-gray-800 px-5 py-3 flex justify-end">
              <button
                onClick={() => setImportSummary(null)}
                className="rounded bg-indigo-600 px-4 py-1.5 text-sm font-medium hover:bg-indigo-500 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Songs</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={uploadJson}
            className="rounded border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:border-indigo-500 hover:text-white transition-colors"
          >
            Upload JSON
          </button>
          <Link href="/songs/new" className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500 transition-colors">
            + New Song
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400">Loading…</p>
      ) : songs.length === 0 ? (
        <p className="text-gray-400">No songs yet. <Link href="/songs/new" className="text-indigo-400 hover:underline">Create one.</Link></p>
      ) : (
        <>
        <div className="flex items-center gap-3 mb-3">
          <input
            className="flex-1 rounded bg-gray-800 border border-gray-700 px-3 py-1.5 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="Filter songs…"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
          <button
            onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
            className="flex items-center gap-1 rounded border border-gray-700 px-3 py-1.5 text-sm text-gray-300 hover:border-indigo-500 hover:text-white transition-colors"
          >
            A–Z {sortDir === 'asc' ? '↑' : '↓'}
          </button>
        </div>

        {selected.size > 0 && (
          <div className="flex items-center gap-3 mb-3 rounded border border-red-900 bg-red-950/50 px-4 py-2">
            <span className="text-sm text-gray-300">{selected.size} selected</span>
            <button
              onClick={bulkDelete}
              className="rounded bg-red-600 px-3 py-1 text-sm font-medium hover:bg-red-500 transition-colors"
            >
              Delete selected
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Clear selection
            </button>
          </div>
        )}

        {displayed.length === 0 ? (
          <p className="text-sm text-gray-500">No songs match &quot;{filter}&quot;</p>
        ) : (
        <div className="divide-y divide-gray-800 rounded-lg border border-gray-800 bg-gray-900">
          {/* Select all header */}
          <div className="flex items-center gap-3 px-4 py-2 bg-gray-950/50">
            <input
              type="checkbox"
              checked={allDisplayedSelected}
              onChange={toggleSelectAll}
              className="rounded border-gray-600"
            />
            <span className="text-xs text-gray-500">{displayed.length} song{displayed.length !== 1 ? 's' : ''}</span>
          </div>
          {displayed.map(song => (
            <div key={song.id} className={`flex items-center justify-between px-4 py-3 ${selected.has(song.id) ? 'bg-indigo-950/30' : ''}`}>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selected.has(song.id)}
                  onChange={() => toggleSelect(song.id)}
                  className="rounded border-gray-600"
                />
                <div>
                  <Link href={`/songs/${song.id}`} className="font-medium hover:text-indigo-400 transition-colors">{song.title}</Link>
                  <span className="ml-3 text-sm text-gray-400">{song.tempo} BPM · {song.timeSignature}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => generateMidi(song.id, song.title)}
                  className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  ↓ MIDI
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
        </>
      )}
    </div>
  )
}
