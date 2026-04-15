'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type MessageType = 'CC' | 'CC_PARAM_VALUE' | 'PC'

interface EventTypeDef {
  slug: string
  label: string
  messageType: MessageType
  ccNumber?: number | null
  ccValue?: number | null
  valueOffset?: number | null
  instrumentOffset?: number | null
  hasParameter: boolean
  onSectionChange?: boolean
  onSongEnd?: boolean
}

interface GearTemplate {
  id: string
  name: string
  midiChannel: number
  color: string | null
  eventTypes: EventTypeDef[]
}

interface EventForm {
  slug: string
  label: string
  messageType: MessageType
  ccNumber: string
  ccValue: string
  valueOffset: string
  instrumentOffset: string
  hasParameter: boolean
  onSectionChange: boolean
  onSongEnd: boolean
}

const EMPTY_EVENT: EventForm = {
  slug: '', label: '', messageType: 'CC',
  ccNumber: '0', ccValue: '127', valueOffset: '0', instrumentOffset: '0', hasParameter: false,
  onSectionChange: false, onSongEnd: false,
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function eventFormToDef(f: EventForm): EventTypeDef {
  return {
    slug: f.slug,
    label: f.label,
    messageType: f.messageType,
    ccNumber: f.messageType !== 'PC' ? Number(f.ccNumber) : null,
    ccValue: f.messageType === 'CC' ? Number(f.ccValue) : null,
    valueOffset: f.messageType === 'CC_PARAM_VALUE' ? Number(f.valueOffset) : null,
    instrumentOffset: f.messageType === 'PC' ? Number(f.instrumentOffset) : null,
    hasParameter: f.hasParameter,
    onSectionChange: f.onSectionChange || undefined,
    onSongEnd: f.onSongEnd || undefined,
  }
}

function defToEventForm(d: EventTypeDef): EventForm {
  return {
    slug: d.slug,
    label: d.label,
    messageType: d.messageType,
    ccNumber: String(d.ccNumber ?? 0),
    ccValue: String(d.ccValue ?? 127),
    valueOffset: String(d.valueOffset ?? 0),
    instrumentOffset: String(d.instrumentOffset ?? 0),
    hasParameter: d.hasParameter,
    onSectionChange: d.onSectionChange ?? false,
    onSongEnd: d.onSongEnd ?? false,
  }
}

export default function GearLibraryPage() {
  const [templates, setTemplates] = useState<GearTemplate[]>([])
  const [editing, setEditing] = useState<string | null>(null) // template id or 'new'
  const [name, setName] = useState('')
  const [midiChannel, setMidiChannel] = useState('1')
  const [color, setColor] = useState('#6366f1')
  const [events, setEvents] = useState<EventForm[]>([])
  const [saving, setSaving] = useState(false)
  const [loadingBuiltins, setLoadingBuiltins] = useState(false)

  function load() {
    fetch('/api/config/gear/library').then(r => r.json()).then(setTemplates)
  }
  useEffect(load, [])

  function startNew() {
    setEditing('new')
    setName('')
    setMidiChannel('1')
    setColor('#6366f1')
    setEvents([])
  }

  function startEdit(t: GearTemplate) {
    setEditing(t.id)
    setName(t.name)
    setMidiChannel(String(t.midiChannel))
    setColor(t.color ?? '#6366f1')
    setEvents(t.eventTypes.map(defToEventForm))
  }

  function addEvent() {
    setEvents(es => [...es, { ...EMPTY_EVENT }])
  }

  function removeEvent(i: number) {
    setEvents(es => es.filter((_, j) => j !== i))
  }

  function updateEvent(i: number, patch: Partial<EventForm>) {
    setEvents(es => {
      const copy = [...es]
      const updated = { ...copy[i], ...patch }
      // Auto-slug from label for new events
      if (patch.label && copy[i].slug === slugify(copy[i].label)) {
        updated.slug = slugify(patch.label)
      }
      copy[i] = updated
      return copy
    })
  }

  async function save() {
    setSaving(true)
    const body = {
      name,
      midiChannel: Number(midiChannel),
      color,
      eventTypes: events.map(eventFormToDef),
    }
    const res = editing === 'new'
      ? await fetch('/api/config/gear/library', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      : await fetch(`/api/config/gear/library/${editing}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setSaving(false)
    if (res.ok) { setEditing(null); load() } else alert('Save failed')
  }

  async function deleteTemplate(id: string, tName: string) {
    if (!confirm(`Delete "${tName}" from gear library?`)) return
    await fetch(`/api/config/gear/library/${id}`, { method: 'DELETE' })
    load()
  }

  async function provision(id: string) {
    const res = await fetch(`/api/config/gear/library/${id}/provision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    if (res.ok) alert('Gear added to your config!')
    else alert('Failed to provision gear')
  }

  async function loadBuiltins() {
    setLoadingBuiltins(true)
    const res = await fetch('/api/config/gear/library/load-builtins', { method: 'POST' })
    setLoadingBuiltins(false)
    if (res.ok) {
      const { loaded } = await res.json()
      if (loaded.length > 0) {
        load()
      } else {
        alert('All built-in presets are already loaded')
      }
    }
  }

  const msgTypeLabel: Record<MessageType, string> = {
    CC: 'CC (fixed)',
    CC_PARAM_VALUE: 'CC (param→value)',
    PC: 'Program Change',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Gear Library</h1>
          <p className="text-sm text-gray-400 mt-1">
            Reusable gear templates. <Link href="/config/gear" className="text-indigo-400 hover:underline">Back to Gear Config</Link>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadBuiltins} disabled={loadingBuiltins}
            className="rounded border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:border-indigo-500 hover:text-white transition-colors disabled:opacity-50">
            {loadingBuiltins ? 'Loading…' : 'Load Built-ins'}
          </button>
          <button onClick={startNew} className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500 transition-colors">
            + New Template
          </button>
        </div>
      </div>

      {editing && (
        <div className="rounded-lg border border-indigo-700 bg-gray-900 p-4 mb-6 space-y-4">
          <h2 className="text-sm font-semibold text-indigo-300">{editing === 'new' ? 'New Gear Template' : 'Edit Gear Template'}</h2>

          {/* Gear metadata */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Name</label>
              <input className="w-full rounded bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Helix" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Default MIDI Channel (1–16)</label>
              <input type="number" min={1} max={16} className="w-full rounded bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={midiChannel} onChange={e => setMidiChannel(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Color</label>
              <div className="flex items-center gap-2">
                <input type="color" className="h-9 w-9 rounded cursor-pointer bg-transparent border-0"
                  value={color} onChange={e => setColor(e.target.value)} />
                <input className="flex-1 rounded bg-gray-800 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  value={color} onChange={e => setColor(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Event types */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-400">Event Types</h3>
              <button onClick={addEvent} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">+ Add Event Type</button>
            </div>
            <div className="space-y-2">
              {events.map((ev, i) => (
                <div key={i} className="rounded border border-gray-800 bg-gray-950 p-3">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Label</label>
                      <input className="w-full rounded bg-gray-800 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        value={ev.label} onChange={e => updateEvent(i, { label: e.target.value })} placeholder="Harmony On" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Slug</label>
                      <input className="w-full rounded bg-gray-800 px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        value={ev.slug} onChange={e => updateEvent(i, { slug: e.target.value })} placeholder="harmony-on" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Message Type</label>
                      <select className="w-full rounded bg-gray-800 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        value={ev.messageType} onChange={e => updateEvent(i, { messageType: e.target.value as MessageType })}>
                        <option value="CC">CC (fixed value)</option>
                        <option value="CC_PARAM_VALUE">CC (value = parameter)</option>
                        <option value="PC">Program Change</option>
                      </select>
                    </div>
                    <div className="flex items-end gap-2">
                      {ev.messageType !== 'PC' && (
                        <div className="flex-1">
                          <label className="block text-xs text-gray-500 mb-1">CC#</label>
                          <input type="number" min={0} max={127} className="w-full rounded bg-gray-800 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            value={ev.ccNumber} onChange={e => updateEvent(i, { ccNumber: e.target.value })} />
                        </div>
                      )}
                      {ev.messageType === 'CC' && (
                        <div className="flex-1">
                          <label className="block text-xs text-gray-500 mb-1">Value</label>
                          <input type="number" min={0} max={127} className="w-full rounded bg-gray-800 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            value={ev.ccValue} onChange={e => updateEvent(i, { ccValue: e.target.value })} />
                        </div>
                      )}
                      {ev.messageType === 'CC_PARAM_VALUE' && (
                        <div className="flex-1">
                          <label className="block text-xs text-gray-500 mb-1">Offset</label>
                          <input type="number" className="w-full rounded bg-gray-800 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            value={ev.valueOffset} onChange={e => updateEvent(i, { valueOffset: e.target.value })} />
                        </div>
                      )}
                      {ev.messageType === 'PC' && (
                        <div className="flex-1">
                          <label className="block text-xs text-gray-500 mb-1">Inst Offset</label>
                          <input type="number" className="w-full rounded bg-gray-800 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            value={ev.instrumentOffset} onChange={e => updateEvent(i, { instrumentOffset: e.target.value })} />
                        </div>
                      )}
                      <button onClick={() => removeEvent(i)} className="pb-1.5 text-red-500 hover:text-red-400 text-sm">✕</button>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-4">
                    <label className="inline-flex items-center gap-2 text-sm text-gray-400">
                      <input type="checkbox" checked={ev.hasParameter} onChange={e => updateEvent(i, { hasParameter: e.target.checked })} className="rounded" />
                      Has parameter
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm text-gray-400">
                      <input type="checkbox" checked={ev.onSectionChange} onChange={e => updateEvent(i, { onSectionChange: e.target.checked })} className="rounded" />
                      On section change
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm text-gray-400">
                      <input type="checkbox" checked={ev.onSongEnd} onChange={e => updateEvent(i, { onSongEnd: e.target.checked })} className="rounded" />
                      On song end
                    </label>
                  </div>
                </div>
              ))}
              {events.length === 0 && <p className="text-sm text-gray-500">No event types yet. Click "+ Add Event Type" above.</p>}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={save} disabled={saving} className="rounded bg-indigo-600 px-4 py-1.5 text-sm hover:bg-indigo-500 disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : 'Save Template'}
            </button>
            <button onClick={() => setEditing(null)} className="text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* Template list */}
      <div className="space-y-3">
        {templates.length === 0 && (
          <p className="text-sm text-gray-400">No gear templates yet. Click "Load Built-ins" to import presets or create your own.</p>
        )}
        {templates.map(t => (
          <div key={t.id} className="rounded-lg border border-gray-800 bg-gray-900">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: t.color ?? '#6366f1' }} />
                <span className="font-medium">{t.name}</span>
                <span className="text-sm text-gray-400">Ch {t.midiChannel}</span>
                <span className="text-xs text-gray-500">{t.eventTypes.length} event{t.eventTypes.length !== 1 ? 's' : ''}</span>
                <span className="text-xs text-gray-600 font-mono">{t.id.slice(0, 8)}…</span>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => provision(t.id)} className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
                  Add to Gear
                </button>
                <button onClick={() => startEdit(t)} className="text-sm text-gray-400 hover:text-white transition-colors">Edit</button>
                <button onClick={() => deleteTemplate(t.id, t.name)} className="text-sm text-red-500 hover:text-red-400 transition-colors">Delete</button>
              </div>
            </div>
            <div className="px-4 pb-3 flex flex-wrap gap-1.5">
              {t.eventTypes.map(et => (
                <span key={et.slug} className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-400 font-mono">
                  {et.slug} <span className="text-gray-600">{msgTypeLabel[et.messageType]}</span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
