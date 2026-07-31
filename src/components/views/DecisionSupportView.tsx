/* eslint-disable @typescript-eslint/no-explicit-any */

type GenericRow = Record<string, unknown>;

export default function DecisionSupportView({ ctx }: { ctx: any }) {
  const { Bar, CHART_AXIS_PROPS, CHART_GRID_PROPS, CartesianGrid, ChartTooltip, CheckCircle2, CorrelationBadge, DataTable, INTELLIGENCE_THRESHOLDS, InsightCard, Legend, Line, LineChart, ResponsiveContainer, Scatter, ScatterChart, SectionCard, Tooltip, XAxis, YAxis, ZAxis, allInsights, buildVisibleChartLabel, collapsedSections, congestedCalls, congestionVsOccupationCorrelation, congestionVsOccupationRows, congestionWaitThreshold, dailyAnalysis, describeCorrelationStrength, formatDateLabel, formatHours, formatInteger, formatMinutes, formatPercent, getCorrelationWarning, hasSufficientPearsonSample, intelligenceCriteria, intelligenceGuideSections, quayVsProductivityCorrelation, quayVsProductivityRows, strongestCorrelations, toNumber, toggleSection, underperformingCalls, waitingVsCongestionCorrelation, waitingVsCongestionRows } = ctx;
  return (
            <>
              <SectionCard
                id="intelligence-guide"
                title="Guide d'intelligence et de calcul"
                subtitle="Definition des modules, des modeles, des correlatons et des regles de calcul"
                collapsed={collapsedSections["intelligence-guide"]}
                onToggle={toggleSection}
              >
                <div className="grid gap-4 xl:grid-cols-2">
                  {intelligenceGuideSections.map((section: any) => (
                    <div key={section.title} className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface-hover)] p-4">
                      <p className="text-[14px] font-semibold text-[var(--text-primary)]">{section.title}</p>
                      <p className="mt-2 text-[12px] leading-5 text-[var(--text-secondary)]">{section.description}</p>
                      <div className="mt-3 space-y-2">
                        {section.bullets.map((bullet: any) => (
                          <div key={bullet} className="flex items-start gap-2 text-[12px] text-[var(--text-secondary)]">
                            <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--cyan)]" />
                            <span>{bullet}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>

              {/* Summary cards */}
              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-[var(--insight-critical-border)] bg-[var(--insight-critical-bg)] p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#f87171]">Critique</p>
                  <p className="mt-2 text-3xl font-bold text-[#f87171]">{allInsights.filter((i: any) => i.level === "critical").length}</p>
                </div>
                <div className="rounded-2xl border border-[var(--insight-warning-border)] bg-[var(--insight-warning-bg)] p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5fb0e8]">Attention</p>
                  <p className="mt-2 text-3xl font-bold text-[#5fb0e8]">{allInsights.filter((i: any) => i.level === "warning").length}</p>
                </div>
                <div className="rounded-2xl border border-[var(--insight-info-border)] bg-[var(--insight-info-bg)] p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#164b7e]">Information</p>
                  <p className="mt-2 text-3xl font-bold text-[#164b7e]">{allInsights.filter((i: any) => i.level === "info").length}</p>
                </div>
                <div className="rounded-2xl border border-[var(--insight-success-border)] bg-[var(--insight-success-bg)] p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#2e90d9]">Succes</p>
                  <p className="mt-2 text-3xl font-bold text-[#2e90d9]">{allInsights.filter((i: any) => i.level === "success").length}</p>
                </div>
              </div>

              <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                <SectionCard title="Criteres de croisement" subtitle="Lecture explicite de ce que l'intelligence compare">
                  <div className="grid gap-3 md:grid-cols-2">
                    {intelligenceCriteria.map((item: any) => (
                      <div key={item.critere} className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-hover)] p-4">
                        <p className="text-[13px] font-semibold text-[var(--text-primary)]">{item.critere}</p>
                        <p className="mt-1 text-[12px] text-[var(--text-secondary)]">{item.lecture}</p>
                      </div>
                    ))}
                  </div>
                </SectionCard>

                <SectionCard title="Correlations prioritaires" subtitle="Les liens les plus marquants entre indicateurs">
                  <div className="space-y-3">
                    {strongestCorrelations.map((ca: any, index: any) => (
                      <div key={`${ca.title}-${index}`} className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-hover)] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[13px] font-semibold text-[var(--text-primary)]">{ca.title}</p>
                          <CorrelationBadge value={ca.correlation} />
                        </div>
                        <p className="mt-2 text-[12px] text-[var(--text-secondary)]">
                          {ca.correlation >= 0
                            ? `${ca.xLabel} et ${ca.yLabel} montent ensemble.`
                            : `${ca.xLabel} et ${ca.yLabel} evoluent en sens inverse.`}
                        </p>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </div>

              {/* All insights */}
              <SectionCard title="Toutes les detections" subtitle={`${allInsights.length} insight(s) aggrege(s) depuis les analyses`}>
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {allInsights.length === 0 ? (
                    <div className="py-8 text-center">
                      <CheckCircle2 className="mx-auto h-10 w-10 text-[var(--emerald)]" />
                      <p className="mt-3 text-[var(--text-secondary)]">Toutes les metriques sont dans les seuils normaux. Aucune anomalie detectee.</p>
                    </div>
                  ) : (
                    allInsights.map((ins: any) => <InsightCard key={ins.id} insight={ins} />)
                  )}
                </div>
              </SectionCard>

              <div className="grid gap-5 xl:grid-cols-2">
                <SectionCard title="Congestions detectees avant quai" subtitle={`Attente ATA→ATB >= ${congestionWaitThreshold.toFixed(1)} h : congestion, indisponibilite poste ou file d'attente avant quai`}>
                  <DataTable
                    columns={[
                      { key: "dateRapport", label: "Date", render: (r: any) => formatDateLabel(r.dateRapport) },
                      { key: "vesselName", label: "Navire" },
                      { key: "voyage", label: "Voyage" },
                      { key: "shipping", label: "Ligne" },
                      { key: "loaBucket", label: "LOA" },
                      { key: "ataText", label: "ATA" },
                      { key: "atbText", label: "ATB" },
                      { key: "waitHours", label: "ATA→ATB", align: "right", render: (r: any) => formatHours(r.waitHours) },
                    ]}
                    rows={congestedCalls as unknown as GenericRow[]}
                    compact
                    maxHeight="360px"
                  />
                </SectionCard>

                <SectionCard title="Navires sous-performes" subtitle={`Sous-performe = productivite < ${(INTELLIGENCE_THRESHOLDS.underperformingLoaRatio * 100).toFixed(0)}% de la moyenne de son type de navire (classe LOA)`}>
                  <DataTable
                    columns={[
                      { key: "dateRapport", label: "Date", render: (r: any) => formatDateLabel(r.dateRapport) },
                      { key: "vesselName", label: "Navire" },
                      { key: "voyage", label: "Voyage" },
                      { key: "shipping", label: "Ligne" },
                      { key: "loaBucket", label: "LOA" },
                      { key: "units", label: "Units", align: "right", render: (r: any) => formatInteger(r.units) },
                      { key: "productivity", label: "Prod.", align: "right", render: (r: any) => `${toNumber(r.productivity).toFixed(1)} mvts/h` },
                      { key: "loaAverageProductivity", label: "Moy. type", align: "right", render: (r: any) => `${toNumber(r.loaAverageProductivity).toFixed(1)} mvts/h` },
                      { key: "performanceGapPct", label: "Ecart", align: "right", render: (r: any) => `${toNumber(r.performanceGapPct).toFixed(1)}%` },
                      { key: "operationHours", label: "ATB→ATC", align: "right", render: (r: any) => formatHours(r.operationHours) },
                    ]}
                    rows={underperformingCalls as unknown as GenericRow[]}
                    compact
                    maxHeight="360px"
                  />
                </SectionCard>
              </div>

              <div className="grid gap-5 xl:grid-cols-3">
                <SectionCard
                  title="Congestion vs occupation parc"
                  subtitle={hasSufficientPearsonSample(congestionVsOccupationRows.length)
                    ? `Correlation ${describeCorrelationStrength(congestionVsOccupationCorrelation)} (${congestionVsOccupationCorrelation.toFixed(2)}) entre attente moyenne congestionnee et taux moyen du parc`
                    : "Echantillon insuffisant pour calculer une correlation fiable"}
                >
                  <div className="h-[280px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart>
                        <CartesianGrid {...CHART_GRID_PROPS} />
                        <XAxis
                          type="number"
                          dataKey="x"
                          name="Congestion"
                          unit=" h"
                          {...CHART_AXIS_PROPS}
                        />
                        <YAxis
                          type="number"
                          dataKey="y"
                          name="Occupation parc"
                          unit="%"
                          {...CHART_AXIS_PROPS}
                        />
                        <ZAxis dataKey="waitingCount" range={[60, 250]} />
                        <Tooltip
                          content={<ChartTooltip valueFormatter={(value: any, name: any) => String(name).includes("Occupation") ? formatPercent(value) : formatHours(value)} />}
                        />
                        <Scatter data={congestionVsOccupationRows} fill="#93cbf2" />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="mt-3 text-[12px] text-[var(--text-secondary)]">
                    Lecture : plus la duree moyenne de congestion avant quai augmente, plus le parc a tendance a se tendre
                    {congestionVsOccupationCorrelation >= 0 ? "." : " inversement."}
                  </p>
                  {getCorrelationWarning(congestionVsOccupationRows.length) && (
                    <p className="mt-2 text-[12px] text-amber-400">{getCorrelationWarning(congestionVsOccupationRows.length)}</p>
                  )}
                </SectionCard>

                <SectionCard
                  title="Productivite quai vs duree a quai"
                  subtitle={hasSufficientPearsonSample(quayVsProductivityRows.length)
                    ? `Correlation ${describeCorrelationStrength(quayVsProductivityCorrelation)} (${quayVsProductivityCorrelation.toFixed(2)}) entre productivite nette et temps passe a quai`
                    : "Echantillon insuffisant pour calculer une correlation fiable"}
                >
                  <div className="h-[280px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart>
                        <CartesianGrid {...CHART_GRID_PROPS} />
                        <XAxis type="number" dataKey="x" name="Duree a quai" unit=" h" {...CHART_AXIS_PROPS} />
                        <YAxis type="number" dataKey="y" name="Productivite" {...CHART_AXIS_PROPS} />
                        <Tooltip
                          content={<ChartTooltip valueFormatter={(value: any, name: any) => String(name).includes("Duree") ? formatHours(value) : `${toNumber(value).toFixed(1)} mvts/h`} />}
                        />
                        <Scatter data={quayVsProductivityRows} fill="#2e90d9" />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="mt-3 text-[12px] text-[var(--text-secondary)]">
                    Lecture : une correlation negative signifie qu&apos;une meilleure productivite nette contribue a reduire la duree moyenne a quai.
                  </p>
                  {getCorrelationWarning(quayVsProductivityRows.length) && (
                    <p className="mt-2 text-[12px] text-amber-400">{getCorrelationWarning(quayVsProductivityRows.length)}</p>
                  )}
                </SectionCard>

                <SectionCard
                  title="Navires en attente vs taux de congestion"
                  subtitle={hasSufficientPearsonSample(waitingVsCongestionRows.length)
                    ? `Correlation ${describeCorrelationStrength(waitingVsCongestionCorrelation)} (${waitingVsCongestionCorrelation.toFixed(2)}) entre volume d'attente et poids mensuel de la congestion`
                    : "Echantillon insuffisant pour calculer une correlation fiable"}
                >
                  <div className="h-[280px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={waitingVsCongestionRows}>
                        <CartesianGrid {...CHART_GRID_PROPS} />
                        <XAxis dataKey="moisLabel" {...CHART_AXIS_PROPS} />
                        <YAxis yAxisId="left" {...CHART_AXIS_PROPS} />
                        <YAxis yAxisId="right" orientation="right" {...CHART_AXIS_PROPS} />
                        <Tooltip
                          content={<ChartTooltip valueFormatter={(value: any, name: any) => String(name).includes("Taux") ? formatPercent(value) : formatInteger(value)} />}
                        />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar yAxisId="left" dataKey="waitingCount" name="Navires en attente" fill="#1d6fb8" radius={[4, 4, 0, 0]} label={buildVisibleChartLabel({ position: "top" })} />
                        <Line connectNulls={false} yAxisId="right" type="monotone" dataKey="congestionRate" name="Taux de congestion" stroke="#5fb0e8" strokeWidth={2.5} dot={{ r: 3 }} label={buildVisibleChartLabel()} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="mt-3 text-[12px] text-[var(--text-secondary)]">
                    Taux de congestion = part des escales du mois dont l&apos;attente ATA→ATB depasse {congestionWaitThreshold.toFixed(1)} h.
                  </p>
                  {getCorrelationWarning(waitingVsCongestionRows.length) && (
                    <p className="mt-2 text-[12px] text-amber-400">{getCorrelationWarning(waitingVsCongestionRows.length)}</p>
                  )}
                </SectionCard>
              </div>

              <div className="grid gap-5 xl:grid-cols-3">
                <SectionCard title="Serie mensuelle congestion / parc" subtitle="Base mois 2026 consolides">
                  <DataTable
                    columns={[
                      { key: "moisLabel", label: "Mois" },
                      { key: "avgCongestionHours", label: "Congestion", align: "right", render: (r: any) => formatHours(r.avgCongestionHours) },
                      { key: "occupancyAvg", label: "Occ. parc", align: "right", render: (r: any) => formatPercent(r.occupancyAvg) },
                      { key: "waitingCount", label: "Attente", align: "right", render: (r: any) => formatInteger(r.waitingCount) },
                    ]}
                    rows={congestionVsOccupationRows as unknown as GenericRow[]}
                    compact
                    maxHeight="280px"
                  />
                </SectionCard>
                <SectionCard title="Serie mensuelle quai / productivite" subtitle="Moyennes des escales terminees">
                  <DataTable
                    columns={[
                      { key: "moisLabel", label: "Mois" },
                      { key: "quayHours", label: "Duree a quai", align: "right", render: (r: any) => formatHours(r.quayHours) },
                      { key: "productivity", label: "Prod nette", align: "right", render: (r: any) => `${toNumber(r.productivity).toFixed(1)} mvts/h` },
                    ]}
                    rows={quayVsProductivityRows as unknown as GenericRow[]}
                    compact
                    maxHeight="280px"
                  />
                </SectionCard>
                <SectionCard title="Serie mensuelle attente / congestion" subtitle="Escales terminees a la cle voyage">
                  <DataTable
                    columns={[
                      { key: "moisLabel", label: "Mois" },
                      { key: "waitingCount", label: "Navires en attente", align: "right", render: (r: any) => formatInteger(r.waitingCount) },
                      { key: "congestionRate", label: "Taux congestion", align: "right", render: (r: any) => formatPercent(r.congestionRate) },
                    ]}
                    rows={waitingVsCongestionRows as unknown as GenericRow[]}
                    compact
                    maxHeight="280px"
                  />
                </SectionCard>
              </div>

              {/* Derived indicators */}
              <div className="grid gap-5 xl:grid-cols-2">
                <SectionCard title="Indicateurs derives" subtitle="Productivite reelle et efficacite operationnelle">
                  <div className="space-y-4">
                    {dailyAnalysis && (
                      <>
                        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-hover)] p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">Productivite reelle</p>
                              <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{dailyAnalysis.productivity.toFixed(1)} <span className="text-sm text-[var(--text-muted)]">mvts/h</span></p>
                            </div>
                            <div className={`rounded-full px-3 py-1 text-[12px] font-medium ${dailyAnalysis.productivity >= INTELLIGENCE_THRESHOLDS.productivityWarningMvtsPerHour ? "bg-emerald-500/10 text-[var(--emerald)]" : "bg-rose-500/10 text-rose-400"}`}>
                              {dailyAnalysis.productivity >= INTELLIGENCE_THRESHOLDS.productivityWarningMvtsPerHour ? "Conforme" : "Faible"}
                            </div>
                          </div>
                        </div>
                        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-hover)] p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">Efficacite operationnelle</p>
                              <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{dailyAnalysis.realisationPct.toFixed(1)}<span className="text-sm text-[var(--text-muted)]">%</span></p>
                            </div>
                            <div className={`rounded-full px-3 py-1 text-[12px] font-medium ${dailyAnalysis.realisationPct >= INTELLIGENCE_THRESHOLDS.budgetTargetPct ? "bg-emerald-500/10 text-[var(--emerald)]" : dailyAnalysis.realisationPct >= INTELLIGENCE_THRESHOLDS.operationalWarningPct ? "bg-amber-500/10 text-amber-400" : "bg-rose-500/10 text-rose-400"}`}>
                              {dailyAnalysis.realisationPct >= INTELLIGENCE_THRESHOLDS.budgetTargetPct ? "Optimal" : dailyAnalysis.realisationPct >= INTELLIGENCE_THRESHOLDS.operationalWarningPct ? "Acceptable" : "Sous-performance"}
                            </div>
                          </div>
                        </div>
                        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-hover)] p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">Charge parc</p>
                              <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{dailyAnalysis.occupancyPct.toFixed(1)}<span className="text-sm text-[var(--text-muted)]">%</span></p>
                            </div>
                            <div className={`rounded-full px-3 py-1 text-[12px] font-medium ${dailyAnalysis.occupancyPct >= INTELLIGENCE_THRESHOLDS.parkCriticalPct ? "bg-rose-500/10 text-rose-400" : dailyAnalysis.occupancyPct >= INTELLIGENCE_THRESHOLDS.parkWarningPct ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-[var(--emerald)]"}`}>
                              {dailyAnalysis.occupancyPct >= INTELLIGENCE_THRESHOLDS.parkCriticalPct ? "Saturation" : dailyAnalysis.occupancyPct >= INTELLIGENCE_THRESHOLDS.parkWarningPct ? "Tension" : "Fluide"}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </SectionCard>

                <SectionCard title="Suggestions automatiques" subtitle="Recommandations basees sur les donnees">
                  <div className="space-y-4">
                    {dailyAnalysis && dailyAnalysis.occupancyPct >= INTELLIGENCE_THRESHOLDS.parkWarningPct && (
                      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                        <p className="text-[13px] font-semibold text-amber-400">Risque de saturation parc</p>
                        <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
                          Le taux d&apos;occupation du parc est a {dailyAnalysis.occupancyPct.toFixed(1)}%. Envisager une acceleration des livraisons sortantes ou une extension des horaires gate.
                        </p>
                      </div>
                    )}
                    {dailyAnalysis && dailyAnalysis.realisationPct < INTELLIGENCE_THRESHOLDS.budgetWarningPct && dailyAnalysis.realisationPct > 0 && (
                      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
                        <p className="text-[13px] font-semibold text-blue-400">Activite faible vs forecast</p>
                        <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
                          Ecart de {Math.abs(dailyAnalysis.gapVsForecast).toLocaleString("fr-FR")} TEU par rapport au budget. Verifier les escales prevues et les retards potentiels.
                        </p>
                      </div>
                    )}
                    {dailyAnalysis && dailyAnalysis.tttMinutes > 60 && (
                      <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
                        <p className="text-[13px] font-semibold text-violet-400">TTT eleve</p>
                        <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
                          Le temps de rotation des camions est de {formatMinutes(dailyAnalysis.tttMinutes)}. Verifier la fluidite du processus gate et les causes de congestion.
                        </p>
                      </div>
                    )}
                    {dailyAnalysis && dailyAnalysis.realisationPct >= INTELLIGENCE_THRESHOLDS.budgetTargetPct && (
                      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                        <p className="text-[13px] font-semibold text-[var(--emerald)]">Performance optimale</p>
                        <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
                          Objectifs budgetaires atteints ou depasses. Maintenir le rythme operationnel actuel.
                        </p>
                      </div>
                    )}
                    {(!dailyAnalysis || (dailyAnalysis.occupancyPct < INTELLIGENCE_THRESHOLDS.parkWarningPct && dailyAnalysis.realisationPct >= INTELLIGENCE_THRESHOLDS.budgetWarningPct && dailyAnalysis.tttMinutes <= 60)) && (
                      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                        <p className="text-[13px] font-semibold text-[var(--emerald)]">Operations normales</p>
                        <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
                          Tous les indicateurs sont dans les normes. Aucune action corrective necessaire.
                        </p>
                      </div>
                    )}
                  </div>
                </SectionCard>
              </div>

            </>

  );
}
