'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface GearItem {
  id: string
  name: string
  midiChannel: number
  color: string | null
  _count: { eventTypes: number }
}

interface GearTemplate {
  id: string
  name: string
  midiChannel: number
  color: string | null
  eventTypes: { slug: string; label: string }[]
}

interface GearForm { name: string; midiChannel: string; color: string }
const EMPTY_FORM: GearForm = { name: '', midiChannel: '1', color: '#6366f1' }

export default function GearPage() {
  const [gear, setGear] = useState<GearItem[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState<GearForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [library, setLibrary] = useState<GearTemplate[]>([])
  const [showLibrary, setShowLibrary] = useState(false)
  const [adding, setAdding] = useState<string | null>(null)

  function load() {
    fetch('/api/config/gear').then(r => r.json()).then(setGear)
  }
  useEffect(load, [])

  function startEdit(item: GearItem) {
    setEditing(item.id)
    setShowLibrary(false)
    setForm({ name: item.name, midiChannel: String(item.midiChannel), color: item.color ?? '#6366f1' })
  }

  function startNew() {
    setEditing('new')
    setShowLibrary(false)
    setForm(EMPTY_FORM)
  }

  async function openLibrary() {
    setEditing(null)
    setShowLibrary(v => !v)
    if (library.length === 0) {
      const res = await fetch('/api/config/gear/library')
      setLibrary(await res.json())
    }
  }

  async function addFromLibrary(templateId: string) {
    setAdding(templateId)
    const res = await fetch(`/api/config/gear/library/${templateId}/provision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    setAdding(null)
    if (res.ok) {
      load()
    } else {
      alert('Failed to add gear')
    }
  }

  async function save() {
    setSaving(true)
    const body = { name: form.name, midiChannel: Number(form.midiChannel), color: form.color }
    const res = editing === 'new'
      ? await fetch('/api/config/gear', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      : await fetch(`/api/config/gear/${editing}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setSaving(false)
    if (res.ok) { setEditing(null); load() } else alert('Save failed')
  }

  async function deleteGear(id: string, name: string) {
    if (!confirm(`Delete "${name}" and all its event types?`)) return
    await fetch(`/api/config/gear/${id}`, { method: 'DELETE' })
    load()
  }

  const gearNames = new Set(gear.map(g => g.name))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Gear</h1>
        <div className="flex items-center gap-2">
          <button onClick={openLibrary} className="rounded border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:border-indigo-500 hover:text-white transition-colors">
            {showLibrary ? 'Hide Library' : 'Add from Library'}
          </button>
          <Link href="/config/gear/library" className="rounded border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:border-indigo-500 hover:text-white transition-colors">
            Edit Library
          </Link>
          <button onClick={startNew} className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500 transition-colors">
            + Add Gear
          </button>
        </div>
      </div>

      {showLibrary && (
        <div className="rounded-lg border border-gray-700 bg-gray-900 p-4 mb-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Gear Library</h2>
          {library.length === 0 ? (
            <p className="text-sm text-gray-500">No templates in library. <Link href="/config/gear/library" className="text-indigo-400 hover:underline">Create one</Link> or load built-ins.</p>
          ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {library.map(entry => {
              const alreadyAdded = gearNames.has(entry.name)
              return (
                <div key={entry.id} className="rounded border border-gray-800 bg-gray-950 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: entry.color ?? '#6366f1' }} />
                      <span className="font-medium">{entry.name}</span>
                      <span className="text-sm text-gray-400">Ch {entry.midiChannel}</span>
                    </div>
                    <button
                      onClick={() => addFromLibrary(entry.id)}
                      disabled={adding === entry.id || alreadyAdded}
                      className="rounded bg-indigo-600 px-3 py-1 text-xs font-medium hover:bg-indigo-500 disabled:opacity-40 transition-colors"
                    >
                      {alreadyAdded ? 'Added' : adding === entry.id ? 'Adding…' : 'Add'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {entry.eventTypes.map(et => (
                      <span key={et.slug} className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-400 font-mono">
                        {et.slug}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
          )}
        </div>
      )}

      {editing && (
        <div className="rounded-lg border border-indigo-700 bg-gray-900 p-4 mb-6 space-y-4">
          <h2 className="text-sm font-semibold text-indigo-300">{editing === 'new' ? 'New Gear' : 'Edit Gear'}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Name</label>
              <input className="w-full rounded bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Helix" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">MIDI Channel (1–16)</label>
              <input type="number" min={1} max={16} className="w-full rounded bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={form.midiChannel} onChange={e => setForm(f => ({ ...f, midiChannel: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Color</label>
              <div className="flex items-center gap-2">
                <input type="color" className="h-9 w-9 rounded cursor-pointer bg-transparent border-0"
                  value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} />
                <input className="flex-1 rounded bg-gray-800 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} />
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={save} disabled={saving} className="rounded bg-indigo-600 px-4 py-1.5 text-sm hover:bg-indigo-500 disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => setEditing(null)} className="text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-gray-800 bg-gray-900">
        {gear.length === 0 ? <p className="px-4 py-3 text-sm text-gray-400">No gear configured.</p> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-2 w-16">Ch</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2 w-24">Events</th>
                <th className="px-4 py-2 w-32 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {gear.map(item => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-mono text-gray-400">{item.midiChannel}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: item.color ?? '#6366f1' }} />
                      <Link href={`/config/events?gear=${item.id}`} className="font-medium hover:text-indigo-400 transition-colors">{item.name}</Link>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{item._count.eventTypes}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => startEdit(item)} className="text-gray-400 hover:text-white transition-colors">Edit</button>
                      <button onClick={() => deleteGear(item.id, item.name)} className="text-red-500 hover:text-red-400 transition-colors">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
