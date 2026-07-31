/* eslint-disable @typescript-eslint/no-explicit-any */

type GenericRow = Record<string, unknown>;

export default function EscalesDetailSection({ ctx }: { ctx: any }) {
  const { BAR_VALUE_LABEL, BAR_VALUE_LABEL_RIGHT, Bar, BarChart, CHART_AXIS_PROPS, CHART_GRID_PROPS, CartesianGrid, ChartTooltip, DataTable, FLOW_COLORS, JitStatusBadge, Legend, Line, LineChart, MapPinned, ResponsiveContainer, SectionCard, Tooltip, XAxis, YAxis, collapsedSections, completedLoaStats, completedShippingStats, formatChartExportLabel, formatDateTimeCompact, formatHours, formatInteger, formatPercent, isJustInTime, isPngExporting, latestGate, loaCycleChartRows, loaProductivityMonthly, operationsActivePredictions, portDestinations, portOrigins, serviceRecap, shippingCycleChartRows, shippingProductivityMonthly, toNumber, toggleSection } = ctx;
  return (
    <>
              {/* Gate + Services */}
              <div className="grid gap-5 xl:grid-cols-2">
                <SectionCard
                  id="ops-gate"
                  title="Gate & mouvements"
                  subtitle="Entrees/sorties pleins et vides"
                  collapsed={collapsedSections["ops-gate"]}
                  onToggle={toggleSection}
                >
                  <div className="h-[320px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[{
                        name: "Gate",
                        "Pleins entrant": toNumber(latestGate.gate_entrees_pleins),
                        "Vides entrant": toNumber(latestGate.gate_entrees_vides),
                        "Pleins sortant": toNumber(latestGate.gate_sorties_pleins),
                        "Vides sortant": toNumber(latestGate.gate_sorties_vides),
                      }]}>
                        <CartesianGrid {...CHART_GRID_PROPS} />
                        <XAxis dataKey="name" {...CHART_AXIS_PROPS} />
                        <YAxis {...CHART_AXIS_PROPS} />
                        <Tooltip content={<ChartTooltip valueFormatter={(v: any) => formatInteger(v)} />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="Pleins entrant" fill="#164b7e" radius={[6, 6, 0, 0]} label={BAR_VALUE_LABEL} />
                        <Bar dataKey="Vides entrant" fill="#1d6fb8" radius={[6, 6, 0, 0]} label={BAR_VALUE_LABEL} />
                        <Bar dataKey="Pleins sortant" fill="#5fb0e8" radius={[6, 6, 0, 0]} label={BAR_VALUE_LABEL} />
                        <Bar dataKey="Vides sortant" fill="#93cbf2" radius={[6, 6, 0, 0]} label={BAR_VALUE_LABEL} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>

                <SectionCard
                  id="ops-services"
                  title="Recap par service"
                  subtitle="Voyages, unites et productivite nette"
                  collapsed={collapsedSections["ops-services"]}
                  onToggle={toggleSection}
                >
                  <DataTable
                    columns={[
                      { key: "service", label: "Service" },
                      { key: "voyages", label: "Voyages", align: "right", render: (r: any) => formatInteger(r.voyages) },
                      { key: "units", label: "Unites", align: "right", render: (r: any) => formatInteger(r.units) },
                      { key: "productivity", label: "Prod.", align: "right", render: (r: any) => `${toNumber(r.productivity).toFixed(1)}` },
                    ]}
                    rows={serviceRecap}
                    maxHeight="320px"
                    compact
                  />
                </SectionCard>
              </div>

              <div className="grid gap-5 xl:grid-cols-2">
                <SectionCard
                  id="ops-shipping-cycle-chart"
                  title="Cycle moyen par ligne maritime"
                  subtitle="Top lignes par escales terminees, calculees a la cle voyage"
                  collapsed={collapsedSections["ops-shipping-cycle-chart"]}
                  onToggle={toggleSection}
                >
                  <div className="h-[360px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={shippingCycleChartRows} layout="vertical" margin={{ top: 8, right: 8, bottom: 8, left: 24 }}>
                        <CartesianGrid {...CHART_GRID_PROPS} />
                        <XAxis type="number" {...CHART_AXIS_PROPS} />
                        <YAxis type="category" dataKey="shipping" width={100} {...CHART_AXIS_PROPS} />
                        <Tooltip content={<ChartTooltip valueFormatter={(v: any) => formatHours(v)} />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="waitHours" name="ATA→ATB (arrivee→quai)" fill="#1d6fb8" radius={[0, 4, 4, 0]} label={BAR_VALUE_LABEL_RIGHT} />
                        <Bar dataKey="operationHours" name="ATB→ATC (operations)" fill="#2e90d9" radius={[0, 4, 4, 0]} label={BAR_VALUE_LABEL_RIGHT} />
                        <Bar dataKey="totalCycleHours" name="ATA→ATD (cycle total)" fill="#93cbf2" radius={[0, 4, 4, 0]} label={BAR_VALUE_LABEL_RIGHT} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>

                <SectionCard
                  id="ops-loa-cycle-chart"
                  title="Cycle moyen par type de navire"
                  subtitle="Typologie navire par gabarit LOA"
                  collapsed={collapsedSections["ops-loa-cycle-chart"]}
                  onToggle={toggleSection}
                >
                  <div className="h-[360px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={loaCycleChartRows}>
                        <CartesianGrid {...CHART_GRID_PROPS} />
                        <XAxis dataKey="loaBucket" {...CHART_AXIS_PROPS} />
                        <YAxis {...CHART_AXIS_PROPS} />
                        <Tooltip content={<ChartTooltip valueFormatter={(v: any) => formatHours(v)} />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="waitHours" name="ATA→ATB (arrivee→quai)" fill="#1d6fb8" radius={[4, 4, 0, 0]} label={BAR_VALUE_LABEL} />
                        <Bar dataKey="operationHours" name="ATB→ATC (operations)" fill="#2e90d9" radius={[4, 4, 0, 0]} label={BAR_VALUE_LABEL} />
                        <Bar dataKey="totalCycleHours" name="ATA→ATD (cycle total)" fill="#93cbf2" radius={[4, 4, 0, 0]} label={BAR_VALUE_LABEL} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>
              </div>

              <div className="grid gap-5 xl:grid-cols-2">
                <SectionCard
                  id="ops-shipping-prod-monthly"
                  title="Productivite nette par ligne et par mois"
                  subtitle="Base navires appareilles, moyenne mensuelle a la cle voyage"
                  collapsed={collapsedSections["ops-shipping-prod-monthly"]}
                  onToggle={toggleSection}
                >
                  <div className="h-[360px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={shippingProductivityMonthly.rows}>
                        <CartesianGrid {...CHART_GRID_PROPS} />
                        <XAxis dataKey="moisLabel" {...CHART_AXIS_PROPS} />
                        <YAxis {...CHART_AXIS_PROPS} />
                        <Tooltip content={<ChartTooltip valueFormatter={(v: any) => `${toNumber(v).toFixed(1)} mvts/h`} />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        {shippingProductivityMonthly.series.map((series: any, index: any) => (
                          <Line
connectNulls={false}                             key={series}
                            type="monotone"
                            dataKey={series}
                            name={series}
                            stroke={FLOW_COLORS[index % FLOW_COLORS.length]}
                            strokeWidth={2.3}
                            dot={{ r: 3 }}
                            label={isPngExporting ? { fill: "#7396b5", fontSize: 10, formatter: formatChartExportLabel } : false}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>

                <SectionCard
                  id="ops-loa-prod-monthly"
                  title="Productivite nette par type de navire et par mois"
                  subtitle="Base navires appareilles, moyenne mensuelle par gabarit LOA"
                  collapsed={collapsedSections["ops-loa-prod-monthly"]}
                  onToggle={toggleSection}
                >
                  <div className="h-[360px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={loaProductivityMonthly.rows}>
                        <CartesianGrid {...CHART_GRID_PROPS} />
                        <XAxis dataKey="moisLabel" {...CHART_AXIS_PROPS} />
                        <YAxis {...CHART_AXIS_PROPS} />
                        <Tooltip content={<ChartTooltip valueFormatter={(v: any) => `${toNumber(v).toFixed(1)} mvts/h`} />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        {loaProductivityMonthly.series.map((series: any, index: any) => (
                          <Line
connectNulls={false}                             key={series}
                            type="monotone"
                            dataKey={series}
                            name={series}
                            stroke={["#1d6fb8", "#2e90d9", "#5fb0e8", "#93cbf2", "#f87171", "#64748b"][index % 6]}
                            strokeWidth={2.2}
                            dot={{ r: 2.5 }}
                            label={isPngExporting ? { fill: "#7396b5", fontSize: 10, formatter: formatChartExportLabel } : false}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>
              </div>

              <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
                <SectionCard
                  id="ops-shipping-stats"
                  title="Performance par ligne maritime"
                  subtitle="Escales uniques, units, productivite et durees moyennes"
                  collapsed={collapsedSections["ops-shipping-stats"]}
                  onToggle={toggleSection}
                >
                  <DataTable
                    columns={[
                      { key: "shipping", label: "Ligne" },
                      { key: "escales", label: "Escales", align: "right", render: (r: any) => formatInteger(r.escales) },
                      { key: "marketShare", label: "PDM", align: "right", render: (r: any) => formatPercent(r.marketShare) },
                      { key: "units", label: "Units", align: "right", render: (r: any) => formatInteger(r.units) },
                      { key: "waitHours", label: "ATA→ATB (arrivee→quai)", align: "right", render: (r: any) => formatHours(r.waitHours) },
                      { key: "productivity", label: "Prod.", align: "right", render: (r: any) => `${toNumber(r.productivity).toFixed(1)} mvts/h` },
                      { key: "operationHours", label: "Op.", align: "right", render: (r: any) => formatHours(r.operationHours) },
                      { key: "quayHours", label: "Quai", align: "right", render: (r: any) => formatHours(r.quayHours) },
                      { key: "totalCycleHours", label: "Cycle", align: "right", render: (r: any) => formatHours(r.totalCycleHours) },
                    ]}
                    rows={completedShippingStats as unknown as GenericRow[]}
                    compact
                    maxHeight="360px"
                  />
                </SectionCard>

                <SectionCard
                  id="ops-loa-stats"
                  title="Durees par gabarit LOA"
                  subtitle="Segmentation navires selon la longueur hors tout"
                  collapsed={collapsedSections["ops-loa-stats"]}
                  onToggle={toggleSection}
                >
                  <DataTable
                    columns={[
                      { key: "loaBucket", label: "LOA" },
                      { key: "escales", label: "Escales", align: "right", render: (r: any) => formatInteger(r.escales) },
                      { key: "units", label: "Units", align: "right", render: (r: any) => formatInteger(r.units) },
                      { key: "waitHours", label: "ATA→ATB (arrivee→quai)", align: "right", render: (r: any) => formatHours(r.waitHours) },
                      { key: "productivity", label: "Prod.", align: "right", render: (r: any) => `${toNumber(r.productivity).toFixed(1)} mvts/h` },
                      { key: "operationHours", label: "Op.", align: "right", render: (r: any) => formatHours(r.operationHours) },
                      { key: "quayHours", label: "Quai", align: "right", render: (r: any) => formatHours(r.quayHours) },
                      { key: "totalCycleHours", label: "Cycle", align: "right", render: (r: any) => formatHours(r.totalCycleHours) },
                    ]}
                    rows={completedLoaStats as unknown as GenericRow[]}
                    compact
                    maxHeight="360px"
                  />
                </SectionCard>
              </div>

              <SectionCard
                id="ops-active-projections"
                title="Navires en operation : projection de sortie"
                subtitle="Modele base sur la productivite observee, ajuste avec l'historique par ligne et LOA"
                collapsed={collapsedSections["ops-active-projections"]}
                onToggle={toggleSection}
              >
                <DataTable
                  columns={[
                    { key: "nom_navire", label: "Navire" },
                    { key: "shippingLabel", label: "Ligne" },
                    { key: "loaBucket", label: "LOA" },
                    { key: "ata_pstn", label: "ATA" },
                    { key: "atb", label: "ATB" },
                    { key: "etc", label: "ETC bulletin" },
                    { key: "rem_units", label: "Rem.", align: "right", render: (r: any) => formatInteger(r.rem_units) },
                    { key: "observedProd", label: "Prod obs.", align: "right", render: (r: any) => `${toNumber(r.observedProd).toFixed(1)}` },
                    { key: "modeledProd", label: "Prod modele", align: "right", render: (r: any) => `${toNumber(r.modeledProd).toFixed(1)}` },
                    { key: "elapsedQuayHours", label: "Deja a quai", align: "right", render: (r: any) => formatHours(r.elapsedQuayHours) },
                    { key: "projectedCompletion", label: "Fin estimee", render: (r: any) => formatDateTimeCompact(r.projectedCompletion as Date | null) },
                    { key: "projectedDeparture", label: "Sortie estimee", render: (r: any) => formatDateTimeCompact(r.projectedDeparture as Date | null) },
                    {
                      key: "jitStatus",
                      label: "JIT",
                      render: (r: any) => <JitStatusBadge active={isJustInTime(r)} />,
                    },
                  ]}
                  rows={operationsActivePredictions as unknown as GenericRow[]}
                  compact
                  maxHeight="360px"
                />
              </SectionCard>

              {/* Ports */}
              <SectionCard
                id="ops-ports"
                title="Provenance & destination"
                subtitle="Ports les plus representes dans les escales attendues"
                collapsed={collapsedSections["ops-ports"]}
                onToggle={toggleSection}
              >
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <div className="mb-3 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <MapPinned className="h-3.5 w-3.5 text-[var(--cyan)]" />
                      <span className="font-medium">Dernier port</span>
                    </div>
                    <div className="space-y-2">
                      {portOrigins.map((item: any, i: any) => (
                        <div key={item.port} className="flex items-center gap-3">
                          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white/[0.04] text-[11px] font-bold text-[var(--text-muted)]">{i + 1}</span>
                          <span className="flex-1 text-sm text-[var(--text-primary)]">{item.port}</span>
                          <span className="font-mono text-sm font-medium text-[var(--cyan)]">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="mb-3 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <MapPinned className="h-3.5 w-3.5 text-[var(--emerald)]" />
                      <span className="font-medium">Prochain port</span>
                    </div>
                    <div className="space-y-2">
                      {portDestinations.map((item: any, i: any) => (
                        <div key={item.port} className="flex items-center gap-3">
                          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white/[0.04] text-[11px] font-bold text-[var(--text-muted)]">{i + 1}</span>
                          <span className="flex-1 text-sm text-[var(--text-primary)]">{item.port}</span>
                          <span className="font-mono text-sm font-medium text-[var(--emerald)]">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                id="ops-glossary"
                title="Glossaire operations bord"
                subtitle="Lecture metier des temps navire utilises dans les calculs"
                collapsed={collapsedSections["ops-glossary"]}
                onToggle={toggleSection}
              >
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {[
                    { code: "ATA", text: "Arrivee reelle en zone portuaire." },
                    { code: "ATB", text: "Amarrage effectif au quai : debut reel des operations." },
                    { code: "ATC", text: "Fin reelle des operations de chargement / dechargement." },
                    { code: "ATD", text: "Depart reel du navire hors port." },
                    { code: "ETC", text: "Fin estimee des operations. C'est une prevision, pas une heure constatee." },
                    { code: "TC", text: "Total conteneurs. Dans le bulletin, il s'agit du volume en nombre de conteneurs, distinct des EVP/TEU." },
                  ].map((item: any) => (
                    <div key={item.code} className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-hover)] p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cyan)]">{item.code}</div>
                      <p className="mt-2 text-sm text-[var(--text-secondary)]">{item.text}</p>
                    </div>
                  ))}
                </div>
              </SectionCard>
    </>
  );
}
