/**
 * Default event type configuration — mirrors the current hardcoded gear setup.
 * Used by the CLI. The web app loads these from the database instead.
 *
 * Gear:
 *   Channel 1 — VL3 Harmony
 *   Channel 2 — Helix
 *   Channel 3 — Loopy Pro
 *   Channel 4 — OnSong
 */

/** @type {import('./types').EventTypeConfig[]} */
const defaultEventTypes = [
	// ── VL3 Harmony (channel 1) ──────────────────────────────────────────────
	{ slug: 'harmony-on',          label: 'Harmony On',          midiChannel: 1, messageType: 'CC', ccNumber: 110, ccValue: 127, hasParameter: false },
	{ slug: 'harmony-off',         label: 'Harmony Off',         midiChannel: 1, messageType: 'CC', ccNumber: 110, ccValue: 0,   hasParameter: false },
	{ slug: 'vocal-double-on',     label: 'Vocal Double On',     midiChannel: 1, messageType: 'CC', ccNumber: 111, ccValue: 127, hasParameter: false },
	{ slug: 'vocal-double-off',    label: 'Vocal Double Off',    midiChannel: 1, messageType: 'CC', ccNumber: 111, ccValue: 0,   hasParameter: false },
	{ slug: 'vocal-patch-change',  label: 'Vocal Patch Change',  midiChannel: 1, messageType: 'PC', instrumentOffset: -1, hasParameter: true },

	// ── Helix (channel 2) ────────────────────────────────────────────────────
	{ slug: 'helix-snapshot',      label: 'Helix Snapshot',      midiChannel: 2, messageType: 'CC_PARAM_VALUE', ccNumber: 69, valueOffset: -1, hasParameter: true },

	// ── Loopy Pro (channel 3) — one event per slot ───────────────────────────
	{ slug: 'guitar-loop-1-record', label: 'Guitar Loop 1 Record', midiChannel: 3, messageType: 'CC', ccNumber: 80, ccValue: 127, hasParameter: false },
	{ slug: 'guitar-loop-1-play',   label: 'Guitar Loop 1 Play',   midiChannel: 3, messageType: 'CC', ccNumber: 80, ccValue: 0,   hasParameter: false },
	{ slug: 'guitar-loop-1-stop',   label: 'Guitar Loop 1 Stop',   midiChannel: 3, messageType: 'CC', ccNumber: 81, ccValue: 0,   hasParameter: false },
	{ slug: 'guitar-loop-1-clear',  label: 'Guitar Loop 1 Clear',  midiChannel: 3, messageType: 'CC', ccNumber: 81, ccValue: 127, hasParameter: false },
	{ slug: 'guitar-loop-2-record', label: 'Guitar Loop 2 Record', midiChannel: 3, messageType: 'CC', ccNumber: 82, ccValue: 127, hasParameter: false },
	{ slug: 'guitar-loop-2-play',   label: 'Guitar Loop 2 Play',   midiChannel: 3, messageType: 'CC', ccNumber: 82, ccValue: 0,   hasParameter: false },
	{ slug: 'guitar-loop-2-stop',   label: 'Guitar Loop 2 Stop',   midiChannel: 3, messageType: 'CC', ccNumber: 83, ccValue: 0,   hasParameter: false },
	{ slug: 'guitar-loop-2-clear',  label: 'Guitar Loop 2 Clear',  midiChannel: 3, messageType: 'CC', ccNumber: 83, ccValue: 127, hasParameter: false },
	{ slug: 'vocal-loop-1-record',  label: 'Vocal Loop 1 Record',  midiChannel: 3, messageType: 'CC', ccNumber: 86, ccValue: 127, hasParameter: false },
	{ slug: 'vocal-loop-1-play',    label: 'Vocal Loop 1 Play',    midiChannel: 3, messageType: 'CC', ccNumber: 86, ccValue: 0,   hasParameter: false },
	{ slug: 'vocal-loop-1-stop',    label: 'Vocal Loop 1 Stop',    midiChannel: 3, messageType: 'CC', ccNumber: 87, ccValue: 0,   hasParameter: false },
	{ slug: 'vocal-loop-1-clear',   label: 'Vocal Loop 1 Clear',   midiChannel: 3, messageType: 'CC', ccNumber: 87, ccValue: 127, hasParameter: false },
	{ slug: 'vocal-loop-2-record',  label: 'Vocal Loop 2 Record',  midiChannel: 3, messageType: 'CC', ccNumber: 88, ccValue: 127, hasParameter: false },
	{ slug: 'vocal-loop-2-play',    label: 'Vocal Loop 2 Play',    midiChannel: 3, messageType: 'CC', ccNumber: 88, ccValue: 0,   hasParameter: false },
	{ slug: 'vocal-loop-2-stop',    label: 'Vocal Loop 2 Stop',    midiChannel: 3, messageType: 'CC', ccNumber: 89, ccValue: 0,   hasParameter: false },
	{ slug: 'vocal-loop-2-clear',   label: 'Vocal Loop 2 Clear',   midiChannel: 3, messageType: 'CC', ccNumber: 89, ccValue: 127, hasParameter: false },

	// ── OnSong (channel 4) ───────────────────────────────────────────────────
	{ slug: 'onsong-next-section',  label: 'OnSong Next Section',  midiChannel: 4, messageType: 'CC', ccNumber: 1,   ccValue: 127, hasParameter: false },
	{ slug: 'metronome-start',      label: 'Metronome Start',      midiChannel: 4, messageType: 'CC', ccNumber: 126, ccValue: 127, hasParameter: false },
	{ slug: 'metronome-stop',       label: 'Metronome Stop',       midiChannel: 4, messageType: 'CC', ccNumber: 3,   ccValue: 127, hasParameter: false },
]

module.exports = { defaultEventTypes }
