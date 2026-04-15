export type MessageType = 'CC' | 'CC_PARAM_VALUE' | 'PC'

export interface EventTypeConfig {
  slug: string
  label: string
  midiChannel: number
  messageType: MessageType
  ccNumber?: number | null
  ccValue?: number | null
  valueOffset?: number | null
  instrumentOffset?: number | null
  hasParameter: boolean
  /** Fire this event automatically at each section boundary */
  onSectionChange?: boolean
  /** Fire this event automatically at the end of the song */
  onSongEnd?: boolean
  /** Derive CC value from the current time signature via the built-in lookup table */
  isTimeSignatureCarrier?: boolean
}

export interface GearLibraryEventType {
  slug: string
  label: string
  messageType: MessageType
  ccNumber?: number | null
  ccValue?: number | null
  valueOffset?: number | null
  instrumentOffset?: number | null
  hasParameter: boolean
  onSectionChange?: boolean
  onSongEnd?: boolean
  isTimeSignatureCarrier?: boolean
}

export interface GearLibraryEntry {
  key: string
  name: string
  midiChannel: number
  color: string
  eventTypes: GearLibraryEventType[]
}

export interface SongEvent {
  position: string
  event: string
  parameter?: number
}

export interface Section {
  name: string
  length: string
  timeSignature?: string
  events?: SongEvent[]
}

export interface SongSpec {
  title: string
  tempo: number
  timeSignature: string
  /** Semitone offsets from standard tuning, index 0 = string 6 (low E), index 5 = string 1 (high E) */
  tuning?: number[]
  sections: Section[]
}
