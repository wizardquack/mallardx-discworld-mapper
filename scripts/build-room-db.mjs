// scripts/build-room-db.mjs
//
// Quow distributes his plugin from https://quow.co.uk/ — `quow_cowbar.zip`
// is the bundled .mallardx-equivalent (PNGs + SQLite DB + Lua source). When
// Quow publishes a new version, update the URL constant below (or replace the
// zip on disk and re-run) and re-run the script. Outputs are committed; CI
// does not rebuild.
//
// Run with:  node scripts/build-room-db.mjs

import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import AdmZip from "adm-zip";
import Database from "better-sqlite3";

const QUOW_URL = "https://quow.co.uk/quow_cowbar.zip";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const OUT_ROOMS = path.join(REPO_ROOT, "ui", "data", "rooms.js");
const OUT_MAPS = path.join(REPO_ROOT, "ui", "maps");

async function main() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "mallard-mapper-build-"));
  console.log(`[build] working dir: ${tmpDir}`);

  const zipPath = path.join(tmpDir, "quow_cowbar.zip");
  await downloadZip(QUOW_URL, zipPath);

  const unpackDir = path.join(tmpDir, "unpack");
  await fs.mkdir(unpackDir, { recursive: true });
  unzipTo(zipPath, unpackDir);

  const dbPath = path.join(unpackDir, "maps", "_quowmap_database.db");
  const xmlPath = path.join(unpackDir, "QuowMinimap.xml");
  await assertExists(dbPath, "_quowmap_database.db");
  await assertExists(xmlPath, "QuowMinimap.xml");

  const rooms = readRoomsTable(dbPath);
  const maps = parseMapfilesTable(await fs.readFile(xmlPath, "utf8"));
  const terrain = terrainConstants();

  await fs.mkdir(path.dirname(OUT_ROOMS), { recursive: true });
  await fs.writeFile(OUT_ROOMS, emitRoomsModule({ rooms, maps, terrain }), "utf8");
  console.log(`[build] wrote ${OUT_ROOMS}  (${Object.keys(rooms).length} rooms, ${Object.keys(maps).length} maps)`);

  await copyPngs(path.join(unpackDir, "maps"), OUT_MAPS);
  console.log(`[build] copied PNGs to ${OUT_MAPS}`);

  console.log("[build] done.");
}

async function downloadZip(url, dest) {
  console.log(`[build] downloading ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url} → HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(dest, buf);
  console.log(`[build] saved ${buf.length} bytes → ${dest}`);
}

function unzipTo(zipPath, destDir) {
  const zip = new AdmZip(zipPath);
  zip.extractAllTo(destDir, /* overwrite */ true);
}

async function assertExists(p, label) {
  try { await fs.access(p); }
  catch { throw new Error(`Expected ${label} at ${p}; got missing. Did Quow restructure the zip?`); }
}

function readRoomsTable(dbPath) {
  const db = new Database(dbPath, { readonly: true });
  try {
    const rows = db.prepare("SELECT room_id, map_id, xpos, ypos, room_short FROM rooms").all();
    if (rows.length < 5000) {
      console.warn(`[build] WARNING: rooms table has only ${rows.length} rows; expected >5000. Continuing.`);
    }
    const out = {};
    for (const r of rows) {
      // Compact [map_id, x, y, short]; matches the spec's array form.
      out[r.room_id] = [r.map_id, r.xpos, r.ypos, r.room_short];
    }
    return out;
  } finally {
    db.close();
  }
}

// Parse the sQuowMapfiles = { … } literal out of QuowMinimap.xml.
// The block format (one map per line) is stable across Quow releases:
//   [id] = { "file.png", "Display Name", w, h, defx, defy, "Region", false, color, maxX, maxY, topLevel, },
function parseMapfilesTable(xml) {
  const blockMatch = xml.match(/sQuowMapfiles\s*=\s*\{([\s\S]*?)\n\}/);
  if (!blockMatch) throw new Error("Could not locate sQuowMapfiles table in QuowMinimap.xml");
  const block = blockMatch[1];

  const out = {};
  const rowRe = /\[(\d+)\]\s*=\s*\{\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*"([^"]+)"\s*,\s*(?:true|false)\s*,\s*\d+\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(true|false)/g;
  let m;
  while ((m = rowRe.exec(block)) !== null) {
    const id = Number(m[1]);
    out[id] = {
      file: m[2],
      name: m[3],
      // m[4]/m[5] are sprite size — not needed for v1 rendering
      defaultX: Number(m[6]),
      defaultY: Number(m[7]),
      region: m[8],
      maxX: Number(m[9]),
      maxY: Number(m[10]),
      topLevel: m[11] === "true",
    };
  }
  if (Object.keys(out).length < 20) {
    throw new Error(`Parsed only ${Object.keys(out).length} maps from sQuowMapfiles; expected >60. Format may have changed.`);
  }
  return out;
}

// Hardcoded transcription of QuowMinimap.xml lines ~8159–8174.
// If Quow ever changes the formula, the maintainer notices when re-running and updates here.
function terrainConstants() {
  return {
    hubX: 2450,
    hubY: 2350,
    scaleX: 300000,
    scaleY: 338000,
    viewportMapId: 99,
  };
}

function emitRoomsModule({ rooms, maps, terrain }) {
  const today = new Date().toISOString().slice(0, 10);
  const header = `// Auto-generated by scripts/build-room-db.mjs.
// Source: QuowMinimap.xml + _quowmap_database.db
// Downloaded from ${QUOW_URL} on ${today}.
// Do not edit by hand — re-run \`npm run build:rooms\` to refresh.

export const schemaVersion = 1;
`;

  // Maps: small dictionary, pretty-print as a normal object.
  const mapsLines = ["export const maps = {"];
  for (const id of Object.keys(maps).map(Number).sort((a, b) => a - b)) {
    mapsLines.push(`  ${id}: ${JSON.stringify(maps[id])},`);
  }
  mapsLines.push("};\n");

  // Rooms: 10k rows — emit one room per line. JSON.stringify on the array is compact enough.
  const roomLines = ["export const rooms = {"];
  for (const id of Object.keys(rooms).sort()) {
    // Escape the room_id key safely as a JSON string property.
    roomLines.push(`  ${JSON.stringify(id)}: ${JSON.stringify(rooms[id])},`);
  }
  roomLines.push("};\n");

  const terrainBlock = `export const terrain = ${JSON.stringify(terrain, null, 2)};\n`;

  return [header, mapsLines.join("\n"), roomLines.join("\n"), terrainBlock].join("\n");
}

async function copyPngs(srcDir, destDir) {
  await fs.mkdir(destDir, { recursive: true });
  const entries = await fs.readdir(srcDir);
  let copied = 0;
  for (const name of entries) {
    if (!name.toLowerCase().endsWith(".png")) continue;
    await fs.copyFile(path.join(srcDir, name), path.join(destDir, name));
    copied++;
  }
  console.log(`[build] copied ${copied} PNGs`);
}

main().catch((err) => {
  console.error(`[build] FAILED: ${err.message}`);
  process.exit(1);
});
