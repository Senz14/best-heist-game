// Moonlit Museum Heist — hand-in program for the make.fun best-heist-game bounty.
// Running `node main.ts` with MAKEFUN_OUTPUT_DIR set copies the playable game
// and its screenshots into that directory and writes a dossier.json there,
// built with the kit's own library so the bytes match what the scorer builds.
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The gate caps this entry is built to respect.
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};
const DOSSIER_MAX_BYTES = 1572864; // 1.5 MiB
const SCREENSHOT_MAX_BYTES = 262144; // 256 KiB

const rootDir = dirname(fileURLToPath(import.meta.url));

function fail(message: string): never {
  console.error(`main.ts: ${message}`);
  process.exit(1);
}

// Walk a directory and return every entry (files and directories) under it,
// as paths relative to the directory itself, in sorted order.
function listEntries(dir: string): string[] {
  const found: string[] = [];
  const walk = (current: string): void => {
    const names = readdirSync(current).sort();
    for (const name of names) {
      const full = join(current, name);
      found.push(relative(dir, full));
      if (statSync(full).isDirectory()) walk(full);
    }
  };
  walk(dir);
  return found;
}

function totalBytes(dir: string, entries: string[]): number {
  let sum = 0;
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isFile()) sum += statSync(full).size;
  }
  return sum;
}

// Check the game tree against the file-count, byte and path-length caps.
function checkGameTree(gameDir: string): void {
  if (!existsSync(gameDir)) fail('game/ directory is missing');
  const entries = listEntries(gameDir);
  if (entries.length > CAPS.game_max_files) {
    fail(`game/ holds ${entries.length} entries, over the ${CAPS.game_max_files} cap`);
  }
  const bytes = totalBytes(gameDir, entries);
  if (bytes > CAPS.game_max_bytes) {
    fail(`game/ is ${bytes} bytes, over the ${CAPS.game_max_bytes} cap`);
  }
  for (const entry of entries) {
    const len = Buffer.byteLength(entry, 'utf8');
    if (len > CAPS.game_path_max_bytes) {
      fail(`game path ${entry} is ${len} UTF-8 bytes, over the cap`);
    }
  }
  const indexPath = join(gameDir, 'index.html');
  if (!existsSync(indexPath) || !statSync(indexPath).isFile()) {
    fail('game/index.html is missing');
  }
  if (statSync(indexPath).size > 1048576) fail('game/index.html is over 1 MiB');
}

// Check the screenshots: 3 or 4 images, each a whole PNG or JPEG in cap.
function checkScreenshots(shotDir: string): string[] {
  if (!existsSync(shotDir)) fail('screenshots/ directory is missing');
  const names = readdirSync(shotDir).sort();
  if (names.length < 3 || names.length > CAPS.screenshots.max) {
    fail(`screenshots/ holds ${names.length} files, need 3 or 4`);
  }
  for (const name of names) {
    const full = join(shotDir, name);
    if (!statSync(full).isFile()) fail(`screenshots/${name} is not a file`);
    const data = readFileSync(full);
    if (data.length > SCREENSHOT_MAX_BYTES) {
      fail(`screenshots/${name} is ${data.length} bytes, over 256 KiB`);
    }
    const isJpeg = data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
    const isPng =
      data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47;
    if (!isJpeg && !isPng) fail(`screenshots/${name} is neither PNG nor JPEG`);
  }
  return names;
}

function main(): void {
  const outDir = process.env.MAKEFUN_OUTPUT_DIR;
  if (!outDir) fail('MAKEFUN_OUTPUT_DIR is not set');
  const gameDir = join(rootDir, 'game');
  const shotDir = join(rootDir, 'screenshots');
  checkGameTree(gameDir);
  checkScreenshots(shotDir);

  mkdirSync(outDir, { recursive: true });
  const outGame = join(outDir, 'game');
  const outShots = join(outDir, 'screenshots');
  rmSync(outGame, { recursive: true, force: true });
  rmSync(outShots, { recursive: true, force: true });
  cpSync(gameDir, outGame, { recursive: true });
  cpSync(shotDir, outShots, { recursive: true });

  const dossier = buildDossier(outDir, CAPS);
  if (dossier.length > DOSSIER_MAX_BYTES) {
    fail(`dossier.json would be ${dossier.length} bytes, over 1.5 MiB`);
  }
  writeFileSync(join(outDir, 'dossier.json'), dossier);
  selfCheck(outDir, dossier);
  console.log(`handed in: game + screenshots + dossier.json (${dossier.length} bytes)`);
}

// Determinism self-check: rebuild the whole hand-in into a scratch directory
// and compare it byte for byte with what was just written. The grader runs
// this program twice and demands identical bytes, so a mismatch here is a
// failure worth stopping for. The scratch copy is removed either way.
function selfCheck(outDir: string, dossier: Uint8Array): void {
  const scratch = join(outDir, '.selfcheck');
  rmSync(scratch, { recursive: true, force: true });
  try {
    mkdirSync(scratch, { recursive: true });
    cpSync(join(outDir, 'game'), join(scratch, 'game'), { recursive: true });
    cpSync(join(outDir, 'screenshots'), join(scratch, 'screenshots'), { recursive: true });
    const rebuilt = buildDossier(scratch, CAPS);
    if (rebuilt.length !== dossier.length || !Buffer.from(rebuilt).equals(Buffer.from(dossier))) {
      fail('determinism self-check: rebuilt dossier differs from the one written');
    }
    for (const part of ['game', 'screenshots']) {
      const mine = listEntries(join(outDir, part));
      const theirs = listEntries(join(scratch, part));
      if (mine.join('\n') !== theirs.join('\n')) {
        fail(`determinism self-check: ${part}/ entry lists differ after rebuild`);
      }
      for (const entry of mine) {
        const a = join(outDir, part, entry);
        const b = join(scratch, part, entry);
        if (statSync(a).isFile() && !readFileSync(a).equals(readFileSync(b))) {
          fail(`determinism self-check: ${part}/${entry} differs after rebuild`);
        }
      }
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

main();
