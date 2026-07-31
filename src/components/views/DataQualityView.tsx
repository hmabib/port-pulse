import { AlertTriangle, CalendarCheck2, CheckCircle2, CopyX, FileWarning } from "lucide-react";
import type { QualitySummary } from "@/lib/data-quality";
import DataTable from "@/components/ui/DataTable";
import MetricCard from "@/components/ui/MetricCard";
import SectionCard from "@/components/ui/SectionCard";

type Row = Record<string, unknown>;

export interface DataQualityDetails {
  summary: QualitySummary;
  lastBulletin: string;
  weekdayCoverage: Array<{
    day: string;
    reported: number;
    expected: number;
    coveragePct: number;
  }>;
  duplicates: Array<{ date: string; received: number; removed: number }>;
  ruleCounts: Array<{ rule: string; count: number; sample: string }>;
  rejectedTimestamps: Array<{
    reportDate: string;
    vessel: string;
    field: string;
    raw: string;
    reason: string;
  }>;
}

function formatDate(value: unknown): string {
  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function DataQualityView({ details }: { details: DataQualityDetails | null }) {
  if (!details) {
    return (
      <SectionCard title="Qualité des données" subtitle="Aucun bulletin exploitable sur le périmètre">
        <p className="text-sm text-[var(--text-secondary)]">Les indicateurs de qualité ne sont pas disponibles.</p>
      </SectionCard>
    );
  }

  const coverage = details.summary.coverage;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Couverture calendrier"
          value={coverage ? `${coverage.coveragePct.toFixed(1)}%` : "—"}
          hint={coverage ? `${coverage.reportedDays} bulletins / ${coverage.calendarDays} jours` : "Période inconnue"}
          icon={<CalendarCheck2 className="h-4 w-4" />}
          tone="#2e90d9"
        />
        <MetricCard
          label="Dernier bulletin reçu"
          value={formatDate(details.lastBulletin)}
          hint="Date de rapport la plus récente"
          icon={<CheckCircle2 className="h-4 w-4" />}
          tone="#164b7e"
        />
        <MetricCard
          label="Doublons écartés"
          value={details.summary.duplicatesRemoved.toLocaleString("fr-FR")}
          hint={`${details.duplicates.length} date(s) concernée(s)`}
          icon={<CopyX className="h-4 w-4" />}
          tone="#fbbf24"
        />
        <MetricCard
          label="Valeurs rejetées — 30 j"
          value={details.summary.totalRejected.toLocaleString("fr-FR")}
          hint={`${details.rejectedTimestamps.length} horodatage(s) navire`}
          icon={<FileWarning className="h-4 w-4" />}
          tone="#f87171"
        />
      </div>

      <SectionCard
        title="Couverture par jour de semaine"
        subtitle="Le biais structurel du lundi reste visible et n'est pas compensé"
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {details.weekdayCoverage.map((item) => (
            <div
              key={item.day}
              className={`rounded-xl border p-3 ${
                item.day === "Lundi"
                  ? "border-amber-400/40 bg-amber-400/5"
                  : "border-[var(--card-border)] bg-[var(--surface-hover)]"
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-[12px]">
                <span className="font-semibold text-[var(--text-primary)]">{item.day}</span>
                <span className="font-mono text-[var(--text-secondary)]">{item.coveragePct.toFixed(0)}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--line)]">
                <div className="h-full rounded-full bg-[#2e90d9]" style={{ width: `${Math.min(item.coveragePct, 100)}%` }} />
              </div>
              <p className="mt-2 text-[11px] text-[var(--text-muted)]">
                {item.reported} reçu{item.reported > 1 ? "s" : ""} / {item.expected} attendu{item.expected > 1 ? "s" : ""}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-5 xl:grid-cols-2">
        <SectionCard title="Bulletins dupliqués écartés" subtitle="Arbitrage déterministe par date de rapport">
          <DataTable
            rows={details.duplicates as unknown as Row[]}
            columns={[
              { key: "date", label: "Date", render: (row) => formatDate(row.date) },
              { key: "received", label: "Reçus", align: "right" },
              { key: "removed", label: "Écartés", align: "right" },
            ]}
            compact
            maxHeight="320px"
          />
        </SectionCard>

        <SectionCard title="Rejets par règle — 30 jours" subtitle="R1 à R15, y compris les règles sans rejet">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {details.ruleCounts.map((item) => (
              <div key={item.rule} className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-hover)] p-3" title={item.sample}>
                <p className="text-[11px] font-semibold text-[var(--text-muted)]">{item.rule}</p>
                <p className={`mt-1 font-mono text-xl font-bold ${item.count > 0 ? "text-red-400" : "text-[var(--text-primary)]"}`}>
                  {item.count}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Horodatages navires rejetés"
        subtitle="Valeurs nominatives à corriger dans la chaîne OCR"
      >
        {details.rejectedTimestamps.length > 0 ? (
          <DataTable
            rows={details.rejectedTimestamps as unknown as Row[]}
            columns={[
              { key: "reportDate", label: "Bulletin", render: (row) => formatDate(row.reportDate) },
              { key: "vessel", label: "Navire" },
              { key: "field", label: "Champ" },
              { key: "raw", label: "Valeur brute" },
              { key: "reason", label: "Motif" },
            ]}
            compact
            maxHeight="440px"
          />
        ) : (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-sm text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            Aucun horodatage navire rejeté sur les 30 derniers jours.
          </div>
        )}
        {details.summary.totalSuspect > 0 ? (
          <p className="mt-3 flex items-center gap-2 text-[12px] text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            {details.summary.totalSuspect} valeur(s) suspecte(s) restent visibles mais sont exclues des calculs stricts.
          </p>
        ) : null}
      </SectionCard>
    </div>
  );
}
