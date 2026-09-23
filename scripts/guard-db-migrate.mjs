// Refuses to run drizzle-kit migrate while the local dev server is up.
//
// PGlite (the embedded WASM Postgres this app uses locally) only tolerates
// one writer per data directory. `pnpm dev` holds the ./data/pglite
// directory open for as long as it runs; running `drizzle-kit migrate`
// concurrently opens a second, competing instance against the same files
// and reliably crashes the WASM engine ("Aborted(). Build with
// -sASSERTIONS for more info."), corrupting local dev data and forcing a
// full `rm -rf data` + re-migrate to recover. This has happened more than
// once in this project — this guard exists so it stops happening.
//
// Wired as the first step of the `db:migrate` script in package.json, not
// as a pnpm pre-script hook, so it runs the same way regardless of pnpm
// config.
import { existsSync, readFileSync } from "node:fs";

const DEV_SERVER_INFO_PATH = "./.agent-native/dev-server.json";

function isProcessAlive(pid) {
  if (!pid) return false;
  try {
    // Signal 0 doesn't actually send a signal — it just checks whether the
    // process exists and this user can signal it.
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function main() {
  if (!existsSync(DEV_SERVER_INFO_PATH)) return;

  let info;
  try {
    info = JSON.parse(readFileSync(DEV_SERVER_INFO_PATH, "utf8"));
  } catch {
    // Malformed/unreadable info file — nothing reliable to check, let
    // db:migrate proceed rather than block on a false positive.
    return;
  }

  if (!isProcessAlive(info.pid)) return;

  console.error(
    "\n[db:migrate] Refusing to run: the dev server (pid " +
      info.pid +
      (info.origin ? `, ${info.origin}` : "") +
      ") is still running.\n\n" +
      "PGlite only tolerates one writer per data directory. Running db:migrate\n" +
      "while `pnpm dev` is up will crash the embedded Postgres engine and corrupt\n" +
      "local dev data — this has happened before in this project.\n\n" +
      "Stop the dev server first (Ctrl+C in its terminal), confirm it's gone\n" +
      '(`ps aux | grep -i "agent-native\\|vite"`), then re-run `pnpm db:migrate`.\n',
  );
  process.exit(1);
}

main();
