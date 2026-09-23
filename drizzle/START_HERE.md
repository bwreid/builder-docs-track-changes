# Data layer — start here

This file plus `drizzle/crud-action-example.ts` is all you need to add a table
and wire CRUD. You do **not** need the `storing-data`, `actions`, or
`agent-native-docs` skills for standard CRUD, and you do **not** need to search
`node_modules` or read any `dist/*.d.ts` to discover the API — the pattern is
already stubbed in the files below.

## The files are already here

| What | Path | State |
| --- | --- | --- |
| App tables | `drizzle/schema.ts` | Stub — add tables here |
| DB client | `server/db.ts` → `getDb()`, `schema` | Stub — uncomment to enable |
| CRUD pattern | `drizzle/crud-action-example.ts` | Copy into `actions/<name>.ts` |
| Migrate | `pnpm db:generate` → `pnpm db:migrate` | `drizzle.config.ts` ships |
| Actions | `actions/<name>.ts` | You create these |

Open `server/db.ts` and `drizzle/schema.ts` and edit them in place. Do **not**
`find` / `cat` over `node_modules/@agent-native` or `drizzle-orm`, and do **not**
read `dist/*.d.ts` — everything you need is in the two stub files.

## Enable the data layer (once)

`drizzle-orm`, `drizzle-kit`, `drizzle.config.ts`, and the `pnpm db:generate` /
`pnpm db:migrate` scripts already ship — do not re-add them.

1. Add a table to `drizzle/schema.ts` (an example is commented in the file).
2. Uncomment the wiring in `server/db.ts`.
3. Run `pnpm db:generate` to create the migration, then `pnpm db:migrate` to
   apply it.
4. Copy the CRUD pattern from `drizzle/crud-action-example.ts` into
   `actions/<name>.ts`. **One action per file, default-exported** — the four
   `export const ...Example` blocks in that reference each become their own
   `actions/<name>.ts` (e.g. `listNotesExample` → `actions/list-notes.ts` with
   `export default`); the kebab-case filename is the action name. Don't paste
   them into one file as named exports.

## After a batch of schema/action edits

One smoke path (create + list), then one `pnpm typecheck`. See
`self-modifying-code`.

## `db:migrate` must run with the dev server stopped

PGlite (the embedded WASM Postgres used for local dev) only tolerates one
writer per data directory. Running `pnpm db:migrate` while `pnpm dev` is also
open lets two separate processes open `./data/pglite` at once, which reliably
crashes the WASM engine (`Aborted(). Build with -sASSERTIONS for more info.`)
and corrupts local dev data — recovering means `rm -rf data` and re-migrating
from scratch. `scripts/guard-db-migrate.mjs` now runs automatically as part of
`pnpm db:migrate` and refuses with a clear message if the dev server (per
`.agent-native/dev-server.json`) is still alive, but the underlying rule is
still yours to follow: stop the dev server, run `pnpm db:migrate`, then start
it again.
