'use strict'

/**
 * @typedef {import('./types').SongSpec} SongSpec
 * @typedef {import('./types').EventTypeConfig} EventTypeConfig
 */

const midiWriter = require('./midi-writer-js.cjs')
const { ControllerChangeEvent, ProgramChangeEvent, Track, Utils, Writer } = midiWriter

// Section-change events fire slightly after any 1.1.1 events
const SECTION_CHANGE_OFFSET_TICKS = 16

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
	if (!eventType) return // silently skip — validation happens at import time
	track.addEvent(buildMidiEvent(eventType, delta, parameter))
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
	const [beatsPerMeasure, timeDivision] = spec.timeSignature.split('/').map(x => parseInt(x))
	track.setTimeSignature(beatsPerMeasure, timeDivision)
	track.setTempo(spec.tempo)

	const sectionChangeEvents = eventTypes.filter(et => et.onSectionChange)
	const songEndEvents = eventTypes.filter(et => et.onSongEnd)

	// Start delta at 1 measure (count-off before the song begins)
	let nextEventDelta = Utils.getTickDuration(['1'], beatsPerMeasure)

	for (const section of spec.sections) {
		const sectionTickLength = ticksFromLength(section.length, beatsPerMeasure)
		let sectionDeltaSum = 0
		let previousEventPosition = ''

		// Events at 1.1.1 fire at the section boundary
		for (const event of (section.events ?? []).filter(e => e.position === '1.1.1')) {
			writeSpecEvent(event.event, event.parameter, nextEventDelta, track, eventTypes)
			nextEventDelta = 0
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

		// Remaining events sorted by position
		for (const event of (section.events ?? []).filter(e => e.position !== '1.1.1')) {
			if (previousEventPosition !== event.position) {
				const eventOffsetFromSectionStart = ticksFromPosition(event.position, beatsPerMeasure)
				nextEventDelta = eventOffsetFromSectionStart - sectionDeltaSum
				sectionDeltaSum += nextEventDelta
			}
			writeSpecEvent(event.event, event.parameter, nextEventDelta, track, eventTypes)
			previousEventPosition = event.position
			nextEventDelta = 0
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
