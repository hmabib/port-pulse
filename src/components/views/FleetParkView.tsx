/* eslint-disable @typescript-eslint/no-explicit-any */


export default function FleetParkView({ ctx }: { ctx: any }) {
  const { Activity, ArrowRightLeft, Bar, BarChart, CHART_AXIS_PROPS, CHART_GRID_PROPS, CartesianGrid, Cell, ChartTooltip, Container, DataBadge, DataTable, Legend, Line, LineChart, MapPinned, MetricCard, Pie, PieChart, ResponsiveContainer, SectionCard, ShippingBadge, Tooltip, Truck, XAxis, YAxis, armateurEscalesPie, buildVisibleChartLabel, dashboardData, exploitantsBreakdown, formatDateLabel, formatInteger, formatShortDate, latestDaily, latestExploitants, latestGate, parkFamilyMix, portDestinations, portOrigins, selectedCumulYear, toNumber, yearScopedDailyData } = ctx;
  return (
            <>
              {/* Navires top metrics */}
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <MetricCard label="Volume" value={formatInteger(latestDaily.total_teu)} tone="#2e90d9" icon={<Activity className="h-4 w-4" />} compact />
                <MetricCard label="Import" value={formatInteger(latestDaily.import_teu)} tone="#164b7e" icon={<ArrowRightLeft className="h-4 w-4" />} compact />
                <MetricCard label="Export" value={formatInteger(latestDaily.export_teu)} tone="#1d6fb8" icon={<ArrowRightLeft className="h-4 w-4" />} compact />
                <MetricCard label="Camions" value={formatInteger(latestGate.ttt_total_camions)} tone="#5fb0e8" icon={<Truck className="h-4 w-4" />} compact />
                <MetricCard label="Parc" value={formatInteger(latestDaily.parc_conteneurs_utilise)} tone="#93cbf2" icon={<Container className="h-4 w-4" />} compact />
              </div>

              {/* Navires attendus + appareilles */}
              <div className="grid gap-5 xl:grid-cols-2">
                <SectionCard title="Navires attendus" subtitle={<><DataBadge type="jour" /> ETA, service, ports et unites prevues</>}>
                  <DataTable
                    columns={[
                      { key: "nom_navire", label: "Navire" },
                      { key: "shipping", label: "Ligne", render: (r: any) => <ShippingBadge rawValue={r.shipping} /> },
                      { key: "service", label: "Service" },
                      { key: "last_port", label: "Last port" },
                      { key: "eta", label: "ETA" },
                      { key: "t_units_prevu", label: "Units", align: "right", render: (r: any) => formatInteger(r.t_units_prevu) },
                    ]}
                    rows={dashboardData.naviresAttendus}
                  />
                </SectionCard>
                <SectionCard title="Navires appareilles" subtitle={<><DataBadge type="jour" /> ATB, ATD, productivite et unites</>}>
                  <DataTable
                    columns={[
                      { key: "nom_navire", label: "Navire" },
                      { key: "shipping", label: "Ligne", render: (r: any) => <ShippingBadge rawValue={r.shipping} /> },
                      { key: "service", label: "Service" },
                      { key: "atb", label: "ATB" },
                      { key: "atd", label: "ATD" },
                      { key: "t_units", label: "Units", align: "right", render: (r: any) => formatInteger(r.t_units) },
                      { key: "net_prod", label: "Prod.", align: "right", render: (r: any) => `${toNumber(r.net_prod).toFixed(1)}` },
                    ]}
                    rows={dashboardData.naviresAppareilles}
                  />
                </SectionCard>
              </div>

              {/* Performance + escales */}
              <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
                <SectionCard title="Performance navires" subtitle="Productivite nette par navire">
                  <div className="h-[480px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dashboardData.naviresPerformance} layout="vertical">
                        <CartesianGrid {...CHART_GRID_PROPS} />
                        <XAxis type="number" {...CHART_AXIS_PROPS} />
                        <YAxis type="category" dataKey="nom_navire" {...CHART_AXIS_PROPS} width={120} tickFormatter={(v: any) => String(v).length > 16 ? `${String(v).slice(0, 16)}...` : String(v)} />
                        <Tooltip content={<ChartTooltip valueFormatter={(v: any) => `${toNumber(v).toFixed(1)} mvts/h`} />} />
                        <Bar dataKey="net_prod" fill="#2e90d9" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>

                <SectionCard title="Escales par armateur" subtitle="Repartition des escales realisees de la fiche courante">
                  <div className="h-[340px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={armateurEscalesPie}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={68}
                          outerRadius={118}
                          paddingAngle={2}
                          cornerRadius={4}
                          label={({ percent }: { percent?: number }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                        >
                          {armateurEscalesPie.map((item: any) => <Cell key={item.name} fill={item.color} />)}
                        </Pie>
                        <Tooltip content={<ChartTooltip valueFormatter={(v: any) => formatInteger(v)} />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 space-y-2">
                    {armateurEscalesPie.map((item: any) => (
                      <div key={item.name} className="flex items-center gap-2 text-sm">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-[var(--text-secondary)]">{item.name}</span>
                        <span className="ml-auto font-mono text-[var(--text-primary)]">{formatInteger(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </div>

              {/* Exploitants + Equipment */}
              <div className="grid gap-5 xl:grid-cols-2">
                <SectionCard title="Parc par ligne maritime" subtitle={`Repartition du stock occupe | total ${formatInteger(latestExploitants.exp_grand_total)} unites`}>
                  <div className="h-[360px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={exploitantsBreakdown}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={72}
                          outerRadius={126}
                          paddingAngle={2}
                          cornerRadius={4}
                          label={({ percent }: { percent?: number }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                        >
                          {exploitantsBreakdown.map((e: any) => <Cell key={e.name} fill={e.color} />)}
                        </Pie>
                        <Tooltip content={<ChartTooltip valueFormatter={(v: any) => formatInteger(v)} />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {exploitantsBreakdown.map((item: any) => (
                      <div key={item.name} className="flex items-center gap-2 text-sm">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-[var(--text-secondary)]">{item.name}</span>
                        <span className="ml-auto font-mono text-[var(--text-primary)]">{formatInteger(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </SectionCard>

                <SectionCard title="Composition du parc occupe" subtitle={`Le total correspond exactement au stock occupe (${formatInteger(latestExploitants.exp_grand_total)})`}>
                  <div className="h-[360px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={parkFamilyMix}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={72}
                          outerRadius={126}
                          paddingAngle={2}
                          cornerRadius={4}
                          label={({ percent }: { percent?: number }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                        >
                          {parkFamilyMix.map((item: any) => <Cell key={item.name} fill={item.color} />)}
                        </Pie>
                        <Tooltip content={<ChartTooltip valueFormatter={(v: any) => formatInteger(v)} />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 space-y-2">
                    {parkFamilyMix.map((item: any) => (
                      <div key={item.name} className="flex items-center gap-2 text-sm">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-[var(--text-secondary)]">{item.name}</span>
                        <span className="ml-auto font-mono text-[var(--text-primary)]">{formatInteger(item.value)}</span>
                      </div>
                    ))}
                    <p className="pt-2 text-[12px] text-[var(--text-muted)]">
                      Note : la source parc fournit une decomposition fiable par ligne maritime et par famille d&apos;equipement. Elle ne fournit pas un stock parc direct par plein/vide.
                    </p>
                  </div>
                </SectionCard>
              </div>

              {/* Ports + Cadence */}
              <div className="grid gap-5 xl:grid-cols-2">
                <SectionCard title="Ports amont / aval" subtitle="Origines et destinations">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <div className="mb-3 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                        <MapPinned className="h-3.5 w-3.5 text-[var(--cyan)]" />
                        <span className="font-medium">Last ports</span>
                      </div>
                      <div className="space-y-2">
                        {portOrigins.map((item: any, i: any) => (
                          <div key={item.port} className="flex items-center gap-3">
                            <span className="flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-[var(--text-muted)]">{i + 1}</span>
                            <span className="flex-1 text-sm text-[var(--text-primary)]">{item.port}</span>
                            <span className="font-mono text-sm text-[var(--cyan)]">{item.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="mb-3 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                        <MapPinned className="h-3.5 w-3.5 text-[var(--emerald)]" />
                        <span className="font-medium">Next ports</span>
                      </div>
                      <div className="space-y-2">
                        {portDestinations.map((item: any, i: any) => (
                          <div key={item.port} className="flex items-center gap-3">
                            <span className="flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-[var(--text-muted)]">{i + 1}</span>
                            <span className="flex-1 text-sm text-[var(--text-primary)]">{item.port}</span>
                            <span className="font-mono text-sm text-[var(--emerald)]">{item.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </SectionCard>

                <SectionCard title="Cadence d'execution" subtitle={`Camions, TTT et productivite depuis le 1er janvier ${selectedCumulYear}`}>
                  <div className="h-[360px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={yearScopedDailyData}>
                        <CartesianGrid {...CHART_GRID_PROPS} />
                        <XAxis dataKey="date_rapport" {...CHART_AXIS_PROPS} tickFormatter={formatShortDate} />
                        <YAxis {...CHART_AXIS_PROPS} />
                        <Tooltip content={<ChartTooltip labelFormatter={formatDateLabel} />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Line connectNulls={false} type="monotone" dataKey="ttt_total_camions" name="Camions" stroke="#164b7e" strokeWidth={2.5} dot={{ r: 2 }} label={buildVisibleChartLabel()} />
                            <Line connectNulls={false} type="monotone" dataKey="ttt_duree_minutes" name="TTT (min)" stroke="#5fb0e8" strokeWidth={2.5} dot={{ r: 2 }} label={buildVisibleChartLabel()} />
                            <Line connectNulls={false} type="monotone" dataKey="kpi_net_prod_moy_appareilles" name="Prod. nette" stroke="#2e90d9" strokeWidth={2.5} dot={{ r: 2 }} label={buildVisibleChartLabel()} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>
              </div>
            </>

  );
}
