import { SEMANTIC, seriesColor } from "@/lib/chart-config";

interface GaugeProps {
  label: string;
  value: number;
  used: number;
  capacity: number;
  unit?: string;
}

function formatMetric(value: number): string {
  return Number.isFinite(value) ? value.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) : "—";
}

function gaugeColor(value: number): string {
  if (value > 100) return SEMANTIC.critical;
  if (value > 85) return SEMANTIC.warning;
  return seriesColor(1);
}

/**
 * Jauge d'occupation non bornée. Un second arc matérialise le dépassement de
 * la capacité de référence et la valeur centrale conserve toujours le fait brut.
 */
export default function Gauge({ label, value, used, capacity, unit = "" }: GaugeProps) {
  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;
  const baseProgress = Math.min(safeValue, 100);
  const overflowProgress = Math.min(Math.max(safeValue - 100, 0), 100);
  const color = gaugeColor(safeValue);

  return (
    <figure className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-hover)] px-4 pb-4 pt-3">
      <figcaption className="text-center text-[12px] font-semibold text-[var(--text-secondary)]">
        {label}
      </figcaption>
      <div className="relative mx-auto mt-2 aspect-[2/1] w-full max-w-[260px] overflow-hidden">
        <svg viewBox="0 0 220 112" className="h-full w-full" role="img" aria-label={`${label} : ${safeValue.toFixed(1)} %`}>
          <path d="M 20 102 A 90 90 0 0 1 200 102" pathLength="100" fill="none" stroke="var(--line)" strokeWidth="18" strokeLinecap="round" />
          <path d="M 20 102 A 90 90 0 0 1 200 102" pathLength="100" fill="none" stroke={color} strokeWidth="18" strokeLinecap="round" strokeDasharray={`${baseProgress} 100`} />
          {overflowProgress > 0 ? (
            <path d="M 32 102 A 78 78 0 0 1 188 102" pathLength="100" fill="none" stroke={SEMANTIC.critical} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${overflowProgress} 100`} />
          ) : null}
        </svg>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 text-center">
          <p className="t-metric font-mono font-bold text-[var(--text-primary)]">
            {safeValue.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
          </p>
          {safeValue > 100 ? (
            <p className="text-[11px] font-semibold" style={{ color: SEMANTIC.critical }}>
              +{(safeValue - 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} pt au-delà de la référence
            </p>
          ) : null}
        </div>
      </div>
      <p className="mt-3 text-center text-[12px] text-[var(--text-secondary)]">
        <span className="font-mono text-[var(--text-primary)]">{formatMetric(used)}</span>
        {` utilisé${unit ? ` ${unit}` : ""} / `}
        <span className="font-mono text-[var(--text-primary)]">{formatMetric(capacity)}</span>
        {" capacité de référence"}
      </p>
    </figure>
  );
}
