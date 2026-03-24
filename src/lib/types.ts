export interface SongEvent {
	position: string
	event: string
	parameter?: number
}

export interface Section {
	name: string
	length: string
	events?: SongEvent[]
}

export interface SongSpec {
	title: string
	tempo: number
	timeSignature: string
	sections: Section[]
}

export type MessageType = 'CC' | 'CC_PARAM_VALUE' | 'PC'

export interface EventTypeConfig {
	slug: string
	label: string
	midiChannel: number
	messageType: MessageType
	// CC
	ccNumber?: number
	ccValue?: number
	// CC_PARAM_VALUE
	valueOffset?: number
	// PC
	instrumentOffset?: number
	hasParameter: boolean
}
