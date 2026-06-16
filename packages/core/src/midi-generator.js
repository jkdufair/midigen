'use strict'

/**
 * @typedef {import('./types').SongSpec} SongSpec
 * @typedef {import('./types').EventTypeConfig} EventTypeConfig
 */

const midiWriter = require('./midi-writer-js.cjs')
const { ControllerChangeEvent, ProgramChangeEvent, Track, Utils, Writer } = midiWriter

// Section-change events fire slightly after any 1.1.1 events
const SECTION_CHANGE_OFFSET_TICKS = 16

// Lead time for the mid-section meter-change carrier CC before the downbeat.
// 0 = fire exactly on the downbeat (the realign CC handles bar alignment, so a
// clock-slaved metronome doesn't need the meter early). Bump up (e.g. 64 = an
// eighth note at 128 PPQ) only if a receiver needs the meter set pre-bar.
const TIME_SIG_CARRIER_LEAD_TICKS = 0

// A clock-slaved looper (Loopy Pro) derives its bar phase from cumulative clock
// beats modulo the meter — it never re-counts a bar — so a short/odd bar leaves
// the downbeat permanently offset. When an event type with this slug is
// configured, the generator emits its CC AT a meter-change downbeat that would
// otherwise land off-grid, so it can be bound to Loopy's "Phase Align Clock" to
// re-zero the bar. Fires only where a realign is actually needed (the "return"),
// not at every meter change — avoiding spurious clock resets.
//
// Loopy binding REQUIREMENT: in the Phase Align Clock action settings, set
// Quantum = "Master". Without it the action rushes the clock forward to catch up
// (adding beats) instead of snapping cleanly to the master clock's bar boundary.
const CLOCK_REALIGN_SLUG = 'clock-realign'

// Variax tuning: convert a semitone offset (-12 to +12) to a MIDI CC value (0-127).
// 0 semitones (standard tuning) maps to ~64 (midpoint of the range).
function semitoneOffsetToCCValue(offset) {
	const clamped = Math.max(-12, Math.min(12, offset))
	return Math.ceil((clamped + 12) * 127 / 24)
}

// Loopy Pro CC lookup table: time signature numerator → CC value
// CC value is the midpoint of each range in the user's Loopy Pro binding
const TIME_SIG_CC_VALUES = {
	1: 2, 2: 11, 3: 23, 4: 35, 5: 46,
	6: 58, 7: 69, 8: 81, 9: 92, 10: 104, 11: 115, 12: 124,
}

/**
 * @param {string} timeSignature - e.g. "4/4", "3/4", "6/8"
 * @returns {number} CC value for the time signature carrier
 */
function getTimeSignatureCCValue(timeSignature) {
	const numerator = parseInt(timeSignature.split('/')[0], 10)
	const value = TIME_SIG_CC_VALUES[numerator]
	if (value === undefined) throw new Error(`No CC mapping for time signature "${timeSignature}" (numerator ${numerator} not in lookup table)`)
	return value
}

// A quarter note and a 16th note are a fixed number of ticks regardless of meter
// (only a whole note / full measure scales with beatsPerMeasure).
const QUARTER_TICKS = Utils.getTickDuration('4')
const SIXTEENTH_TICKS = Utils.getTickDuration('16')

/**
 * Build a per-measure beats-per-measure map for a section, applying any
 * mid-section time signature changes (each persists until the next change).
 * The opening meter is `section.timeSignature` (handled at the section boundary),
 * so in-section changes apply from measure 2 onward.
 * @param {import('./types').Section} section
 * @param {number} startBeatsPerMeasure - meter entering the section (measure 1)
 * @returns {number[]} index 0 = measure 1
 */
function buildSectionBpms(section, startBeatsPerMeasure) {
	const measureCount = parseInt(section.length.split('.')[0], 10) || 0
	const changes = (section.timeSigChanges ?? [])
		.filter(c => c.measure >= 2 && c.measure <= measureCount)
		.slice()
		.sort((a, b) => a.measure - b.measure)
	const bpms = []
	let bpm = startBeatsPerMeasure
	let ci = 0
	for (let m = 1; m <= measureCount; m++) {
		while (ci < changes.length && changes[ci].measure <= m) {
			bpm = parseInt(changes[ci].timeSignature.split('/')[0], 10)
			ci++
		}
		bpms.push(bpm)
	}
	return bpms
}

/**
 * Section-offset ticks at the downbeat of measure `m` (1-based), honouring
 * the per-measure meter map.
 * @param {number[]} bpms
 * @param {number} m
 */
function tickOfMeasureStart(bpms, m) {
	let ticks = 0
	for (let i = 1; i < m; i++) {
		const bpm = bpms[i - 1] ?? bpms[bpms.length - 1]
		ticks += QUARTER_TICKS * bpm
	}
	return ticks
}

/**
 * Convert a "measures.beats.subdivisions" duration to ticks, honouring the
 * per-measure meter map. Reduces to a single-meter result when every measure
 * shares one beats-per-measure.
 * @param {string} length - "measures.beats.subdivisions"
 * @param {number[]} bpms
 */
function ticksFromLengthVar(length, bpms) {
	const [measures, beats, subdivisions] = length.split('.').map(x => parseInt(x))
	let ticks = 0
	for (let m = 1; m <= measures; m++) {
		const bpm = bpms[m - 1] ?? bpms[bpms.length - 1]
		ticks += QUARTER_TICKS * bpm
	}
	return ticks + QUARTER_TICKS * beats + SIXTEENTH_TICKS * subdivisions
}

/**
 * Convert a 1-based "measures.beats.subdivisions" position to a section-offset
 * in ticks, honouring the per-measure meter map. Reduces to a single-meter
 * result when every measure shares one beats-per-measure.
 * @param {string} position - "measures.beats.subdivisions"
 * @param {number[]} bpms
 */
function ticksFromPositionVar(position, bpms) {
	const [measures, beats, subdivisions] = position.split('.').map(x => parseInt(x))
	return tickOfMeasureStart(bpms, measures) + QUARTER_TICKS * (beats - 1) + SIXTEENTH_TICKS * (subdivisions - 1)
}

/**
 * @param {EventTypeConfig} eventType
 * @param {number} delta
 * @param {number|undefined} parameter
 */
function buildMidiEvent(eventType, delta, parameter) {
	switch (eventType.messageType) {
		case 'CC':
			return new ControllerChangeEvent({
				controllerNumber: eventType.ccNumber,
				controllerValue: eventType.ccValue,
				channel: eventType.midiChannel,
				delta,
			})
		case 'CC_PARAM_VALUE':
			return new ControllerChangeEvent({
				controllerNumber: eventType.ccNumber,
				controllerValue: (parameter ?? 1) + (eventType.valueOffset ?? 0),
				channel: eventType.midiChannel,
				delta,
			})
		case 'PC':
			return new ProgramChangeEvent({
				channel: eventType.midiChannel - 1, // midi-writer-js is 0-indexed for PC
				instrument: (parameter ?? 1) + (eventType.instrumentOffset ?? 0),
				delta,
			})
		default:
			throw new Error(`Unknown messageType: "${eventType.messageType}" on event "${eventType.slug}"`)
	}
}

/**
 * @param {string} eventSlug
 * @param {number|undefined} parameter
 * @param {number} delta
 * @param {{ addEvent: (e: unknown) => void }} track
 * @param {EventTypeConfig[]} eventTypes
 */
function writeSpecEvent(eventSlug, parameter, delta, track, eventTypes) {
	const eventType = eventTypes.find(et => et.slug === eventSlug)
	if (!eventType) return false // silently skip — validation happens at import time
	track.addEvent(buildMidiEvent(eventType, delta, parameter))
	return eventSlug === 'helix-snapshot' || eventSlug === 'helix-patch-change'
}

const TUNING_REINFORCE_OFFSET_TICKS = 8

function emitTuningCCs(track, tuning, delta) {
	tuning.forEach((offset, idx) => {
		track.addEvent(new ControllerChangeEvent({
			controllerNumber: 116 - idx,
			controllerValue: semitoneOffsetToCCValue(offset),
			channel: 2,
			delta: idx === 0 ? delta : 0,
		}))
	})
}

/**
 * @param {SongSpec} spec
 * @param {EventTypeConfig[]} eventTypes
 * @returns {Buffer}
 */
function generateMidi(spec, eventTypes) {
	if (!spec.title) throw new Error('Song spec must have a title')
	if (!spec.tempo) throw new Error('Song spec must have a tempo')
	if (!spec.timeSignature) throw new Error('Song spec must have a timeSignature')
	if (!spec.sections?.length) throw new Error('Song spec must have at least one section')

	const track = new Track()
	let [beatsPerMeasure, timeDivision] = spec.timeSignature.split('/').map(x => parseInt(x))
	track.setTimeSignature(beatsPerMeasure, timeDivision)
	track.setTempo(spec.tempo)

	const sectionChangeEvents = eventTypes.filter(et => et.onSectionChange)
	const songEndEvents = eventTypes.filter(et => et.onSongEnd)
	const timeSigCarriers = eventTypes.filter(et => et.isTimeSignatureCarrier)
	const realignEvent = eventTypes.find(et => et.slug === CLOCK_REALIGN_SLUG)

	// Emit time signature CC at tick 0 (before the count-off measure)
	let currentTimeSig = spec.timeSignature
	if (timeSigCarriers.length > 0) {
		const ccValue = getTimeSignatureCCValue(currentTimeSig)
		for (const et of timeSigCarriers) {
			track.addEvent(new ControllerChangeEvent({
				controllerNumber: et.ccNumber,
				controllerValue: ccValue,
				channel: et.midiChannel,
				delta: 0,
			}))
		}
	}

	// Emit Variax tuning CCs at tick 0 (Helix, channel 2, CC 111-116)
	// tuning[0] = string 6 (low E → CC 116), tuning[5] = string 1 (high E → CC 111)
	let currentTuning = Array.isArray(spec.tuning) ? spec.tuning : [0, 0, 0, 0, 0, 0]
	emitTuningCCs(track, currentTuning, 0)

	// Start delta at 1 measure (count-off before the song begins).
	// Use string '1' (not array ['1']) so beatsPerMeasure is forwarded — the array
	// variant ignores the second argument and always defaults to 4/4 (512 ticks).
	let nextEventDelta = Utils.getTickDuration('1', beatsPerMeasure)

	// Absolute tick of the current section's start (count-off + prior section lengths).
	// Used to decide whether a meter-change downbeat lands off Loopy's beat grid.
	let sectionStartTick = nextEventDelta

	for (const section of spec.sections) {
		// Handle mid-song time signature change
		const sectionTimeSig = section.timeSignature || currentTimeSig
		if (sectionTimeSig !== currentTimeSig) {
			currentTimeSig = sectionTimeSig
			;[beatsPerMeasure, timeDivision] = currentTimeSig.split('/').map(x => parseInt(x))
			track.setTimeSignature(beatsPerMeasure, timeDivision)
			if (timeSigCarriers.length > 0) {
				const ccValue = getTimeSignatureCCValue(currentTimeSig)
				let first = true
				for (const et of timeSigCarriers) {
					track.addEvent(new ControllerChangeEvent({
						controllerNumber: et.ccNumber,
						controllerValue: ccValue,
						channel: et.midiChannel,
						delta: first ? nextEventDelta : 0,
					}))
					first = false
				}
				nextEventDelta = 0
			}
		}

		// Per-measure meter map (applies any mid-section time signature changes).
		// Markers are emitted at each interior change's downbeat (measure >= 2);
		// the opening meter is handled by the section-boundary block above.
		const bpms = buildSectionBpms(section, beatsPerMeasure)
		const meterMarkers = (section.timeSigChanges ?? [])
			.filter(c => c.measure >= 2 && c.measure <= bpms.length)
			.slice()
			.sort((a, b) => a.measure - b.measure)
			.map(c => {
				const downbeat = tickOfMeasureStart(bpms, c.measure)
				const newBpb = parseInt(c.timeSignature.split('/')[0], 10)
				// Loopy stays aligned only when the cumulative beat count at this
				// downbeat is a whole number of the new meter's bars. If not (e.g.
				// the bar before was short), a clock realign is needed here.
				const beatAtDownbeat = Math.round((sectionStartTick + downbeat) / QUARTER_TICKS)
				return {
					downbeat,
					timeSignature: c.timeSignature,
					realign: !!realignEvent && beatAtDownbeat % newBpb !== 0,
				}
			})

		const sectionTickLength = ticksFromLengthVar(section.length, bpms)
		let sectionDeltaSum = 0
		let previousEventPosition = ''

		// Events at 1.1.1 fire at the section boundary
		let needsTuningReinforce = false
		for (const event of (section.events ?? []).filter(e => e.position === '1.1.1')) {
			if (event.event === 'variax-tuning' && Array.isArray(event.tuning)) {
				currentTuning = event.tuning
				emitTuningCCs(track, currentTuning, nextEventDelta)
				nextEventDelta = 0
				continue
			}
			if (writeSpecEvent(event.event, event.parameter, nextEventDelta, track, eventTypes))
				needsTuningReinforce = true
			nextEventDelta = 0
		}
		if (needsTuningReinforce) {
			emitTuningCCs(track, currentTuning, TUNING_REINFORCE_OFFSET_TICKS)
			sectionDeltaSum += TUNING_REINFORCE_OFFSET_TICKS
		}

		// Section-change events fire slightly after 1.1.1 events
		if (sectionChangeEvents.length > 0) {
			let first = true
			for (const et of sectionChangeEvents) {
				track.addEvent(buildMidiEvent(et, first ? nextEventDelta + SECTION_CHANGE_OFFSET_TICKS : 0))
				first = false
			}
			nextEventDelta = 0
			sectionDeltaSum += SECTION_CHANGE_OFFSET_TICKS
		}

		if (meterMarkers.length === 0) {
			// Fast path — no mid-section meter change; behaviour identical to a single-meter section.
			for (const event of (section.events ?? []).filter(e => e.position !== '1.1.1')) {
				const eventOffsetFromSectionStart = ticksFromPositionVar(event.position, bpms)
				if (eventOffsetFromSectionStart >= sectionTickLength) continue

				if (previousEventPosition !== event.position) {
					nextEventDelta = eventOffsetFromSectionStart - sectionDeltaSum
					sectionDeltaSum += nextEventDelta
				}

				if (event.event === 'variax-tuning' && Array.isArray(event.tuning)) {
					currentTuning = event.tuning
					emitTuningCCs(track, currentTuning, nextEventDelta)
					previousEventPosition = event.position
					nextEventDelta = 0
					continue
				}

				const reinforce = writeSpecEvent(event.event, event.parameter, nextEventDelta, track, eventTypes)
				previousEventPosition = event.position
				nextEventDelta = 0
				if (reinforce) {
					emitTuningCCs(track, currentTuning, TUNING_REINFORCE_OFFSET_TICKS)
					sectionDeltaSum += TUNING_REINFORCE_OFFSET_TICKS
				}
			}
		} else {
			// Merge mid-section meter changes (pre-rolled), clock realigns (on the
			// downbeat), and the remaining position-sorted events.
			const rank = k => (k === 'meter' ? 0 : k === 'realign' ? 1 : 2)
			const items = [
				...meterMarkers.map(m => ({ offset: Math.max(0, m.downbeat - TIME_SIG_CARRIER_LEAD_TICKS), kind: 'meter', timeSignature: m.timeSignature, event: null })),
				...meterMarkers.filter(m => m.realign).map(m => ({ offset: m.downbeat, kind: 'realign', timeSignature: '', event: null })),
				...(section.events ?? [])
					.filter(e => e.position !== '1.1.1')
					.map(e => ({ offset: ticksFromPositionVar(e.position, bpms), kind: 'event', timeSignature: '', event: e }))
					.filter(e => e.offset < sectionTickLength),
			].sort((a, b) => {
				if (a.offset !== b.offset) return a.offset - b.offset
				// At the same tick: set meter, then realign, then events.
				return rank(a.kind) - rank(b.kind)
			})

			let previousOffset = null
			for (const item of items) {
				if (previousOffset !== item.offset) {
					nextEventDelta = item.offset - sectionDeltaSum
					sectionDeltaSum += nextEventDelta
					previousOffset = item.offset
				}

				if (item.kind === 'meter') {
					const [num, den] = item.timeSignature.split('/').map(x => parseInt(x))
					track.setTimeSignature(num, den)
					currentTimeSig = item.timeSignature
					beatsPerMeasure = num
					timeDivision = den
					if (timeSigCarriers.length > 0) {
						const ccValue = getTimeSignatureCCValue(item.timeSignature)
						let first = true
						for (const et of timeSigCarriers) {
							track.addEvent(new ControllerChangeEvent({
								controllerNumber: et.ccNumber,
								controllerValue: ccValue,
								channel: et.midiChannel,
								delta: first ? nextEventDelta : 0,
							}))
							first = false
						}
					}
					nextEventDelta = 0
					continue
				}

				if (item.kind === 'realign') {
					track.addEvent(buildMidiEvent(realignEvent, nextEventDelta))
					nextEventDelta = 0
					continue
				}

				const event = item.event
				if (event.event === 'variax-tuning' && Array.isArray(event.tuning)) {
					currentTuning = event.tuning
					emitTuningCCs(track, currentTuning, nextEventDelta)
					previousEventPosition = event.position
					nextEventDelta = 0
					continue
				}

				const reinforce = writeSpecEvent(event.event, event.parameter, nextEventDelta, track, eventTypes)
				previousEventPosition = event.position
				nextEventDelta = 0
				if (reinforce) {
					emitTuningCCs(track, currentTuning, TUNING_REINFORCE_OFFSET_TICKS)
					sectionDeltaSum += TUNING_REINFORCE_OFFSET_TICKS
				}
			}
		}

		nextEventDelta += sectionTickLength - sectionDeltaSum
		sectionStartTick += sectionTickLength
	}

	// Song-end events
	if (songEndEvents.length > 0) {
		let first = true
		for (const et of songEndEvents) {
			track.addEvent(buildMidiEvent(et, first ? nextEventDelta : 0))
			first = false
		}
	}

	const write = new Writer(track)
	return Buffer.from(write.buildFile())
}

module.exports = { generateMidi }
