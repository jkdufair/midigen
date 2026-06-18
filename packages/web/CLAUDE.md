@AGENTS.md

# Prisma / database — do not cause migration drift

This package uses Prisma (v7, SQLite) with a **migration history** (`prisma/migrations/`). Past drift was caused by mixing `db push` with migrations and by editing applied migration files. Follow these rules exactly.

- **Schema changes go through migrations only.** After editing `prisma/schema.prisma`, run `npx prisma migrate dev --name <what_changed>` (from `packages/web`, with `DATABASE_URL="file:./prisma/dev.db"` if not already set). This writes a migration file *and* applies it.
- **Never run `prisma db push`** on this project. It mutates the DB without writing a migration, which silently desyncs the DB from `prisma/migrations/` (this is exactly what broke things before).
- **Never edit a migration file after it has been applied** (it breaks the recorded checksum). Need a change? Create a *new* migration.
- **Never run `prisma migrate reset`** or otherwise drop/recreate the DB — `dev.db` holds real data the user cares about. If `migrate dev` wants to reset due to drift, stop and ask the user; do not accept the reset.
- After changing the schema, **regenerate the client** if it didn't happen automatically: `npx prisma generate`. The generated client lives in `src/generated/prisma/` (git-ignored).
- **`prisma/dev.db` is git-ignored and must stay untracked** (along with `*-journal/-wal/-shm` sidecars and `dev.db.bak-*` backups). Never `git add` the database.
- **Commit the `prisma/migrations/` folder** — it is the source-of-truth schema history.
- If the DB and migration history have already drifted, the safe non-destructive fix is to **re-baseline**: back up `dev.db`, generate one `0_init` migration from the schema (`prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script`), clear `_prisma_migrations`, then `prisma migrate resolve --applied 0_init`. Confirm `prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --script` is empty before and after.
- **Production/Vercel has its own migration history.** After a local re-baseline, the prod DB may need `prisma migrate resolve --applied 0_init` once before the next `migrate deploy`. Flag this to the user rather than assuming.
