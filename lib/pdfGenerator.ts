import { toJpeg, toPng } from "html-to-image";
import jsPDF from "jspdf";

const PIXEL_RATIO = 2;

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "application/octet-stream";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  if (isIOS || isSafari) {
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return;
  }

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 200);
}

function rasterizeSvg(svgText: string, width: number, height: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const svgBlob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width * 2;
      canvas.height = height * 2;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to rasterize SVG"));
    };
    img.src = url;
  });
}

async function inlineImages(container: HTMLElement): Promise<() => void> {
  const imgs = container.querySelectorAll<HTMLImageElement>("img");
  const originals: { img: HTMLImageElement; src: string }[] = [];

  await Promise.all(
    Array.from(imgs).map(async (img) => {
      if (img.src.startsWith("data:")) return;
      originals.push({ img, src: img.src });
      try {
        const resp = await fetch(img.src);
        const blob = await resp.blob();
        if (blob.type === "image/svg+xml") {
          const svgText = await blob.text();
          const w = img.naturalWidth || img.clientWidth || 400;
          const h = img.naturalHeight || img.clientHeight || 140;
          img.src = await rasterizeSvg(svgText, w, h);
        } else {
          const reader = new FileReader();
          const dataUrl: string = await new Promise((res, rej) => {
            reader.onload = () => res(reader.result as string);
            reader.onerror = rej;
            reader.readAsDataURL(blob);
          });
          img.src = dataUrl;
        }
      } catch {
        // keep original src on failure
      }
    })
  );

  return () => originals.forEach(({ img, src }) => (img.src = src));
}

export async function generatePDF(
  elementId: string,
  filename: string
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) throw new Error("PDF content element not found");

  const restore = await inlineImages(element);

  const dataUrl = await toJpeg(element, {
    quality: 0.95,
    pixelRatio: PIXEL_RATIO,
    backgroundColor: "#ffffff",
  });

  restore();

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  const img = new Image();
  img.src = dataUrl;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
  });

  const aspectRatio = img.naturalHeight / img.naturalWidth;
  let finalWidth = pdfWidth;
  let finalHeight = pdfWidth * aspectRatio;

  if (finalHeight > pdfHeight) {
    finalHeight = pdfHeight;
    finalWidth = pdfHeight / aspectRatio;
  }

  pdf.addImage(dataUrl, "JPEG", 0, 0, finalWidth, finalHeight);
  const pdfBlob = pdf.output("blob");
  triggerDownload(pdfBlob, filename);
}

export async function generatePNG(
  elementId: string,
  filename: string
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) throw new Error("Content element not found");

  const restore = await inlineImages(element);

  const dataUrl = await toPng(element, {
    pixelRatio: PIXEL_RATIO,
    backgroundColor: "#ffffff",
  });

  restore();

  const blob = dataUrlToBlob(dataUrl);
  triggerDownload(blob, filename);
}

export type ExportFormat = "pdf" | "png";

export function generateFilename(
  flightNumber: string,
  date: string,
  format: ExportFormat = "pdf"
): string {
  const cleanDate = date.replace(/-/g, "");
  const cleanFlight = flightNumber.replace(/\s+/g, "");
  return `FlightLog_${cleanFlight}_${cleanDate}.${format}`;
}
