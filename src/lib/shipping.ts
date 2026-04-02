export interface ShippingOption {
  value: string;
  label: string;
  aliases: string[];
  badge: string;
  color: string;
}

const SHIPPING_DEFINITIONS: ShippingOption[] = [
  {
    value: "cma-cgm",
    label: "CMA CGM",
    aliases: ["CMA CGM", "CMA"],
    badge: "CMA",
    color: "#0f766e",
  },
  {
    value: "msc",
    label: "MSC",
    aliases: ["MSC"],
    badge: "MSC",
    color: "#1d4ed8",
  },
  {
    value: "hapag-lloyd",
    label: "Hapag-Lloyd",
    aliases: ["HAPAG LLOYD", "HAPAG-LLOYD"],
    badge: "HL",
    color: "#b45309",
  },
  {
    value: "maersk",
    label: "Maersk",
    aliases: ["MAERSK"],
    badge: "M",
    color: "#0284c7",
  },
  {
    value: "marguisa",
    label: "Marguisa",
    aliases: ["MARGUISA"],
    badge: "MG",
    color: "#7c3aed",
  },
  {
    value: "socopao",
    label: "Socopao",
    aliases: ["SOCOPAO"],
    badge: "SO",
    color: "#be123c",
  },
];

function normalizeKey(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

export function getShippingOption(rawValue: string): ShippingOption {
  const key = normalizeKey(rawValue);
  const matched = SHIPPING_DEFINITIONS.find((option) =>
    option.aliases.some((alias) => normalizeKey(alias) === key),
  );

  if (matched) {
    return matched;
  }

  const compact = rawValue.trim() || "Autres";
  const badge = compact
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();

  return {
    value: normalizeKey(compact).replace(/\s+/g, "-") || "autres",
    label: compact,
    aliases: [compact],
    badge,
    color: "#475569",
  };
}

export function getUniqueShippingOptions(rawValues: string[]): ShippingOption[] {
  const map = new Map<string, ShippingOption>();

  for (const rawValue of rawValues) {
    const option = getShippingOption(rawValue);
    const existing = map.get(option.value);

    if (!existing) {
      map.set(option.value, { ...option, aliases: [...option.aliases] });
      continue;
    }

    const aliasSet = new Set([...existing.aliases, ...option.aliases, rawValue]);
    map.set(option.value, { ...existing, aliases: Array.from(aliasSet) });
  }

  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, "fr"));
}
