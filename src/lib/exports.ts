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

  // Header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 18);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(subtitle, 14, 25);
  doc.setTextColor(0);

  let startY = logoDataUrl ? 36 : 32;

  for (const section of sections) {
    const hasChart = Boolean(section.chartImage);
    const hasTable = section.rows.length > 0;
    if (!hasChart && !hasTable) continue;

    // Check if we need a new page
    if (startY > pageHeight - 40) {
      doc.addPage();
      startY = 14;
    }

    // Section title
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(section.title, 14, startY);
    startY += 6;

    // Chart image
    if (section.chartImage) {
      const chartHeight = 70; // fixed height for chart images in mm
      if (startY + chartHeight > pageHeight - 20) {
        doc.addPage();
        startY = 14;
      }
      try {
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
        startY = 14;
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
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: "bold",
        },
        bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
        alternateRowStyles: { fillColor: [241, 245, 249] },
        margin: { left: 14, right: 14 },
        styles: { cellPadding: 2, overflow: "linebreak" },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lastTable = (doc as any).lastAutoTable;
      startY = (lastTable?.finalY ?? startY) + 10;
    }
  }

  // Footer + logo on each page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
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
