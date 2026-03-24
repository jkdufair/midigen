'use client'

import { useEffect, useState } from 'react'

interface GearItem {
  id: string
  name: string
  midiChannel: number
  color: string | null
  _count: { eventTypes: number }
}

interface GearForm { name: string; midiChannel: string; color: string }
const EMPTY_FORM: GearForm = { name: '', midiChannel: '1', color: '#6366f1' }

export default function GearPage() {
  const [gear, setGear] = useState<GearItem[]>([])
  const [editing, setEditing] = useState<string | null>(null) // id or 'new'
  const [form, setForm] = useState<GearForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  function load() {
    fetch('/api/config/gear').then(r => r.json()).then(setGear)
  }
  useEffect(load, [])

  function startEdit(item: GearItem) {
    setEditing(item.id)
    setForm({ name: item.name, midiChannel: String(item.midiChannel), color: item.color ?? '#6366f1' })
  }

  function startNew() {
    setEditing('new')
    setForm(EMPTY_FORM)
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Gear</h1>
        <button onClick={startNew} className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500 transition-colors">
          + Add Gear
        </button>
      </div>

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

      <div className="divide-y divide-gray-800 rounded-lg border border-gray-800 bg-gray-900">
        {gear.length === 0 && <p className="px-4 py-3 text-sm text-gray-400">No gear configured.</p>}
        {gear.map(item => (
          <div key={item.id} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: item.color ?? '#6366f1' }} />
              <span className="font-medium">{item.name}</span>
              <span className="text-sm text-gray-400">Ch {item.midiChannel}</span>
              <span className="text-xs text-gray-500">{item._count.eventTypes} event{item._count.eventTypes !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => startEdit(item)} className="text-sm text-gray-400 hover:text-white transition-colors">Edit</button>
              <button onClick={() => deleteGear(item.id, item.name)} className="text-sm text-red-500 hover:text-red-400 transition-colors">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
