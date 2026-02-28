#!/usr/bin/env node
/**
 * Prepares navigation fix data from X-Plane earth_fix.dat format
 * into a compact JSON file for the flight track waypoint matching feature.
 *
 * Usage: node scripts/prepare-navdata.mjs <path-to-earth_fix.dat>
 *
 * If no file is provided, downloads from the x-plane-navdata GitHub repo.
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, "..", "data", "fixes.json");

const GITHUB_RAW_URL =
  "https://raw.githubusercontent.com/mcantsin/x-plane-navdata/master/earth_fix.dat";

async function downloadFixData() {
  console.log("Downloading earth_fix.dat from GitHub...");
  const res = await fetch(GITHUB_RAW_URL);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  return await res.text();
}

function parseFixData(content) {
  const lines = content.split("\n");
  const fixes = [];
  const seen = new Set();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("I") || trimmed === "99") continue;

    const parts = trimmed.split(/\s+/);
    if (parts.length < 3) continue;

    const lat = parseFloat(parts[0]);
    const lon = parseFloat(parts[1]);
    const name = parts[2];

    if (isNaN(lat) || isNaN(lon) || !name) continue;
    if (name.length < 2 || name.length > 7) continue;

    const key = `${name}_${lat.toFixed(2)}_${lon.toFixed(2)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    fixes.push({
      n: name,
      la: Math.round(lat * 10000) / 10000,
      lo: Math.round(lon * 10000) / 10000,
    });
  }

  return fixes;
}

async function main() {
  let content;
  const inputPath = process.argv[2];

  if (inputPath) {
    console.log(`Reading from ${inputPath}...`);
    content = readFileSync(inputPath, "utf-8");
  } else {
    content = await downloadFixData();
  }

  const fixes = parseFixData(content);
  console.log(`Parsed ${fixes.length} unique fixes`);

  const json = JSON.stringify(fixes);
  writeFileSync(OUTPUT_PATH, json, "utf-8");

  const sizeMB = (Buffer.byteLength(json) / 1024 / 1024).toFixed(2);
  console.log(`Written to ${OUTPUT_PATH} (${sizeMB} MB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
