"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";

type GenericRow = Record<string, unknown>;

/* ── Helpers ── */

function toStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

/**
 * Format numbers for PDF output.
 * Uses regular spaces instead of non-breaking spaces (U+00A0)
 * to prevent jsPDF from spacing out each digit individually.
 */
function formatNum(v: unknown): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return toStr(v);
  // Replace ALL non-breaking spaces (U+00A0, U+202F) with regular spaces
  return new Intl.NumberFormat("fr-FR").format(n).replace(/[\u00A0\u202F]/g, " ");
}

function formatPdfPercent(v: unknown): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return toStr(v);
  return `${n.toFixed(1)}%`;
}

function formatPdfDecimal(v: unknown, decimals = 1): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return toStr(v);
  return n.toFixed(decimals).replace(/[\u00A0\u202F]/g, " ");
}

function getColumns(rows: GenericRow[]): string[] {
  const set = new Set<string>();
  for (const row of rows) Object.keys(row).forEach((k) => set.add(k));
  return Array.from(set);
}

function getGlobalExportContextLines() {
  if (typeof document === "undefined") return [];
  return Array.from(document.querySelectorAll("[data-export-context-line]"))
    .map((node) => node.textContent?.trim() ?? "")
    .filter(Boolean);
}

/* ── Chart capture ── */

export async function captureCharts(containerSelector: string, maxCharts = 6): Promise<string[]> {
  const containers = document.querySelectorAll(containerSelector);
  const images: string[] = [];

  const toCapture = Array.from(containers).slice(0, maxCharts);

  for (const container of toCapture) {
    try {
      const el = container as HTMLElement;
      // Force light background for PDF export clarity
      const canvas = await html2canvas(el, {
        backgroundColor: "#ffffff",
        scale: 2.5,
        logging: false,
        useCORS: true,
        removeContainer: true,
      });
      images.push(canvas.toDataURL("image/png"));
    } catch {
      // Skip charts that fail to capture
    }
  }

  return images;
}

export async function downloadElementAsPng(
  elementId: string,
  filename: string,
  metadataLines: string[] = [],
) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const isDark = document.documentElement.getAttribute("data-theme") !== "light";
  const bgColor = isDark ? "#0c1525" : "#ffffff";
  const textColor = isDark ? "#dbe4f0" : "#0f172a";
  const mutedColor = isDark ? "#94a3b8" : "#475569";

  const wrapper = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.left = "-10000px";
  wrapper.style.top = "0";
  wrapper.style.width = `${Math.max(element.scrollWidth, 1200)}px`;
  wrapper.style.background = bgColor;
  wrapper.style.padding = "24px";
  wrapper.style.borderRadius = "24px";

  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.maxHeight = "none";
  clone.style.height = "auto";
  clone.style.overflow = "visible";
  clone.querySelectorAll("[data-export-ignore='true']").forEach((node) => node.remove());
  wrapper.appendChild(clone);

  const mergedMetadata = [...getGlobalExportContextLines(), ...metadataLines];

  if (mergedMetadata.length > 0) {
    const footer = document.createElement("div");
    footer.style.marginTop = "20px";
    footer.style.paddingTop = "16px";
    footer.style.borderTop = isDark ? "1px solid rgba(148,163,184,0.25)" : "1px solid rgba(148,163,184,0.35)";

    const footerTitle = document.createElement("div");
    footerTitle.textContent = "Metadonnees de construction";
    footerTitle.style.font = "700 14px Inter, system-ui, sans-serif";
    footerTitle.style.color = textColor;
    footerTitle.style.marginBottom = "8px";
    footer.appendChild(footerTitle);

    for (const line of mergedMetadata) {
      const item = document.createElement("div");
      item.textContent = line;
      item.style.font = "12px Inter, system-ui, sans-serif";
      item.style.color = mutedColor;
      item.style.lineHeight = "1.5";
      footer.appendChild(item);
    }
    wrapper.appendChild(footer);
  }

  document.body.appendChild(wrapper);
  try {
    window.dispatchEvent(new CustomEvent("port-pulse:png-export-start", { detail: { elementId } }));
    await new Promise((resolve) => window.setTimeout(resolve, 180));
    const canvas = await html2canvas(wrapper, {
      backgroundColor: bgColor,
      scale: 2,
      logging: false,
      useCORS: true,
      removeContainer: true,
    });
    const dataUrl = canvas.toDataURL("image/png");
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    triggerDownload(blob, filename);
  } finally {
    window.dispatchEvent(new CustomEvent("port-pulse:png-export-end", { detail: { elementId } }));
    document.body.removeChild(wrapper);
  }
}

/* ── CSV ── */

export function rowsToCsv(rows: GenericRow[]): string {
  if (rows.length === 0) return "";
  const keys = getColumns(rows);
  const escape = (v: unknown) => {
    const t = toStr(v);
    return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  return [keys.join(","), ...rows.map((row) => keys.map((k) => escape(row[k])).join(","))].join("\n");
}

export function downloadCsv(filename: string, rows: GenericRow[]) {
  const csv = rowsToCsv(rows);
  const bom = "\uFEFF";
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename);
}

/* ── Excel (.xlsx) ── */

export interface ExcelSheet {
  name: string;
  rows: GenericRow[];
  columns?: string[];
}

export function downloadExcel(filename: string, sheets: ExcelSheet[]) {
  const wb = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const cols = sheet.columns ?? getColumns(sheet.rows);
    const data = [cols, ...sheet.rows.map((row) => cols.map((k) => row[k] ?? ""))];
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Auto-size columns
    ws["!cols"] = cols.map((col) => {
      let max = col.length;
      for (const row of sheet.rows) {
        const len = toStr(row[col]).length;
        if (len > max) max = len;
      }
      return { wch: Math.min(max + 2, 40) };
    });

    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31));
  }

  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  triggerDownload(blob, filename);
}

/* ── PDF ── */

export interface PdfSection {
  title: string;
  rows: GenericRow[];
  columns?: { key: string; label: string; format?: "number" | "percent" | "decimal" | "text" }[];
  chartImage?: string; // base64 PNG of chart to render above the table
  intro?: string;
  highlights?: { label: string; value: string }[];
  notes?: string[];
}

/* ── PDF brand palette ── */

const PDF_BRAND = {
  navy: [12, 21, 42] as [number, number, number],
  navyLight: [30, 41, 59] as [number, number, number],
  cyan: [8, 145, 178] as [number, number, number],
  cyanDark: [14, 116, 144] as [number, number, number],
  slate: [71, 85, 105] as [number, number, number],
  slateMuted: [148, 163, 184] as [number, number, number],
  soft: [241, 245, 249] as [number, number, number],
  softer: [248, 250, 252] as [number, number, number],
  emerald: [16, 185, 129] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  border: [226, 232, 240] as [number, number, number],
};

/**
 * Attempt to load and embed a logo image.
 * Returns base64 data URL or null if loading fails.
 */
async function loadLogoForPdf(logoUrl: string): Promise<string | null> {
  try {
    const response = await fetch(logoUrl);
    if (!response.ok) return null;
    const blob = await response.blob();
    // Convert to PNG via canvas if not already a supported format
    const imageBitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = imageBitmap.width;
    canvas.height = imageBitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imageBitmap, 0, 0);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

/**
 * Draw a consistent page header on every page (after page 1).
 */
function drawPageHeader(doc: jsPDF, title: string, pageWidth: number) {
  doc.setFillColor(...PDF_BRAND.navy);
  doc.rect(0, 0, pageWidth, 14, "F");
  doc.setTextColor(...PDF_BRAND.white);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
}

/**
 * Draw consistent page footer with page number and branding.
 */
function drawFooters(doc: jsPDF, pageCount: number, pageWidth: number, pageHeight: number) {
  const dateStr = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short" }).format(new Date());
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    // Separator line
    doc.setDrawColor(...PDF_BRAND.border);
    doc.setLineWidth(0.3);
    doc.line(14, pageHeight - 14, pageWidth - 14, pageHeight - 14);
    // Left: branding
    doc.setFontSize(7.5);
    doc.setTextColor(...PDF_BRAND.slateMuted);
    doc.text(`Port Pulse — Pakazure | ${dateStr}`, 14, pageHeight - 9);
    // Right: page number
    doc.setFont("helvetica", "bold");
    doc.text(`Page ${i}/${pageCount}`, pageWidth - 14, pageHeight - 9, { align: "right" });
    doc.setFont("helvetica", "normal");
  }
}

/**
 * Format a cell value for PDF table display based on column format hint.
 */
function formatCellForPdf(v: unknown, format?: "number" | "percent" | "decimal" | "text"): string {
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    }).format(v);
  }
  if (format === "percent") return formatPdfPercent(v);
  if (format === "decimal") return formatPdfDecimal(v);
  if (format === "number") return formatNum(v);
  if (typeof v === "number") return formatNum(v);
  return toStr(v);
}

export async function downloadPdf(
  filename: string,
  title: string,
  subtitle: string,
  sections: PdfSection[],
  logoUrl?: string,
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 14;
  const marginRight = 14;
  const contentWidth = pageWidth - marginLeft - marginRight;
  const safeBottom = pageHeight - 20; // leave room for footer

  // ─── Load logo ───
  let logoDataUrl: string | null = null;
  if (logoUrl) {
    logoDataUrl = await loadLogoForPdf(logoUrl);
  }

  // ═══════════════════════════════════════════
  //  PAGE 1 — COVER HEADER
  // ═══════════════════════════════════════════

  // Full-width navy header band
  doc.setFillColor(...PDF_BRAND.navy);
  doc.rect(0, 0, pageWidth, 40, "F");

  // Accent bar under header
  doc.setFillColor(...PDF_BRAND.cyan);
  doc.rect(0, 40, pageWidth, 1.5, "F");

  // Logo (top-right in header)
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", pageWidth - 48, 5, 34, 30);
    } catch {
      // silently skip logo if it fails
    }
  }

  // Title text
  doc.setTextColor(...PDF_BRAND.white);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(title, marginLeft, 17);

  // Subtitle
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 215, 235);
  doc.text(subtitle, marginLeft, 25);

  // Generation date
  doc.setFontSize(8.5);
  doc.setTextColor(140, 160, 190);
  const genDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date());
  doc.text(`Genere le ${genDate}`, marginLeft, 33);

  doc.setTextColor(0, 0, 0);
  let startY = 50;

  // ═══════════════════════════════════════════
  //  SECTIONS
  // ═══════════════════════════════════════════

  for (const section of sections) {
    const hasChart = Boolean(section.chartImage);
    const hasTable = section.rows.length > 0;
    const hasHighlights = Boolean(section.highlights?.length);
    const hasNotes = Boolean(section.notes?.length);
    const hasIntro = Boolean(section.intro);
    if (!hasChart && !hasTable && !hasHighlights && !hasNotes && !hasIntro) continue;

    // ─── New page check ───
    if (startY > safeBottom - 30) {
      doc.addPage();
      drawPageHeader(doc, title, pageWidth);
      startY = 22;
    }

    // ─── Section title bar ───
    doc.setFillColor(...PDF_BRAND.cyan);
    doc.rect(marginLeft, startY - 1, 3, 8, "F"); // accent bar left
    doc.setFillColor(...PDF_BRAND.softer);
    doc.roundedRect(marginLeft + 4, startY - 3, contentWidth - 4, 10, 1.5, 1.5, "F");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PDF_BRAND.navy);
    doc.text(section.title, marginLeft + 8, startY + 3.5);
    doc.setFont("helvetica", "normal");
    startY += 13;

    // ─── Intro text ───
    if (section.intro) {
      doc.setFontSize(8.5);
      doc.setTextColor(...PDF_BRAND.slate);
      const introLines = doc.splitTextToSize(section.intro, contentWidth);
      doc.text(introLines, marginLeft, startY);
      startY += (introLines.length * 4) + 4;
    }

    // ─── Highlight KPI cards ───
    if (section.highlights?.length) {
      const count = section.highlights.length;
      const gap = 5;
      const cardWidth = (contentWidth - (gap * (count - 1))) / Math.max(count, 1);
      const cardHeight = 18;
      let cardX = marginLeft;

      for (const item of section.highlights) {
        // Card background
        doc.setFillColor(...PDF_BRAND.white);
        doc.setDrawColor(...PDF_BRAND.border);
        doc.setLineWidth(0.3);
        doc.roundedRect(cardX, startY, cardWidth, cardHeight, 2, 2, "FD");

        // Top accent line
        doc.setFillColor(...PDF_BRAND.cyan);
        doc.rect(cardX + 3, startY + 1, cardWidth - 6, 0.8, "F");

        // Label
        doc.setFontSize(7);
        doc.setTextColor(...PDF_BRAND.slateMuted);
        doc.setFont("helvetica", "normal");
        doc.text(item.label.toUpperCase(), cardX + 4, startY + 6.5);

        // Value — larger, bold, navy
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...PDF_BRAND.navy);
        // Replace non-breaking spaces in the value too
        const cleanValue = item.value.replace(/[\u00A0\u202F]/g, " ");
        doc.text(cleanValue, cardX + 4, startY + 14);

        doc.setFont("helvetica", "normal");
        cardX += cardWidth + gap;
      }
      startY += cardHeight + 6;
    }

    // ─── Chart image ───
    if (section.chartImage) {
      // Determine proper chart dimensions from image aspect ratio
      const chartDisplayWidth = contentWidth;
      let chartDisplayHeight = 65; // default

      try {
        // Decode image to get actual dimensions
        const img = new Image();
        const loaded = await new Promise<boolean>((resolve) => {
          img.onload = () => resolve(true);
          img.onerror = () => resolve(false);
          img.src = section.chartImage!;
        });
        if (loaded && img.naturalWidth > 0 && img.naturalHeight > 0) {
          const ratio = img.naturalHeight / img.naturalWidth;
          chartDisplayHeight = Math.min(Math.round(chartDisplayWidth * ratio), 85);
          chartDisplayHeight = Math.max(chartDisplayHeight, 40);
        }
      } catch {
        // keep defaults
      }

      if (startY + chartDisplayHeight > safeBottom) {
        doc.addPage();
        drawPageHeader(doc, title, pageWidth);
        startY = 22;
      }

      try {
        // Light border around chart
        doc.setDrawColor(...PDF_BRAND.border);
        doc.setLineWidth(0.2);
        doc.roundedRect(marginLeft, startY, chartDisplayWidth, chartDisplayHeight, 1.5, 1.5, "S");
        doc.addImage(section.chartImage, "PNG", marginLeft + 0.5, startY + 0.5, chartDisplayWidth - 1, chartDisplayHeight - 1);
        startY += chartDisplayHeight + 6;
      } catch {
        // Skip if image fails
      }
    }

    // ─── Data table ───
    if (hasTable) {
      if (startY > safeBottom - 20) {
        doc.addPage();
        drawPageHeader(doc, title, pageWidth);
        startY = 22;
      }

      const cols: NonNullable<PdfSection["columns"]> =
        section.columns ?? getColumns(section.rows).map((k) => ({ key: k, label: k }));
      const head = [cols.map((c) => c.label)];
      const body = section.rows.map((row) =>
        cols.map((c) => formatCellForPdf(row[c.key], c.format)),
      );

      autoTable(doc, {
        startY,
        head,
        body,
        theme: "grid",
        headStyles: {
          fillColor: [...PDF_BRAND.navy],
          textColor: [...PDF_BRAND.white],
          fontSize: 8,
          fontStyle: "bold",
          cellPadding: 3,
          halign: "center",
        },
        bodyStyles: {
          fontSize: 7.5,
          textColor: [...PDF_BRAND.navyLight],
          cellPadding: 2.5,
          halign: "right",
        },
        columnStyles: {
          0: { halign: "left", fontStyle: "bold" },
        },
        alternateRowStyles: { fillColor: [...PDF_BRAND.softer] },
        margin: { left: marginLeft, right: marginRight },
        styles: {
          overflow: "linebreak",
          lineColor: [...PDF_BRAND.border],
          lineWidth: 0.15,
        },
        didDrawPage: (data: { pageNumber: number }) => {
          // Add header on new pages created by table overflow
          if (data.pageNumber > 1) {
            drawPageHeader(doc, title, pageWidth);
          }
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lastTable = (doc as any).lastAutoTable;
      startY = (lastTable?.finalY ?? startY) + 8;
    }

    // ─── Notes ───
    if (section.notes?.length) {
      if (startY > safeBottom - 16) {
        doc.addPage();
        drawPageHeader(doc, title, pageWidth);
        startY = 22;
      }
      doc.setFontSize(7.5);
      doc.setTextColor(...PDF_BRAND.slateMuted);
      doc.setFont("helvetica", "italic");
      for (const note of section.notes) {
        const lines = doc.splitTextToSize(`• ${note}`, contentWidth);
        doc.text(lines, marginLeft, startY);
        startY += (lines.length * 3.5) + 1.5;
      }
      doc.setFont("helvetica", "normal");
      startY += 4;
    }

    // Small visual separator between sections
    if (startY < safeBottom - 10) {
      doc.setDrawColor(...PDF_BRAND.border);
      doc.setLineWidth(0.15);
      doc.line(marginLeft + 20, startY, pageWidth - marginLeft - 20, startY);
      startY += 6;
    }
  }

  // ═══════════════════════════════════════════
  //  FOOTERS ON ALL PAGES
  // ═══════════════════════════════════════════
  drawFooters(doc, doc.getNumberOfPages(), pageWidth, pageHeight);

  doc.save(filename);
}

/* ── Utility ── */

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
