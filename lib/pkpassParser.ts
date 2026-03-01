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
      scale: 3,
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

function drawFieldRow(
  ctx: CanvasRenderingContext2D,
  fields: PkpassField[],
  x: number, y: number, w: number,
  labelColor: string, valueColor: string,
  labelSize: number, valueSize: number,
): number {
  if (fields.length === 0) return y;
  const colW = w / fields.length;
  for (let i = 0; i < fields.length; i++) {
    const fx = x + colW * i;
    ctx.textAlign = "left";
    if (fields[i].label) {
      ctx.font = `${labelSize}px -apple-system, "SF Pro Text", sans-serif`;
      ctx.fillStyle = labelColor;
      ctx.fillText(fields[i].label!, fx, y);
    }
    if (fields[i].value) {
      ctx.font = `500 ${valueSize}px -apple-system, "SF Pro Text", sans-serif`;
      ctx.fillStyle = valueColor;
      ctx.fillText(String(fields[i].value), fx, y + labelSize + valueSize - 2);
    }
  }
  return y + labelSize + valueSize + 14;
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
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const bgColor = parseColor(passJson.backgroundColor, "#1e293b");
  const textColor = parseColor(passJson.foregroundColor, "#ffffff");
  const labelColor = parseColor(passJson.labelColor, "rgba(255,255,255,0.6)");

  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.roundRect(0, 0, W, H, 24);
  ctx.fill();

  const PAD = 36;
  let y = 32;

  // --- Row 1: Logo + headerFields (top-right) ---
  const headerFields = passJson.boardingPass?.headerFields || [];
  if (logoDataUrl) {
    try {
      const img = await loadImage(logoDataUrl);
      const maxH = 36;
      const scale = Math.min(180 / img.width, maxH / img.height, 1);
      ctx.drawImage(img, PAD, y, img.width * scale, img.height * scale);
    } catch { /* ignore */ }
  }
  if (headerFields.length > 0) {
    const hColW = 90;
    for (let i = headerFields.length - 1; i >= 0; i--) {
      const hx = W - PAD - (headerFields.length - i) * hColW;
      ctx.textAlign = "right";
      if (headerFields[i].label) {
        ctx.font = `12px -apple-system, "SF Pro Text", sans-serif`;
        ctx.fillStyle = labelColor;
        ctx.fillText(headerFields[i].label!, hx + hColW - 4, y + 12);
      }
      if (headerFields[i].value) {
        ctx.font = `500 24px -apple-system, "SF Pro Display", sans-serif`;
        ctx.fillStyle = textColor;
        ctx.fillText(String(headerFields[i].value), hx + hColW - 4, y + 38);
      }
    }
  }
  y += 56;

  // --- Strip image (if present) ---
  if (stripDataUrl) {
    try {
      const img = await loadImage(stripDataUrl);
      const stripH = Math.min(160, (W / img.width) * img.height);
      ctx.drawImage(img, 0, y, W, stripH);
      y += stripH + 12;
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
    ctx.font = `13px -apple-system, "SF Pro Text", sans-serif`;
    ctx.fillStyle = labelColor;
    ctx.fillText(depLabel, PAD, y + 14);
  }
  if (arrLabel) {
    ctx.textAlign = "right";
    ctx.font = `13px -apple-system, "SF Pro Text", sans-serif`;
    ctx.fillStyle = labelColor;
    ctx.fillText(arrLabel, W - PAD, y + 14);
  }
  y += depLabel || arrLabel ? 22 : 4;

  ctx.fillStyle = textColor;
  ctx.font = `bold 64px -apple-system, "SF Pro Display", sans-serif`;
  ctx.textAlign = "left";
  ctx.fillText(String(depValue).substring(0, 4), PAD, y + 60);
  ctx.textAlign = "right";
  ctx.fillText(String(arrValue).substring(0, 4), W - PAD, y + 60);

  // Airplane icon between codes
  ctx.textAlign = "center";
  ctx.font = `28px -apple-system, sans-serif`;
  ctx.fillStyle = textColor;
  ctx.globalAlpha = 0.7;
  ctx.fillText("✈", W / 2, y + 50);
  ctx.globalAlpha = 1;

  y += 80;

  // --- Row 3: Secondary fields ---
  const secondaryFields = passJson.boardingPass?.secondaryFields || [];
  if (secondaryFields.length > 0) {
    y += 8;
    y = drawFieldRow(ctx, secondaryFields, PAD, y, W - PAD * 2, labelColor, textColor, 13, 22);
  }

  // --- Row 4: Auxiliary fields ---
  const auxiliaryFields = passJson.boardingPass?.auxiliaryFields || [];
  if (auxiliaryFields.length > 0) {
    y += 4;
    y = drawFieldRow(ctx, auxiliaryFields, PAD, y, W - PAD * 2, labelColor, textColor, 13, 20);
  }

  // --- Barcode ---
  if (barcodeDataUrl) {
    try {
      const img = await loadImage(barcodeDataUrl);
      const remainingH = H - y;
      const barcodeSize = Math.round(W * 0.36);
      const scale = Math.min(barcodeSize / img.width, barcodeSize / img.height);
      const finalW = img.width * scale;
      const finalH = img.height * scale;

      const bx = (W - finalW) / 2;
      const by = y + (remainingH - finalH) / 2;

      const pad = Math.round(finalW * 0.1);
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.roundRect(bx - pad, by - pad, finalW + pad * 2, finalH + pad * 2, 14);
      ctx.fill();

      ctx.drawImage(img, bx, by, finalW, finalH);
    } catch { /* ignore */ }
  }

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
