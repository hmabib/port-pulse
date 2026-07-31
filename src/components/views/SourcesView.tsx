/* eslint-disable @typescript-eslint/no-explicit-any */


export default function SourcesView({ ctx }: { ctx: any }) {
  const { Area, AreaChart, Bar, BarChart, CHART_AXIS_PROPS, CHART_GRID_PROPS, CalendarRange, CartesianGrid, ChartTooltip, Container, DataTable, Gauge, Legend, Line, LineChart, MetricCard, ResponsiveContainer, SEGMENT_ITEMS, SectionCard, Ship, ShippingBadge, Tooltip, XAxis, YAxis, activeSegment, buildVisibleChartLabel, dashboardData, formatDateLabel, formatInteger, formatMinutes, formatPercent, formatShortDate, gateTttTrend, latestKpi, latestParc, selectedCumulYear, setActiveSegment, toNumber, toText, yearScopedArmateursData, yearScopedDailyData, yearScopedExploitantsData, yearScopedGateData, yearScopedKpisData, yearScopedParcData, yearScopedRapportData } = ctx;
  return (
            <>
              {/* Mobile segment picker */}
              <div className="flex flex-wrap gap-1.5 overflow-x-auto lg:hidden">
                {SEGMENT_ITEMS.map((s: any) => (
                  <button key={s.id} type="button" onClick={() => setActiveSegment(s.id)}
                    className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[12px] font-medium transition ${activeSegment === s.id ? "bg-[var(--badge-bg)] text-[var(--cyan)]" : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"}`}>
                    {s.label}
                  </button>
                ))}
              </div>

              {activeSegment === "global" && (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <MetricCard label="Rapports" value={formatInteger(dashboardData.rapportQuotidien.length)} tone="#164b7e" hint="Occurrences disponibles" icon={<CalendarRange className="h-4 w-4" />} compact />
                  <MetricCard label="KPIs" value={formatPercent(latestKpi.kpi_utilisation_globale_pct)} tone="#2e90d9" hint={`Flag TTT : ${toText(latestKpi.kpi_ttt_flag, "normal")}`} icon={<Gauge className="h-4 w-4" />} compact />
                  <MetricCard label="Parc" value={formatPercent(latestParc.taux_occupation_parc)} tone="#93cbf2" hint={`${formatInteger(latestParc.parc_conteneurs_utilise)} utilises`} icon={<Container className="h-4 w-4" />} compact />
                  <MetricCard label="Navires en op." value={formatInteger(dashboardData.naviresOperation.length)} tone="#5fb0e8" hint="Lignes dans le segment" icon={<Ship className="h-4 w-4" />} compact />
                </div>
              )}

              {activeSegment === "volumes" && (
                <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
                  <SectionCard title="Volumes TEU" subtitle={`Evolution import, export, transbo, vides depuis le 1er janvier ${selectedCumulYear}`}>
                    <div className="h-[380px] min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={yearScopedDailyData}>
                          <CartesianGrid {...CHART_GRID_PROPS} />
                          <XAxis dataKey="date_rapport" {...CHART_AXIS_PROPS} tickFormatter={formatShortDate} />
                          <YAxis {...CHART_AXIS_PROPS} />
                          <Tooltip content={<ChartTooltip labelFormatter={formatDateLabel} valueFormatter={(v: any) => formatInteger(v)} />} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Line connectNulls={false} type="monotone" dataKey="import_teu" name="Import" stroke="#164b7e" strokeWidth={2.2} dot={{ r: 2 }} label={buildVisibleChartLabel()} />
                          <Line connectNulls={false} type="monotone" dataKey="export_teu" name="Export" stroke="#2e90d9" strokeWidth={2.2} dot={{ r: 2 }} label={buildVisibleChartLabel()} />
                          <Line connectNulls={false} type="monotone" dataKey="transbo_teu" name="Transbo" stroke="#5fb0e8" strokeWidth={2.2} dot={{ r: 2 }} label={buildVisibleChartLabel()} />
                          <Line connectNulls={false} type="monotone" dataKey="vides_teu" name="Vides" stroke="#93cbf2" strokeWidth={2.2} dot={{ r: 2 }} label={buildVisibleChartLabel()} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </SectionCard>
                  <DataTable
                    columns={[
                      { key: "date_rapport", label: "Date", render: (r: any) => formatDateLabel(r.date_rapport) },
                      { key: "import_teu", label: "Import", align: "right", render: (r: any) => formatInteger(r.import_teu) },
                      { key: "export_teu", label: "Export", align: "right", render: (r: any) => formatInteger(r.export_teu) },
                      { key: "transbo_teu", label: "Transbo", align: "right", render: (r: any) => formatInteger(r.transbo_teu) },
                      { key: "total_teu", label: "Total", align: "right", render: (r: any) => formatInteger(r.total_teu) },
                    ]}
                    rows={[...yearScopedDailyData].reverse()}
                  />
                </div>
              )}

              {activeSegment === "gate" && (
                <div className="space-y-5">
                  <div className="grid gap-5 xl:grid-cols-2">
                    <SectionCard title="Gate / TTT" subtitle={`Camions et mouvements par date depuis le 1er janvier ${selectedCumulYear}`}>
                      <div className="h-[380px] min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={yearScopedGateData}>
                            <CartesianGrid {...CHART_GRID_PROPS} />
                            <XAxis dataKey="date_rapport" {...CHART_AXIS_PROPS} tickFormatter={formatShortDate} />
                            <YAxis {...CHART_AXIS_PROPS} />
                            <Tooltip content={<ChartTooltip labelFormatter={formatDateLabel} valueFormatter={(v: any) => formatInteger(v)} />} />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Bar dataKey="ttt_total_camions" name="Camions" fill="#164b7e" radius={[6, 6, 0, 0]} label={buildVisibleChartLabel({ position: "top" })} />
                            <Bar dataKey="gate_total_mouvements" name="Mouvements" fill="#5fb0e8" radius={[6, 6, 0, 0]} label={buildVisibleChartLabel({ position: "top" })} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </SectionCard>

                    <SectionCard title="Evolution du TTT" subtitle={`Fiches gate disponibles depuis le 1er janvier ${selectedCumulYear}`}>
                      <div className="h-[380px] min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={gateTttTrend}>
                            <CartesianGrid {...CHART_GRID_PROPS} />
                            <XAxis dataKey="date_rapport" {...CHART_AXIS_PROPS} tickFormatter={formatShortDate} />
                            <YAxis yAxisId="left" {...CHART_AXIS_PROPS} />
                            <YAxis yAxisId="right" orientation="right" {...CHART_AXIS_PROPS} />
                            <Tooltip
                              content={(
                                <ChartTooltip
                                  labelFormatter={formatDateLabel}
                                  valueFormatter={(v: any, name: any) => String(name).includes("TTT") ? formatMinutes(v) : formatInteger(v)}
                                />
                              )}
                            />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Line connectNulls={false} yAxisId="left" type="monotone" dataKey="ttt_duree_minutes" name="TTT" stroke="#5fb0e8" strokeWidth={2.5} dot={{ r: 2.5 }} label={buildVisibleChartLabel()} />
                            <Line connectNulls={false} yAxisId="right" type="monotone" dataKey="ttt_total_camions" name="Camions" stroke="#164b7e" strokeWidth={2.2} dot={{ r: 2 }} label={buildVisibleChartLabel()} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </SectionCard>
                  </div>

                  <DataTable
                    columns={[
                      { key: "date_rapport", label: "Date", render: (r: any) => formatDateLabel(r.date_rapport) },
                      { key: "ttt_duree_minutes", label: "TTT", align: "right", render: (r: any) => formatMinutes(r.ttt_duree_minutes) },
                      { key: "ttt_total_camions", label: "Camions", align: "right", render: (r: any) => formatInteger(r.ttt_total_camions) },
                      { key: "gate_entrees_pleins", label: "Ent. P", align: "right", render: (r: any) => formatInteger(r.gate_entrees_pleins) },
                      { key: "gate_sorties_pleins", label: "Sort. P", align: "right", render: (r: any) => formatInteger(r.gate_sorties_pleins) },
                      { key: "gate_total_mouvements", label: "Mvts", align: "right", render: (r: any) => formatInteger(r.gate_total_mouvements) },
                    ]}
                    rows={[...yearScopedGateData].reverse()}
                  />
                </div>
              )}

              {activeSegment === "escales" && (
                <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
                  <SectionCard title="Escales armateurs" subtitle={`Prevues vs realisees depuis le 1er janvier ${selectedCumulYear}`}>
                    <div className="h-[380px] min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={yearScopedArmateursData}>
                          <CartesianGrid {...CHART_GRID_PROPS} />
                          <XAxis dataKey="date_rapport" {...CHART_AXIS_PROPS} tickFormatter={formatShortDate} />
                          <YAxis {...CHART_AXIS_PROPS} />
                          <Tooltip content={<ChartTooltip labelFormatter={formatDateLabel} />} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Line connectNulls={false} type="monotone" dataKey="escales_total_prevues" name="Prevues" stroke="#164b7e" strokeWidth={2.5} dot={{ r: 2 }} label={buildVisibleChartLabel()} />
                          <Line connectNulls={false} type="monotone" dataKey="escales_total_realisees" name="Realisees" stroke="#2e90d9" strokeWidth={2.5} dot={{ r: 2 }} label={buildVisibleChartLabel()} />
                          <Line connectNulls={false} type="monotone" dataKey="taux_realisation_escales_pct" name="Taux %" stroke="#5fb0e8" strokeWidth={2} dot={{ r: 2 }} label={buildVisibleChartLabel()} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </SectionCard>
                  <DataTable
                    columns={[
                      { key: "date_rapport", label: "Date", render: (r: any) => formatDateLabel(r.date_rapport) },
                      { key: "escales_total_prevues", label: "Prevues", align: "right", render: (r: any) => formatInteger(r.escales_total_prevues) },
                      { key: "escales_total_realisees", label: "Realisees", align: "right", render: (r: any) => formatInteger(r.escales_total_realisees) },
                      { key: "taux_realisation_escales_pct", label: "Taux", align: "right", render: (r: any) => formatPercent(r.taux_realisation_escales_pct) },
                    ]}
                    rows={[...yearScopedArmateursData].reverse()}
                  />
                </div>
              )}

              {activeSegment === "exploitants" && (
                <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
                  <SectionCard title="Exploitants parc" subtitle={`Stocks par exploitant depuis le 1er janvier ${selectedCumulYear}`}>
                    <div className="h-[380px] min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={yearScopedExploitantsData}>
                          <CartesianGrid {...CHART_GRID_PROPS} />
                          <XAxis dataKey="date_rapport" {...CHART_AXIS_PROPS} tickFormatter={formatShortDate} />
                          <YAxis {...CHART_AXIS_PROPS} />
                          <Tooltip content={<ChartTooltip labelFormatter={formatDateLabel} valueFormatter={(v: any) => formatInteger(v)} />} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Area connectNulls={false} type="monotone" dataKey="exp_cma_total" name="CMA" stackId="1" stroke="#10304f" fill="#10304f" fillOpacity={0.4} />
                          <Area connectNulls={false} type="monotone" dataKey="exp_hlc_total" name="HLC" stackId="1" stroke="#5fb0e8" fill="#5fb0e8" fillOpacity={0.35} />
                          <Area connectNulls={false} type="monotone" dataKey="exp_msk_total" name="MSK" stackId="1" stroke="#164b7e" fill="#164b7e" fillOpacity={0.35} />
                          <Area connectNulls={false} type="monotone" dataKey="exp_mgs_total" name="MGS" stackId="1" stroke="#93cbf2" fill="#93cbf2" fillOpacity={0.35} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </SectionCard>
                  <DataTable
                    columns={[
                      { key: "date_rapport", label: "Date", render: (r: any) => formatDateLabel(r.date_rapport) },
                      { key: "exp_cma_total", label: "CMA", align: "right", render: (r: any) => formatInteger(r.exp_cma_total) },
                      { key: "exp_hlc_total", label: "HLC", align: "right", render: (r: any) => formatInteger(r.exp_hlc_total) },
                      { key: "exp_msk_total", label: "MSK", align: "right", render: (r: any) => formatInteger(r.exp_msk_total) },
                      { key: "exp_mgs_total", label: "MGS", align: "right", render: (r: any) => formatInteger(r.exp_mgs_total) },
                      { key: "exp_grand_total", label: "Total", align: "right", render: (r: any) => formatInteger(r.exp_grand_total) },
                    ]}
                    rows={[...yearScopedExploitantsData].reverse()}
                  />
                </div>
              )}

              {activeSegment === "kpis" && (
                <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
                  <SectionCard title="KPIs" subtitle={`Productivite et utilisation depuis le 1er janvier ${selectedCumulYear}`}>
                    <div className="h-[380px] min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={yearScopedKpisData}>
                          <CartesianGrid {...CHART_GRID_PROPS} />
                          <XAxis dataKey="date_rapport" {...CHART_AXIS_PROPS} tickFormatter={formatShortDate} />
                          <YAxis {...CHART_AXIS_PROPS} />
                          <Tooltip content={<ChartTooltip labelFormatter={formatDateLabel} />} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Line connectNulls={false} type="monotone" dataKey="kpi_net_prod_moy_appareilles" name="Prod app." stroke="#2e90d9" strokeWidth={2.5} dot={{ r: 2 }} label={buildVisibleChartLabel()} />
                          <Line connectNulls={false} type="monotone" dataKey="kpi_net_prod_moy_operation" name="Prod op." stroke="#164b7e" strokeWidth={2.5} dot={{ r: 2 }} label={buildVisibleChartLabel()} />
                          <Line connectNulls={false} type="monotone" dataKey="kpi_utilisation_globale_pct" name="Utilisation %" stroke="#5fb0e8" strokeWidth={2.2} dot={{ r: 2 }} label={buildVisibleChartLabel()} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </SectionCard>
                  <DataTable
                    columns={[
                      { key: "date_rapport", label: "Date", render: (r: any) => formatDateLabel(r.date_rapport) },
                      { key: "kpi_net_prod_moy_appareilles", label: "Prod app.", align: "right", render: (r: any) => toNumber(r.kpi_net_prod_moy_appareilles).toFixed(1) },
                      { key: "kpi_net_prod_moy_operation", label: "Prod op.", align: "right", render: (r: any) => toNumber(r.kpi_net_prod_moy_operation).toFixed(1) },
                      { key: "kpi_teu_restant_operation", label: "TEU rest.", align: "right", render: (r: any) => formatInteger(r.kpi_teu_restant_operation) },
                      { key: "kpi_utilisation_globale_pct", label: "Util.", align: "right", render: (r: any) => formatPercent(r.kpi_utilisation_globale_pct) },
                      { key: "kpi_ttt_flag", label: "Flag" },
                    ]}
                    rows={[...yearScopedKpisData].reverse()}
                  />
                </div>
              )}

              {activeSegment === "attendus" && (
                <DataTable
                  columns={[
                    { key: "date_rapport", label: "Date", render: (r: any) => formatDateLabel(r.date_rapport) },
                    { key: "shipping", label: "Ligne", render: (r: any) => <ShippingBadge rawValue={r.shipping} /> },
                    { key: "nom_navire", label: "Navire" },
                    { key: "service", label: "Service" },
                    { key: "eta", label: "ETA" },
                    { key: "t_units_prevu", label: "T units", align: "right", render: (r: any) => formatInteger(r.t_units_prevu) },
                  ]}
                  rows={dashboardData.naviresAttendus}
                />
              )}

              {activeSegment === "appareilles" && (
                <DataTable
                  columns={[
                    { key: "date_rapport", label: "Date", render: (r: any) => formatDateLabel(r.date_rapport) },
                    { key: "shipping", label: "Ligne", render: (r: any) => <ShippingBadge rawValue={r.shipping} /> },
                    { key: "nom_navire", label: "Navire" },
                    { key: "service", label: "Service" },
                    { key: "atd", label: "ATD" },
                    { key: "net_prod", label: "Prod.", align: "right", render: (r: any) => toNumber(r.net_prod).toFixed(1) },
                  ]}
                  rows={dashboardData.naviresAppareilles}
                />
              )}

              {activeSegment === "operation" && (
                <DataTable
                  columns={[
                    { key: "date_rapport", label: "Date", render: (r: any) => formatDateLabel(r.date_rapport) },
                    { key: "shipping", label: "Ligne", render: (r: any) => <ShippingBadge rawValue={r.shipping} /> },
                    { key: "nom_navire", label: "Navire" },
                    { key: "service", label: "Service" },
                    { key: "rem_units", label: "Rem.", align: "right", render: (r: any) => formatInteger(r.rem_units) },
                    { key: "pct_complete", label: "Complet", align: "right", render: (r: any) => formatPercent(r.pct_complete) },
                  ]}
                  rows={dashboardData.naviresOperation}
                />
              )}

              {activeSegment === "escalesOps" && (
                <DataTable
                  columns={[
                    { key: "date_rapport", label: "Date", render: (r: any) => formatDateLabel(r.date_rapport) },
                    { key: "nom_navire", label: "Navire" },
                    { key: "import_total_teu", label: "Import", align: "right", render: (r: any) => formatInteger(r.import_total_teu) },
                    { key: "export_total_teu", label: "Export", align: "right", render: (r: any) => formatInteger(r.export_total_teu) },
                    { key: "transbo_total_teu", label: "Transbo", align: "right", render: (r: any) => formatInteger(r.transbo_total_teu) },
                  ]}
                  rows={dashboardData.operationsEscales}
                />
              )}

              {activeSegment === "parc" && (
                <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
                  <SectionCard title="Parc conteneurs" subtitle={`Utilise, disponible et taux depuis le 1er janvier ${selectedCumulYear}`}>
                    <div className="h-[380px] min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={yearScopedParcData}>
                          <CartesianGrid {...CHART_GRID_PROPS} />
                          <XAxis dataKey="date_rapport" {...CHART_AXIS_PROPS} tickFormatter={formatShortDate} />
                          <YAxis {...CHART_AXIS_PROPS} />
                          <Tooltip content={<ChartTooltip labelFormatter={formatDateLabel} />} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Line connectNulls={false} type="monotone" dataKey="parc_conteneurs_utilise" name="Utilise" stroke="#2e90d9" strokeWidth={2.5} dot={{ r: 2 }} label={buildVisibleChartLabel()} />
                          <Line connectNulls={false} type="monotone" dataKey="parc_conteneurs_disponible" name="Disponible" stroke="#164b7e" strokeWidth={2.5} dot={{ r: 2 }} label={buildVisibleChartLabel()} />
                          <Line connectNulls={false} type="monotone" dataKey="taux_occupation_parc" name="Tx %" stroke="#93cbf2" strokeWidth={2.2} dot={{ r: 2 }} label={buildVisibleChartLabel()} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </SectionCard>
                  <DataTable
                    columns={[
                      { key: "date_rapport", label: "Date", render: (r: any) => formatDateLabel(r.date_rapport) },
                      { key: "parc_conteneurs_utilise", label: "Utilise", align: "right", render: (r: any) => formatInteger(r.parc_conteneurs_utilise) },
                      { key: "parc_conteneurs_total", label: "Capacite", align: "right", render: (r: any) => formatInteger(r.parc_conteneurs_total) },
                      { key: "taux_occupation_parc", label: "Tx parc", align: "right", render: (r: any) => formatPercent(r.taux_occupation_parc) },
                      { key: "taux_occupation_reefers", label: "Tx reefer", align: "right", render: (r: any) => formatPercent(r.taux_occupation_reefers) },
                    ]}
                    rows={[...yearScopedParcData].reverse()}
                  />
                </div>
              )}

              {activeSegment === "rapport" && (
                <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
                  <SectionCard title="Rapport quotidien" subtitle={`Navires attendus, en operation, appareilles depuis le 1er janvier ${selectedCumulYear}`}>
                    <div className="h-[380px] min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={yearScopedRapportData}>
                          <CartesianGrid {...CHART_GRID_PROPS} />
                          <XAxis dataKey="date_rapport" {...CHART_AXIS_PROPS} tickFormatter={formatShortDate} />
                          <YAxis {...CHART_AXIS_PROPS} />
                          <Tooltip content={<ChartTooltip labelFormatter={formatDateLabel} />} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Bar dataKey="nb_navires_attendus" name="Attendus" fill="#164b7e" radius={[6, 6, 0, 0]} label={buildVisibleChartLabel({ position: "top" })} />
                          <Bar dataKey="nb_navires_en_operation" name="En operation" fill="#5fb0e8" radius={[6, 6, 0, 0]} label={buildVisibleChartLabel({ position: "top" })} />
                          <Bar dataKey="nb_navires_appareilles" name="Appareilles" fill="#2e90d9" radius={[6, 6, 0, 0]} label={buildVisibleChartLabel({ position: "top" })} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </SectionCard>
                  <DataTable
                    columns={[
                      { key: "date_rapport", label: "Date", render: (r: any) => formatDateLabel(r.date_rapport) },
                      { key: "document_numero", label: "Doc." },
                      { key: "nb_navires_appareilles", label: "App.", align: "right", render: (r: any) => formatInteger(r.nb_navires_appareilles) },
                      { key: "nb_navires_en_operation", label: "Op.", align: "right", render: (r: any) => formatInteger(r.nb_navires_en_operation) },
                      { key: "nb_navires_attendus", label: "Att.", align: "right", render: (r: any) => formatInteger(r.nb_navires_attendus) },
                    ]}
                    rows={[...yearScopedRapportData].reverse()}
                  />
                </div>
              )}
            </>

  );
}
