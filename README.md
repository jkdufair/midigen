# midigen

A web app for building MIDI control-change files from structured song specs. Designed for live performance — configure your gear, define your sections and events, generate a MIDI file, and push it directly to [OnSong](https://onsongapp.com) on your iPad with one click.

**License:** [PolyForm Noncommercial 1.0.0](LICENSE) — free for personal, noncommercial use.

---

## What it does

- Define songs as a sequence of named sections, each with MIDI events at specific positions
- Configure your gear (MIDI channel per device) and event types (CC, CC with parameter, Program Change)
- Generate `.mid` files from any song
- **Publish directly to OnSong** over the local network via OnSong Connect

Tested with: Line 6 Helix, TC-Helicon VoiceLive 3, Loopy Pro, OnSong.

---

## Prerequisites

- Node.js 20+
- An iPad running [OnSong](https://onsongapp.com) with OnSong Connect enabled (for publishing)
- An OnSong Connect API key (request from the OnSong developer program)

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/jkdufair/midigen.git
cd midigen
npm install
```

### 2. Set up the database

```bash
cd packages/web
npx prisma migrate deploy
npx prisma db seed    # optional: loads example gear and event types
```

### 3. Configure environment

Copy and fill in your values:

```bash
cp packages/web/.env.example packages/web/.env   # if .env.example exists, otherwise edit .env directly
```

`packages/web/.env`:

```
DATABASE_URL="file:./dev.db"

# OnSong Connect (required only for Publish to OnSong feature)
ONSONG_CLIENT_UUID="<generate with: uuidgen>"
ONSONG_API_KEY="<your OnSong Connect API key>"
ONSONG_PORT="80"
```

- **`ONSONG_CLIENT_UUID`** — any UUID; uniquely identifies this midigen instance to OnSong. Generate one with `uuidgen` (macOS/Linux) and keep it stable.
- **`ONSONG_API_KEY`** — the key from the OnSong developer program. Used to authorize your client without requiring manual approval on the iPad each time.
- **`ONSONG_PORT`** — OnSong Connect port. Default is `80`.

### 4. Run the dev server

```bash
cd packages/web
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Usage

### Configure gear and events

Go to **Gear** → add your MIDI devices with their channel numbers.

Go to **Events** → define event types per gear:
- **CC** — fixed CC number and value (e.g. harmony on/off)
- **CC (parameterized)** — CC number with value derived from a per-event parameter (e.g. Helix snapshot number)
- **PC** — program change with instrument derived from a parameter (e.g. vocal patch)

### Build a song

Go to **Songs → New Song**. Set the title, tempo, and time signature, then add sections. Each section has a length (`measures.beats.subdivisions`) and a list of events with positions and types.

Use **JSON view** to paste in or edit the raw spec directly.

### Generate and publish

- **↓ Generate MIDI** — downloads the `.mid` file to your computer
- **→ OnSong** — generates the MIDI and pushes it directly to OnSong's media library over the local network (iPad must be on the same network)

---

## Monorepo structure

```
midigen/
  packages/
    core/     — @midigen/core: MIDI generation logic (shared)
    cli/      — @midigen/cli: command-line interface
    web/      — Next.js web app (main interface)
```

---

## CLI usage

```bash
node packages/cli/src/main.js path/to/song.json
```

Outputs `<title>.mid` in the current directory.
