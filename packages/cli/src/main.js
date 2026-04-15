#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { generateMidi } = require('@midigen/core')
const { defaultEventTypes } = require('@midigen/core')

const inputFile = process.argv[2]
if (!inputFile) {
	console.error('Usage: node src/main.js <song-spec.json>')
	process.exit(1)
}

const spec = JSON.parse(fs.readFileSync(inputFile, 'utf8'))
const buffer = generateMidi(spec, defaultEventTypes)
const outputFile = inputFile.replace(/\.json$/, '.mid')
fs.writeFileSync(outputFile, buffer)
console.log(`Written: ${path.resolve(outputFile)}`)
