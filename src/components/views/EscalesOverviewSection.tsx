/* eslint-disable @typescript-eslint/no-explicit-any */

type GenericRow = Record<string, unknown>;

export default function EscalesOverviewSection({ ctx }: { ctx: any }) {
  const { Area, AreaChart, CHART_AXIS_PROPS, CHART_GRID_PROPS, CalendarRange, CartesianGrid, Cell, ChartTooltip, Container, DataTable, FLOW_COLORS, Gauge, Legend, Line, LineChart, MetricCard, Pie, PieChart, ResponsiveContainer, SectionCard, Ship, Tooltip, XAxis, YAxis, avgCompletedOperationHours, avgCompletedProductivity, avgCompletedQuayHours, collapsedSections, completedCalls, completedShippingPie, completedShippingStats, dashboardData, flowMix, formatChartExportLabel, formatDateLabel, formatHours, formatInteger, formatPercent, formatRowDate, formatShortDate, isPngExporting, latestDaily, monthlyCycleRows, monthlyTrafficRows, renderExportPieValueLabel, selectedCumulYear, toText, toggleSection } = ctx;
  return (
    <>
              {/* Operations overview cards */}
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Date rapport" value={formatRowDate(latestDaily)} tone="#10304f" hint={toText(latestDaily.jour_nom_fr, "")} icon={<CalendarRange className="h-4 w-4" />} compact />
                <MetricCard label="Escales uniques" value={formatInteger(completedCalls.length)} tone="#164b7e" hint={`${selectedCumulYear} | ${formatInteger(latestDaily.nb_navires_en_operation)} navires encore en op.`} icon={<Ship className="h-4 w-4" />} compact />
                <MetricCard label="Prod. navire moy." value={`${avgCompletedProductivity.toFixed(1)} mvts/h`} tone="#93cbf2" hint={`Sur ${formatInteger(completedCalls.length)} escales terminees`} icon={<Gauge className="h-4 w-4" />} compact />
                <MetricCard label="Duree a quai moy." value={formatHours(avgCompletedQuayHours)} tone="#5fb0e8" hint={`Operation ${formatHours(avgCompletedOperationHours)} | Cycle ${formatHours(monthlyCycleRows.length ? monthlyCycleRows.reduce((s: any, r: any) => s + r.totalCycleHours, 0) / monthlyCycleRows.length : 0)}`} icon={<Container className="h-4 w-4" />} compact />
              </div>

              <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
                <SectionCard
                  id="ops-monthly-flows"
                  title="Trafic mensuel par type"
                  subtitle="Maxima mensuels 2026 avec pleins derives = import + export + transbo"
                  collapsed={collapsedSections["ops-monthly-flows"]}
                  onToggle={toggleSection}
                >
                  <div className="h-[360px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyTrafficRows}>
                        <CartesianGrid {...CHART_GRID_PROPS} />
                        <XAxis dataKey="moisLabel" {...CHART_AXIS_PROPS} />
                        <YAxis {...CHART_AXIS_PROPS} />
                        <Tooltip content={<ChartTooltip valueFormatter={(v: any) => `${formatInteger(v)} TEU`} />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Line connectNulls={false} type="monotone" dataKey="importTeu" name="Import" stroke="#164b7e" strokeWidth={2.2} dot={{ r: 3 }} label={isPngExporting ? { fill: "#7396b5", fontSize: 10, formatter: formatChartExportLabel } : false} />
                        <Line connectNulls={false} type="monotone" dataKey="exportTeu" name="Export" stroke="#1d6fb8" strokeWidth={2.2} dot={{ r: 3 }} label={isPngExporting ? { fill: "#7396b5", fontSize: 10, formatter: formatChartExportLabel } : false} />
                        <Line connectNulls={false} type="monotone" dataKey="transboTeu" name="Transbo" stroke="#5fb0e8" strokeWidth={2.2} dot={{ r: 3 }} label={isPngExporting ? { fill: "#7396b5", fontSize: 10, formatter: formatChartExportLabel } : false} />
                        <Line connectNulls={false} type="monotone" dataKey="pleinsDerives" name="Pleins I+E+T" stroke="#93cbf2" strokeWidth={2.2} dot={{ r: 3 }} label={isPngExporting ? { fill: "#7396b5", fontSize: 10, formatter: formatChartExportLabel } : false} />
                        <Line connectNulls={false} type="monotone" dataKey="videsTeu" name="Vides" stroke="#93cbf2" strokeWidth={2.2} dot={{ r: 3 }} label={isPngExporting ? { fill: "#7396b5", fontSize: 10, formatter: formatChartExportLabel } : false} />
                        <Line connectNulls={false} type="monotone" dataKey="totalTeu" name="Total" stroke="#2e90d9" strokeWidth={2.8} dot={{ r: 4 }} label={isPngExporting ? { fill: "#7396b5", fontSize: 10, formatter: formatChartExportLabel } : false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>

                <SectionCard
                  id="ops-market-share"
                  title="Part de marche des escales"
                  subtitle="Escales terminees dedupliquees par ligne maritime"
                  collapsed={collapsedSections["ops-market-share"]}
                  onToggle={toggleSection}
                >
                  <div className="h-[300px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={completedShippingPie}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={64}
                          outerRadius={106}
                          paddingAngle={2}
                          cornerRadius={4}
                          label={isPngExporting ? renderExportPieValueLabel : ({ percent }: { percent?: number }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                        >
                          {completedShippingPie.map((item: any) => <Cell key={item.name} fill={item.color} />)}
                        </Pie>
                        <Tooltip content={<ChartTooltip valueFormatter={(v: any) => `${formatInteger(v)} escales`} />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 space-y-2">
                    {completedShippingStats.slice(0, 5).map((item: any) => (
                      <div key={item.shipping} className="flex items-center justify-between gap-3 text-sm">
                        <div className="min-w-0">
                          <div className="font-medium text-[var(--text-primary)]">{item.shipping}</div>
                          <div className="text-[12px] text-[var(--text-muted)]">{formatInteger(item.units)} units</div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-[var(--cyan)]">{formatInteger(item.escales)}</div>
                          <div className="text-[12px] text-[var(--text-muted)]">{formatPercent(item.marketShare)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </div>

              <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
                <SectionCard
                  id="ops-monthly-cycle-chart"
                  title="Cycle navire moyen par mois"
                  subtitle="Cle voyage dedupliquee : ATA→ATB (arrivee→quai), ATB→ATC (operations), ATC→ATD (fin ops→depart), ATA→ATD (cycle total)"
                  collapsed={collapsedSections["ops-monthly-cycle-chart"]}
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
                  id="ops-monthly-cycle-table"
                  title="Tableau des durees mensuelles"
                  subtitle="Moyennes horaires par mois, calculees a la cle voyage"
                  collapsed={collapsedSections["ops-monthly-cycle-table"]}
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

              {/* Main operations charts */}
              <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
                <SectionCard
                  id="ops-daily"
                  title="Production journaliere"
                  subtitle="Cumul TEU realise vs budget sur la periode"
                  collapsed={collapsedSections["ops-daily"]}
                  onToggle={toggleSection}
                >
                  <div className="h-[360px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dashboardData.dailyData}>
                        <defs>
                          <linearGradient id="gradReal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2e90d9" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#2e90d9" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gradBudget" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#164b7e" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#164b7e" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid {...CHART_GRID_PROPS} />
                        <XAxis dataKey="date_rapport" {...CHART_AXIS_PROPS} tickFormatter={formatShortDate} />
                        <YAxis {...CHART_AXIS_PROPS} />
                        <Tooltip content={<ChartTooltip labelFormatter={formatDateLabel} valueFormatter={(v: any) => formatInteger(v)} />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Area connectNulls={false} type="monotone" dataKey="total_teu" name="Realise" stroke="#2e90d9" fill="url(#gradReal)" strokeWidth={2.5} label={isPngExporting ? { fill: "#7396b5", fontSize: 10, formatter: formatChartExportLabel } : false} />
                        <Area connectNulls={false} type="monotone" dataKey="total_forecast" name="Budget" stroke="#164b7e" fill="url(#gradBudget)" strokeWidth={2} strokeDasharray="6 3" label={isPngExporting ? { fill: "#7396b5", fontSize: 10, formatter: formatChartExportLabel } : false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>

                <SectionCard
                  id="ops-flow"
                  title="Repartition des flux"
                  subtitle="Import, export, transbordement, vides"
                  collapsed={collapsedSections["ops-flow"]}
                  onToggle={toggleSection}
                >
                  <div className="h-[360px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={flowMix} dataKey="value" nameKey="name" innerRadius={75} outerRadius={120} paddingAngle={3} cornerRadius={4} label={isPngExporting ? renderExportPieValueLabel : undefined}>
                          {flowMix.map((e: any, i: any) => <Cell key={e.name} fill={FLOW_COLORS[i % FLOW_COLORS.length]} />)}
                        </Pie>
                        <Tooltip content={<ChartTooltip valueFormatter={(v: any) => `${formatInteger(v)} TEU`} />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Flow breakdown numbers */}
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {flowMix.map((f: any, i: any) => (
                      <div key={f.name} className="flex items-center gap-2 text-sm">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: FLOW_COLORS[i] }} />
                        <span className="text-[var(--text-secondary)]">{f.name}</span>
                        <span className="ml-auto font-mono text-[var(--text-primary)]">{formatInteger(f.value)}</span>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </div>

    </>
  );
}
