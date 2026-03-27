import { PrismaClient } from '@/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

const dbUrl = process.env.DATABASE_URL ?? "file:./dev.db"
const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: dbUrl }),
})

async function main() {
  const vl3 = await prisma.gear.upsert({
    where: { name: 'VoiceLive 3' },
    update: {},
    create: { name: 'VoiceLive 3', midiChannel: 1, color: '#6366f1' },
  })
  const helix = await prisma.gear.upsert({
    where: { name: 'Helix' },
    update: {},
    create: { name: 'Helix', midiChannel: 2, color: '#f59e0b' },
  })
  const loopy = await prisma.gear.upsert({
    where: { name: 'Loopy Pro' },
    update: {},
    create: { name: 'Loopy Pro', midiChannel: 3, color: '#10b981' },
  })
  const onsong = await prisma.gear.upsert({
    where: { name: 'OnSong' },
    update: {},
    create: { name: 'OnSong', midiChannel: 4, color: '#3b82f6' },
  })

  const eventTypes = [
    // VoiceLive 3 (ch 1)
    { slug: 'harmony-on',         label: 'Harmony On',          gearId: vl3.id,   messageType: 'CC',            ccNumber: 110, ccValue: 127, valueOffset: null, instrumentOffset: null, hasParameter: false, onSectionChange: false, onSongEnd: false },
    { slug: 'harmony-off',        label: 'Harmony Off',         gearId: vl3.id,   messageType: 'CC',            ccNumber: 110, ccValue: 0,   valueOffset: null, instrumentOffset: null, hasParameter: false, onSectionChange: false, onSongEnd: true  },
    { slug: 'vocal-double-on',    label: 'Vocal Double On',     gearId: vl3.id,   messageType: 'CC',            ccNumber: 111, ccValue: 127, valueOffset: null, instrumentOffset: null, hasParameter: false, onSectionChange: false, onSongEnd: false },
    { slug: 'vocal-double-off',   label: 'Vocal Double Off',    gearId: vl3.id,   messageType: 'CC',            ccNumber: 111, ccValue: 0,   valueOffset: null, instrumentOffset: null, hasParameter: false, onSectionChange: false, onSongEnd: false },
    { slug: 'vocal-patch-change', label: 'Vocal Patch Change',  gearId: vl3.id,   messageType: 'PC',            ccNumber: null, ccValue: null, valueOffset: null, instrumentOffset: -1,  hasParameter: true,  onSectionChange: false, onSongEnd: false },

    // Helix (ch 2)
    { slug: 'helix-snapshot',     label: 'Helix Snapshot',      gearId: helix.id, messageType: 'CC_PARAM_VALUE', ccNumber: 69, ccValue: null, valueOffset: -1,  instrumentOffset: null, hasParameter: true,  onSectionChange: false, onSongEnd: false },
    { slug: 'helix-patch-change', label: 'Helix Patch Change',  gearId: helix.id, messageType: 'PC',            ccNumber: null, ccValue: null, valueOffset: null, instrumentOffset: 0,   hasParameter: true,  onSectionChange: false, onSongEnd: false },

    // OnSong (ch 4)
    { slug: 'onsong-next-section', label: 'OnSong Next Section', gearId: onsong.id, messageType: 'CC',           ccNumber: 1,   ccValue: 127, valueOffset: null, instrumentOffset: null, hasParameter: false, onSectionChange: true,  onSongEnd: false },

    // Loopy Pro (ch 3)
    { slug: 'guitar-loop-record',   label: 'Guitar Loop 1 Record', gearId: loopy.id, messageType: 'CC', ccNumber: 80, ccValue: 127, valueOffset: null, instrumentOffset: null, hasParameter: false, onSectionChange: false, onSongEnd: false },
    { slug: 'guitar-loop-play',     label: 'Guitar Loop 1 Play',   gearId: loopy.id, messageType: 'CC', ccNumber: 80, ccValue: 0,   valueOffset: null, instrumentOffset: null, hasParameter: false, onSectionChange: false, onSongEnd: false },
    { slug: 'guitar-loop-stop',     label: 'Guitar Loop 1 Stop',   gearId: loopy.id, messageType: 'CC', ccNumber: 81, ccValue: 0,   valueOffset: null, instrumentOffset: null, hasParameter: false, onSectionChange: false, onSongEnd: false },
    { slug: 'guitar-loop-clear',    label: 'Guitar Loop 1 Clear',  gearId: loopy.id, messageType: 'CC', ccNumber: 81, ccValue: 127, valueOffset: null, instrumentOffset: null, hasParameter: false, onSectionChange: false, onSongEnd: false },
    { slug: 'guitar-loop-2-record', label: 'Guitar Loop 2 Record', gearId: loopy.id, messageType: 'CC', ccNumber: 82, ccValue: 127, valueOffset: null, instrumentOffset: null, hasParameter: false, onSectionChange: false, onSongEnd: false },
    { slug: 'guitar-loop-2-play',   label: 'Guitar Loop 2 Play',   gearId: loopy.id, messageType: 'CC', ccNumber: 82, ccValue: 0,   valueOffset: null, instrumentOffset: null, hasParameter: false, onSectionChange: false, onSongEnd: false },
    { slug: 'guitar-loop-2-stop',   label: 'Guitar Loop 2 Stop',   gearId: loopy.id, messageType: 'CC', ccNumber: 83, ccValue: 0,   valueOffset: null, instrumentOffset: null, hasParameter: false, onSectionChange: false, onSongEnd: false },
    { slug: 'guitar-loop-2-clear',  label: 'Guitar Loop 2 Clear',  gearId: loopy.id, messageType: 'CC', ccNumber: 83, ccValue: 127, valueOffset: null, instrumentOffset: null, hasParameter: false, onSectionChange: false, onSongEnd: false },
    { slug: 'guitar-loop-3-record', label: 'Guitar Loop 3 Record', gearId: loopy.id, messageType: 'CC', ccNumber: 84, ccValue: 127, valueOffset: null, instrumentOffset: null, hasParameter: false, onSectionChange: false, onSongEnd: false },
    { slug: 'guitar-loop-3-play',   label: 'Guitar Loop 3 Play',   gearId: loopy.id, messageType: 'CC', ccNumber: 84, ccValue: 0,   valueOffset: null, instrumentOffset: null, hasParameter: false, onSectionChange: false, onSongEnd: false },
    { slug: 'guitar-loop-3-stop',   label: 'Guitar Loop 3 Stop',   gearId: loopy.id, messageType: 'CC', ccNumber: 85, ccValue: 0,   valueOffset: null, instrumentOffset: null, hasParameter: false, onSectionChange: false, onSongEnd: false },
    { slug: 'guitar-loop-3-clear',  label: 'Guitar Loop 3 Clear',  gearId: loopy.id, messageType: 'CC', ccNumber: 85, ccValue: 127, valueOffset: null, instrumentOffset: null, hasParameter: false, onSectionChange: false, onSongEnd: false },
    { slug: 'guitar-loop-4-record', label: 'Guitar Loop 4 Record', gearId: loopy.id, messageType: 'CC', ccNumber: 86, ccValue: 127, valueOffset: null, instrumentOffset: null, hasParameter: false, onSectionChange: false, onSongEnd: false },
    { slug: 'guitar-loop-4-play',   label: 'Guitar Loop 4 Play',   gearId: loopy.id, messageType: 'CC', ccNumber: 86, ccValue: 0,   valueOffset: null, instrumentOffset: null, hasParameter: false, onSectionChange: false, onSongEnd: false },
    { slug: 'guitar-loop-4-stop',   label: 'Guitar Loop 4 Stop',   gearId: loopy.id, messageType: 'CC', ccNumber: 87, ccValue: 0,   valueOffset: null, instrumentOffset: null, hasParameter: false, onSectionChange: false, onSongEnd: false },
    { slug: 'guitar-loop-4-clear',  label: 'Guitar Loop 4 Clear',  gearId: loopy.id, messageType: 'CC', ccNumber: 87, ccValue: 127, valueOffset: null, instrumentOffset: null, hasParameter: false, onSectionChange: false, onSongEnd: false },
    { slug: 'vocal-loop-record',    label: 'Vocal Loop 1 Record',  gearId: loopy.id, messageType: 'CC', ccNumber: 88, ccValue: 127, valueOffset: null, instrumentOffset: null, hasParameter: false, onSectionChange: false, onSongEnd: false },
    { slug: 'vocal-loop-play',      label: 'Vocal Loop 1 Play',    gearId: loopy.id, messageType: 'CC', ccNumber: 88, ccValue: 0,   valueOffset: null, instrumentOffset: null, hasParameter: false, onSectionChange: false, onSongEnd: false },
    { slug: 'vocal-loop-stop',      label: 'Vocal Loop 1 Stop',    gearId: loopy.id, messageType: 'CC', ccNumber: 89, ccValue: 0,   valueOffset: null, instrumentOffset: null, hasParameter: false, onSectionChange: false, onSongEnd: false },
    { slug: 'vocal-loop-clear',     label: 'Vocal Loop 1 Clear',   gearId: loopy.id, messageType: 'CC', ccNumber: 89, ccValue: 127, valueOffset: null, instrumentOffset: null, hasParameter: false, onSectionChange: false, onSongEnd: false },
    { slug: 'vocal-loop-2-record',  label: 'Vocal Loop 2 Record',  gearId: loopy.id, messageType: 'CC', ccNumber: 90, ccValue: 127, valueOffset: null, instrumentOffset: null, hasParameter: false, onSectionChange: false, onSongEnd: false },
    { slug: 'vocal-loop-2-play',    label: 'Vocal Loop 2 Play',    gearId: loopy.id, messageType: 'CC', ccNumber: 90, ccValue: 0,   valueOffset: null, instrumentOffset: null, hasParameter: false, onSectionChange: false, onSongEnd: false },
    { slug: 'vocal-loop-2-stop',    label: 'Vocal Loop 2 Stop',    gearId: loopy.id, messageType: 'CC', ccNumber: 91, ccValue: 0,   valueOffset: null, instrumentOffset: null, hasParameter: false, onSectionChange: false, onSongEnd: false },
    { slug: 'vocal-loop-2-clear',   label: 'Vocal Loop 2 Clear',   gearId: loopy.id, messageType: 'CC', ccNumber: 91, ccValue: 127, valueOffset: null, instrumentOffset: null, hasParameter: false, onSectionChange: false, onSongEnd: false },
    { slug: 'vocal-loop-3-record',  label: 'Vocal Loop 3 Record',  gearId: loopy.id, messageType: 'CC', ccNumber: 92, ccValue: 127, valueOffset: null, instrumentOffset: null, hasParameter: false, onSectionChange: false, onSongEnd: false },
    { slug: 'vocal-loop-3-play',    label: 'Vocal Loop 3 Play',    gearId: loopy.id, messageType: 'CC', ccNumber: 92, ccValue: 0,   valueOffset: null, instrumentOffset: null, hasParameter: false, onSectionChange: false, onSongEnd: false },
    { slug: 'vocal-loop-3-stop',    label: 'Vocal Loop 3 Stop',    gearId: loopy.id, messageType: 'CC', ccNumber: 93, ccValue: 0,   valueOffset: null, instrumentOffset: null, hasParameter: false, onSectionChange: false, onSongEnd: false },
    { slug: 'vocal-loop-3-clear',   label: 'Vocal Loop 3 Clear',   gearId: loopy.id, messageType: 'CC', ccNumber: 93, ccValue: 127, valueOffset: null, instrumentOffset: null, hasParameter: false, onSectionChange: false, onSongEnd: false },
    { slug: 'vocal-loop-4-record',  label: 'Vocal Loop 4 Record',  gearId: loopy.id, messageType: 'CC', ccNumber: 94, ccValue: 127, valueOffset: null, instrumentOffset: null, hasParameter: false, onSectionChange: false, onSongEnd: false },
    { slug: 'vocal-loop-4-play',    label: 'Vocal Loop 4 Play',    gearId: loopy.id, messageType: 'CC', ccNumber: 94, ccValue: 0,   valueOffset: null, instrumentOffset: null, hasParameter: false, onSectionChange: false, onSongEnd: false },
    { slug: 'vocal-loop-4-stop',    label: 'Vocal Loop 4 Stop',    gearId: loopy.id, messageType: 'CC', ccNumber: 95, ccValue: 0,   valueOffset: null, instrumentOffset: null, hasParameter: false, onSectionChange: false, onSongEnd: false },
    { slug: 'vocal-loop-4-clear',   label: 'Vocal Loop 4 Clear',   gearId: loopy.id, messageType: 'CC', ccNumber: 95, ccValue: 127, valueOffset: null, instrumentOffset: null, hasParameter: false, onSectionChange: false, onSongEnd: false },
  ]

  for (const et of eventTypes) {
    await prisma.eventType.upsert({
      where: { slug: et.slug },
      update: {},
      create: et as never,
    })
  }

  console.log('Seed complete.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
