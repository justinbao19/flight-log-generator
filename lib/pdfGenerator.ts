import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export async function generatePDF(
  elementId: string,
  filename: string
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) throw new Error("PDF content element not found");

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    logging: false,
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.95);
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;
  const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
  const scaledWidth = imgWidth * ratio;
  const scaledHeight = imgHeight * ratio;

  pdf.addImage(imgData, "JPEG", 0, 0, scaledWidth, scaledHeight);
  pdf.save(filename);
}

export function generateFilename(flightNumber: string, date: string): string {
  const cleanDate = date.replace(/-/g, "");
  const cleanFlight = flightNumber.replace(/\s+/g, "");
  return `FlightLog_${cleanFlight}_${cleanDate}.pdf`;
}
