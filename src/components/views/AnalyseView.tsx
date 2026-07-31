/* eslint-disable @typescript-eslint/no-explicit-any */
import CorrelationsView from "./CorrelationsView";
import DecisionSupportView from "./DecisionSupportView";

export default function AnalyseView({
  activeView,
  correlationsContext,
  decisionContext,
}: {
  activeView: string;
  correlationsContext: any;
  decisionContext: any;
}) {
  if (activeView === "croisee") return <CorrelationsView ctx={correlationsContext} />;
  if (activeView === "intelligence") return <DecisionSupportView ctx={decisionContext} />;
  return null;
}
