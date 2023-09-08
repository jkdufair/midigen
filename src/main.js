const fs = require('fs')
const midiWriter = require('./midi-writer-js.cjs')
const { ControllerChangeEvent, ProgramChangeEvent, Track, Utils, Writer } = midiWriter

const vl3Channel = 1
const vl3Harmony = 110

const hd500xChannel = 2
const hd500xFootswitch1 = 51

const rc5Channel = 3
const rc5RecPlay = 80
const rc5Stop = 81
const rc5Clear = 82
const rc5Delta = Utils.getTickDuration('16')

const onSongChannel = 4
const onSongNextSection = 1
const onSongStartMetronome = 2
const onSongStopMetronome = 3

const on = 127
const off = 0

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
			return new ControllerChangeEvent({ controllerNumber: vl3Harmony, controllerValue: on, channel: vl3Channel, delta: delta })
		case 'harmony-off':
			return new ControllerChangeEvent({ controllerNumber: vl3Harmony, controllerValue: off, channel: vl3Channel, delta: delta })

		case 'hd500x-fs1-on':
			return new ControllerChangeEvent({ controllerNumber: hd500xFootswitch1, controllerValue: on, channel: hd500xChannel, delta: delta })
		case 'hd500x-fs1-off':
			return new ControllerChangeEvent({ controllerNumber: hd500xFootswitch1, controllerValue: off, channel: hd500xChannel, delta: delta })

		case 'rc5-clear-down':
			return new ControllerChangeEvent({ controllerNumber: rc5Clear, controllerValue: on, channel: rc5Channel, delta: delta })
		case 'rc5-clear-up':
			return new ControllerChangeEvent({ controllerNumber: rc5Clear, controllerValue: off, channel: rc5Channel, delta: delta })

		case 'metronome-start':
			return new ControllerChangeEvent({ controllerNumber: onSongStartMetronome, controllerValue: on, channel: onSongChannel, delta: delta })
		case 'metronome-stop':
			return new ControllerChangeEvent({ controllerNumber: onSongStopMetronome, controllerValue: on, channel: onSongChannel, delta: delta })
	}
}

//#endregion

const track = new Track()

// Get the spec file
const inputFile = process.argv[2]
const spec = JSON.parse(fs.readFileSync(inputFile, 'utf8'))


// Set tempo and time signature
const [time_beats, time_division] = spec.timeSignature.split('/').map(x => parseInt(x))
track.setTempo(spec.tempo)
track.setTimeSignature(time_beats, time_division)

// Program change for VL3 and HD500X
track.addEvent(new ProgramChangeEvent({ channel: vl3Channel, instrument: spec.vl3Program }))
track.addEvent(new ProgramChangeEvent({ channel: hd500xChannel, instrument: hd500xProgram(spec.hd500xProgram) }))

// Start metronome
track.addEvent(eventFromName('metronome-start', 0))

// Reset RC-5
track.addEvent(eventFromName('rc5-clear-down', 0))
track.addEvent(eventFromName('rc5-clear-up', rc5Delta))

// Set delta to the start of the first measure
let delta = Utils.getTickDuration('1') - rc5Delta

// Iterate over sections and add events
spec.sections.forEach(section => {
	track.controllerChange(onSongNextSection, on, onSongChannel, delta)
  delta = 0

	let sectionTicks = ticksFromPosition(section.length)
  let previousEventPosition = ""
	section.events?.forEach(event => {
		if (previousEventPosition !== event.position) {
			const eventDelta = ticksFromPosition(event.position)
			delta += eventDelta
			sectionTicks -= eventDelta
		} else {
			delta = 0
		}
		track.addEvent(eventFromName(event.event, delta))
		previousEventPosition = event.position
	})
  delta += sectionTicks
})

// Stop the metronome
track.addEvent(eventFromName('metronome-stop', delta))

const write = new Writer(track)

console.log(track)

const buffer = new Buffer.from(write.buildFile())
fs.writeFileSync('test.mid', buffer)
