/* eslint-disable @typescript-eslint/no-explicit-any */
import CumulAnnualView from "./CumulAnnualView";
import BulletinsView from "./BulletinsView";
import KpiAnalysisView from "./KpiAnalysisView";

export default function PerformanceView({
  activeView,
  cumulContext,
  bulletinContext,
  kpiContext,
}: {
  activeView: string;
  cumulContext: any;
  bulletinContext: any;
  kpiContext: any;
}) {
  if (activeView === "cumul2026") return <CumulAnnualView ctx={cumulContext} />;
  if (activeView === "bulletin") return <BulletinsView ctx={bulletinContext} />;
  if (activeView === "analyse") return <KpiAnalysisView ctx={kpiContext} />;
  return null;
}
