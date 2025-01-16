#!/usr/bin/env node

//#region Imports

const fs = require('fs')
const midiWriter = require('./midi-writer-js.cjs')
const {ControllerChangeEvent, NoteEvent, ProgramChangeEvent, Track, Utils, Writer} = midiWriter
const winston = require('winston')

// Click track generation libs
// const child_process = require("child_process")
// const WaveFile = require('wavefile').WaveFile

//#endregion Imports

//#region Logging

const logger = winston.createLogger({
	level: 'info',
	format: winston.format.json(),
	transports: [
		new winston.transports.Console({
			format: winston.format.simple()
		})
	]
})

//#endregion Logging

//#region Constants

const harmonyChannel = 1
const harmonyVoice1Controller = 110
const harmonyVoice2Controller = 111

const helixChannel = 2
const helixSnapshot = 69

const loopyChannel = 3
const loopyGuitarController = 80
const loopyVocalController = 86

const onSongChannel = 4
const onSongNextSection = 1
const onSongStartMetronome = 126
const onSongStopMetronome = 3

const on = 127
const off = 0

//#endregion Constants

//#region Support Functions

const ticksFromLength = (length, beatsPerMeasure) => {
	const [measures, beats, subdivisions] = length.split('.').map(x => parseInt(x))

	return Utils.getTickDuration('1', beatsPerMeasure) * measures +
		Utils.getTickDuration('4', beatsPerMeasure) * beats +
		Utils.getTickDuration('16', beatsPerMeasure) * subdivisions
}

const ticksFromPosition = (position, beatsPerMeasure) => {
	const [measures, beats, subdivisions] = position.split('.').map(x => parseInt(x))

	// Note: position specification is 1-based (i.e. 1.1.1 is the start of the measure)
	// 8.4.4 is, i.e., the point at the 8th measure, 4th beat, 4th 16th note
	return Utils.getTickDuration('1', beatsPerMeasure) * (measures - 1) +
		Utils.getTickDuration('4', beatsPerMeasure) * (beats - 1) +
		Utils.getTickDuration('16', beatsPerMeasure) * (subdivisions - 1)
}

const eventFromName = (eventName, delta, parameter) => {
	switch (eventName) {
		case 'harmony-on':
			return new ControllerChangeEvent({
				controllerNumber: harmonyVoice1Controller,
				controllerValue: on,
				channel: harmonyChannel,
				delta: delta
			})
		case 'harmony-off':
			return new ControllerChangeEvent({
				controllerNumber: harmonyVoice1Controller,
				controllerValue: off,
				channel: harmonyChannel,
				delta: delta
			})
		case 'vocal-double-on':
			return new ControllerChangeEvent({
				controllerNumber: harmonyVoice2Controller,
				controllerValue: on,
				channel: harmonyChannel,
				delta: delta
			})
		case 'vocal-double-off':
			return new ControllerChangeEvent({
				controllerNumber: harmonyVoice2Controller,
				controllerValue: off,
				channel: harmonyChannel,
				delta: delta
			})
		case 'vocal-patch-change':
			return new ProgramChangeEvent({
				channel: harmonyChannel - 1,
				instrument: parameter - 1,
				delta: delta
			})
		case 'vocal-loop-record':
			return new ControllerChangeEvent({
				controllerNumber: loopyVocalController + parameter - 1, controllerValue: on, channel: loopyChannel, delta: delta
			})
		case 'vocal-loop-play':
			return new ControllerChangeEvent({
				controllerNumber: loopyVocalController + parameter - 1, controllerValue: off, channel: loopyChannel, delta: delta
			})
		case 'vocal-loop-stop':
			return new ControllerChangeEvent({
				controllerNumber: loopyVocalController + parameter, controllerValue: off, channel: loopyChannel, delta: delta
			})
		case 'vocal-loop-clear':
			return new ControllerChangeEvent({
				controllerNumber: loopyVocalController + parameter, controllerValue: on, channel: loopyChannel, delta: delta
			})


		case 'helix-snapshot':
			return new ControllerChangeEvent({
				controllerNumber: helixSnapshot,
				controllerValue: parameter - 1,
				channel: helixChannel,
				delta: delta
			})

		case 'guitar-loop-record':
			return new ControllerChangeEvent({
					controllerNumber: loopyGuitarController + parameter - 1, controllerValue: on, channel: loopyChannel, delta: delta
				})
		case 'guitar-loop-play':
			return new ControllerChangeEvent({
					controllerNumber: loopyGuitarController + parameter - 1, controllerValue: off, channel: loopyChannel, delta: delta
				})
		case 'guitar-loop-stop':
			return new ControllerChangeEvent({
					controllerNumber: loopyGuitarController + parameter, controllerValue: off, channel: loopyChannel, delta: delta
				})
		case 'guitar-loop-clear':
			return new ControllerChangeEvent({
				controllerNumber: loopyGuitarController + parameter, controllerValue: on, channel: loopyChannel, delta: delta
			})

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
		default:
			console.log(`Unknown event: ${eventName}`)
	}
}

const writeSpecEvent = (event, delta, track) => {
		const eventOrEvents = eventFromName(event.event, delta, event.parameter)
		if (Array.isArray(eventOrEvents)) {
			eventOrEvents.forEach(e => {
				track.addEvent(e)
			})
		} else {
			track.addEvent(eventOrEvents)
		}

}

//#endregion Support Functions

let track = new Track()

// Get the spec file
const inputFile = process.argv[2]
// TODO: Typescript this BS
const spec = JSON.parse(fs.readFileSync(inputFile, 'utf8'))
if (!spec.title) return

logger.info(`${spec.title} (${spec.tempo} BPM)`)

// Set time signature and tempo
const [beatsPerMeasure, timeDivision] = spec.timeSignature.split('/').map(x => parseInt(x))
track.setTimeSignature(beatsPerMeasure, timeDivision)
track.setTempo(spec.tempo)

// Set delta to the start of the first measure (count off) TODO: Make this configurable
let nextEventDelta = Utils.getTickDuration(['1'], beatsPerMeasure)
let totalMeasures = 1

// Iterate over sections and add events
spec.sections.forEach(section => {
	let sectionTickLength = ticksFromLength(section.length, beatsPerMeasure)
	// TODO: handle sections with partial measures
	totalMeasures += parseInt(section.length.split('.')[0])
	logger.verbose(`totalMeasures: ${totalMeasures}`)
	logger.verbose(`----- ${section.name}: ${sectionTickLength} -----`)

	let previousEventPosition = ""
	let sectionDeltaSum = 0
	// Write all the 1.1.1 events first, if any. First one gets written at the
	// section's nextEventDelta. Rest are delta 0
	logger.debug('1.1.1 events')
	section.events?.filter(event => event.position === '1.1.1').forEach(event => {
		logger.verbose(`-- Event ${event.event} at ${event.position} --`)
		logger.debug(`nextEventDelta: ${nextEventDelta}`)
		writeSpecEvent(event, nextEventDelta, track)
		nextEventDelta = 0
		logger.debug('nextEventDelta reset to 0')
	})
	logger.debug('End of 1.1.1 events')
	logger.debug('')

	// Write the OnSong section change 16 ticks later
	const stupidOnSongOffset = 16
	track.controllerChange(onSongNextSection, on, onSongChannel, nextEventDelta + stupidOnSongOffset)
	logger.debug(`OnSong section change at ${nextEventDelta + stupidOnSongOffset} (nextEventDelta: ${nextEventDelta})`)
	nextEventDelta = 0
	logger.debug('nextEventDelta reset to 0')
	sectionDeltaSum += stupidOnSongOffset
	logger.debug(`sectionDeltaSum: ${sectionDeltaSum}`)
	logger.debug()

	section.events?.filter(event => event.position !== '1.1.1').forEach(event => {
		logger.verbose(`-- Event ${event.event} at ${event.position} --`)
		if (previousEventPosition !== event.position) {
			logger.debug('Event position changed')
			const eventOffsetFromSectionStart = ticksFromPosition(event.position, beatsPerMeasure)
			logger.debug(`Event offset from section start: ${eventOffsetFromSectionStart}`)
			nextEventDelta = eventOffsetFromSectionStart - sectionDeltaSum
			logger.debug(`nextEventDelta: ${nextEventDelta}`)
			sectionDeltaSum += nextEventDelta
			logger.debug(`sectionDeltaSum: ${sectionDeltaSum}`)
    }
		writeSpecEvent(event, nextEventDelta, track)
		logger.debug(`Event written at ${nextEventDelta}`)
    previousEventPosition = event.position
		logger.debug(`previousEventPosition set to event position: ${event.position}`)
		nextEventDelta = 0
		logger.debug('nextEventDelta reset to 0')
		logger.debug()
	})
	logger.verbose('Sections done')

	nextEventDelta += sectionTickLength - sectionDeltaSum
	logger.debug(`nextEventDelta: ${nextEventDelta}`)
	sectionDeltaSum += nextEventDelta
	logger.debug(`sectionDeltaSum: ${sectionDeltaSum}`)
	logger.debug('')
})

// Stop the metronome
track.addEvent(eventFromName('metronome-stop', nextEventDelta))

const write = new Writer(track)

logger.verbose(JSON.stringify(track, null, 4)
                .replaceAll('"channel": 0', '---VL3---')
                .replaceAll('"channel": 1', '---Helix---')
                .replaceAll('"channel": 2', '---Guitar1 Loop---')
                .replaceAll('"channel": 3', '---OnSong---')
                .replaceAll(/\"status.*?,[\s\S]/g, '')
                .replaceAll(/\"data.*?\[[\s\S]*?\]/g, '')
                .replaceAll('            "name": "Program', '"name": "Program'))

const buffer = new Buffer.from(write.buildFile())
const outputFile = process.argv[2].replace('.json', '.mid')
fs.writeFileSync(outputFile, buffer)
logger.verbose(`MIDI file written to ${outputFile}`)
logger.verbose('')

//#region Click Track

// const low = new WaveFile();
// const lowBuffer = fs.readFileSync(`${__dirname}/../resources/low.wav`);
// low.fromBuffer(lowBuffer);
// const lowSamples = low.getSamples(false);
//
// const high = new WaveFile();
// const highBuffer = fs.readFileSync(`${__dirname}/../resources/high.wav`);
// high.fromBuffer(highBuffer);
// const highSamples = high.getSamples(false);
//
// const beatDuration = 60 / spec.tempo
// logger.debug(`totalMeasures: ${totalMeasures}`)
// logger.debug(`beatsPerMeasure: ${beatsPerMeasure}`)
// logger.debug(`beatDuration: ${beatDuration}`)
// logger.debug(`spec.tempo: ${spec.tempo}`)
// logger.debug(`Array size ${Math.ceil(totalMeasures * beatsPerMeasure * beatDuration * 44100)}`)
// const samplesArray = new Float64Array(Math.ceil(totalMeasures * beatsPerMeasure * beatDuration * 44100 + Math.max(lowSamples.length, highSamples.length)))
// for (let i = 0; i < samplesArray.length; i++) {
// 	if (i % (Math.floor(beatDuration * 44100) * beatsPerMeasure) === 0) {
// 		samplesArray.set(highSamples, i)
// 	} else if (i % Math.floor(beatDuration * 44100) === 0) {
// 		samplesArray.set(lowSamples, i)
// 	}
// }

// const clickTrack = new WaveFile();
// clickTrack.fromScratch(1, 44100, '16', samplesArray)
// fs.writeFileSync('Click.wav', clickTrack.toBuffer());

//#endregion Click Track

// child_process.execSync(`zip -r ${process.argv[2].replace('.json', '.zip')} ${process.argv[2].replace('.json', '.mid')} Click.wav`);
// logger.verbose(`MIDI and click files written to ${process.argv[2].replace('.json', '.zip')}`)
// fs.unlinkSync('Click.wav');
// fs.unlinkSync(process.argv[2].replace('.json', '.mid'));
// logger.debug('midi and click files deleted')
