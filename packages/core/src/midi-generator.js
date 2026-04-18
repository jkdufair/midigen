'use strict'

/**
 * @typedef {import('./types').SongSpec} SongSpec
 * @typedef {import('./types').EventTypeConfig} EventTypeConfig
 */

const midiWriter = require('./midi-writer-js.cjs')
const { ControllerChangeEvent, ProgramChangeEvent, Track, Utils, Writer } = midiWriter

// Section-change events fire slightly after any 1.1.1 events
const SECTION_CHANGE_OFFSET_TICKS = 16

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

/**
 * @param {string} length - "measures.beats.subdivisions"
 * @param {number} beatsPerMeasure
 * @returns {number}
 */
function ticksFromLength(length, beatsPerMeasure) {
	const [measures, beats, subdivisions] = length.split('.').map(x => parseInt(x))
	return (
		Utils.getTickDuration('1', beatsPerMeasure) * measures +
		Utils.getTickDuration('4', beatsPerMeasure) * beats +
		Utils.getTickDuration('16', beatsPerMeasure) * subdivisions
	)
}

/**
 * @param {string} position - "measures.beats.subdivisions" (1-based)
 * @param {number} beatsPerMeasure
 * @returns {number}
 */
function ticksFromPosition(position, beatsPerMeasure) {
	const [measures, beats, subdivisions] = position.split('.').map(x => parseInt(x))
	return (
		Utils.getTickDuration('1', beatsPerMeasure) * (measures - 1) +
		Utils.getTickDuration('4', beatsPerMeasure) * (beats - 1) +
		Utils.getTickDuration('16', beatsPerMeasure) * (subdivisions - 1)
	)
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
	const tuning = Array.isArray(spec.tuning) ? spec.tuning : [0, 0, 0, 0, 0, 0]
	emitTuningCCs(track, tuning, 0)

	// Start delta at 1 measure (count-off before the song begins).
	// Use string '1' (not array ['1']) so beatsPerMeasure is forwarded — the array
	// variant ignores the second argument and always defaults to 4/4 (512 ticks).
	let nextEventDelta = Utils.getTickDuration('1', beatsPerMeasure)

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

		const sectionTickLength = ticksFromLength(section.length, beatsPerMeasure)
		let sectionDeltaSum = 0
		let previousEventPosition = ''

		// Events at 1.1.1 fire at the section boundary
		let needsTuningReinforce = false
		for (const event of (section.events ?? []).filter(e => e.position === '1.1.1')) {
			if (writeSpecEvent(event.event, event.parameter, nextEventDelta, track, eventTypes))
				needsTuningReinforce = true
			nextEventDelta = 0
		}
		if (needsTuningReinforce) {
			emitTuningCCs(track, tuning, TUNING_REINFORCE_OFFSET_TICKS)
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

		// Remaining events sorted by position (skip any beyond section boundary)
		for (const event of (section.events ?? []).filter(e => e.position !== '1.1.1')) {
			const eventOffsetFromSectionStart = ticksFromPosition(event.position, beatsPerMeasure)
			if (eventOffsetFromSectionStart >= sectionTickLength) continue

			if (previousEventPosition !== event.position) {
				nextEventDelta = eventOffsetFromSectionStart - sectionDeltaSum
				sectionDeltaSum += nextEventDelta
			}
			const reinforce = writeSpecEvent(event.event, event.parameter, nextEventDelta, track, eventTypes)
			previousEventPosition = event.position
			nextEventDelta = 0
			if (reinforce) {
				emitTuningCCs(track, tuning, TUNING_REINFORCE_OFFSET_TICKS)
				sectionDeltaSum += TUNING_REINFORCE_OFFSET_TICKS
			}
		}

		nextEventDelta += sectionTickLength - sectionDeltaSum
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
