"use client";

import React from "react";

type GenericRow = Record<string, unknown>;

export interface TableColumn {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  render?: (row: GenericRow) => React.ReactNode;
}

interface DataTableProps {
  columns: TableColumn[];
  rows: GenericRow[];
  maxHeight?: string;
  compact?: boolean;
}

function toText(value: unknown, fallback = "N/A"): string {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

export default function DataTable({
  columns,
  rows,
  maxHeight = "480px",
  compact = false,
}: DataTableProps) {
  return (
    <div
      className="overflow-hidden rounded-xl border border-[var(--card-border)] theme-transition"
      style={{ maxHeight }}
    >
      <div className="overflow-auto" style={{ maxHeight }}>
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-[var(--line)] bg-[var(--surface-muted)] backdrop-blur-sm">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`whitespace-nowrap px-4 ${compact ? "py-2.5" : "py-3"} text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)] ${
                    col.align === "right"
                      ? "text-right"
                      : col.align === "center"
                        ? "text-center"
                        : "text-left"
                  }`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-sm text-[var(--text-muted)]"
                >
                  Aucune donnee disponible
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => (
                <tr
                  key={`${toText(row.id, String(rowIndex))}-${rowIndex}`}
                  className={`border-b border-[var(--line)] transition-colors duration-150 hover:bg-[var(--surface-hover)] ${rowIndex % 2 === 0 ? "bg-transparent" : "bg-[color:var(--surface-hover)]/[0.26]"}`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 ${compact ? "py-2" : "py-3"} align-top text-[var(--text-primary)] ${
                        col.align === "right"
                          ? "whitespace-nowrap text-right font-mono"
                          : col.align === "center"
                            ? "text-center"
                            : "text-left leading-5"
                      }`}
                    >
                      {col.render ? col.render(row) : toText(row[col.key])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
