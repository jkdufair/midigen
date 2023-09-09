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

const rc5Channel = 3
const rc5RecPlay = 80
const rc5Clear = 82
const rc5Delta = Utils.getTickDuration('16')

const onSongChannel = 4
const onSongNextSection = 1
const onSongStartMetronome = 2
const onSongStopMetronome = 3

const on = 127
const off = 0

//#endregion Constants

//#region Support Functions

const hd500xProgram = (programPreset) => {
	const [_, bank, preset] = programPreset.split(/(\d+)/)
	const offset = preset.charCodeAt(0) - 65
	return (parseInt(bank) - 1) * 4 + offset
}

const ticksFromPosition = (position) => {
	const [measures, beats, subdivisions] = position.split('.').map(x => parseInt(x))

	// TODO: Make sure this works with all time signatures
	return Utils.getTickDuration('1') * measures +
		Utils.getTickDuration('4') * beats +
		Utils.getTickDuration('16') * subdivisions
}

const eventFromName = (eventName, delta) => {
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

		case 'rc5-rec-play':
			return [
				new ControllerChangeEvent({
					controllerNumber: rc5RecPlay, controllerValue: on, channel: rc5Channel, delta: delta - rc5Delta
				}),
				new ControllerChangeEvent({
					controllerNumber: rc5RecPlay, controllerValue: off, channel: rc5Channel, delta: rc5Delta
				})
			]
		case 'rc5-stop':
			return [
				new ControllerChangeEvent({
					controllerNumber: rc5RecPlay, controllerValue: on, channel: rc5Channel, delta: delta - (rc5Delta * 3)
				}),
				new ControllerChangeEvent({
					controllerNumber: rc5RecPlay, controllerValue: off, channel: rc5Channel, delta: rc5Delta
				}),
				new ControllerChangeEvent({
					controllerNumber: rc5RecPlay, controllerValue: on, channel: rc5Channel, delta: rc5Delta
				}),
				new ControllerChangeEvent({
					controllerNumber: rc5RecPlay, controllerValue: off, channel: rc5Channel, delta: rc5Delta
				})
			]
		case 'rc5-clear':
			return [
				new ControllerChangeEvent({
					controllerNumber: rc5Clear, controllerValue: on, channel: rc5Channel, delta: delta
				}),
				new ControllerChangeEvent({
					controllerNumber: rc5Clear, controllerValue: off, channel: rc5Channel, delta: rc5Delta
				})
			]

		case 'metronome-start':
			return new ControllerChangeEvent({
				controllerNumber: onSongStartMetronome,
				controllerValue: on,
				channel: onSongChannel,
				delta: delta
			})
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
track.addEvent(new ProgramChangeEvent({channel: vl3Channel, instrument: spec.vl3Program}))
track.addEvent(new ProgramChangeEvent({channel: hd500xChannel, instrument: hd500xProgram(spec.hd500xProgram)}))

// Start metronome
track.addEvent(eventFromName('metronome-start', 0))

// Reset RC-5
track.addEvent(eventFromName('rc5-clear', 0))

// Set delta to the start of the first measure
let delta = Utils.getTickDuration('1') - rc5Delta

// Iterate over sections and add events
spec.sections.forEach(section => {
	// Handle stupid RC-5 if it's the first event in the section with an offset of 0
	const events = section.events
	if (events != null && events.length > 0 && events[0].event.startsWith('rc5') && events[0].position === '0.0.0') {
		console.log('rc5-event')
		eventFromName(events[0].event, delta).forEach(e => {
			console.log(e)
			track.addEvent(e)
		})
		delta = 0
		events.shift()
	}
	track.controllerChange(onSongNextSection, 64, onSongChannel, delta)
	delta = 0

	let sectionTicksLeft = ticksFromPosition(section.length)
	let previousEventPosition = ""
	events?.forEach(event => {
		if (previousEventPosition !== event.position) {
			const eventOffsetFromSectionStart = ticksFromPosition(event.position)
			delta += eventOffsetFromSectionStart
			sectionTicksLeft -= eventOffsetFromSectionStart
		} else {
			delta = 0
		}
		const eventOrEvents = eventFromName(event.event, delta)
		if (Array.isArray(eventOrEvents)) {
			eventOrEvents.forEach(e => {
				track.addEvent(e)
			})
		} else {
			track.addEvent(eventOrEvents)
		}
		previousEventPosition = event.position
	})
	delta += sectionTicksLeft
})

// Stop the metronome
track.addEvent(eventFromName('metronome-stop', delta))

const write = new Writer(track)

console.log(track)

const buffer = new Buffer.from(write.buildFile())
fs.writeFileSync('test.mid', buffer)
