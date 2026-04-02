"use client";

import React from "react";
import { getShippingOption } from "@/lib/shipping";

function toText(value: unknown, fallback = "N/A"): string {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

export default function ShippingBadge({ rawValue }: { rawValue: unknown }) {
  const option = getShippingOption(toText(rawValue, "Autres"));
  return (
    <div className="inline-flex items-center gap-2">
      <span
        className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[9px] font-bold uppercase text-white"
        style={{ backgroundColor: option.color }}
      >
        {option.badge}
      </span>
      <span className="text-sm text-slate-200">{option.label}</span>
    </div>
  );
}
