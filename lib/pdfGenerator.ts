import { toJpeg, toPng } from "html-to-image";
import jsPDF from "jspdf";

const PIXEL_RATIO = 2;

export async function generatePDF(
  elementId: string,
  filename: string
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) throw new Error("PDF content element not found");

  const dataUrl = await toJpeg(element, {
    quality: 0.95,
    pixelRatio: PIXEL_RATIO,
    backgroundColor: "#ffffff",
  });

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

  const dataUrl = await toPng(element, {
    pixelRatio: PIXEL_RATIO,
    backgroundColor: "#ffffff",
  });

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
