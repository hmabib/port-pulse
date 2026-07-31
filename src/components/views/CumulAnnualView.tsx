/* eslint-disable @typescript-eslint/no-explicit-any */

type GenericRow = Record<string, unknown>;

export default function CumulAnnualView({ ctx }: { ctx: any }) {
  const { Activity, Area, AreaChart, ArrowRightLeft, BAR_VALUE_LABEL, Bar, BarChart, CHART_AXIS_PROPS, CHART_GRID_PROPS, CartesianGrid, ChartTooltip, Container, DataBadge, DataTable, Gauge, Legend, Line, LineChart, MetricCard, ResponsiveContainer, SectionCard, Ship, ShippingBadge, Tooltip, Truck, WeekdayHeatmap, XAxis, YAxis, collapsedSections, cumul2026Annual, cumul2026Monthly, cumul2026Shipping, cumul2026ShippingAnnual, cumul2026WeekdayHeatmap, formatChartExportLabel, formatDateLabel, formatHours, formatInteger, formatMinutes, formatMonthAxisLabel, formatPercent, isPngExporting, monthlyCycleRows, selectedCumulYear, toNumber, toggleSection } = ctx;
  return (
            <>
              {/* KPI cards */}
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard label={`Cumul EVP ${selectedCumulYear}`} value={formatInteger(cumul2026Annual.totalTeu)} tone="#2e90d9" hint={`Budget ${formatInteger(cumul2026Annual.totalForecast)} | Real. ${formatPercent(cumul2026Annual.tauxRealisationLast)}`} icon={<Activity className="h-4 w-4" />} compact />
                <MetricCard label="Escales realisees" value={formatInteger(cumul2026Annual.escalesRealisees)} tone="#1565a8" hint={`${cumul2026Monthly.length} fins de mois consolidees`} icon={<Ship className="h-4 w-4" />} compact />
                <MetricCard label="Import cumule" value={formatInteger(cumul2026Annual.importTeu)} tone="#164b7e" hint={cumul2026Annual.totalTeu > 0 ? `${formatPercent((cumul2026Annual.importTeu / cumul2026Annual.totalTeu) * 100)} du cumul` : "—"} icon={<ArrowRightLeft className="h-4 w-4" />} compact />
                <MetricCard label="Export cumule" value={formatInteger(cumul2026Annual.exportTeu)} tone="#1d6fb8" hint={cumul2026Annual.totalTeu > 0 ? `${formatPercent((cumul2026Annual.exportTeu / cumul2026Annual.totalTeu) * 100)} du cumul` : "—"} icon={<ArrowRightLeft className="h-4 w-4" />} compact />
                <MetricCard label="Transbo cumule" value={formatInteger(cumul2026Annual.transboTeu)} tone="#5fb0e8" hint={cumul2026Annual.totalTeu > 0 ? `${formatPercent((cumul2026Annual.transboTeu / cumul2026Annual.totalTeu) * 100)} du cumul` : "—"} icon={<Container className="h-4 w-4" />} compact />
                <MetricCard label="Pleins I+E+T" value={formatInteger(cumul2026Annual.pleinsTeu)} tone="#93cbf2" hint={`Vides ${formatInteger(cumul2026Annual.videsTeu)}`} icon={<Container className="h-4 w-4" />} compact />
                <MetricCard label="Camions moyens / jour" value={cumul2026Annual.camionsAvgJour.toFixed(0)} tone="#10304f" hint={`Entrees ${cumul2026Annual.entreesTotalAvgJour.toFixed(0)} | Sorties ${cumul2026Annual.sortiesTotalAvgJour.toFixed(0)}`} icon={<Truck className="h-4 w-4" />} compact />
                <MetricCard label="TTT / Occupation moy." value={formatMinutes(cumul2026Annual.tttAvg)} tone="#93cbf2" hint={`Parc ${cumul2026Annual.occupationAvg.toFixed(0)}% | Prod. ${cumul2026Annual.productivityAverage.toFixed(1)}`} icon={<Gauge className="h-4 w-4" />} compact />
              </div>

              {/* Cumul TEU par mois (barres) + Moyennes sorties/jour par mois */}
              <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
                <SectionCard title="Cumul EVP par mois" subtitle={<><DataBadge type="cumul-mois" /> Snapshot au dernier bulletin disponible de chaque mois</>}>
                  <div className="h-[380px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={cumul2026Monthly}>
                        <CartesianGrid {...CHART_GRID_PROPS} />
                        <XAxis dataKey="moisLabel" {...CHART_AXIS_PROPS} />
                        <YAxis {...CHART_AXIS_PROPS} />
                        <Tooltip content={<ChartTooltip valueFormatter={(v: any) => formatInteger(v)} />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="importTeu" name="Import" fill="#164b7e" radius={[4, 4, 0, 0]} stackId="teu" label={BAR_VALUE_LABEL} />
                        <Bar dataKey="exportTeu" name="Export" fill="#2e90d9" radius={[0, 0, 0, 0]} stackId="teu" label={BAR_VALUE_LABEL} />
                        <Bar dataKey="transboTeu" name="Transbo" fill="#5fb0e8" radius={[0, 0, 0, 0]} stackId="teu" label={BAR_VALUE_LABEL} />
                        <Bar dataKey="pleinsTeu" name="Pleins" fill="#93cbf2" radius={[0, 0, 0, 0]} stackId="teu" label={BAR_VALUE_LABEL} />
                        <Bar dataKey="videsTeu" name="Vides" fill="#93cbf2" radius={[4, 4, 0, 0]} stackId="teu" label={BAR_VALUE_LABEL} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>

                <SectionCard title="Indicateurs moyens de la periode" subtitle={<><DataBadge type="moy-annuel" /> Moyennes calculees sur l&apos;annee {selectedCumulYear}</>}>
                  <DataTable
                    columns={[
                      { key: "name", label: "Indicateur" },
                      { key: "value", label: "Valeur moyenne", align: "right" },
                    ]}
                    rows={[
                      { name: "Sorties pleins / jour", value: cumul2026Annual.sortiesPleinAvgJour.toFixed(0) },
                      { name: "Sorties vides / jour", value: cumul2026Annual.sortiesVideAvgJour.toFixed(0) },
                      { name: "Entrees totales / jour", value: cumul2026Annual.entreesTotalAvgJour.toFixed(0) },
                      { name: "Total sorties / jour", value: cumul2026Annual.sortiesTotalAvgJour.toFixed(0) },
                      { name: "Camions / jour", value: cumul2026Annual.camionsAvgJour.toFixed(0) },
                      { name: "TTT", value: formatMinutes(cumul2026Annual.tttAvg) },
                      { name: "Occupation parc", value: `${cumul2026Annual.occupationAvg.toFixed(0)}%` },
                      { name: "Occupation reefers", value: `${cumul2026Annual.reefersAvg.toFixed(0)}%` },
                      { name: "Productivite", value: `${cumul2026Annual.productivityAverage.toFixed(1)} mvt/h` },
                    ]}
                    compact
                  />
                </SectionCard>
              </div>

              <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
                <SectionCard
                  id="ops-cycle-monthly"
                  title="Cycle navire moyen par mois"
                  subtitle="Moyennes par voyage deduplique : attente, operation, post-operation et cycle total"
                  collapsed={collapsedSections["ops-cycle-monthly"]}
                  onToggle={toggleSection}
                >
                  <div className="h-[360px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyCycleRows}>
                        <CartesianGrid {...CHART_GRID_PROPS} />
                        <XAxis dataKey="moisLabel" {...CHART_AXIS_PROPS} />
                        <YAxis {...CHART_AXIS_PROPS} />
                        <Tooltip content={<ChartTooltip valueFormatter={(v: any) => formatHours(v)} />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Line connectNulls={false} type="monotone" dataKey="waitHours" name="ATA→ATB (arrivee→quai)" stroke="#1d6fb8" strokeWidth={2.2} dot={{ r: 3 }} label={isPngExporting ? { fill: "#7396b5", fontSize: 10, formatter: formatChartExportLabel } : false} />
                        <Line connectNulls={false} type="monotone" dataKey="operationHours" name="ATB→ATC (operations)" stroke="#2e90d9" strokeWidth={2.2} dot={{ r: 3 }} label={isPngExporting ? { fill: "#7396b5", fontSize: 10, formatter: formatChartExportLabel } : false} />
                        <Line connectNulls={false} type="monotone" dataKey="postOpsHours" name="ATC→ATD (fin ops→depart)" stroke="#5fb0e8" strokeWidth={2.2} dot={{ r: 3 }} label={isPngExporting ? { fill: "#7396b5", fontSize: 10, formatter: formatChartExportLabel } : false} />
                        <Line connectNulls={false} type="monotone" dataKey="totalCycleHours" name="ATA→ATD (cycle total)" stroke="#93cbf2" strokeWidth={2.8} dot={{ r: 4 }} label={isPngExporting ? { fill: "#7396b5", fontSize: 10, formatter: formatChartExportLabel } : false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>

                <SectionCard
                  id="ops-cycle-monthly-table"
                  title="Tableau des durees mensuelles"
                  subtitle="Moyennes horaires par mois, calculees a la cle voyage"
                  collapsed={collapsedSections["ops-cycle-monthly-table"]}
                  onToggle={toggleSection}
                >
                  <DataTable
                    columns={[
                      { key: "moisLabel", label: "Mois" },
                      { key: "escales", label: "Escales", align: "right", render: (r: any) => formatInteger(r.escales) },
                      { key: "waitHours", label: "ATA→ATB (arrivee→quai)", align: "right", render: (r: any) => formatHours(r.waitHours) },
                      { key: "operationHours", label: "ATB→ATC (operations)", align: "right", render: (r: any) => formatHours(r.operationHours) },
                      { key: "postOpsHours", label: "ATC→ATD (fin ops→depart)", align: "right", render: (r: any) => formatHours(r.postOpsHours) },
                      { key: "totalCycleHours", label: "ATA→ATD (cycle total)", align: "right", render: (r: any) => formatHours(r.totalCycleHours) },
                    ]}
                    rows={monthlyCycleRows as unknown as GenericRow[]}
                    compact
                    maxHeight="360px"
                  />
                </SectionCard>
              </div>

              {/* Moyennes gate/jour par mois + TTT moyen/jour par mois */}
              <div className="grid gap-5 xl:grid-cols-2">
                <SectionCard title="Moyennes gate / jour par mois" subtitle={<><DataBadge type="moy-mois" /> Entrees, sorties et camions moyens sur les bulletins du mois</>}>
                  <div className="h-[340px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={cumul2026Monthly}>
                        <CartesianGrid {...CHART_GRID_PROPS} />
                        <XAxis dataKey="moisLabel" {...CHART_AXIS_PROPS} />
                        <YAxis {...CHART_AXIS_PROPS} />
                        <Tooltip content={<ChartTooltip valueFormatter={(v: any) => toNumber(v).toFixed(0)} />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="entreesTotalAvgJour" name="Entrees/j" fill="#2e90d9" radius={[4, 4, 0, 0]} label={BAR_VALUE_LABEL} />
                        <Bar dataKey="sortiesPleinAvgJour" name="Sorties pleins/j" fill="#164b7e" radius={[4, 4, 0, 0]} label={BAR_VALUE_LABEL} />
                        <Bar dataKey="sortiesVideAvgJour" name="Sorties vides/j" fill="#93cbf2" radius={[4, 4, 0, 0]} label={BAR_VALUE_LABEL} />
                        <Bar dataKey="camionsAvgJour" name="Camions total/j" fill="#1d6fb8" radius={[4, 4, 0, 0]} label={BAR_VALUE_LABEL} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>

                <SectionCard title="TTT moyen / jour par mois" subtitle={<><DataBadge type="moy-mois" /> Moyenne journaliere en minutes</>}>
                  <div className="h-[340px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={cumul2026Monthly}>
                        <CartesianGrid {...CHART_GRID_PROPS} />
                        <XAxis dataKey="moisLabel" {...CHART_AXIS_PROPS} />
                        <YAxis {...CHART_AXIS_PROPS} />
                        <Tooltip content={<ChartTooltip valueFormatter={(v: any, name: any) => String(name).includes("TTT") ? formatMinutes(v) : `${toNumber(v).toFixed(1)}`} />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Line connectNulls={false} type="monotone" dataKey="tttAvg" name="TTT moy./j" stroke="#5fb0e8" strokeWidth={2.5} dot={{ r: 4 }} label={isPngExporting ? { fill: "#7396b5", fontSize: 10, formatter: formatChartExportLabel } : false} />
                        <Line connectNulls={false} type="monotone" dataKey="productivityAverage" name="Prod. moy." stroke="#2e90d9" strokeWidth={2.5} dot={{ r: 4 }} label={isPngExporting ? { fill: "#7396b5", fontSize: 10, formatter: formatChartExportLabel } : false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>
              </div>

              {/* Occupation + Reefers moyennes par mois */}
              <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                <SectionCard title="Occupation moyenne par mois" subtitle={<><DataBadge type="moy-mois" /> Moyenne journaliere du taux d&apos;occupation</>}>
                  <div className="h-[340px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={cumul2026Monthly}>
                        <defs>
                          <linearGradient id="gradOcc" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#93cbf2" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#93cbf2" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gradReef" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#1d6fb8" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#1d6fb8" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid {...CHART_GRID_PROPS} />
                        <XAxis dataKey="moisLabel" {...CHART_AXIS_PROPS} />
                        <YAxis {...CHART_AXIS_PROPS} unit="%" />
                        <Tooltip content={<ChartTooltip valueFormatter={(v: any) => `${toNumber(v).toFixed(1)}%`} />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Area connectNulls={false} type="monotone" dataKey="occupationAvg" name="Parc %" stroke="#93cbf2" fill="url(#gradOcc)" strokeWidth={2.5} label={isPngExporting ? { fill: "#7396b5", fontSize: 10, formatter: formatChartExportLabel } : false} />
                        <Area connectNulls={false} type="monotone" dataKey="reefersAvg" name="Reefers %" stroke="#1d6fb8" fill="url(#gradReef)" strokeWidth={2.5} label={isPngExporting ? { fill: "#7396b5", fontSize: 10, formatter: formatChartExportLabel } : false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>

                <SectionCard title={`TTT moyen par jour de semaine (${selectedCumulYear})`} subtitle={<><DataBadge type="moy-annuel" /> Heatmap gate sur l&apos;annee</>}>
                  <WeekdayHeatmap rows={cumul2026WeekdayHeatmap} />
                </SectionCard>
              </div>

              {/* Cumuls gate annuels */}
              <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
                <SectionCard title="Flux gate cumules" subtitle={<><DataBadge type="cumul-annuel" /> Cumul {selectedCumulYear}</>}>
                  <DataTable
                    columns={[
                      { key: "name", label: "Flux" },
                      { key: "cumul", label: "Cumul annuel", align: "right" },
                      { key: "avgJour", label: "Moy. / jour", align: "right" },
                    ]}
                    rows={[
                      { name: "Entrees pleins", cumul: formatInteger(cumul2026Annual.gateEntreesPleins), avgJour: (cumul2026Annual.gateEntreesPleins / Math.max(cumul2026Annual.totalGateDays, 1)).toFixed(0) },
                      { name: "Entrees vides", cumul: formatInteger(cumul2026Annual.gateEntreesVides), avgJour: (cumul2026Annual.gateEntreesVides / Math.max(cumul2026Annual.totalGateDays, 1)).toFixed(0) },
                      { name: "Sorties pleins", cumul: formatInteger(cumul2026Annual.gateSortiesPleins), avgJour: (cumul2026Annual.gateSortiesPleins / Math.max(cumul2026Annual.totalGateDays, 1)).toFixed(0) },
                      { name: "Sorties vides", cumul: formatInteger(cumul2026Annual.gateSortiesVides), avgJour: (cumul2026Annual.gateSortiesVides / Math.max(cumul2026Annual.totalGateDays, 1)).toFixed(0) },
                      { name: "Total camions", cumul: formatInteger(cumul2026Annual.totalCamions), avgJour: cumul2026Annual.camionsAvgJour.toFixed(0) },
                    ]}
                    compact
                  />
                </SectionCard>

                <SectionCard title="Escales par ligne maritime" subtitle={<><DataBadge type="cumul-annuel" /> Cumul annuel {selectedCumulYear}</>}>
                  <DataTable
                    columns={[
                      { key: "shipping", label: "Ligne", render: (r: any) => <ShippingBadge rawValue={r.shipping} /> },
                      { key: "escales", label: "Escales", align: "right", render: (r: any) => formatInteger(r.escales) },
                      { key: "units", label: "Units", align: "right", render: (r: any) => formatInteger(r.units) },
                      { key: "productivity", label: "Prod. moy.", align: "right", render: (r: any) => toNumber(r.productivity).toFixed(1) },
                    ]}
                    rows={cumul2026ShippingAnnual}
                    compact
                  />
                </SectionCard>
              </div>

              {/* Full monthly table */}
              <SectionCard title={`Tableau mensuel ${selectedCumulYear}`} subtitle={<><DataBadge type="cumul-mois" /> Cumul TEU au dernier jour du mois + moyennes journalieres</>}>
                <DataTable
                  columns={[
                    { key: "moisLabel", label: "Mois" },
                    { key: "latestDate", label: "Derniere fiche", render: (r: any) => formatDateLabel(r.latestDate) },
                    { key: "escalesRealisees", label: "Escales", align: "right", render: (r: any) => formatInteger(r.escalesRealisees) },
                    { key: "totalTeu", label: "Cumul TEU", align: "right", render: (r: any) => formatInteger(r.totalTeu) },
                    { key: "importTeu", label: "Import", align: "right", render: (r: any) => formatInteger(r.importTeu) },
                    { key: "exportTeu", label: "Export", align: "right", render: (r: any) => formatInteger(r.exportTeu) },
                    { key: "transboTeu", label: "Transbo", align: "right", render: (r: any) => formatInteger(r.transboTeu) },
                    { key: "pleinsTeu", label: "Pleins", align: "right", render: (r: any) => formatInteger(r.pleinsTeu) },
                    { key: "videsTeu", label: "Vides", align: "right", render: (r: any) => formatInteger(r.videsTeu) },
                    { key: "tauxRealisation", label: "Real. %", align: "right", render: (r: any) => formatPercent(r.tauxRealisation) },
                    { key: "occupationAvg", label: "Occ. moy.", align: "right", render: (r: any) => `${toNumber(r.occupationAvg).toFixed(0)}%` },
                    { key: "tttAvg", label: "TTT moy./j", align: "right", render: (r: any) => formatMinutes(r.tttAvg) },
                    { key: "camionsAvgJour", label: "Cam./j", align: "right", render: (r: any) => toNumber(r.camionsAvgJour).toFixed(0) },
                    { key: "entreesTotalAvgJour", label: "Ent./j", align: "right", render: (r: any) => toNumber(r.entreesTotalAvgJour).toFixed(0) },
                    { key: "sortiesTotalAvgJour", label: "Sort./j", align: "right", render: (r: any) => toNumber(r.sortiesTotalAvgJour).toFixed(0) },
                    { key: "sortiesPleinAvgJour", label: "Sort.P/j", align: "right", render: (r: any) => toNumber(r.sortiesPleinAvgJour).toFixed(0) },
                    { key: "productivityAverage", label: "Prod.", align: "right", render: (r: any) => toNumber(r.productivityAverage).toFixed(1) },
                  ]}
                  rows={cumul2026Monthly as unknown as GenericRow[]}
                />
              </SectionCard>

              {/* Escales mensuelles par ligne */}
              <SectionCard title="Escales mensuelles par ligne maritime" subtitle={<><DataBadge type="cumul-mois" /> Realisees en {selectedCumulYear}</>}>
                <DataTable
                  columns={[
                    { key: "anneeMois", label: "Mois", render: (r: any) => formatMonthAxisLabel(r.anneeMois) },
                    { key: "shipping", label: "Ligne", render: (r: any) => <ShippingBadge rawValue={r.shipping} /> },
                    { key: "escales", label: "Escales", align: "right", render: (r: any) => formatInteger(r.escales) },
                    { key: "units", label: "Units", align: "right", render: (r: any) => formatInteger(r.units) },
                    { key: "productivity", label: "Prod. moy.", align: "right", render: (r: any) => toNumber(r.productivity).toFixed(1) },
                  ]}
                  rows={cumul2026Shipping as unknown as GenericRow[]}
                />
              </SectionCard>
            </>


  );
}
