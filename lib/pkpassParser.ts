import JSZip from "jszip";
import { decode as decodeBcbp } from "bcbp";
import type { BoardingPassData } from "./types";

interface PkpassField {
  key: string;
  label?: string;
  value?: string;
}

interface PkpassBarcode {
  message?: string;
  format?: string;
  messageEncoding?: string;
  altText?: string;
}

interface PkpassJson {
  boardingPass?: {
    primaryFields?: PkpassField[];
    secondaryFields?: PkpassField[];
    auxiliaryFields?: PkpassField[];
    headerFields?: PkpassField[];
    backFields?: PkpassField[];
    transitType?: string;
  };
  barcode?: PkpassBarcode;
  barcodes?: PkpassBarcode[];
  backgroundColor?: string;
  foregroundColor?: string;
  labelColor?: string;
  [key: string]: unknown;
}

const PKPASS_FORMAT_TO_BCID: Record<string, string> = {
  "PKBarcodeFormatQR": "qrcode",
  "PKBarcodeFormatPDF417": "pdf417",
  "PKBarcodeFormatAztec": "azteccode",
  "PKBarcodeFormatCode128": "code128",
};

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function findField(fields: PkpassField[], ...keys: string[]): string | undefined {
  for (const k of keys) {
    const f = fields.find(
      (f) => f.key.toLowerCase() === k.toLowerCase()
    );
    if (f?.value) return String(f.value);
  }
  return undefined;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function generateBarcodeDataUrl(barcode: PkpassBarcode): Promise<string | undefined> {
  const bcid = PKPASS_FORMAT_TO_BCID[barcode.format || ""];
  if (!bcid || !barcode.message) return undefined;

  try {
    const bwipjs = await import("bwip-js");
    const canvas = document.createElement("canvas");
    bwipjs.toCanvas(canvas, {
      bcid,
      text: barcode.message,
      scale: 6, // Increased from 3 to 6 for much higher resolution
      backgroundcolor: "ffffff",
      barcolor: "000000",
    });
    return canvas.toDataURL("image/png");
  } catch (e) {
    console.warn("Barcode generation failed:", e);
    return undefined;
  }
}

function parseColor(c: string | undefined, fallback: string): string {
  if (!c) return fallback;
  if (c.startsWith("rgb")) return c;
  if (c.startsWith("#")) return c;
  return fallback;
}

function fillTextTruncated(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number, y: number,
  maxWidth: number,
) {
  const measuredW = ctx.measureText(text).width;
  if (measuredW <= maxWidth) {
    ctx.fillText(text, x, y);
    return;
  }
  const scale = maxWidth / measuredW;
  const align = ctx.textAlign;
  ctx.save();
  if (align === "right") {
    ctx.translate(x, y);
    ctx.scale(scale, 1);
    ctx.textAlign = "right";
    ctx.fillText(text, 0, 0);
  } else {
    ctx.translate(x, y);
    ctx.scale(scale, 1);
    ctx.fillText(text, 0, 0);
  }
  ctx.restore();
}

function drawFieldRow(
  ctx: CanvasRenderingContext2D,
  fields: PkpassField[],
  x: number, y: number, w: number,
  labelColor: string, valueColor: string,
  labelSize: number, valueSize: number,
): number {
  if (fields.length === 0) return y;
  const n = fields.length;
  // Give the last column a fixed small width and distribute the rest evenly
  const lastColW = n > 1 ? Math.min(w * 0.14, 80) : w;
  const remainW = w - lastColW;
  const midColW = n > 1 ? remainW / (n - 1) : 0;
  const gap = 12;

  for (let i = 0; i < n; i++) {
    const isLast = i === n - 1 && n > 1;
    const fx = i < n - 1 ? x + midColW * i : 0;
    const anchorX = isLast ? x + w : fx;
    const align = isLast ? "right" as const : "left" as const;
    const maxTextW = (isLast ? lastColW : midColW) - gap;
    ctx.textAlign = align;
    if (fields[i].label) {
      ctx.font = `${labelSize}px -apple-system, "SF Pro Text", sans-serif`;
      ctx.fillStyle = labelColor;
      fillTextTruncated(ctx, fields[i].label!, anchorX, y, maxTextW);
    }
    if (fields[i].value) {
      ctx.font = `500 ${valueSize}px -apple-system, "SF Pro Text", sans-serif`;
      ctx.fillStyle = valueColor;
      fillTextTruncated(ctx, String(fields[i].value), anchorX, y + labelSize + 14, maxTextW);
    }
  }
  return y + labelSize + valueSize + 28;
}

async function renderBoardingPassCard(
  passJson: PkpassJson,
  parsed: BoardingPassData["parsedData"],
  logoDataUrl?: string,
  barcodeDataUrl?: string,
  stripDataUrl?: string,
): Promise<string> {
  const W = 600;
  const H = 900;
  // Create a high-resolution canvas internally (2x scale)
  const scaleFactor = 2;
  const canvas = document.createElement("canvas");
  canvas.width = W * scaleFactor;
  canvas.height = H * scaleFactor;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scaleFactor, scaleFactor);

  const bgColor = parseColor(passJson.backgroundColor, "#1e293b");
  const textColor = parseColor(passJson.foregroundColor, "#ffffff");
  const labelColor = parseColor(passJson.labelColor, "rgba(255,255,255,0.6)");

  const notchY = 260;
  const notchR = 14;
  const radius = 24;

  ctx.fillStyle = bgColor;
  ctx.beginPath();
  // Top-left
  ctx.moveTo(0, radius);
  ctx.arcTo(0, 0, radius, 0, radius);
  // Top-right
  ctx.lineTo(W - radius, 0);
  ctx.arcTo(W, 0, W, radius, radius);
  // Right edge down to notch
  ctx.lineTo(W, notchY - notchR);
  // Right notch (inward half-circle)
  ctx.arc(W, notchY, notchR, -Math.PI / 2, Math.PI / 2, true);
  // Right edge down to bottom-right
  ctx.lineTo(W, H - radius);
  ctx.arcTo(W, H, W - radius, H, radius);
  // Bottom-left
  ctx.lineTo(radius, H);
  ctx.arcTo(0, H, 0, H - radius, radius);
  // Left edge up to notch
  ctx.lineTo(0, notchY + notchR);
  // Left notch (inward half-circle)
  ctx.arc(0, notchY, notchR, Math.PI / 2, -Math.PI / 2, true);
  // Close path
  ctx.lineTo(0, radius);
  ctx.fill();

  const PAD = 28;
  let y = 32;

  // --- Row 1: Logo + headerFields (top-right) ---
  const headerFields = passJson.boardingPass?.headerFields || [];
  if (logoDataUrl) {
    try {
      const img = await loadImage(logoDataUrl);
      const maxW = 180;
      const maxH = 36;
      const scale = Math.min(maxW / img.width, maxH / img.height);
      ctx.drawImage(img, PAD, y, img.width * scale, img.height * scale);
    } catch { /* ignore */ }
  }
  if (headerFields.length > 0) {
    const hColW = 120;
    for (let i = 0; i < headerFields.length; i++) {
      const fieldIndex = headerFields.length - 1 - i;
      const hx = W - PAD - i * hColW;
      ctx.textAlign = "right";
      if (headerFields[fieldIndex].label) {
        ctx.font = `13px -apple-system, "SF Pro Text", sans-serif`;
        ctx.fillStyle = labelColor;
        ctx.fillText(headerFields[fieldIndex].label!, hx, y + 12);
      }
      if (headerFields[fieldIndex].value) {
        ctx.font = `300 28px -apple-system, "SF Pro Display", sans-serif`;
        ctx.fillStyle = textColor;
        ctx.fillText(String(headerFields[fieldIndex].value), hx, y + 40);
      }
    }
  }
  y += 80; // Increased spacing below header

  // --- Strip image (if present) ---
  if (stripDataUrl) {
    try {
      const img = await loadImage(stripDataUrl);
      const stripH = Math.min(160, (W / img.width) * img.height);
      ctx.drawImage(img, 0, y, W, stripH);
      y += stripH + 24; // Increased spacing
    } catch { /* ignore */ }
  }

  // --- Row 2: Primary fields (airport codes) ---
  const primaryFields = passJson.boardingPass?.primaryFields || [];
  const depLabel = primaryFields[0]?.label || "";
  const depValue = parsed?.departureAirport || primaryFields[0]?.value || "---";
  const arrLabel = primaryFields.length > 1 ? (primaryFields[primaryFields.length - 1]?.label || "") : "";
  const arrValue = parsed?.arrivalAirport || (primaryFields.length > 1 ? primaryFields[primaryFields.length - 1]?.value : undefined) || "---";

  if (depLabel) {
    ctx.textAlign = "left";
    ctx.font = `14px -apple-system, "SF Pro Text", sans-serif`;
    ctx.fillStyle = labelColor;
    ctx.fillText(depLabel, PAD, y + 14);
  }
  if (arrLabel) {
    ctx.textAlign = "right";
    ctx.font = `14px -apple-system, "SF Pro Text", sans-serif`;
    ctx.fillStyle = labelColor;
    ctx.fillText(arrLabel, W - PAD, y + 14);
  }
  y += depLabel || arrLabel ? 24 : 4; // Increased spacing

  ctx.fillStyle = textColor;
  ctx.font = `300 76px -apple-system, "SF Pro Display", sans-serif`;
  ctx.textAlign = "left";
  ctx.fillText(String(depValue).substring(0, 4), PAD, y + 68);
  ctx.textAlign = "right";
  ctx.fillText(String(arrValue).substring(0, 4), W - PAD, y + 68);

  // Airplane icon between codes
  ctx.fillStyle = textColor;
  ctx.globalAlpha = 0.7;
  ctx.save();
  ctx.translate(W / 2, y + 36);
  // A standard airplane SVG path
  const planePath = new Path2D("M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z");
  ctx.scale(1.8, 1.8);
  ctx.translate(-12, -12);
  ctx.rotate(Math.PI / 2); // Point right
  ctx.translate(0, -24);
  ctx.fill(planePath);
  ctx.restore();
  ctx.globalAlpha = 1;

  y += 110; // Increased spacing below primary fields

  // --- Row 3: Secondary fields ---
  const secondaryFields = passJson.boardingPass?.secondaryFields || [];
  if (secondaryFields.length > 0) {
    y += 12;
    y = drawFieldRow(ctx, secondaryFields, PAD, y, W - PAD * 2, labelColor, textColor, 14, 22);
  }

  // --- Row 4: Auxiliary fields ---
  const auxiliaryFields = passJson.boardingPass?.auxiliaryFields || [];
  if (auxiliaryFields.length > 0) {
    y += 12;
    y = drawFieldRow(ctx, auxiliaryFields, PAD, y, W - PAD * 2, labelColor, textColor, 14, 20); // Slightly smaller value size for auxiliary fields
  }

  // --- Barcode ---
  if (barcodeDataUrl) {
    try {
      const img = await loadImage(barcodeDataUrl);
      const remainingH = H - y;
      const barcodeSize = Math.round(W * 0.44); // Increased size
      
      // Increase internal canvas resolution for sharper barcode
      const bw = Math.min(barcodeSize, img.width);
      const bh = Math.min(barcodeSize, img.height);
      const scale = Math.min(bw / img.width, bh / img.height);
      const finalW = img.width * scale;
      const finalH = img.height * scale;

      const bx = (W - finalW) / 2;
      // Shift slightly down for better visual balance
      const by = y + (remainingH - finalH) / 2 + 10;

      const pad = 16; // Fixed padding instead of proportional
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.roundRect(bx - pad, by - pad, finalW + pad * 2, finalH + pad * 2, 16);
      ctx.fill();

      // Disable image smoothing for barcodes to keep edges sharp
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, bx, by, finalW, finalH);
      ctx.imageSmoothingEnabled = true;
    } catch { /* ignore */ }
  }

  // Double the output resolution for sharper text and graphics
  return canvas.toDataURL("image/png");
}

export interface PkpassResult {
  imageDataUrl: string;
  parsedData: BoardingPassData["parsedData"];
}

export async function parsePkpass(file: File): Promise<PkpassResult> {
  const zip = await JSZip.loadAsync(file);

  const passFile = zip.file("pass.json");
  if (!passFile) throw new Error("Invalid .pkpass file: missing pass.json");
  const passJson: PkpassJson = JSON.parse(await passFile.async("string"));

  const allFields: PkpassField[] = [
    ...(passJson.boardingPass?.headerFields || []),
    ...(passJson.boardingPass?.primaryFields || []),
    ...(passJson.boardingPass?.secondaryFields || []),
    ...(passJson.boardingPass?.auxiliaryFields || []),
    ...(passJson.boardingPass?.backFields || []),
  ];

  let parsedData: BoardingPassData["parsedData"] = {
    departureAirport: findField(allFields, "departureAirport", "origin", "depart", "from", "departureCode", "originCode"),
    arrivalAirport: findField(allFields, "arrivalAirport", "destination", "arrive", "to", "destinationCode", "arrivalCode"),
    flightNumber: findField(allFields, "flightNumber", "flight", "flightCode"),
    seatNumber: findField(allFields, "seatNumber", "seat", "seatAssignment"),
    gate: findField(allFields, "gate", "boardingGate", "gateNumber"),
    boardingTime: findField(allFields, "boardingTime", "boarding", "boardTime"),
    passengerName: findField(allFields, "passengerName", "passenger", "name"),
  };

  const barcode = passJson.barcodes?.[0] || passJson.barcode;
  const barcodeMsg = barcode?.message;
  if (barcodeMsg) {
    try {
      const decoded = decodeBcbp(barcodeMsg);
      const leg = decoded.data?.legs?.[0];
      parsedData = {
        passengerName: parsedData?.passengerName || decoded.data?.passengerName,
        flightNumber: parsedData?.flightNumber || (leg?.operatingCarrierDesignator && leg?.flightNumber ? `${leg.operatingCarrierDesignator}${leg.flightNumber}` : undefined),
        seatNumber: parsedData?.seatNumber || leg?.seatNumber,
        departureAirport: parsedData?.departureAirport || leg?.departureAirport,
        arrivalAirport: parsedData?.arrivalAirport || leg?.arrivalAirport,
        gate: parsedData?.gate,
        boardingTime: parsedData?.boardingTime,
      };
    } catch {
      // barcode decode failed — keep field-extracted data
    }
  }

  let barcodeDataUrl: string | undefined;
  if (barcode) {
    barcodeDataUrl = await generateBarcodeDataUrl(barcode);
  }

  let stripDataUrl: string | undefined;
  const stripCandidates = ["strip@2x.png", "strip.png", "strip@3x.png"];
  for (const name of stripCandidates) {
    const f = zip.file(name);
    if (f) {
      const blob = await f.async("blob");
      stripDataUrl = await blobToDataUrl(new Blob([blob], { type: "image/png" }));
      break;
    }
  }

  let logoDataUrl: string | undefined;
  const logoFile = zip.file("logo@2x.png") || zip.file("logo.png");
  if (logoFile) {
    const blob = await logoFile.async("blob");
    logoDataUrl = await blobToDataUrl(new Blob([blob], { type: "image/png" }));
  }

  const imageDataUrl = await renderBoardingPassCard(
    passJson, parsedData, logoDataUrl, barcodeDataUrl, stripDataUrl,
  );

  return { imageDataUrl, parsedData };
}
