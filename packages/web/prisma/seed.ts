import { PrismaClient } from '@/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

const dbUrl = process.env.DATABASE_URL ?? "file:./dev.db"
const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: dbUrl }),
})

async function main() {
  const vl3 = await prisma.gear.upsert({
    where: { id: 'gear-vl3' },
    update: {},
    create: { id: 'gear-vl3', name: 'VoiceLive 3', midiChannel: 1, color: '#6366f1' },
  })
  const helix = await prisma.gear.upsert({
    where: { id: 'gear-helix' },
    update: {},
    create: { id: 'gear-helix', name: 'Helix', midiChannel: 2, color: '#f59e0b' },
  })
  const loopy = await prisma.gear.upsert({
    where: { id: 'gear-loopy' },
    update: {},
    create: { id: 'gear-loopy', name: 'Loopy Pro', midiChannel: 3, color: '#10b981' },
  })
  const onsong = await prisma.gear.upsert({
    where: { id: 'gear-onsong' },
    update: {},
    create: { id: 'gear-onsong', name: 'OnSong', midiChannel: 4, color: '#3b82f6' },
  })

  const eventTypes = [
    // VoiceLive 3 (ch 1)
    { id: 'et-harmony-on',         slug: 'harmony-on',          label: 'Harmony On',          gearId: vl3.id, messageType: 'CC', ccNumber: 110, ccValue: 127, hasParameter: false, onSectionChange: false, onSongEnd: false },
    { id: 'et-harmony-off',        slug: 'harmony-off',         label: 'Harmony Off',         gearId: vl3.id, messageType: 'CC', ccNumber: 110, ccValue: 0,   hasParameter: false, onSectionChange: false, onSongEnd: true },
    { id: 'et-vocal-double-on',    slug: 'vocal-double-on',     label: 'Vocal Double On',     gearId: vl3.id, messageType: 'CC', ccNumber: 111, ccValue: 127, hasParameter: false, onSectionChange: false, onSongEnd: false },
    { id: 'et-vocal-double-off',   slug: 'vocal-double-off',    label: 'Vocal Double Off',    gearId: vl3.id, messageType: 'CC', ccNumber: 111, ccValue: 0,   hasParameter: false, onSectionChange: false, onSongEnd: false },
    { id: 'et-vocal-patch-change', slug: 'vocal-patch-change',  label: 'Vocal Patch Change',  gearId: vl3.id, messageType: 'PC', instrumentOffset: -1, hasParameter: true, onSectionChange: false, onSongEnd: false },

    // Helix (ch 2)
    { id: 'et-helix-snapshot',     slug: 'helix-snapshot',      label: 'Helix Snapshot',      gearId: helix.id, messageType: 'CC_PARAM_VALUE', ccNumber: 69, valueOffset: -1, hasParameter: true, onSectionChange: false, onSongEnd: false },
    { id: 'et-helix-patch-change', slug: 'helix-patch-change',  label: 'Helix Patch Change',  gearId: helix.id, messageType: 'PC', instrumentOffset: 0, hasParameter: true, onSectionChange: false, onSongEnd: false },

    // Loopy Pro (ch 3)
    { id: 'et-gl1-record',  slug: 'guitar-loop-record',   label: 'Guitar Loop 1 Record', gearId: loopy.id, messageType: 'CC', ccNumber: 80, ccValue: 127, hasParameter: false, onSectionChange: false, onSongEnd: false },
    { id: 'et-gl1-play',    slug: 'guitar-loop-play',     label: 'Guitar Loop 1 Play',   gearId: loopy.id, messageType: 'CC', ccNumber: 80, ccValue: 0,   hasParameter: false, onSectionChange: false, onSongEnd: false },
    { id: 'et-gl1-stop',    slug: 'guitar-loop-stop',     label: 'Guitar Loop 1 Stop',   gearId: loopy.id, messageType: 'CC', ccNumber: 81, ccValue: 0,   hasParameter: false, onSectionChange: false, onSongEnd: false },
    { id: 'et-gl1-clear',   slug: 'guitar-loop-clear',    label: 'Guitar Loop 1 Clear',  gearId: loopy.id, messageType: 'CC', ccNumber: 81, ccValue: 127, hasParameter: false, onSectionChange: false, onSongEnd: false },
    { id: 'et-gl2-record',  slug: 'guitar-loop-2-record', label: 'Guitar Loop 2 Record', gearId: loopy.id, messageType: 'CC', ccNumber: 82, ccValue: 127, hasParameter: false, onSectionChange: false, onSongEnd: false },
    { id: 'et-gl2-play',    slug: 'guitar-loop-2-play',   label: 'Guitar Loop 2 Play',   gearId: loopy.id, messageType: 'CC', ccNumber: 82, ccValue: 0,   hasParameter: false, onSectionChange: false, onSongEnd: false },
    { id: 'et-gl2-stop',    slug: 'guitar-loop-2-stop',   label: 'Guitar Loop 2 Stop',   gearId: loopy.id, messageType: 'CC', ccNumber: 83, ccValue: 0,   hasParameter: false, onSectionChange: false, onSongEnd: false },
    { id: 'et-gl2-clear',   slug: 'guitar-loop-2-clear',  label: 'Guitar Loop 2 Clear',  gearId: loopy.id, messageType: 'CC', ccNumber: 83, ccValue: 127, hasParameter: false, onSectionChange: false, onSongEnd: false },
    { id: 'et-vl1-record',  slug: 'vocal-loop-record',    label: 'Vocal Loop 1 Record',  gearId: loopy.id, messageType: 'CC', ccNumber: 86, ccValue: 127, hasParameter: false, onSectionChange: false, onSongEnd: false },
    { id: 'et-vl1-play',    slug: 'vocal-loop-play',      label: 'Vocal Loop 1 Play',    gearId: loopy.id, messageType: 'CC', ccNumber: 86, ccValue: 0,   hasParameter: false, onSectionChange: false, onSongEnd: false },
    { id: 'et-vl1-stop',    slug: 'vocal-loop-stop',      label: 'Vocal Loop 1 Stop',    gearId: loopy.id, messageType: 'CC', ccNumber: 87, ccValue: 0,   hasParameter: false, onSectionChange: false, onSongEnd: false },
    { id: 'et-vl1-clear',   slug: 'vocal-loop-clear',     label: 'Vocal Loop 1 Clear',   gearId: loopy.id, messageType: 'CC', ccNumber: 87, ccValue: 127, hasParameter: false, onSectionChange: false, onSongEnd: false },
    { id: 'et-vl2-record',  slug: 'vocal-loop-2-record',  label: 'Vocal Loop 2 Record',  gearId: loopy.id, messageType: 'CC', ccNumber: 88, ccValue: 127, hasParameter: false, onSectionChange: false, onSongEnd: false },
    { id: 'et-vl2-play',    slug: 'vocal-loop-2-play',    label: 'Vocal Loop 2 Play',    gearId: loopy.id, messageType: 'CC', ccNumber: 88, ccValue: 0,   hasParameter: false, onSectionChange: false, onSongEnd: false },
    { id: 'et-vl2-stop',    slug: 'vocal-loop-2-stop',    label: 'Vocal Loop 2 Stop',    gearId: loopy.id, messageType: 'CC', ccNumber: 89, ccValue: 0,   hasParameter: false, onSectionChange: false, onSongEnd: false },
    { id: 'et-vl2-clear',   slug: 'vocal-loop-2-clear',   label: 'Vocal Loop 2 Clear',   gearId: loopy.id, messageType: 'CC', ccNumber: 89, ccValue: 127, hasParameter: false, onSectionChange: false, onSongEnd: false },

    // OnSong (ch 4)
    { id: 'et-onsong-next', slug: 'onsong-next-section',  label: 'OnSong Next Section',  gearId: onsong.id, messageType: 'CC', ccNumber: 1, ccValue: 127, hasParameter: false, onSectionChange: true, onSongEnd: false },
  ]

  for (const et of eventTypes) {
    await prisma.eventType.upsert({
      where: { id: et.id },
      update: {},
      create: et as never,
    })
  }

  console.log('Seed complete.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
