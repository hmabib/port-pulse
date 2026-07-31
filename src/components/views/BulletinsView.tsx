/* eslint-disable @typescript-eslint/no-explicit-any */

type GenericRow = Record<string, unknown>;

export default function BulletinsView({ ctx }: { ctx: any }) {
  const { Bar, BarChart, BulletinManager, CHART_AXIS_PROPS, CHART_GRID_PROPS, CartesianGrid, ChartTooltip, DataTable, JitStatusBadge, Legend, Line, LineChart, ProgressBar, ResponsiveContainer, SectionCard, Tooltip, XAxis, YAxis, activeBulletin, armateurProgress, buildVisibleChartLabel, bulletinCapacityAlerts, bulletinOperationPredictions, collapsedSections, formatDateLabel, formatDateTimeCompact, formatInteger, formatMinutes, formatMonthAxisLabel, formatPercent, formatShortDate, isJustInTime, monthlyBulletin, router, selectedBulletin, setSelectedBulletin, toNumber, toggleSection, weekdayAverages, yearScopedDailyData } = ctx;
  return (
            <>
              {/* Bulletin selector */}
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Bulletin</span>
                  <select
                    value={selectedBulletin}
                    onChange={(e) => setSelectedBulletin(e.target.value)}
                    className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--input-bg)] px-4 py-2.5 text-[13px] text-[var(--text-primary)] outline-none transition focus:border-[var(--cyan)]/40 focus:ring-1 focus:ring-[var(--cyan)]/20 sm:min-w-[360px] lg:min-w-[520px]"
                  >
                    {monthlyBulletin.slice().reverse().map((b: any) => (
                      <option key={b.anneeMois} value={b.anneeMois}>
                        {b.moisLabel} {b.annee} | Bulletin affiche : {formatDateLabel(b.latestDate)}
                      </option>
                    ))}
                  </select>
                </div>
                {activeBulletin && (
                  <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-3 text-[13px] text-[var(--text-secondary)]">
                    <span className="font-medium text-[var(--text-primary)]">Date du bulletin affiche :</span>{" "}
                    <strong>{formatDateLabel(activeBulletin.latestDate)}</strong>
                  </div>
                )}
              </div>

              {/* Bulletin headline cards */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 theme-transition">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Mois selectionne</p>
                  <p className="mt-2 text-xl font-bold text-[var(--text-primary)]">
                    {activeBulletin ? `${activeBulletin.moisLabel} ${activeBulletin.annee}` : "—"}
                  </p>
                  <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
                    Dernier point : {activeBulletin ? formatDateLabel(activeBulletin.latestDate) : "—"}
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 theme-transition">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Realise / Budget</p>
                  <p className="mt-2 text-xl font-bold text-[var(--text-primary)]">
                    {activeBulletin ? formatInteger(activeBulletin.realized) : "0"}
                    <span className="mx-1 text-[var(--text-muted)]">/</span>
                    <span className="text-[var(--text-secondary)]">{activeBulletin ? formatInteger(activeBulletin.budget) : "0"}</span>
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 theme-transition">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Camions cumules / TTT moyen</p>
                  <p className="mt-2 text-xl font-bold text-[var(--text-primary)]">
                    {activeBulletin ? formatInteger(activeBulletin.gateCamionsSum) : "0"}
                    <span className="ml-2 text-base text-[var(--text-secondary)]">
                      TTT {activeBulletin ? formatMinutes(activeBulletin.tttAverage) : "00:00"}
                    </span>
                  </p>
                </div>
              </div>

              {/* Bulletin chart */}
              <SectionCard
                id="bulletin-chart"
                title="Evolution mensuelle"
                subtitle="Realise vs budget par mois"
                collapsed={collapsedSections["bulletin-chart"]}
                onToggle={toggleSection}
              >
                <div className="h-[400px] min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyBulletin}>
                      <CartesianGrid {...CHART_GRID_PROPS} />
                      <XAxis dataKey="anneeMois" {...CHART_AXIS_PROPS} tickFormatter={formatMonthAxisLabel} interval={0} angle={-18} textAnchor="end" height={60} />
                      <YAxis {...CHART_AXIS_PROPS} />
                      <Tooltip content={<ChartTooltip labelFormatter={formatMonthAxisLabel} valueFormatter={(v: any) => formatInteger(v)} />} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="realized" name="Realise" fill="#2e90d9" radius={[6, 6, 0, 0]} label={buildVisibleChartLabel({ position: "top" })} />
                      <Bar dataKey="budget" name="Budget" fill="#164b7e" radius={[6, 6, 0, 0]} label={buildVisibleChartLabel({ position: "top" })} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </SectionCard>

              {/* Bulletin sub-sections */}
              <div className="grid gap-5 xl:grid-cols-3">
                <SectionCard
                  id="bulletin-weekday"
                  title="Camions par jour de semaine"
                  subtitle="Moyenne des mouvements gate et du TTT"
                  collapsed={collapsedSections["bulletin-weekday"]}
                  onToggle={toggleSection}
                >
                  <div className="h-[320px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weekdayAverages}>
                        <CartesianGrid {...CHART_GRID_PROPS} />
                        <XAxis dataKey="name" {...CHART_AXIS_PROPS} angle={-18} textAnchor="end" height={60} />
                        <YAxis {...CHART_AXIS_PROPS} />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="camions" name="Mvts moy." fill="#164b7e" radius={[6, 6, 0, 0]} label={buildVisibleChartLabel({ position: "top" })} />
                        <Bar dataKey="ttt" name="TTT (min)" fill="#5fb0e8" radius={[6, 6, 0, 0]} label={buildVisibleChartLabel({ position: "top" })} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>

                <SectionCard
                  id="bulletin-occupation"
                  title="Occupation & reefers"
                  subtitle="Taux de remplissage parc et reefers"
                  collapsed={collapsedSections["bulletin-occupation"]}
                  onToggle={toggleSection}
                >
                  <div className="h-[320px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={yearScopedDailyData}>
                        <CartesianGrid {...CHART_GRID_PROPS} />
                        <XAxis dataKey="date_rapport" {...CHART_AXIS_PROPS} tickFormatter={formatShortDate} />
                        <YAxis {...CHART_AXIS_PROPS} />
                        <Tooltip content={<ChartTooltip labelFormatter={formatDateLabel} valueFormatter={(v: any) => `${toNumber(v).toFixed(1)}%`} />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Line connectNulls={false} type="monotone" dataKey="taux_occupation_parc" name="Parc" stroke="#2e90d9" strokeWidth={2.5} dot={{ r: 2 }} label={buildVisibleChartLabel()} />
                        <Line connectNulls={false} type="monotone" dataKey="taux_occupation_reefers" name="Reefers" stroke="#93cbf2" strokeWidth={2.5} dot={{ r: 2 }} label={buildVisibleChartLabel()} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>

                <SectionCard
                  id="bulletin-escales"
                  title="Escales par armateur"
                  subtitle="Prevu vs realise"
                  collapsed={collapsedSections["bulletin-escales"]}
                  onToggle={toggleSection}
                >
                  <div className="space-y-4">
                    {armateurProgress.map((item: any) => (
                      <ProgressBar key={item.name} label={item.name} done={item.done} planned={item.planned} color={item.color} />
                    ))}
                  </div>
                </SectionCard>
              </div>

              <SectionCard
                id="bulletin-capacity-alerts"
                title="Alertes capacite terminal"
                subtitle="Confrontation entre reste a decharger, navires attendus et places disponibles"
                collapsed={collapsedSections["bulletin-capacity-alerts"]}
                onToggle={toggleSection}
              >
                <div className="grid gap-3 md:grid-cols-3">
                  {bulletinCapacityAlerts.map((alert: any) => (
                    <div
                      key={alert.id}
                      className={`rounded-xl border p-4 ${
                        alert.level === "critical"
                          ? "border-rose-500/25 bg-rose-500/8"
                          : alert.level === "warning"
                            ? "border-amber-500/25 bg-amber-500/8"
                            : "border-sky-500/25 bg-sky-500/8"
                      }`}
                    >
                      <p className={`text-[13px] font-semibold ${
                        alert.level === "critical"
                          ? "text-rose-400"
                          : alert.level === "warning"
                            ? "text-amber-400"
                            : "text-sky-400"
                      }`}>{alert.title}</p>
                      <p className="mt-1 text-[12px] text-[var(--text-secondary)]">{alert.description}</p>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard
                id="bulletin-ops-projection"
                title="Navires en operation : projection de sortie"
                subtitle="Projection sur le bulletin affiche, avec ajustement sur l'historique des escales terminees"
                collapsed={collapsedSections["bulletin-ops-projection"]}
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
                    {
                      key: "projectedCompletion",
                      label: "Fin estimee",
                      render: (r: any) => (
                        <div className="flex items-center gap-2">
                          <span>{formatDateTimeCompact(r.projectedCompletion as Date | null)}</span>
                          {isJustInTime(r) && (
                            <JitStatusBadge active />
                          )}
                        </div>
                      ),
                    },
                    { key: "projectedDeparture", label: "Sortie estimee", render: (r: any) => formatDateTimeCompact(r.projectedDeparture as Date | null) },
                  ]}
                  rows={bulletinOperationPredictions as unknown as GenericRow[]}
                  compact
                />
              </SectionCard>

              {/* Bulletin table */}
              <SectionCard
                id="bulletin-table"
                title="Tableau mensuel"
                subtitle="Cumuls gate et moyennes journalieres recalcules"
                collapsed={collapsedSections["bulletin-table"]}
                onToggle={toggleSection}
              >
                <DataTable
                  columns={[
                    { key: "anneeMois", label: "Mois" },
                    { key: "realized", label: "Realise", align: "right", render: (r: any) => formatInteger(r.realized) },
                    { key: "budget", label: "Budget", align: "right", render: (r: any) => formatInteger(r.budget) },
                    { key: "gateCamionsSum", label: "Camions", align: "right", render: (r: any) => formatInteger(r.gateCamionsSum) },
                    { key: "gateMovementsSum", label: "Mvts", align: "right", render: (r: any) => formatInteger(r.gateMovementsSum) },
                    { key: "tttAverage", label: "TTT", align: "right", render: (r: any) => formatMinutes(r.tttAverage) },
                    { key: "occupationAverage", label: "Parc %", align: "right", render: (r: any) => formatPercent(r.occupationAverage) },
                  ]}
                  rows={monthlyBulletin as unknown as GenericRow[]}
                />
              </SectionCard>

              {/* Bulletin management: duplicate detection & deletion */}
              <SectionCard
                id="bulletin-manage"
                title="Gestion des bulletins"
                subtitle="Doublons detectes et suppression"
                collapsed={collapsedSections["bulletin-manage"]}
                onToggle={toggleSection}
              >
                <BulletinManager onDeleted={() => router.refresh()} />
              </SectionCard>
            </>

  );
}
