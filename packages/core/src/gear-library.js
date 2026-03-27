'use strict'

/**
 * Gear library — catalog of known gear presets with their event types.
 * Adding a gear from the library provisions all its event types automatically.
 *
 * @typedef {import('./types').GearLibraryEntry} GearLibraryEntry
 * @typedef {import('./types').EventTypeConfig} EventTypeConfig
 */

/** @type {GearLibraryEntry[]} */
const gearLibrary = [
	{
		key: 'vl3',
		name: 'VoiceLive 3',
		midiChannel: 1,
		color: '#6366f1',
		eventTypes: [
			{ slug: 'harmony-on',         label: 'Harmony On',         messageType: 'CC', ccNumber: 110, ccValue: 127, hasParameter: false },
			{ slug: 'harmony-off',        label: 'Harmony Off',        messageType: 'CC', ccNumber: 110, ccValue: 0,   hasParameter: false, onSongEnd: true },
			{ slug: 'vocal-double-on',    label: 'Vocal Double On',    messageType: 'CC', ccNumber: 111, ccValue: 127, hasParameter: false },
			{ slug: 'vocal-double-off',   label: 'Vocal Double Off',   messageType: 'CC', ccNumber: 111, ccValue: 0,   hasParameter: false },
			{ slug: 'vocal-patch-change', label: 'Vocal Patch Change', messageType: 'PC', instrumentOffset: -1, hasParameter: true },
		],
	},
	{
		key: 'helix',
		name: 'Helix',
		midiChannel: 2,
		color: '#f59e0b',
		eventTypes: [
			{ slug: 'helix-snapshot',     label: 'Helix Snapshot',     messageType: 'CC_PARAM_VALUE', ccNumber: 69, valueOffset: -1, hasParameter: true },
			{ slug: 'helix-patch-change', label: 'Helix Patch Change', messageType: 'PC', instrumentOffset: 0, hasParameter: true },
		],
	},
	{
		key: 'loopy-pro',
		name: 'Loopy Pro',
		midiChannel: 3,
		color: '#10b981',
		eventTypes: [
			{ slug: 'guitar-loop-record',   label: 'Guitar Loop 1 Record', messageType: 'CC', ccNumber: 80, ccValue: 127, hasParameter: false },
			{ slug: 'guitar-loop-play',     label: 'Guitar Loop 1 Play',   messageType: 'CC', ccNumber: 80, ccValue: 0,   hasParameter: false },
			{ slug: 'guitar-loop-stop',     label: 'Guitar Loop 1 Stop',   messageType: 'CC', ccNumber: 81, ccValue: 0,   hasParameter: false },
			{ slug: 'guitar-loop-clear',    label: 'Guitar Loop 1 Clear',  messageType: 'CC', ccNumber: 81, ccValue: 127, hasParameter: false },
			{ slug: 'guitar-loop-2-record', label: 'Guitar Loop 2 Record', messageType: 'CC', ccNumber: 82, ccValue: 127, hasParameter: false },
			{ slug: 'guitar-loop-2-play',   label: 'Guitar Loop 2 Play',   messageType: 'CC', ccNumber: 82, ccValue: 0,   hasParameter: false },
			{ slug: 'guitar-loop-2-stop',   label: 'Guitar Loop 2 Stop',   messageType: 'CC', ccNumber: 83, ccValue: 0,   hasParameter: false },
			{ slug: 'guitar-loop-2-clear',  label: 'Guitar Loop 2 Clear',  messageType: 'CC', ccNumber: 83, ccValue: 127, hasParameter: false },
			{ slug: 'vocal-loop-record',    label: 'Vocal Loop 1 Record',  messageType: 'CC', ccNumber: 86, ccValue: 127, hasParameter: false },
			{ slug: 'vocal-loop-play',      label: 'Vocal Loop 1 Play',    messageType: 'CC', ccNumber: 86, ccValue: 0,   hasParameter: false },
			{ slug: 'vocal-loop-stop',      label: 'Vocal Loop 1 Stop',    messageType: 'CC', ccNumber: 87, ccValue: 0,   hasParameter: false },
			{ slug: 'vocal-loop-clear',     label: 'Vocal Loop 1 Clear',   messageType: 'CC', ccNumber: 87, ccValue: 127, hasParameter: false },
			{ slug: 'vocal-loop-2-record',  label: 'Vocal Loop 2 Record',  messageType: 'CC', ccNumber: 88, ccValue: 127, hasParameter: false },
			{ slug: 'vocal-loop-2-play',    label: 'Vocal Loop 2 Play',    messageType: 'CC', ccNumber: 88, ccValue: 0,   hasParameter: false },
			{ slug: 'vocal-loop-2-stop',    label: 'Vocal Loop 2 Stop',    messageType: 'CC', ccNumber: 89, ccValue: 0,   hasParameter: false },
			{ slug: 'vocal-loop-2-clear',   label: 'Vocal Loop 2 Clear',   messageType: 'CC', ccNumber: 89, ccValue: 127, hasParameter: false },
		],
	},
	{
		key: 'onsong',
		name: 'OnSong',
		midiChannel: 4,
		color: '#3b82f6',
		eventTypes: [
			{ slug: 'onsong-next-section', label: 'OnSong Next Section', messageType: 'CC', ccNumber: 1,   ccValue: 127, hasParameter: false, onSectionChange: true },
		],
	},
]

// Lookup helpers
const gearLibraryByKey = new Map(gearLibrary.map(g => [g.key, g]))

const gearLibraryEventBySlug = new Map()
for (const gear of gearLibrary) {
	for (const et of gear.eventTypes) {
		gearLibraryEventBySlug.set(et.slug, { gear, eventType: et })
	}
}

/**
 * Flatten the gear library into the EventTypeConfig[] format used by the generator and CLI.
 * @returns {EventTypeConfig[]}
 */
function flattenGearLibrary() {
	/** @type {EventTypeConfig[]} */
	const result = []
	for (const gear of gearLibrary) {
		for (const et of gear.eventTypes) {
			result.push({ ...et, midiChannel: gear.midiChannel })
		}
	}
	return result
}

// Backward-compatible alias
const defaultEventTypes = flattenGearLibrary()

module.exports = { gearLibrary, gearLibraryByKey, gearLibraryEventBySlug, flattenGearLibrary, defaultEventTypes }
