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
  /** Only set when `event === 'variax-tuning'`. Six semitone offsets, index 0 = low E, index 5 = high E. */
  tuning?: number[]
}

export interface TimeSigChange {
  /** 1-based measure within the section where the new meter begins */
  measure: number
  /** e.g. "2/4"; persists until the next change or the next section's override */
  timeSignature: string
}

export interface Section {
  name: string
  length: string
  timeSignature?: string
  /** Mid-section meter changes at barlines; each persists until the next change */
  timeSigChanges?: TimeSigChange[]
  events?: SongEvent[]
}

export interface SongSpec {
  title: string
  tempo: number
  timeSignature: string
  /**
   * Song key sent to the VoiceLive 3 NaturalPlay at the start of the file, as
   * "<root> <scale>" — e.g. "C major", "F# minor". Root is one of C, C#, D, D#,
   * E, F, F#, G, G#, A, A#, B (flats accepted as enharmonic equivalents); scale
   * is "major" or "minor".
   */
  key?: string
  /** Semitone offsets from standard tuning, index 0 = string 6 (low E), index 5 = string 1 (high E) */
  tuning?: number[]
  sections: Section[]
}
