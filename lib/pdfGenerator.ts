import { toJpeg, toPng } from "html-to-image";
import jsPDF from "jspdf";

const PIXEL_RATIO = 2;

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
          img.src =
            "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgText)));
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
  pdf.save(filename);
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

  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
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
