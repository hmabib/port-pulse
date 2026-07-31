/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";

type GenericRow = Record<string, unknown>;

export default function KpiAnalysisView({ ctx }: { ctx: any }) {
  const { Activity, AnalyseSubTab, Area, AreaChart, Bar, BarChart, CHART_AXIS_PROPS, CHART_GRID_PROPS, CalendarRange, CartesianGrid, Cell, ChartTooltip, Container, DataTable, Gauge, INTELLIGENCE_THRESHOLDS, InsightCard, Legend, Line, LineChart, MetricCard, ResponsiveContainer, SectionCard, Tooltip, Truck, XAxis, YAxis, analyseSubTab, annualAnalysis, buildVisibleChartLabel, dailyAnalysis, formatDateLabel, formatInteger, formatMinutes, formatPercent, formatShortDate, gateTttTrend, monthlyAnalyses, occupancyTrend, selectedCumulYear, setAnalyseSubTab, toNumber, yearScopedDailyData } = ctx;
  return (
            <>
              <div className="flex gap-2">
                <AnalyseSubTab active={analyseSubTab === "daily"} label="Journaliere" onClick={() => setAnalyseSubTab("daily")} />
                <AnalyseSubTab active={analyseSubTab === "monthly"} label="Mensuelle" onClick={() => setAnalyseSubTab("monthly")} />
                <AnalyseSubTab active={analyseSubTab === "annual"} label="Annuelle" onClick={() => setAnalyseSubTab("annual")} />
              </div>

              {/* ── Daily Analysis ── */}
              {analyseSubTab === "daily" && dailyAnalysis && (
                <>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard label="Volume jour" value={formatInteger(dailyAnalysis.totalTeu)} tone="#2e90d9" hint={`Forecast ${formatInteger(dailyAnalysis.forecast)} TEU`} icon={<Activity className="h-4 w-4" />} compact />
                    <MetricCard label="Realisation" value={formatPercent(dailyAnalysis.realisationPct)} tone={dailyAnalysis.realisationPct >= 90 ? "#2e90d9" : dailyAnalysis.realisationPct >= 75 ? "#5fb0e8" : "#f87171"} hint={`Ecart ${dailyAnalysis.gapVsForecast >= 0 ? "+" : ""}${formatInteger(dailyAnalysis.gapVsForecast)} TEU`} icon={<Gauge className="h-4 w-4" />} compact />
                    <MetricCard label="Occupation parc" value={formatPercent(dailyAnalysis.occupancyPct)} tone={dailyAnalysis.occupancyPct >= 90 ? "#f87171" : "#164b7e"} hint={`Reefers ${formatPercent(dailyAnalysis.reeferPct)}`} icon={<Container className="h-4 w-4" />} compact />
                    <MetricCard label="Productivite" value={`${dailyAnalysis.productivity.toFixed(1)} mvts/h`} tone="#93cbf2" hint={`TTT ${formatMinutes(dailyAnalysis.tttMinutes)} | Gate ${formatInteger(dailyAnalysis.gateMovements)} mvts`} icon={<Gauge className="h-4 w-4" />} compact />
                  </div>

                  <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
                    <SectionCard title="Performance vs forecast" subtitle={`Evolution realise vs budget depuis le 1er janvier ${selectedCumulYear}`}>
                      <div className="h-[360px] min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={yearScopedDailyData}>
                            <defs>
                              <linearGradient id="gradAnalyseReal" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#2e90d9" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#2e90d9" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid {...CHART_GRID_PROPS} />
                            <XAxis dataKey="date_rapport" {...CHART_AXIS_PROPS} tickFormatter={formatShortDate} />
                            <YAxis {...CHART_AXIS_PROPS} />
                            <Tooltip content={<ChartTooltip labelFormatter={formatDateLabel} valueFormatter={(v: any) => formatInteger(v)} />} />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Area connectNulls={false} type="monotone" dataKey="total_teu" name="Realise" stroke="#2e90d9" fill="url(#gradAnalyseReal)" strokeWidth={2.5} label={buildVisibleChartLabel()} />
                            <Area connectNulls={false} type="monotone" dataKey="total_forecast" name="Budget" stroke="#164b7e" fill="none" strokeWidth={2} strokeDasharray="6 3" label={buildVisibleChartLabel()} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </SectionCard>

                    <SectionCard title="Insights du jour" subtitle={`${dailyAnalysis.insights.length} detection(s)`}>
                      <div className="space-y-3 max-h-[360px] overflow-y-auto">
                        {dailyAnalysis.insights.length === 0 ? (
                          <p className="text-[13px] text-[var(--text-muted)]">Aucune anomalie detectee. Operations normales.</p>
                        ) : (
                          dailyAnalysis.insights.map((ins: any) => <InsightCard key={ins.id} insight={ins} />)
                        )}
                      </div>
                    </SectionCard>
                  </div>

                  <div className="grid gap-5 xl:grid-cols-2">
                    <SectionCard title="Taux d'occupation - Depuis le 1er janvier" subtitle="Parc et reefers sur la periode chargee">
                      <div className="h-[300px] min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={occupancyTrend}>
                            <CartesianGrid {...CHART_GRID_PROPS} />
                            <XAxis dataKey="date_rapport" {...CHART_AXIS_PROPS} tickFormatter={formatShortDate} />
                            <YAxis {...CHART_AXIS_PROPS} domain={[0, 120]} />
                            <Tooltip content={<ChartTooltip labelFormatter={formatDateLabel} valueFormatter={(v: any) => formatPercent(v)} />} />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Line connectNulls={false} type="monotone" dataKey="taux_occupation_parc" name="Parc %" stroke="#93cbf2" strokeWidth={2.5} dot={{ r: 2 }} label={buildVisibleChartLabel()} />
                            <Line connectNulls={false} type="monotone" dataKey="taux_occupation_reefers" name="Reefers %" stroke="#5fb0e8" strokeWidth={2.5} dot={{ r: 2 }} label={buildVisibleChartLabel()} />
                            <Line
connectNulls={false}                               type="monotone"
                              dataKey={() => INTELLIGENCE_THRESHOLDS.parkCriticalPct}
                              name="Seuil critique"
                              stroke="#f87171"
                              strokeWidth={1}
                              strokeDasharray="4 4"
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </SectionCard>

                    <SectionCard title="Productivite - Depuis le 1er janvier" subtitle="Prod. nette et TTT sur la periode chargee">
                      <div className="h-[300px] min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={gateTttTrend}>
                            <CartesianGrid {...CHART_GRID_PROPS} />
                            <XAxis dataKey="date_rapport" {...CHART_AXIS_PROPS} tickFormatter={formatShortDate} />
                            <YAxis yAxisId="left" {...CHART_AXIS_PROPS} />
                            <YAxis yAxisId="right" orientation="right" {...CHART_AXIS_PROPS} />
                            <Tooltip content={<ChartTooltip labelFormatter={formatDateLabel} valueFormatter={(v: any, name: any) => String(name).includes("TTT") ? formatMinutes(v) : `${toNumber(v).toFixed(1)} mvts/h`} />} />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Line connectNulls={false} yAxisId="left" type="monotone" dataKey="ttt_duree_minutes" name="TTT" stroke="#5fb0e8" strokeWidth={2.5} dot={{ r: 2 }} label={buildVisibleChartLabel()} />
                            <Line connectNulls={false} yAxisId="right" type="monotone" dataKey="ttt_total_camions" name="Camions" stroke="#164b7e" strokeWidth={2.2} dot={{ r: 2 }} label={buildVisibleChartLabel()} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </SectionCard>
                  </div>
                </>
              )}

              {/* ── Monthly Analysis ── */}
              {analyseSubTab === "monthly" && (
                <>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {monthlyAnalyses.slice(-1).map((m: any) => (
                      <React.Fragment key={m.month}>
                        <MetricCard label={m.monthLabel} value={formatInteger(m.totalTeu)} tone="#2e90d9" hint={`Realisation ${formatPercent(m.realisationPct)}`} icon={<CalendarRange className="h-4 w-4" />} compact />
                        <MetricCard label="Tendance vs prec." value={`${m.trendVsPrevious >= 0 ? "+" : ""}${m.trendVsPrevious.toFixed(1)}%`} tone={m.trendVsPrevious >= 0 ? "#2e90d9" : "#f87171"} hint={`${m.daysReported} jours rapportes`} icon={<Activity className="h-4 w-4" />} compact />
                        <MetricCard label="Occ. parc moy." value={formatPercent(m.avgOccupancy)} tone={m.avgOccupancy >= 90 ? "#f87171" : "#164b7e"} hint={`TTT moyen ${formatMinutes(m.avgTtt)}`} icon={<Container className="h-4 w-4" />} compact />
                        <MetricCard label="Prod. moyenne" value={`${m.avgProductivity.toFixed(1)} mvts/h`} tone="#93cbf2" hint={`Gate cumule ${formatInteger(m.totalGateMovements)} mvts`} icon={<Gauge className="h-4 w-4" />} compact />
                      </React.Fragment>
                    ))}
                  </div>

                  <div className="grid gap-5 xl:grid-cols-[1.4fr_0.6fr]">
                    <SectionCard title="Comparaison mensuelle" subtitle="Volume total, realisation et tendance">
                      <div className="h-[400px] min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={monthlyAnalyses}>
                            <CartesianGrid {...CHART_GRID_PROPS} />
                            <XAxis dataKey="monthLabel" {...CHART_AXIS_PROPS} tickFormatter={(v: any) => String(v).split(" ")[0]?.slice(0, 4) ?? v} />
                            <YAxis {...CHART_AXIS_PROPS} />
                            <Tooltip content={<ChartTooltip valueFormatter={(v: any) => formatInteger(v)} />} />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Bar dataKey="totalTeu" name="Realise" fill="#2e90d9" radius={[6, 6, 0, 0]} label={buildVisibleChartLabel({ position: "top" })} />
                            <Bar dataKey="forecast" name="Budget" fill="#164b7e" radius={[6, 6, 0, 0]} label={buildVisibleChartLabel({ position: "top" })} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </SectionCard>

                    <SectionCard title="Insights mensuels" subtitle="Dernier mois">
                      <div className="space-y-3 max-h-[400px] overflow-y-auto">
                        {monthlyAnalyses.slice(-1).flatMap((m: any) => m.insights).length === 0 ? (
                          <p className="text-[13px] text-[var(--text-muted)]">Aucun signal detecte pour ce mois.</p>
                        ) : (
                          monthlyAnalyses.slice(-1).flatMap((m: any) => m.insights).map((ins: any) => <InsightCard key={ins.id} insight={ins} />)
                        )}
                      </div>
                    </SectionCard>
                  </div>

                  <SectionCard title="Tableau mensuel detaille" subtitle="KPIs par mois">
                    <DataTable
                      columns={[
                        { key: "monthLabel", label: "Mois" },
                        { key: "totalTeu", label: "Volume", align: "right", render: (r: any) => formatInteger(r.totalTeu) },
                        { key: "forecast", label: "Budget", align: "right", render: (r: any) => formatInteger(r.forecast) },
                        { key: "realisationPct", label: "Real. %", align: "right", render: (r: any) => formatPercent(r.realisationPct) },
                        { key: "trendVsPrevious", label: "Tend. %", align: "right", render: (r: any) => `${toNumber(r.trendVsPrevious) >= 0 ? "+" : ""}${toNumber(r.trendVsPrevious).toFixed(1)}%` },
                        { key: "avgOccupancy", label: "Occ. %", align: "right", render: (r: any) => formatPercent(r.avgOccupancy) },
                        { key: "avgTtt", label: "TTT moy.", align: "right", render: (r: any) => formatMinutes(r.avgTtt) },
                        { key: "avgProductivity", label: "Prod.", align: "right", render: (r: any) => toNumber(r.avgProductivity).toFixed(1) },
                        { key: "totalGateMovements", label: "Gate", align: "right", render: (r: any) => formatInteger(r.totalGateMovements) },
                        { key: "daysReported", label: "Jours", align: "right" },
                      ]}
                      rows={monthlyAnalyses as unknown as GenericRow[]}
                    />
                  </SectionCard>
                </>
              )}

              {/* ── Annual Analysis ── */}
              {analyseSubTab === "annual" && annualAnalysis && (
                <>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                    <MetricCard label="Volume annuel" value={formatInteger(annualAnalysis.totalTeu)} tone="#2e90d9" icon={<Activity className="h-4 w-4" />} compact />
                    <MetricCard label="Moy. mensuelle" value={formatInteger(annualAnalysis.avgMonthlyTeu)} tone="#164b7e" icon={<CalendarRange className="h-4 w-4" />} compact />
                    <MetricCard label="Meilleur mois" value={annualAnalysis.bestMonth.split(" ")[0] ?? "—"} tone="#2e90d9" icon={<Activity className="h-4 w-4" />} compact />
                    <MetricCard label="Occ. moy." value={formatPercent(annualAnalysis.avgOccupancy)} tone={annualAnalysis.avgOccupancy >= INTELLIGENCE_THRESHOLDS.parkWarningPct ? "#f87171" : "#164b7e"} icon={<Container className="h-4 w-4" />} compact />
                    <MetricCard label="Prod. moy." value={`${annualAnalysis.avgProductivity.toFixed(1)}`} tone="#93cbf2" icon={<Gauge className="h-4 w-4" />} compact />
                    <MetricCard label="Gate total" value={formatInteger(annualAnalysis.totalGateMovements)} tone="#5fb0e8" icon={<Truck className="h-4 w-4" />} compact />
                  </div>

                  <div className="grid gap-5 xl:grid-cols-[1.4fr_0.6fr]">
                    <SectionCard title="Tendance de croissance" subtitle="Volume mensuel sur l'annee">
                      <div className="h-[380px] min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={annualAnalysis.months}>
                            <defs>
                              <linearGradient id="gradAnnual" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#2e90d9" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#2e90d9" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid {...CHART_GRID_PROPS} />
                            <XAxis dataKey="monthLabel" {...CHART_AXIS_PROPS} tickFormatter={(v: any) => String(v).split(" ")[0]?.slice(0, 4) ?? v} />
                            <YAxis {...CHART_AXIS_PROPS} />
                            <Tooltip content={<ChartTooltip valueFormatter={(v: any) => formatInteger(v)} />} />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Area connectNulls={false} type="monotone" dataKey="totalTeu" name="Volume" stroke="#2e90d9" fill="url(#gradAnnual)" strokeWidth={2.5} label={buildVisibleChartLabel()} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </SectionCard>

                    <SectionCard title="Insights annuels" subtitle={`${annualAnalysis.insights.length} signal(s)`}>
                      <div className="space-y-3 max-h-[380px] overflow-y-auto">
                        {annualAnalysis.insights.length === 0 ? (
                          <p className="text-[13px] text-[var(--text-muted)]">Pas de tendance marquante detectee.</p>
                        ) : (
                          annualAnalysis.insights.map((ins: any) => <InsightCard key={ins.id} insight={ins} />)
                        )}
                      </div>
                    </SectionCard>
                  </div>

                  <SectionCard title="Comparaison inter-mois" subtitle="Croissance mensuelle">
                    <div className="h-[300px] min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={annualAnalysis.months}>
                          <CartesianGrid {...CHART_GRID_PROPS} />
                          <XAxis dataKey="monthLabel" {...CHART_AXIS_PROPS} tickFormatter={(v: any) => String(v).split(" ")[0]?.slice(0, 4) ?? v} />
                          <YAxis {...CHART_AXIS_PROPS} />
                          <Tooltip content={<ChartTooltip valueFormatter={(v: any) => `${toNumber(v) >= 0 ? "+" : ""}${toNumber(v).toFixed(1)}%`} />} />
                          <Bar dataKey="trendVsPrevious" name="Variation %" label={buildVisibleChartLabel({ position: "top" })}>
                            {annualAnalysis.months.map((m: any, i: any) => (
                              <Cell key={i} fill={m.trendVsPrevious >= 0 ? "#2e90d9" : "#f87171"} radius={[6, 6, 0, 0] as unknown as number} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </SectionCard>
                </>
              )}
            </>

  );
}
