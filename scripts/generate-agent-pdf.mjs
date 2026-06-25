#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");
const DEFAULT_BASE_URL = "http://127.0.0.1:3000";

function usage() {
  console.log(`Usage:
  node scripts/generate-agent-pdf.mjs --input flight-data.json --output out.pdf [--mode professional|standard] [--base-url http://127.0.0.1:3000]

The input JSON may be either a FlightData object or { "data": FlightData }.
The script writes .flight-log-agent/draft.json, opens the local render page in headless Chrome,
and prints it to an A4 PDF for Hermes delivery.`);
}

function parseArgs(argv) {
  const args = { mode: "professional", baseUrl: DEFAULT_BASE_URL };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") args.help = true;
    else if (arg === "--input") args.input = argv[++i];
    else if (arg === "--output") args.output = argv[++i];
    else if (arg === "--mode") args.mode = argv[++i];
    else if (arg === "--base-url") args.baseUrl = argv[++i];
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function normalizeFlightData(raw) {
  const data = raw?.data ?? raw;
  if (!data || typeof data !== "object") throw new Error("Input must be a JSON object.");
  if (!data.flightNumber) throw new Error("FlightData.flightNumber is required.");
  if (!data.date) throw new Error("FlightData.date is required.");

  return {
    flightNumber: data.flightNumber ?? "",
    callSign: data.callSign ?? "",
    date: data.date ?? "",
    aircraftType: data.aircraftType ?? "",
    registration: data.registration ?? "",
    flightDuration: data.flightDuration ?? "",
    aircraftAge: data.aircraftAge ?? "",
    distance: {
      km: Number(data.distance?.km ?? 0),
      nm: Number(data.distance?.nm ?? 0),
    },
    cruisingAltitude: data.cruisingAltitude ?? "",
    majorWaypoints: data.majorWaypoints ?? "",
    departure: {
      airport: {
        iata: data.departure?.airport?.iata ?? "",
        icao: data.departure?.airport?.icao ?? "",
        name: data.departure?.airport?.name ?? "",
      },
      parkingBay: data.departure?.parkingBay ?? "",
      runway: data.departure?.runway ?? "",
      scheduledTime: data.departure?.scheduledTime ?? "",
      actualTime: data.departure?.actualTime ?? "",
      offChocks: data.departure?.offChocks ?? "",
      metar: data.departure?.metar ?? "",
      utcOffset: data.departure?.utcOffset,
    },
    arrival: {
      airport: {
        iata: data.arrival?.airport?.iata ?? "",
        icao: data.arrival?.airport?.icao ?? "",
        name: data.arrival?.airport?.name ?? "",
      },
      parkingBay: data.arrival?.parkingBay ?? "",
      runway: data.arrival?.runway ?? "",
      scheduledTime: data.arrival?.scheduledTime ?? "",
      actualTime: data.arrival?.actualTime ?? "",
      onChocks: data.arrival?.onChocks ?? "",
      metar: data.arrival?.metar ?? "",
      utcOffset: data.arrival?.utcOffset,
    },
    seatNumber: data.seatNumber ?? "",
    cabinClass: data.cabinClass ?? "",
    bagTag: data.bagTag ?? "",
    selectedPhoto: data.selectedPhoto,
    boardingPass: data.boardingPass,
  };
}

async function isServerReady(baseUrl) {
  try {
    const res = await fetch(`${baseUrl}/api/agent/flight-log/draft`, { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

async function waitForServer(baseUrl, timeoutMs = 45_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isServerReady(baseUrl)) return;
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  throw new Error(`Flight Log Generator did not become ready at ${baseUrl}`);
}

function startDevServer(baseUrl) {
  const url = new URL(baseUrl);
  const port = url.port || "3000";
  return spawn("npm", ["run", "dev", "--", "--hostname", url.hostname, "--port", port], {
    cwd: PROJECT_ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  });
}

function findChrome() {
  const candidates = [
    process.env.CHROME_BIN,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "google-chrome",
    "chromium",
    "chromium-browser",
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate.includes("/") && existsSync(candidate)) return candidate;
    if (!candidate.includes("/")) {
      const check = spawnSync("/usr/bin/env", ["bash", "-lc", `command -v ${candidate}`], {
        encoding: "utf8",
      });
      if (check.status === 0 && check.stdout.trim()) return check.stdout.trim();
    }
  }
  throw new Error("Could not find Chrome/Chromium. Set CHROME_BIN to the browser executable.");
}

async function renderPdfWithPlaywright({ baseUrl, mode, outputPath }) {
  const { chromium } = await import("playwright-core");
  const { jsPDF } = await import("jspdf");
  const browser = await chromium.launch({
    executablePath: findChrome(),
    headless: true,
    args: ["--no-first-run", "--no-default-browser-check", "--disable-gpu"],
  });

  try {
    const page = await browser.newPage({
      viewport: { width: 1200, height: 1600 },
      deviceScaleFactor: 3,
    });
    const renderUrl = `${baseUrl}/agent-pdf?mode=${encodeURIComponent(mode)}`;
    await page.goto(renderUrl, { waitUntil: "networkidle", timeout: 60_000 });
    await page.waitForFunction(
      () => window.__FLIGHT_LOG_READY__ === true || Boolean(window.__FLIGHT_LOG_ERROR__),
      null,
      { timeout: 30_000 }
    );
    const renderError = await page.evaluate(() => window.__FLIGHT_LOG_ERROR__ || null);
    if (renderError) throw new Error(`Render page failed: ${renderError}`);

    const element = page.locator("#pdf-content");
    const box = await element.boundingBox();
    if (!box) throw new Error("PDF content element was not found on render page.");

    const image = await element.screenshot({ type: "jpeg", quality: 95 });
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const aspectRatio = box.height / box.width;
    let finalWidth = pdfWidth;
    let finalHeight = pdfWidth * aspectRatio;
    if (finalHeight > pdfHeight) {
      finalHeight = pdfHeight;
      finalWidth = pdfHeight / aspectRatio;
    }
    const x = (pdfWidth - finalWidth) / 2;
    pdf.addImage(image.toString("base64"), "JPEG", x, 0, finalWidth, finalHeight);
    const arrayBuffer = pdf.output("arraybuffer");
    writeFileSync(outputPath, Buffer.from(arrayBuffer));
  } finally {
    await browser.close();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }
  if (!args.input || !args.output) {
    usage();
    process.exitCode = 2;
    return;
  }
  if (!["professional", "standard"].includes(args.mode)) {
    throw new Error("--mode must be professional or standard");
  }

  const inputPath = resolve(args.input);
  const outputPath = resolve(args.output);
  const raw = JSON.parse(readFileSync(inputPath, "utf8"));
  const data = normalizeFlightData(raw);

  const draftDir = resolve(PROJECT_ROOT, ".flight-log-agent");
  mkdirSync(draftDir, { recursive: true });
  writeFileSync(
    resolve(draftDir, "draft.json"),
    JSON.stringify(
      {
        data,
        metadata: {
          source: "Hermes direct PDF generator",
          notes: `Generated from ${inputPath}`,
          updatedAt: new Date().toISOString(),
          updateCount: 1,
        },
      },
      null,
      2
    ) + "\n"
  );

  let server = null;
  if (!(await isServerReady(args.baseUrl))) {
    server = startDevServer(args.baseUrl);
    server.stdout.on("data", (chunk) => process.stderr.write(`[next] ${chunk}`));
    server.stderr.on("data", (chunk) => process.stderr.write(`[next] ${chunk}`));
  }

  try {
    await waitForServer(args.baseUrl);
    mkdirSync(dirname(outputPath), { recursive: true });

    await renderPdfWithPlaywright({
      baseUrl: args.baseUrl,
      mode: args.mode,
      outputPath,
    });

    if (!existsSync(outputPath)) throw new Error(`PDF was not created: ${outputPath}`);
    console.log(outputPath);
  } finally {
    if (server) server.kill("SIGTERM");
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
