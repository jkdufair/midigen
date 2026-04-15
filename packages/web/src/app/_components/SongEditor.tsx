'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import RichTextEditor from './RichTextEditor'

interface SongEvent {
  position: string
  event: string
  parameter?: number
}

interface Section {
  name: string
  length: string
  timeSignature?: string
  events: SongEvent[]
}

interface SongForm {
  title: string
  tempo: string
  timeSignature: string
  /** Semitone offsets from standard tuning; index 0 = string 6 (low E), index 5 = string 1 (high E) */
  tuning: number[]
  sections: Section[]
  notes: string
}

// Variax tuning helpers
const NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
const STANDARD_STRING_MIDI = [40, 45, 50, 55, 59, 64]
const STRING_LABELS = ['Low E', 'A', 'D', 'G', 'B', 'High E']

function getTuningOptions(stringIdx: number) {
  return Array.from({ length: 25 }, (_, i) => {
    const offset = 12 - i
    const midi = STANDARD_STRING_MIDI[stringIdx] + offset
    const noteName = NOTE_NAMES[((midi % 12) + 12) % 12]
    const sign = offset > 0 ? '+' : ''
    return { value: offset, label: `${noteName} (${sign}${offset})` }
  })
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
  tuning: [0, 0, 0, 0, 0, 0],
  sections: [],
  notes: '',
}

// --- Sortable section wrapper ---

interface SortableSectionProps {
  id: string
  children: (dragHandleProps: React.HTMLAttributes<HTMLElement>) => React.ReactNode
}

function SortableSection({ id, children }: SortableSectionProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative',
    zIndex: isDragging ? 10 : undefined,
  }
  return (
    <div ref={setNodeRef} style={style}>
      {children({ ...attributes, ...listeners })}
    </div>
  )
}

// --- Insert-between button ---

interface InsertButtonProps {
  onClick: () => void
}

function InsertBetweenButton({ onClick }: InsertButtonProps) {
  return (
    <div className="flex items-center gap-2 px-2 py-2">
      <div className="flex-1 h-px bg-gray-800" />
      <button
        onClick={onClick}
        className="text-xs text-gray-600 hover:text-indigo-400 hover:border-indigo-600 border border-gray-700 rounded px-2 py-0.5 transition-colors leading-none"
        title="Insert section here"
      >
        + insert
      </button>
      <div className="flex-1 h-px bg-gray-800" />
    </div>
  )
}

// --- Main editor ---

export default function SongEditor({ songId }: Props) {
  const [form, setForm] = useState<SongForm>(DEFAULT_SONG)
  const [jsonText, setJsonText] = useState('')
  const [jsonView, setJsonView] = useState(false)
  const [jsonError, setJsonError] = useState('')
  const [eventTypes, setEventTypes] = useState<EventTypeSummary[]>([])
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [publishStatus, setPublishStatus] = useState<{ ok: boolean; message: string } | null>(null)
  const router = useRouter()

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

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
          tuning: Array.isArray(song.tuning) ? song.tuning : [0, 0, 0, 0, 0, 0],
          sections: (song.sections ?? []).map((s: Section) => ({ ...s, events: s.events ?? [] })),
          notes: song.notes ?? '',
        })
      })
    }
  }, [songId])

  const formToSpec = useCallback(() => ({
    title: form.title,
    tempo: Number(form.tempo),
    timeSignature: form.timeSignature,
    tuning: form.tuning,
    sections: form.sections,
    notes: form.notes,
  }), [form])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (jsonView) setJsonText(JSON.stringify(formToSpec(), null, 2))
  }, [jsonView, formToSpec])

  function applyJsonText() {
    try {
      const parsed = JSON.parse(jsonText)
      setForm(f => ({
        title: parsed.title ?? '',
        tempo: String(parsed.tempo ?? 120),
        timeSignature: parsed.timeSignature ?? '4/4',
        tuning: Array.isArray(parsed.tuning) ? parsed.tuning : [0, 0, 0, 0, 0, 0],
        sections: parsed.sections ?? [],
        notes: f.notes,
      }))
      setJsonError('')
      setJsonView(false)
    } catch {
      setJsonError('Invalid JSON')
    }
  }

  function insertSectionAt(index: number) {
    setForm(f => {
      const sections = [...f.sections]
      sections.splice(index, 0, { name: '', length: '8.0.0', events: [] })
      return { ...f, sections }
    })
  }

  function removeSection(i: number) {
    setForm(f => ({ ...f, sections: f.sections.filter((_, j) => j !== i) }))
  }

  function updateSection(i: number, key: keyof Section, value: string) {
    setForm(f => {
      const sections = [...f.sections]
      sections[i] = { ...sections[i], [key]: value }
      if (key === 'length') {
        const [newBars] = value.split('.').map(Number)
        if (newBars > 0) {
          sections[i] = {
            ...sections[i],
            events: sections[i].events.map(ev => {
              const [bar, beat, sub] = ev.position.split('.')
              if (Number(bar) > newBars) return { ...ev, position: `${newBars}.${beat}.${sub}` }
              return ev
            }),
          }
        }
      }
      return { ...f, sections }
    })
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setForm(f => {
      const oldIndex = f.sections.findIndex((_, i) => String(i) === active.id)
      const newIndex = f.sections.findIndex((_, i) => String(i) === over.id)
      if (oldIndex === -1 || newIndex === -1) return f
      return { ...f, sections: arrayMove(f.sections, oldIndex, newIndex) }
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
    a.download = `${form.title || 'song'}.mid`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function publishToOnsong() {
    setPublishing(true)
    setPublishStatus(null)
    const spec = formToSpec()
    const res = await fetch('/api/publish/onsong', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(spec),
    })
    setPublishing(false)
    const data = await res.json()
    if (res.ok) {
      setPublishStatus({ ok: true, message: 'Sent to OnSong!' })
      setTimeout(() => setPublishStatus(null), 3000)
    } else {
      setPublishStatus({ ok: false, message: data.error ?? 'Publish failed' })
    }
  }

  const et = eventTypes.reduce<Record<string, EventTypeSummary>>((acc, e) => { acc[e.slug] = e; return acc }, {})

  // Stable IDs for DnD — we use index as string since sections have no db id in state.
  // arrayMove keeps ordering correct; IDs are re-derived after each render.
  const sectionIds = form.sections.map((_, i) => String(i))

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
        <div>
          <label className="block text-xs text-gray-400 mb-1">Tuning (Variax)</label>
          <div className="grid grid-cols-6 gap-2">
            {STRING_LABELS.map((label, idx) => (
              <div key={idx}>
                <div className="text-[10px] text-gray-500 text-center mb-0.5">{label}</div>
                <select
                  className="w-full rounded bg-gray-800 px-1 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  value={form.tuning[idx] ?? 0}
                  onChange={e => {
                    const newTuning = [...form.tuning]
                    newTuning[idx] = Number(e.target.value)
                    setForm(f => ({ ...f, tuning: newTuning }))
                  }}
                >
                  {getTuningOptions(idx).map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            ))}
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
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-1">
              {form.sections.map((section, si) => (
                <div key={si}>
                  {si === 0 && (
                    <InsertBetweenButton onClick={() => insertSectionAt(0)} />
                  )}
                  <SortableSection id={String(si)}>
                    {(dragHandleProps) => (
                      <div className="rounded-lg border border-gray-800 bg-gray-900 p-4 my-1">
                        <div className="flex items-center gap-3 mb-3">
                          {/* Drag handle */}
                          <span
                            {...dragHandleProps}
                            className="cursor-grab active:cursor-grabbing text-gray-600 hover:text-gray-400 select-none px-0.5 touch-none"
                            title="Drag to reorder"
                          >
                            ⣿
                          </span>
                          <input
                            className="flex-1 rounded bg-gray-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            value={section.name}
                            onChange={e => updateSection(si, 'name', e.target.value)}
                            placeholder="Section name (Verse 1, Chorus…)"
                          />
                          <div className="flex items-center gap-1">
                            <label className="text-xs text-gray-400 mr-1">Length</label>
                            {(() => {
                              const [bars = '8', beats = '0', subs = '0'] = section.length.split('.')
                              const setLen = (b: string, bt: string, s: string) => updateSection(si, 'length', `${b}.${bt}.${s}`)
                              return (<>
                                <div className="flex flex-col items-center">
                                  <input type="number" min={0} className="w-12 rounded bg-gray-800 px-1.5 py-1.5 text-sm font-mono text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    value={bars} onChange={e => setLen(e.target.value, beats, subs)} />
                                  <span className="text-[10px] text-gray-500">bar</span>
                                </div>
                                <span className="text-gray-600 font-mono">.</span>
                                <div className="flex flex-col items-center">
                                  <input type="number" min={0} className="w-12 rounded bg-gray-800 px-1.5 py-1.5 text-sm font-mono text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    value={beats} onChange={e => setLen(bars, e.target.value, subs)} />
                                  <span className="text-[10px] text-gray-500">beat</span>
                                </div>
                                <span className="text-gray-600 font-mono">.</span>
                                <div className="flex flex-col items-center">
                                  <input type="number" min={0} className="w-12 rounded bg-gray-800 px-1.5 py-1.5 text-sm font-mono text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    value={subs} onChange={e => setLen(bars, beats, e.target.value)} />
                                  <span className="text-[10px] text-gray-500">sub</span>
                                </div>
                              </>)
                            })()}
                          </div>
                          <div className="flex flex-col items-center">
                            <input
                              className="w-14 rounded bg-gray-800 px-1.5 py-1.5 text-sm font-mono text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              value={section.timeSignature ?? ''}
                              onChange={e => {
                                const val = e.target.value
                                setForm(f => {
                                  const sections = [...f.sections]
                                  const { timeSignature: _, ...rest } = sections[si]
                                  sections[si] = val ? { ...rest, timeSignature: val } : rest as Section
                                  return { ...f, sections }
                                })
                              }}
                              placeholder={form.timeSignature}
                            />
                            <span className="text-[10px] text-gray-500">time sig</span>
                          </div>
                          <button onClick={() => removeSection(si)} className="text-red-500 hover:text-red-400 text-sm">✕</button>
                        </div>

                        {/* Events */}
                        <div className="space-y-2 pl-2 border-l border-gray-700">
                          {(section.events ?? []).map((ev, ei) => {
                            const evType = et[ev.event]
                            const [sectionBars] = section.length.split('.').map(Number)
                            const [evBar] = ev.position.split('.').map(Number)
                            const outOfBounds = evBar > sectionBars
                            return (
                              <div key={ei} className={`flex items-center gap-2${outOfBounds ? ' ring-1 ring-red-500/50 rounded px-1 -mx-1' : ''}`}>
                                {(() => {
                                  const [bar = '1', beat = '1', sub = '1'] = ev.position.split('.')
                                  const setPos = (b: string, bt: string, s: string) => updateEvent(si, ei, { position: `${b}.${bt}.${s}` })
                                  return (
                                    <div className="flex items-center gap-0.5 shrink-0">
                                      <input type="number" min={1} max={sectionBars} className={`w-10 rounded bg-gray-800 px-1 py-1 text-xs font-mono text-center focus:outline-none focus:ring-1 focus:ring-indigo-500${outOfBounds ? ' text-red-400' : ''}`}
                                        value={bar} onChange={e => setPos(e.target.value, beat, sub)} title="Bar" />
                                      <span className="text-gray-600 font-mono text-xs">.</span>
                                      <input type="number" min={1} className="w-10 rounded bg-gray-800 px-1 py-1 text-xs font-mono text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                        value={beat} onChange={e => setPos(bar, e.target.value, sub)} title="Beat" />
                                      <span className="text-gray-600 font-mono text-xs">.</span>
                                      <input type="number" min={1} className="w-10 rounded bg-gray-800 px-1 py-1 text-xs font-mono text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                        value={sub} onChange={e => setPos(bar, beat, e.target.value)} title="Sub" />
                                    </div>
                                  )
                                })()}
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
                    )}
                  </SortableSection>
                  <InsertBetweenButton onClick={() => insertSectionAt(si + 1)} />
                </div>
              ))}

            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* TODO / Notes */}
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-4 space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">TODO / Notes</h2>
        <RichTextEditor
          value={form.notes}
          onChange={html => setForm(f => ({ ...f, notes: html }))}
        />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
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
        <button
          onClick={publishToOnsong}
          disabled={publishing}
          className="rounded bg-sky-700 px-5 py-2 text-sm font-medium hover:bg-sky-600 disabled:opacity-50 transition-colors"
        >
          {publishing ? 'Publishing…' : '→ OnSong'}
        </button>
        {publishStatus && (
          <span className={`text-sm ${publishStatus.ok ? 'text-emerald-400' : 'text-red-400'}`}>
            {publishStatus.message}
          </span>
        )}
        <button onClick={() => router.push('/')} className="text-sm text-gray-400 hover:text-white transition-colors">
          Cancel
        </button>
      </div>
    </div>
  )
}
