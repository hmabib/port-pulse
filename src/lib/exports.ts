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

function formatNum(v: unknown): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return toStr(v);
  return new Intl.NumberFormat("fr-FR").format(n);
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

  const isDark = document.documentElement.getAttribute("data-theme") !== "light";
  const bgColor = isDark ? "#0c1525" : "#ffffff";

  const toCapture = Array.from(containers).slice(0, maxCharts);

  for (const container of toCapture) {
    try {
      const canvas = await html2canvas(container as HTMLElement, {
        backgroundColor: bgColor,
        scale: 2,
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
  columns?: { key: string; label: string }[];
  chartImage?: string; // base64 PNG of chart to render above the table
  intro?: string;
  highlights?: { label: string; value: string }[];
  notes?: string[];
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
  const contentWidth = pageWidth - 28; // 14mm margins each side
  const brand = {
    navy: [15, 23, 42] as [number, number, number],
    cyan: [8, 145, 178] as [number, number, number],
    slate: [71, 85, 105] as [number, number, number],
    soft: [241, 245, 249] as [number, number, number],
    emerald: [16, 185, 129] as [number, number, number],
  };

  // Logo
  let logoDataUrl: string | null = null;
  if (logoUrl) {
    try {
      const response = await fetch(logoUrl);
      const blob = await response.blob();
      logoDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      doc.addImage(logoDataUrl, "JPEG", pageWidth - 44, 6, 30, 25);
    } catch {
      // Logo loading failed, continue without it
    }
  }

  // Cover / header
  doc.setFillColor(...brand.navy);
  doc.rect(0, 0, pageWidth, 36, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 18);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(subtitle, 14, 26);
  doc.setTextColor(...brand.slate);
  doc.setFontSize(9);
  doc.text(`Genere le ${new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date())}`, 14, 32);
  doc.setTextColor(0, 0, 0);

  let startY = 46;

  for (const section of sections) {
    const hasChart = Boolean(section.chartImage);
    const hasTable = section.rows.length > 0;
    const hasHighlights = Boolean(section.highlights?.length);
    const hasNotes = Boolean(section.notes?.length);
    const hasIntro = Boolean(section.intro);
    if (!hasChart && !hasTable && !hasHighlights && !hasNotes && !hasIntro) continue;

    // Check if we need a new page
    if (startY > pageHeight - 40) {
      doc.addPage();
      startY = 18;
    }

    // Section title
    doc.setDrawColor(...brand.soft);
    doc.setFillColor(...brand.soft);
    doc.roundedRect(14, startY - 4, contentWidth, 10, 2, 2, "F");
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...brand.navy);
    doc.text(section.title, 18, startY + 2);
    startY += 12;

    if (section.intro) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...brand.slate);
      const introLines = doc.splitTextToSize(section.intro, contentWidth);
      doc.text(introLines, 14, startY);
      startY += (introLines.length * 4.2) + 3;
    }

    if (section.highlights?.length) {
      const gap = 4;
      const cardWidth = (contentWidth - (gap * (section.highlights.length - 1))) / Math.max(section.highlights.length, 1);
      let cardX = 14;
      for (const item of section.highlights) {
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(cardX, startY, cardWidth, 16, 2, 2, "FD");
        doc.setFontSize(7);
        doc.setTextColor(...brand.slate);
        doc.text(item.label.toUpperCase(), cardX + 3, startY + 5);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...brand.navy);
        doc.text(item.value, cardX + 3, startY + 11);
        doc.setFont("helvetica", "normal");
        cardX += cardWidth + gap;
      }
      startY += 21;
    }

    // Chart image
    if (section.chartImage) {
      const chartHeight = 70; // fixed height for chart images in mm
      if (startY + chartHeight > pageHeight - 20) {
        doc.addPage();
        startY = 18;
      }
      try {
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(14, startY, contentWidth, chartHeight, 2, 2, "S");
        doc.addImage(section.chartImage, "PNG", 14, startY, contentWidth, chartHeight);
        startY += chartHeight + 6;
      } catch {
        // Skip if image fails
      }
    }

    // Table
    if (hasTable) {
      if (startY > pageHeight - 30) {
        doc.addPage();
        startY = 18;
      }

      const cols = section.columns ?? getColumns(section.rows).map((k) => ({ key: k, label: k }));
      const head = [cols.map((c) => c.label)];
      const body = section.rows.map((row) =>
        cols.map((c) => {
          const v = row[c.key];
          if (typeof v === "number") return formatNum(v);
          return toStr(v);
        }),
      );

      autoTable(doc, {
        startY,
        head,
        body,
        theme: "grid",
        headStyles: {
          fillColor: [...brand.navy],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: "bold",
        },
        bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59], cellPadding: 2.5 },
        alternateRowStyles: { fillColor: [...brand.soft] },
        margin: { left: 14, right: 14 },
        styles: { overflow: "linebreak", lineColor: [226, 232, 240], lineWidth: 0.1 },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lastTable = (doc as any).lastAutoTable;
      startY = (lastTable?.finalY ?? startY) + 10;
    }

    if (section.notes?.length) {
      if (startY > pageHeight - 26) {
        doc.addPage();
        startY = 18;
      }
      doc.setFontSize(8.5);
      doc.setTextColor(...brand.slate);
      for (const note of section.notes) {
        const lines = doc.splitTextToSize(`• ${note}`, contentWidth);
        doc.text(lines, 14, startY);
        startY += (lines.length * 4) + 1;
      }
      startY += 3;
    }
  }

  // Footer + logo on each page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...brand.soft);
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);
    doc.setFontSize(8);
    doc.setTextColor(...brand.slate);
    doc.text(
      `Port Pulse — Pakazure | ${new Date().toLocaleDateString("fr-FR")} | Page ${i}/${pageCount}`,
      14,
      pageHeight - 8,
    );
  }

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
