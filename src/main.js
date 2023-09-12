#!/usr/bin/env node

//#region Imports
const fs = require('fs')
const midiWriter = require('./midi-writer-js.cjs')
const {ControllerChangeEvent, ProgramChangeEvent, Track, Utils, Writer} = midiWriter
//#endregion Imports

//#region Constants

const vl3Channel = 1
const vl3Harmony = 110

const hd500xChannel = 2
const hd500xFootswitch1 = 51
const hd500xFootswitch2 = 52
const hd500xFootswitch3 = 53
const hd500xFootswitch4 = 54

const rc5Channel = 3
const rc5RecPlay = 80
const rc5Clear = 82

const onSongChannel = 4
const onSongNextSection = 1
const onSongStopMetronome = 3

const on = 127
const off = 0

//#endregion Constants

//#region Support Functions

const hd500xProgram = (programPreset) => {
	const [_, bank, preset] = programPreset.split(/(\d+)/)
	const offset = preset.charCodeAt(0) - 65 + 1
	return (parseInt(bank) - 1) * 4 + offset - 1
}

const ticksFromLength = (length) => {
	const [measures, beats, subdivisions] = length.split('.').map(x => parseInt(x))

	// TODO: Make sure this works with all time signatures
	return Utils.getTickDuration('1') * measures +
		Utils.getTickDuration('4') * beats +
		Utils.getTickDuration('16') * subdivisions
}

const ticksFromPosition = (position) => {
	const [measures, beats, subdivisions] = position.split('.').map(x => parseInt(x))

	// TODO: Make sure this works with all time signatures
	// Note: position specification is 1-based (i.e. 1.1.1 is the start of the measure)
	return Utils.getTickDuration('1') * (measures - 1) +
		Utils.getTickDuration('4') * (beats - 1) +
		Utils.getTickDuration('16') * (subdivisions - 1)
}

const eventFromName = (eventName, delta, parameter) => {
	switch (eventName) {
		case 'harmony-on':
			return new ControllerChangeEvent({
				controllerNumber: vl3Harmony,
				controllerValue: on,
				channel: vl3Channel,
				delta: delta
			})
		case 'harmony-off':
			return new ControllerChangeEvent({
				controllerNumber: vl3Harmony,
				controllerValue: off,
				channel: vl3Channel,
				delta: delta
			})

		case 'hd500x-fs1-on':
			return new ControllerChangeEvent({
				controllerNumber: hd500xFootswitch1,
				controllerValue: on,
				channel: hd500xChannel,
				delta: delta
			})
		case 'hd500x-fs1-off':
			return new ControllerChangeEvent({
				controllerNumber: hd500xFootswitch1,
				controllerValue: off,
				channel: hd500xChannel,
				delta: delta
			})
		case 'hd500x-fs2-on':
			return new ControllerChangeEvent({
				controllerNumber: hd500xFootswitch2,
				controllerValue: on,
				channel: hd500xChannel,
				delta: delta
			})
		case 'hd500x-fs2-off':
			return new ControllerChangeEvent({
				controllerNumber: hd500xFootswitch2,
				controllerValue: off,
				channel: hd500xChannel,
				delta: delta
			})
		case 'hd500x-fs3-on':
			return new ControllerChangeEvent({
				controllerNumber: hd500xFootswitch3,
				controllerValue: on,
				channel: hd500xChannel,
				delta: delta
			})
		case 'hd500x-fs3-off':
			return new ControllerChangeEvent({
				controllerNumber: hd500xFootswitch3,
				controllerValue: off,
				channel: hd500xChannel,
				delta: delta
			})
		case 'hd500x-fs4-on':
			return new ControllerChangeEvent({
				controllerNumber: hd500xFootswitch4,
				controllerValue: on,
				channel: hd500xChannel,
				delta: delta
			})
		case 'hd500x-fs4-off':
			return new ControllerChangeEvent({
				controllerNumber: hd500xFootswitch4,
				controllerValue: off,
				channel: hd500xChannel,
				delta: delta
			})
		case 'hd500x-patch-change':
			return [
				new ControllerChangeEvent({channel: hd500xChannel, controllerNumber: 0, controllerValue: 0, delta: delta}),
				new ControllerChangeEvent({channel: hd500xChannel, controllerNumber: 32, controllerValue: 6, delta: 0}),
				new ProgramChangeEvent({channel: hd500xChannel - 1, instrument: hd500xProgram(parameter)})
			]

		case 'rc5-rec-play':
			return [
				new ControllerChangeEvent({
					controllerNumber: rc5RecPlay, controllerValue: on, channel: rc5Channel, delta: delta
				}),
				new ControllerChangeEvent({
					controllerNumber: rc5RecPlay, controllerValue: off, channel: rc5Channel, delta: 0
				})
			]
		case 'rc5-stop':
			return [
				new ControllerChangeEvent({
					controllerNumber: rc5RecPlay, controllerValue: on, channel: rc5Channel, delta: delta
				}),
				new ControllerChangeEvent({
					controllerNumber: rc5RecPlay, controllerValue: off, channel: rc5Channel, delta: 0
				}),
				new ControllerChangeEvent({
					controllerNumber: rc5RecPlay, controllerValue: on, channel: rc5Channel, delta: 0
				}),
				new ControllerChangeEvent({
					controllerNumber: rc5RecPlay, controllerValue: off, channel: rc5Channel, delta: 0
				})
			]
		case 'rc5-clear':
			return [
				new ControllerChangeEvent({
					controllerNumber: rc5Clear, controllerValue: on, channel: rc5Channel, delta: delta
				}),
				new ControllerChangeEvent({
					controllerNumber: rc5Clear, controllerValue: off, channel: rc5Channel, delta: 0
				})
			]


		case 'metronome-stop':
			return new ControllerChangeEvent({
				controllerNumber: onSongStopMetronome,
				controllerValue: on,
				channel: onSongChannel,
				delta: delta
			})
	}
}

//#endregion Support Functions

const track = new Track()

// Get the spec file
const inputFile = process.argv[2]
const spec = JSON.parse(fs.readFileSync(inputFile, 'utf8'))

// Set time signature and tempo
const [time_beats, time_division] = spec.timeSignature.split('/').map(x => parseInt(x))
track.setTimeSignature(time_beats, time_division)
track.setTempo(spec.tempo)

// Initial program change for VL3 and HD500X
track.addEvent(new ProgramChangeEvent({channel: vl3Channel - 1, instrument: spec.vl3Program - 1}))
// "Main" bank on HD500X
// TODO: Make the setlist configurable
track.addEvent(new ControllerChangeEvent({channel: hd500xChannel, controllerNumber: 0, controllerValue: 0, delta: 0}))
track.addEvent(new ControllerChangeEvent({channel: hd500xChannel, controllerNumber: 32, controllerValue: 6, delta: 0}))
track.addEvent(new ProgramChangeEvent({channel: hd500xChannel - 1, instrument: hd500xProgram(spec.hd500xProgram)}))

// Reset RC-5
track.addEvent(eventFromName('rc5-clear', 0))

// Set delta to the start of the first measure
// Add an extra 32nd note since OnSong seems to take that long to start the track after starting the metronome.
let nextEventDelta = Utils.getTickDuration(['1', '32'])

// Iterate over sections and add events
spec.sections.forEach(section => {
	// Move the pointer in OnSong to the next section
	track.controllerChange(onSongNextSection, on, onSongChannel, nextEventDelta)
	nextEventDelta = 0

	let sectionTickLength = ticksFromLength(section.length)
	let previousEventPosition = ""
	let sectionTickPointer = 0

	section.events?.forEach(event => {
		if (previousEventPosition !== event.position) {
			const eventOffsetFromSectionStart = ticksFromPosition(event.position)
			nextEventDelta = eventOffsetFromSectionStart - sectionTickPointer
			sectionTickPointer += nextEventDelta
		}
		previousEventPosition = event.position
		const eventOrEvents = eventFromName(event.event, nextEventDelta, event.parameter)
		if (Array.isArray(eventOrEvents)) {
			eventOrEvents.forEach(e => {
				track.addEvent(e)
			})
		} else {
			track.addEvent(eventOrEvents)
		}
		nextEventDelta = 0
	})
	// This will either be 0 if an event was issued during the section or it will accumulate in sections without events
	nextEventDelta += sectionTickLength - sectionTickPointer
})

// Stop the metronome
track.addEvent(eventFromName('metronome-stop', nextEventDelta))
// Stop the RC-5
track.addEvent(eventFromName('rc5-clear', 0))

const write = new Writer(track)

console.log(track)

const buffer = new Buffer.from(write.buildFile())
const outputFile = process.argv[2].replace('.json', '.mid')
fs.writeFileSync(outputFile, buffer)
