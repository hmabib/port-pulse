/* eslint-disable @typescript-eslint/no-explicit-any */
import EscalesOverviewSection from "./EscalesOverviewSection";
import EscalesDetailSection from "./EscalesDetailSection";

export default function EscalesCyclesView({ ctx }: { ctx: any }) {
  return (
    <>
      <EscalesOverviewSection ctx={ctx} />
      <EscalesDetailSection ctx={ctx} />
    </>
  );
}
