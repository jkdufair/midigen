#!/usr/bin/env node

//#region Imports
const fs = require('fs')
const midiWriter = require('./midi-writer-js.cjs')
const {ControllerChangeEvent, ProgramChangeEvent, Track, Utils, Writer} = midiWriter
//#endregion Imports

//#region Constants

const vl3Channel = 1
const vl3Harmony = 110
const vl3Double = 111

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
		case 'vocal-double-on':
			return new ControllerChangeEvent({
				controllerNumber: vl3Double,
				controllerValue: on,
				channel: vl3Channel,
				delta: delta
			})
		case 'vocal-double-off':
			return new ControllerChangeEvent({
				controllerNumber: vl3Double,
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
		// TODO: Currently, this chokes if it's right at the start of the section. Figure out why.
		case 'hd500x-patch-change':
			return [
				new ControllerChangeEvent({channel: hd500xChannel, controllerNumber: 0, controllerValue: 0, delta: delta}),
				new ControllerChangeEvent({channel: hd500xChannel, controllerNumber: 32, controllerValue: 6, delta: 0}),
				new ProgramChangeEvent({channel: hd500xChannel - 1, instrument: hd500xProgram(parameter), delta: 0})
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

const channelToDevice = (channel) => {
  switch (channel) {
      case 0:
        return 'VL3'
      case 1:
        return 'HD500x'
      case 2:
        return 'RC-5'
      case 3:
        return 'OnSong'
  }
}

const writeSpecEvent = (event, delta, track) => {
		const eventOrEvents = eventFromName(event.event, delta, event.parameter)
		if (Array.isArray(eventOrEvents)) {
			eventOrEvents.forEach(e => {
				track.addEvent(e)
		    console.log(`${channelToDevice(e.channel)} ${e.name} after ${e.delta}`)
			})
		} else {
			track.addEvent(eventOrEvents)
		    console.log(`${channelToDevice(eventOrEvents.channel)} ${eventOrEvents.name} after ${eventOrEvents.delta}`)
		}

}

//#endregion Support Functions

const track = new Track()

// Get the spec file
const inputFile = process.argv[2]
const spec = JSON.parse(fs.readFileSync(inputFile, 'utf8'))

// Set time signature and tempo
const [timeBeats, timeDivision] = spec.timeSignature.split('/').map(x => parseInt(x))
track.setTimeSignature(timeBeats, timeDivision)
track.setTempo(spec.tempo)

// Initial program change for VL3 and HD500X
track.addEvent(new ProgramChangeEvent({channel: vl3Channel - 1, instrument: spec.vl3Program - 1}))

// "Main" bank on HD500X
// TODO: Make the setlist configurable
track.addEvent(new ControllerChangeEvent({channel: hd500xChannel, controllerNumber: 0, controllerValue: 0, delta: 0}))
track.addEvent(new ControllerChangeEvent({channel: hd500xChannel, controllerNumber: 32, controllerValue: 6, delta: 0}))
track.addEvent(new ProgramChangeEvent({channel: hd500xChannel - 1, instrument: hd500xProgram(spec.hd500xProgram), delta: 0}))

// Reset RC-5
track.addEvent(eventFromName('rc5-clear', 0))

// Set delta to the start of the first measure
// Add an extra 32nd note since OnSong seems to take that long to start the track after starting the metronome.
let nextEventDelta = Utils.getTickDuration('1')

// Iterate over sections and add events
spec.sections.forEach(section => {
	let sectionTickLength = ticksFromLength(section.length)
	console.log(`----- ${section.name}: ${sectionTickLength} -----`)

	let previousEventPosition = ""
	let sectionDeltaSum = 0
	let sectionTickPointer = 0
	// Write all the 1.1.1 events first, if any. First one gets written at the
	// section's nextEventDelta. Rest are delta 0
	section.events?.filter(event => event.position === '1.1.1').forEach(event => {
		writeSpecEvent(event, nextEventDelta, track)
		nextEventDelta = 0
	})

	// Write the OnSong section change 16 ticks later
	let stupidOnSongOffset = 16
	track.controllerChange(onSongNextSection, on, onSongChannel, nextEventDelta + stupidOnSongOffset)
	nextEventDelta = 0
	sectionDeltaSum += stupidOnSongOffset
	sectionTickPointer += stupidOnSongOffset

	// Iterate over remaining events. First one will be shifted 16 ticks earlier to account for the section
	// change being 16 ticks later and have it line up to the proper position
	section.events?.filter(event => event.position !== '1.1.1').forEach(event => {
		if (previousEventPosition !== event.position) {
			const eventOffsetFromSectionStart = ticksFromPosition(event.position)
			nextEventDelta = eventOffsetFromSectionStart - sectionTickPointer
			sectionDeltaSum += nextEventDelta
			sectionTickPointer += nextEventDelta
    }
		writeSpecEvent(event, nextEventDelta, track)
    previousEventPosition = event.position
		nextEventDelta = 0
	})

	nextEventDelta += sectionTickLength - sectionTickPointer
	sectionDeltaSum += nextEventDelta

  console.log(`Section delta sum: ${sectionDeltaSum}`)
	console.log()
})

// Stop the metronome
track.addEvent(eventFromName('metronome-stop', nextEventDelta))

// Stop the RC-5
track.addEvent(eventFromName('rc5-clear', 0))

const write = new Writer(track)

console.log(JSON.stringify(track, null, 4)
                .replaceAll('"channel": 0', '---VL3---')
                .replaceAll('"channel": 1', '---HD500X---')
                .replaceAll('"channel": 2', '---RC5---')
                .replaceAll('"channel": 3', '---OnSong---')
                .replaceAll(/\"status.*?,[\s\S]/g, '')
                .replaceAll(/\"data.*?\[[\s\S]*?\]/g, '')
                .replaceAll('            "name": "Program', '"name": "Program'))

const buffer = new Buffer.from(write.buildFile())
const outputFile = process.argv[2].replace('.json', '.mid')
fs.writeFileSync(outputFile, buffer)
