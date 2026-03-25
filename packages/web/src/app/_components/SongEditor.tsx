'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface SongEvent {
  position: string
  event: string
  parameter?: number
}

interface Section {
  name: string
  length: string
  events: SongEvent[]
}

interface SongForm {
  title: string
  tempo: string
  timeSignature: string
  sections: Section[]
}

interface EventTypeSummary {
  id: string
  slug: string
  label: string
  hasParameter: boolean
  gear: { name: string; color: string | null }
}

interface Props {
  songId?: string
}

const DEFAULT_SONG: SongForm = {
  title: '',
  tempo: '120',
  timeSignature: '4/4',
  sections: [],
}

export default function SongEditor({ songId }: Props) {
  const [form, setForm] = useState<SongForm>(DEFAULT_SONG)
  const [jsonText, setJsonText] = useState('')
  const [jsonView, setJsonView] = useState(false)
  const [jsonError, setJsonError] = useState('')
  const [eventTypes, setEventTypes] = useState<EventTypeSummary[]>([])
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/config/event-types').then(r => r.json()).then(setEventTypes)
  }, [])

  useEffect(() => {
    if (songId) {
      fetch(`/api/songs/${songId}`).then(r => r.json()).then(song => {
        setForm({
          title: song.title,
          tempo: String(song.tempo),
          timeSignature: song.timeSignature,
          sections: (song.sections ?? []).map((s: any) => ({ ...s, events: s.events ?? [] })),
        })
      })
    }
  }, [songId])

  const formToSpec = useCallback(() => ({
    title: form.title,
    tempo: Number(form.tempo),
    timeSignature: form.timeSignature,
    sections: form.sections,
  }), [form])

  useEffect(() => {
    if (jsonView) setJsonText(JSON.stringify(formToSpec(), null, 2))
  }, [jsonView, formToSpec])

  function applyJsonText() {
    try {
      const parsed = JSON.parse(jsonText)
      setForm({
        title: parsed.title ?? '',
        tempo: String(parsed.tempo ?? 120),
        timeSignature: parsed.timeSignature ?? '4/4',
        sections: parsed.sections ?? [],
      })
      setJsonError('')
      setJsonView(false)
    } catch {
      setJsonError('Invalid JSON')
    }
  }

  function addSection() {
    setForm(f => ({ ...f, sections: [...f.sections, { name: '', length: '8.0.0', events: [] }] }))
  }

  function removeSection(i: number) {
    setForm(f => ({ ...f, sections: f.sections.filter((_, j) => j !== i) }))
  }

  function updateSection(i: number, key: keyof Section, value: string) {
    setForm(f => {
      const sections = [...f.sections]
      sections[i] = { ...sections[i], [key]: value }
      return { ...f, sections }
    })
  }

  function addEvent(sectionIdx: number) {
    setForm(f => {
      const sections = [...f.sections]
      sections[sectionIdx] = {
        ...sections[sectionIdx],
        events: [...sections[sectionIdx].events, { position: '1.1.1', event: eventTypes[0]?.slug ?? '' }],
      }
      return { ...f, sections }
    })
  }

  function removeEvent(sectionIdx: number, eventIdx: number) {
    setForm(f => {
      const sections = [...f.sections]
      sections[sectionIdx] = {
        ...sections[sectionIdx],
        events: sections[sectionIdx].events.filter((_, j) => j !== eventIdx),
      }
      return { ...f, sections }
    })
  }

  function updateEvent(sectionIdx: number, eventIdx: number, patch: Partial<SongEvent>) {
    setForm(f => {
      const sections = [...f.sections]
      const events = [...sections[sectionIdx].events]
      events[eventIdx] = { ...events[eventIdx], ...patch }
      sections[sectionIdx] = { ...sections[sectionIdx], events }
      return { ...f, sections }
    })
  }

  async function save() {
    setSaving(true)
    const spec = formToSpec()
    const method = songId ? 'PUT' : 'POST'
    const url = songId ? `/api/songs/${songId}` : '/api/songs'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(spec),
    })
    setSaving(false)
    if (res.ok) {
      const saved = await res.json()
      if (!songId) router.push(`/songs/${saved.id}`)
    } else {
      alert('Save failed')
    }
  }

  async function generateMidi() {
    setGenerating(true)
    const spec = formToSpec()
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(spec),
    })
    setGenerating(false)
    if (!res.ok) { alert('Generation failed'); return }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${form.title.replace(/[^a-z0-9]/gi, '_') || 'song'}.mid`
    a.click()
    URL.revokeObjectURL(url)
  }

  const et = eventTypes.reduce<Record<string, EventTypeSummary>>((acc, e) => { acc[e.slug] = e; return acc }, {})

  return (
    <div className="space-y-6">
      {/* Metadata */}
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-4 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Song Info</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <label className="block text-xs text-gray-400 mb-1">Title</label>
            <input
              className="w-full rounded bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Song title"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Tempo (BPM)</label>
            <input
              type="number"
              className="w-full rounded bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={form.tempo}
              onChange={e => setForm(f => ({ ...f, tempo: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Time Signature</label>
            <input
              className="w-full rounded bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={form.timeSignature}
              onChange={e => setForm(f => ({ ...f, timeSignature: e.target.value }))}
              placeholder="4/4"
            />
          </div>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold flex-1">Sections</h2>
        <button
          onClick={() => setJsonView(v => !v)}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          {jsonView ? 'Form view' : 'JSON view'}
        </button>
      </div>

      {jsonView ? (
        <div className="space-y-2">
          <textarea
            className="w-full h-96 rounded bg-gray-900 border border-gray-700 p-3 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            value={jsonText}
            onChange={e => setJsonText(e.target.value)}
          />
          {jsonError && <p className="text-sm text-red-400">{jsonError}</p>}
          <button onClick={applyJsonText} className="rounded bg-indigo-600 px-3 py-1.5 text-sm hover:bg-indigo-500 transition-colors">
            Apply JSON
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {form.sections.map((section, si) => (
            <div key={si} className="rounded-lg border border-gray-800 bg-gray-900 p-4">
              <div className="flex items-center gap-3 mb-3">
                <input
                  className="flex-1 rounded bg-gray-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  value={section.name}
                  onChange={e => updateSection(si, 'name', e.target.value)}
                  placeholder="Section name (Verse 1, Chorus…)"
                />
                <div className="flex items-center gap-1.5">
                  <label className="text-xs text-gray-400">Length</label>
                  <input
                    className="w-28 rounded bg-gray-800 px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    value={section.length}
                    onChange={e => updateSection(si, 'length', e.target.value)}
                    placeholder="8.0.0"
                  />
                </div>
                <button onClick={() => removeSection(si)} className="text-red-500 hover:text-red-400 text-sm">✕</button>
              </div>

              {/* Events */}
              <div className="space-y-2 pl-2 border-l border-gray-700">
                {(section.events ?? []).map((ev, ei) => {
                  const evType = et[ev.event]
                  return (
                    <div key={ei} className="flex items-center gap-2">
                      <input
                        className="w-24 rounded bg-gray-800 px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        value={ev.position}
                        onChange={e => updateEvent(si, ei, { position: e.target.value })}
                        placeholder="1.1.1"
                      />
                      <select
                        className="flex-1 rounded bg-gray-800 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        value={ev.event}
                        onChange={e => updateEvent(si, ei, { event: e.target.value, parameter: undefined })}
                      >
                        {eventTypes.length === 0 && <option value="">No event types configured</option>}
                        {eventTypes.map(et => (
                          <option key={et.id} value={et.slug}>{et.gear.name} — {et.label}</option>
                        ))}
                      </select>
                      {evType?.hasParameter && (
                        <input
                          type="number"
                          className="w-16 rounded bg-gray-800 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          value={ev.parameter ?? ''}
                          onChange={e => updateEvent(si, ei, { parameter: Number(e.target.value) })}
                          placeholder="param"
                        />
                      )}
                      <button onClick={() => removeEvent(si, ei)} className="text-gray-500 hover:text-red-400 text-sm">✕</button>
                    </div>
                  )
                })}
                <button
                  onClick={() => addEvent(si)}
                  className="text-xs text-gray-500 hover:text-indigo-400 transition-colors"
                >
                  + Add event
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={addSection}
            className="w-full rounded border border-dashed border-gray-700 py-2 text-sm text-gray-500 hover:border-indigo-600 hover:text-indigo-400 transition-colors"
          >
            + Add Section
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={save}
          disabled={saving}
          className="rounded bg-indigo-600 px-5 py-2 text-sm font-medium hover:bg-indigo-500 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={generateMidi}
          disabled={generating}
          className="rounded bg-emerald-700 px-5 py-2 text-sm font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors"
        >
          {generating ? 'Generating…' : '↓ Generate MIDI'}
        </button>
        <button onClick={() => router.push('/')} className="text-sm text-gray-400 hover:text-white transition-colors">
          Cancel
        </button>
      </div>
    </div>
  )
}
