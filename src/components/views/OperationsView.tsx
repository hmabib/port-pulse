/* eslint-disable @typescript-eslint/no-explicit-any */
import EscalesCyclesView from "./EscalesCyclesView";
import FleetParkView from "./FleetParkView";

export default function OperationsView({
  activeView,
  escalesContext,
  fleetContext,
}: {
  activeView: string;
  escalesContext: any;
  fleetContext: any;
}) {
  if (activeView === "operations") return <EscalesCyclesView ctx={escalesContext} />;
  if (activeView === "navires") return <FleetParkView ctx={fleetContext} />;
  return null;
}
