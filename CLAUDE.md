# midigen — session context

## Current branch
`claude/plan-web-migration-2k3dY` (pushed to origin)

## What was done in this session

Reorganized the repo into an **npm workspaces monorepo**. Previously, `src/lib/` and `web/src/lib/` contained duplicate copies of the MIDI generation code. Now there is a single canonical source.

### New structure
```
midigen/
  package.json              ← workspace root  {"workspaces": ["packages/*"]}
  packages/
    core/                   ← @midigen/core  (new package)
      src/
        index.js            ← exports { generateMidi, defaultEventTypes }
        midi-generator.js   ← moved from src/lib/ (was identical in both places)
        default-event-types.js
        types.ts            ← TypeScript types (moved from web/src/lib/)
        midi-writer-js.cjs  ← bundled midi-writer-js dep
      package.json
    cli/                    ← @midigen/cli  (new package)
      src/main.js           ← moved from src/main.js, now requires('@midigen/core')
      package.json
    web/                    ← Next.js app  (moved from web/)
      src/app/api/generate/route.ts  ← updated: imports from '@midigen/core'
      src/lib/db.ts         ← unchanged
      package.json          ← added "@midigen/core": "*" dependency
      prisma/...
      ...
```

### Key changes
- `packages/web/src/app/api/generate/route.ts`: types now imported from `@midigen/core`, `generateMidi` required from `@midigen/core`
- Root `package.json`: replaced old CLI package.json with workspace root config
- `.gitignore`: updated paths from `web/` → `packages/web/`

## What still needs doing

- Run `npm install` at repo root to wire workspaces (creates symlinks in node_modules)
- **Vercel**: update root directory setting from `web` → `packages/web`
- `packages/web/tsconfig.json` may need `paths` or `moduleResolution` adjustment if TypeScript can't resolve `@midigen/core` types — check after `npm install`
- The web's `package-lock.json` is still inside `packages/web/` — after running root-level `npm install`, you can delete it and let the root lockfile take over
- Consider whether `packages/cli/` needs its own `bin` entry in the root workspace or a top-level script

## How to continue on laptop
```bash
git fetch origin claude/plan-web-migration-2k3dY
git checkout claude/plan-web-migration-2k3dY
npm install          # from repo root
cd packages/web
npm run dev
```
