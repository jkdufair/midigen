'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

type MessageType = 'CC' | 'CC_PARAM_VALUE' | 'PC'

interface EventTypeItem {
  id: string
  slug: string
  label: string
  messageType: string
  ccNumber: number | null
  ccValue: number | null
  valueOffset: number | null
  instrumentOffset: number | null
  hasParameter: boolean
  onSectionChange: boolean
  onSongEnd: boolean
  gear: { id: string; name: string; color: string | null }
}

interface GearItem { id: string; name: string }

interface EventForm {
  slug: string
  label: string
  gearId: string
  messageType: MessageType
  ccNumber: string
  ccValue: string
  valueOffset: string
  instrumentOffset: string
  hasParameter: boolean
  onSectionChange: boolean
  onSongEnd: boolean
}

const EMPTY_FORM: EventForm = {
  slug: '', label: '', gearId: '', messageType: 'CC',
  ccNumber: '0', ccValue: '127', valueOffset: '0', instrumentOffset: '0', hasParameter: false,
  onSectionChange: false, onSongEnd: false,
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventTypeItem[]>([])
  const [gear, setGear] = useState<GearItem[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState<EventForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const searchParams = useSearchParams()
  const [filterGear, setFilterGear] = useState(searchParams.get('gear') ?? '')

  function load() {
    fetch('/api/config/event-types').then(r => r.json()).then(setEvents)
    fetch('/api/config/gear').then(r => r.json()).then(setGear)
  }
  useEffect(load, [])

  function startEdit(item: EventTypeItem) {
    setEditing(item.id)
    setForm({
      slug: item.slug,
      label: item.label,
      gearId: item.gear.id,
      messageType: item.messageType as MessageType,
      ccNumber: String(item.ccNumber ?? 0),
      ccValue: String(item.ccValue ?? 127),
      valueOffset: String(item.valueOffset ?? 0),
      instrumentOffset: String(item.instrumentOffset ?? 0),
      hasParameter: item.hasParameter,
      onSectionChange: item.onSectionChange,
      onSongEnd: item.onSongEnd,
    })
  }

  function startNew() {
    setEditing('new')
    setForm({ ...EMPTY_FORM, gearId: gear[0]?.id ?? '' })
  }

  async function save() {
    setSaving(true)
    const body = {
      slug: form.slug,
      label: form.label,
      gearId: form.gearId,
      messageType: form.messageType,
      ccNumber: form.messageType !== 'PC' ? Number(form.ccNumber) : null,
      ccValue: form.messageType === 'CC' ? Number(form.ccValue) : null,
      valueOffset: form.messageType === 'CC_PARAM_VALUE' ? Number(form.valueOffset) : null,
      instrumentOffset: form.messageType === 'PC' ? Number(form.instrumentOffset) : null,
      hasParameter: form.hasParameter,
      onSectionChange: form.onSectionChange,
      onSongEnd: form.onSongEnd,
    }
    const res = editing === 'new'
      ? await fetch('/api/config/event-types', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      : await fetch(`/api/config/event-types/${editing}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setSaving(false)
    if (res.ok) { setEditing(null); load() } else alert('Save failed')
  }

  async function deleteEvent(id: string, slug: string) {
    if (!confirm(`Delete event type "${slug}"?`)) return
    await fetch(`/api/config/event-types/${id}`, { method: 'DELETE' })
    load()
  }

  const grouped = gear.map(g => ({
    gear: g,
    items: events.filter(e => e.gear.id === g.id && (!filterGear || g.id === filterGear)),
  })).filter(g => g.items.length > 0 || !filterGear)

  function renderEditForm() {
    return (
      <div className="border border-indigo-700 bg-gray-900 p-4 space-y-4">
        <h2 className="text-sm font-semibold text-indigo-300">{editing === 'new' ? 'New Event Type' : 'Edit Event Type'}</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="col-span-2">
            <label className="block text-xs text-gray-400 mb-1">Label</label>
            <input className="w-full rounded bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={form.label}
              onChange={e => setForm(f => ({ ...f, label: e.target.value, slug: editing === 'new' ? slugify(e.target.value) : f.slug }))}
              placeholder="Harmony On" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-400 mb-1">Slug</label>
            <input className="w-full rounded bg-gray-800 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={form.slug}
              onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
              placeholder="harmony-on" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-400 mb-1">Gear</label>
            <select className="w-full rounded bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={form.gearId} onChange={e => setForm(f => ({ ...f, gearId: e.target.value }))}>
              {gear.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-400 mb-1">Message Type</label>
            <select className="w-full rounded bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={form.messageType}
              onChange={e => setForm(f => ({ ...f, messageType: e.target.value as MessageType }))}>
              <option value="CC">CC (fixed value)</option>
              <option value="CC_PARAM_VALUE">CC (value = parameter)</option>
              <option value="PC">Program Change</option>
            </select>
          </div>

          {form.messageType !== 'PC' && (
            <div>
              <label className="block text-xs text-gray-400 mb-1">CC Number (0–127)</label>
              <input type="number" min={0} max={127} className="w-full rounded bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={form.ccNumber} onChange={e => setForm(f => ({ ...f, ccNumber: e.target.value }))} />
            </div>
          )}
          {form.messageType === 'CC' && (
            <div>
              <label className="block text-xs text-gray-400 mb-1">CC Value (0–127)</label>
              <input type="number" min={0} max={127} className="w-full rounded bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={form.ccValue} onChange={e => setForm(f => ({ ...f, ccValue: e.target.value }))} />
            </div>
          )}
          {form.messageType === 'CC_PARAM_VALUE' && (
            <div>
              <label className="block text-xs text-gray-400 mb-1">Value Offset</label>
              <input type="number" className="w-full rounded bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={form.valueOffset} onChange={e => setForm(f => ({ ...f, valueOffset: e.target.value }))} />
              <p className="text-xs text-gray-500 mt-1">CC value = parameter + offset (e.g. −1 for 1-based params)</p>
            </div>
          )}
          {form.messageType === 'PC' && (
            <div>
              <label className="block text-xs text-gray-400 mb-1">Instrument Offset</label>
              <input type="number" className="w-full rounded bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={form.instrumentOffset} onChange={e => setForm(f => ({ ...f, instrumentOffset: e.target.value }))} />
              <p className="text-xs text-gray-500 mt-1">Instrument = parameter + offset (e.g. −1 for 1-based params)</p>
            </div>
          )}

          <div className="col-span-2 flex items-center gap-4 pt-1">
            <label className="inline-flex items-center gap-2 text-sm text-gray-300">
              <input type="checkbox" checked={form.hasParameter}
                onChange={e => setForm(f => ({ ...f, hasParameter: e.target.checked }))}
                className="rounded" />
              Has parameter
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-gray-300">
              <input type="checkbox" checked={form.onSectionChange}
                onChange={e => setForm(f => ({ ...f, onSectionChange: e.target.checked }))}
                className="rounded" />
              On section change
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-gray-300">
              <input type="checkbox" checked={form.onSongEnd}
                onChange={e => setForm(f => ({ ...f, onSongEnd: e.target.checked }))}
                className="rounded" />
              On song end
            </label>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={save} disabled={saving} className="rounded bg-indigo-600 px-4 py-1.5 text-sm hover:bg-indigo-500 disabled:opacity-50 transition-colors">
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button onClick={() => setEditing(null)} className="text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
        </div>
      </div>
    )
  }

  const msgTypeLabel: Record<MessageType, string> = {
    CC: 'CC (fixed)',
    CC_PARAM_VALUE: 'CC (param→value)',
    PC: 'Program Change',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Event Types</h1>
        <div className="flex items-center gap-3">
          <select
            className="rounded bg-gray-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            value={filterGear}
            onChange={e => setFilterGear(e.target.value)}
          >
            <option value="">All gear</option>
            {gear.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <button onClick={startNew} className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500 transition-colors">
            + Add Event Type
          </button>
        </div>
      </div>

      {editing === 'new' && renderEditForm()}

      <div className="space-y-4">
        {grouped.length === 0 && <p className="text-sm text-gray-400">No event types configured.</p>}
        {grouped.map(({ gear: g, items }) => (
          <div key={g.id} className="rounded-lg border border-gray-800 bg-gray-900">
            <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-800">
              {g.name}
            </div>
            <div className="divide-y divide-gray-800">
              {items.map(item => (
                <div key={item.id}>
                  {editing === item.id ? renderEditForm() : (
                    <div className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-gray-800/50 transition-colors" onClick={() => startEdit(item)}>
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono text-sm text-indigo-300 shrink-0">{item.slug}</span>
                        <span className="text-sm text-gray-400 truncate">{item.label}</span>
                        <span className="text-xs text-gray-600 shrink-0">{msgTypeLabel[item.messageType as MessageType]}</span>
                        {item.messageType === 'CC' && <span className="text-xs text-gray-500 shrink-0">CC#{item.ccNumber} = {item.ccValue}</span>}
                        {item.messageType === 'CC_PARAM_VALUE' && <span className="text-xs text-gray-500 shrink-0">CC#{item.ccNumber} val=param{item.valueOffset !== 0 ? `${item.valueOffset ?? ''}` : ''}</span>}
                        {item.messageType === 'PC' && <span className="text-xs text-gray-500 shrink-0">PC inst=param{item.instrumentOffset !== 0 ? `${item.instrumentOffset ?? ''}` : ''}</span>}
                        {item.hasParameter && <span className="text-xs text-amber-600 shrink-0">param</span>}
                        {item.onSectionChange && <span className="text-xs text-cyan-500 shrink-0">section</span>}
                        {item.onSongEnd && <span className="text-xs text-purple-400 shrink-0">end</span>}
                      </div>
                      <button onClick={e => { e.stopPropagation(); deleteEvent(item.id, item.slug) }} className="text-sm text-red-500 hover:text-red-400 transition-colors shrink-0 ml-4">Delete</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
