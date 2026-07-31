/* eslint-disable @typescript-eslint/no-explicit-any */

type GenericRow = Record<string, unknown>;

export default function PilotageView({ ctx }: { ctx: any }) {
  const { Activity, ArrowRightLeft, BAR_VALUE_LABEL, Bar, BarChart, CHART_AXIS_PROPS, CHART_GRID_PROPS, CalendarRange, CartesianGrid, ChartTooltip, Container, DataBadge, DataTable, Gauge, JitStatusBadge, LabelList, Legend, Line, LineChart, MetricCard, OccupancyGauge, ProgressBar, ResponsiveContainer, SectionCard, Ship, ShippingBadge, Tooltip, Truck, XAxis, YAxis, buildArmateurProgress, exportReceptionRate, formatChartExportLabel, formatDateLabel, formatDateTimeCompact, formatDateTimeLabel, formatInteger, formatMinutes, formatPercent, formatShortDate, formatSignedInteger, gateContainersPerTruck, gateFlowTrend, gateFullShare, gateInboundShare, gateOutboundShare, getProductivityAppreciation, isJustInTime, isPngExporting, naviresAppareillesUnits, naviresAttendusUnits, naviresOperationCompletion, naviresOperationRemaining, naviresOperationUnits, occupancyDelta, occupancyTrend, parcAvailabilityPct, parcDelta, pleinsParcTotal, reeferAvailabilityPct, reeferDelta, shippingPerformance, situationAppareilles, situationArmateurs, situationAttendus, situationCollectedAt, situationDaily, situationEscales, situationExploitants, situationGate, situationKpi, situationOperation, situationOperationRowsEnriched, situationParc, situationRecoveryDate, situationReferenceDate, toNumber, transboBalance, yardLineRows } = ctx;
  return (
            <>
              <SectionCard title="Rapport & synthese" subtitle={<><DataBadge type="jour" /> Date du bulletin, volumes globaux et lecture immediate de la situation</>}>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                  <MetricCard label="Date bulletin" value={formatDateLabel(situationReferenceDate)} tone="#10304f" hint={`Recup. ${formatDateLabel(situationRecoveryDate)} | Charge le ${formatDateTimeLabel(situationCollectedAt)}`} icon={<CalendarRange className="h-4 w-4" />} compact />
                  <MetricCard label="Volume total" value={formatInteger(situationDaily.total_teu)} tone="#2e90d9" hint={`Realisation ${formatPercent(situationDaily.taux_realisation_total_pct)} | Util. globale ${formatPercent(situationKpi.kpi_utilisation_globale_pct)}`} icon={<Activity className="h-4 w-4" />} compact />
                  <MetricCard label="Vides TEU" value={formatInteger(situationDaily.vides_teu)} tone="#93cbf2" hint={`Import ${formatInteger(situationDaily.import_teu)} | Export ${formatInteger(situationDaily.export_teu)}`} icon={<ArrowRightLeft className="h-4 w-4" />} compact />
                  <MetricCard label="Pleins sur parc" value={formatInteger(pleinsParcTotal)} tone="#2e90d9" hint={`Std+HC ${formatInteger(toNumber(situationExploitants.total_20std) + toNumber(situationExploitants.total_40std) + toNumber(situationExploitants.total_40htc))} | Speciaux ${formatInteger(toNumber(situationExploitants.total_20spe) + toNumber(situationExploitants.total_40spe))}`} icon={<Container className="h-4 w-4" />} compact />
                  <MetricCard label="Exports recu / prevu" value={formatPercent(exportReceptionRate)} tone="#5fb0e8" hint={`${formatInteger(situationDaily.exports_total_reception)} / ${formatInteger(situationDaily.exports_total_prevision)} TEU | Recu ${formatInteger(situationDaily.exports_total_teu)} TEU`} icon={<ArrowRightLeft className="h-4 w-4" />} compact />
                  <MetricCard label="Navires actifs" value={formatInteger(situationOperation.length || situationDaily.nb_navires_en_operation)} tone="#1d6fb8" hint={`${formatInteger(situationAttendus.length || situationDaily.nb_navires_attendus)} att. | ${formatInteger(situationAppareilles.length || situationDaily.nb_navires_appareilles)} app.`} icon={<Ship className="h-4 w-4" />} compact />
                </div>
              </SectionCard>

              <SectionCard title="Gate & terrestre" subtitle={<><DataBadge type="jour" /> TTT, camions, conteneurs, entrees et sorties pour la journee</>}>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                  <MetricCard label="TTT" value={formatMinutes(situationGate.ttt_duree_minutes)} tone="#fbbf24" hint={`${formatInteger(situationGate.ttt_total_camions)} camions | ${formatInteger(situationGate.ttt_total_conteneurs)} conteneurs`} icon={<Gauge className="h-4 w-4" />} compact />
                  <MetricCard label="Camions / conteneurs" value={`${formatInteger(situationGate.ttt_total_camions)} / ${formatInteger(situationGate.ttt_total_conteneurs)}`} tone="#1d6fb8" hint={`${gateContainersPerTruck.toFixed(2)} cont./camion | ${formatInteger(situationGate.gate_total_mouvements)} mvts`} icon={<Truck className="h-4 w-4" />} compact />
                  <MetricCard label="Entrees gate" value={formatPercent(gateInboundShare)} tone="#1d6fb8" hint={`${formatInteger(situationGate.gate_total_entrees)} entrees | Pleins ${formatPercent(situationKpi.kpi_gate_ratio_pleins_entrees_pct)}`} icon={<Truck className="h-4 w-4" />} compact />
                  <MetricCard label="Sorties gate" value={formatPercent(gateOutboundShare)} tone="#5fb0e8" hint={`${formatInteger(situationGate.gate_total_sorties)} sorties / ${formatInteger(situationGate.gate_total_mouvements)} mvts`} icon={<Truck className="h-4 w-4" />} compact />
                  <MetricCard label="Plein dans les mvts" value={formatPercent(gateFullShare)} tone="#93cbf2" hint={`Entrees pleins ${formatInteger(situationGate.gate_entrees_pleins)} | Sorties pleins ${formatInteger(situationGate.gate_sorties_pleins)}`} icon={<ArrowRightLeft className="h-4 w-4" />} compact />
                  <MetricCard label="Imports detail" value={formatInteger(situationDaily.imports_total_teu)} tone="#164b7e" hint={`${formatInteger(situationDaily.imports_total_tc)} TC | ${formatInteger(situationEscales.length)} escales suivies`} icon={<Ship className="h-4 w-4" />} compact />
                </div>
              </SectionCard>

              <SectionCard title="Parc & reefers" subtitle={<><DataBadge type="jour" /> Occupation, disponibilite et saturation du parc conteneurs</>}>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <MetricCard label="Tx occupation parc" value={formatPercent(situationParc.taux_occupation_parc)} tone="#164b7e" hint={`Variation ${occupancyDelta >= 0 ? "+" : ""}${occupancyDelta.toFixed(1)} pt`} icon={<Container className="h-4 w-4" />} compact />
                  <MetricCard label="Tx occupation reefer" value={formatPercent(situationParc.taux_occupation_reefers)} tone="#5fb0e8" hint={`Variation ${reeferDelta >= 0 ? "+" : ""}${reeferDelta.toFixed(1)} pt`} icon={<Gauge className="h-4 w-4" />} compact />
                  <MetricCard label="Disponibilite parc" value={formatPercent(parcAvailabilityPct)} tone="#c2e1f8" hint={`${formatInteger(situationParc.parc_conteneurs_disponible)} libres / ${formatInteger(situationParc.parc_conteneurs_total)} EVP`} icon={<Container className="h-4 w-4" />} compact />
                  <MetricCard label="Disponibilite reefer" value={formatPercent(reeferAvailabilityPct)} tone="#fbbf24" hint={`${formatInteger(situationParc.reefers_disponibles)} dispo / ${formatInteger(situationParc.reefers_total)} plugs`} icon={<Gauge className="h-4 w-4" />} compact />
                  <MetricCard label="Charge transbo nette" value={formatSignedInteger(transboBalance)} tone="#c2e1f8" hint={`Charge ${formatInteger(situationDaily.transbo_total_charge)} | Decharge ${formatInteger(situationDaily.transbo_total_decharge)}`} icon={<Activity className="h-4 w-4" />} compact />
                </div>
              </SectionCard>

              <SectionCard title="Maritime & navires" subtitle={<><DataBadge type="jour" /> Escales, navires en cours, attendus et volumes maritimes</>}>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <MetricCard label="Navires en operation" value={formatInteger(situationOperation.length || situationDaily.nb_navires_en_operation)} tone="#2e90d9" hint={`${formatInteger(naviresOperationRemaining)} rem. units | ${formatPercent(naviresOperationCompletion)} complet`} icon={<Ship className="h-4 w-4" />} compact />
                  <MetricCard label="Units maritimes" value={formatInteger(naviresOperationUnits + naviresAttendusUnits + naviresAppareillesUnits)} tone="#16a34a" hint={`Op. ${formatInteger(naviresOperationUnits)} | Att. ${formatInteger(naviresAttendusUnits)} | App. ${formatInteger(naviresAppareillesUnits)}`} icon={<Ship className="h-4 w-4" />} compact />
                  <MetricCard label="Escales realisees" value={formatInteger(situationArmateurs.escales_total_realisees)} tone="#1565a8" hint={`${formatInteger(situationArmateurs.escales_total_prevues)} prevues | ${formatPercent(situationArmateurs.taux_realisation_escales_pct)}`} icon={<Ship className="h-4 w-4" />} compact />
                  <MetricCard label="Transbo total" value={formatInteger(situationDaily.transbo_total_teu)} tone="#fbbf24" hint={`Charge ${formatInteger(situationDaily.transbo_total_charge)} | Decharge ${formatInteger(situationDaily.transbo_total_decharge)}`} icon={<Activity className="h-4 w-4" />} compact />
                </div>
              </SectionCard>

              <div className="grid gap-5 xl:grid-cols-2">
                <SectionCard title="Occupation parc detaillee" subtitle={<><DataBadge type="tendance" /> Utilise, disponible et variation journaliere depuis le 1er janvier</>}>
                  <div className="mb-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-hover)] p-3">
                      <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">Utilise</p>
                      <p className="mt-1 text-xl font-semibold text-[var(--text-primary)]">{formatInteger(situationParc.parc_conteneurs_utilise)}</p>
                      <p className="text-[12px] text-[var(--text-secondary)]">Delta veille {formatSignedInteger(parcDelta)}</p>
                    </div>
                    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-hover)] p-3">
                      <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">Disponible</p>
                      <p className="mt-1 text-xl font-semibold text-[var(--text-primary)]">{formatInteger(situationParc.parc_conteneurs_disponible)}</p>
                      <p className="text-[12px] text-[var(--text-secondary)]">Capacite {formatInteger(situationParc.parc_conteneurs_total)}</p>
                    </div>
                    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-hover)] p-3">
                      <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">Reefers</p>
                      <p className="mt-1 text-xl font-semibold text-[var(--text-primary)]">{formatInteger(situationParc.reefers_utilises)} / {formatInteger(situationParc.reefers_total)}</p>
                      <p className="text-[12px] text-[var(--text-secondary)]">{formatPercent(situationParc.taux_occupation_reefers)} d&apos;occupation</p>
                    </div>
                  </div>
                  <div className="h-[340px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={occupancyTrend}>
                        <CartesianGrid {...CHART_GRID_PROPS} />
                        <XAxis dataKey="date_rapport" {...CHART_AXIS_PROPS} tickFormatter={formatShortDate} />
                        <YAxis yAxisId="left" {...CHART_AXIS_PROPS} />
                        <YAxis yAxisId="right" orientation="right" {...CHART_AXIS_PROPS} />
                        <Tooltip content={<ChartTooltip labelFormatter={formatDateLabel} valueFormatter={(v: any, name: any) => String(name).includes("Tx") ? formatPercent(v) : String(name).includes("Variation") ? formatSignedInteger(v) : formatInteger(v)} />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Line connectNulls={false} yAxisId="left" type="monotone" dataKey="parc_conteneurs_utilise" name="Utilise" stroke="#2e90d9" strokeWidth={2.5} dot={{ r: 2 }} label={isPngExporting ? { fill: "#7396b5", fontSize: 10, formatter: formatChartExportLabel } : false} />
                        <Line connectNulls={false} yAxisId="left" type="monotone" dataKey="parc_conteneurs_disponible" name="Disponible" stroke="#164b7e" strokeWidth={2.5} dot={{ r: 2 }} label={isPngExporting ? { fill: "#7396b5", fontSize: 10, formatter: formatChartExportLabel } : false} />
                        <Line connectNulls={false} yAxisId="right" type="monotone" dataKey="variation_utilise" name="Variation journaliere" stroke="#f87171" strokeWidth={2} dot={{ r: 2 }} label={isPngExporting ? { fill: "#fecaca", fontSize: 10, formatter: formatChartExportLabel } : false} />
                        <Line connectNulls={false} yAxisId="right" type="monotone" dataKey="taux_occupation_parc" name="Tx parc %" stroke="#93cbf2" strokeWidth={2.2} dot={{ r: 2 }} label={isPngExporting ? { fill: "#7396b5", fontSize: 10, formatter: formatChartExportLabel } : false} />
                        <Line connectNulls={false} yAxisId="right" type="monotone" dataKey="taux_occupation_reefers" name="Tx reefer %" stroke="#5fb0e8" strokeWidth={2.2} dot={{ r: 2 }} label={isPngExporting ? { fill: "#7396b5", fontSize: 10, formatter: formatChartExportLabel } : false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>

                <SectionCard title="Pleins, vides et mouvements" subtitle={<><DataBadge type="tendance" /> Evolution des flux gate depuis le 1er janvier | {formatInteger(situationGate.gate_total_mouvements)} mvts | TTT {formatMinutes(situationGate.ttt_duree_minutes)}</>}>
                  <div className="h-[400px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={gateFlowTrend}>
                        <CartesianGrid {...CHART_GRID_PROPS} />
                        <XAxis dataKey="date_rapport" {...CHART_AXIS_PROPS} tickFormatter={formatShortDate} />
                        <YAxis {...CHART_AXIS_PROPS} />
                        <Tooltip content={<ChartTooltip labelFormatter={formatDateLabel} valueFormatter={(v: any) => formatInteger(v)} />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="gate_entrees_pleins" name="Pleins entrants" fill="#164b7e" radius={[6, 6, 0, 0]}>
                          <LabelList dataKey="gate_entrees_pleins" position="top" formatter={(v: unknown) => toNumber(v) > 0 ? formatInteger(v) : ""} className="fill-slate-300 text-[10px]" />
                        </Bar>
                        <Bar dataKey="gate_entrees_vides" name="Vides entrants" fill="#1d6fb8" radius={[6, 6, 0, 0]} label={BAR_VALUE_LABEL} />
                        <Bar dataKey="gate_sorties_pleins" name="Pleins sortants" fill="#5fb0e8" radius={[6, 6, 0, 0]} label={BAR_VALUE_LABEL} />
                        <Bar dataKey="gate_sorties_vides" name="Vides sortants" fill="#93cbf2" radius={[6, 6, 0, 0]} label={BAR_VALUE_LABEL} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>
              </div>

              <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                <SectionCard title="Pleins, vides et budget" subtitle={<><DataBadge type="jour" /> Flux observes, capacite parc et reference budgetaire</>}>
                  <div className="h-[360px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { poste: "Import", observe: toNumber(situationDaily.import_teu), budget: toNumber(situationDaily.import_forecast) },
                          { poste: "Export", observe: toNumber(situationDaily.export_teu), budget: toNumber(situationDaily.export_forecast) },
                          { poste: "Transbo", observe: toNumber(situationDaily.transbo_teu), budget: toNumber(situationDaily.transbo_forecast) },
                          { poste: "Vides", observe: toNumber(situationDaily.vides_teu), budget: toNumber(situationDaily.vides_forecast) },
                          { poste: "Pleins parc", observe: pleinsParcTotal, budget: toNumber(situationDaily.pleins_forecast) },
                        ]}
                      >
                        <CartesianGrid {...CHART_GRID_PROPS} />
                        <XAxis dataKey="poste" {...CHART_AXIS_PROPS} />
                        <YAxis {...CHART_AXIS_PROPS} />
                        <Tooltip content={<ChartTooltip valueFormatter={(v: any) => `${formatInteger(v)} TEU`} />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="observe" name="Observe" fill="#2e90d9" radius={[4, 4, 0, 0]} label={BAR_VALUE_LABEL} />
                        <Bar dataKey="budget" name="Budget" fill="#164b7e" radius={[4, 4, 0, 0]} label={BAR_VALUE_LABEL} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>

                <SectionCard title="Escales armateurs du jour" subtitle={<><DataBadge type="jour" /> Realisees, prevues et niveau de service</>}>
                  <div className="space-y-3">
                    {buildArmateurProgress(situationArmateurs).map((item: any) => (
                      <ProgressBar key={item.name} label={item.name} done={item.done} planned={item.planned} color={item.color} />
                    ))}
                  </div>
                </SectionCard>
              </div>

              <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                <SectionCard title="Par ligne maritime" subtitle={<><DataBadge type="jour" /> Voyages, unites et productivite a la date du bulletin</>}>
                  <div className="h-[360px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={shippingPerformance.slice(0, 8)} layout="vertical">
                        <CartesianGrid {...CHART_GRID_PROPS} />
                        <XAxis type="number" {...CHART_AXIS_PROPS} />
                        <YAxis type="category" dataKey="shipping" {...CHART_AXIS_PROPS} width={110} />
                        <Tooltip content={<ChartTooltip valueFormatter={(v: any, name: any) => String(name).includes("Prod") ? `${toNumber(v).toFixed(1)} mvts/h` : formatInteger(v)} />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="units" name="Units" fill="#2e90d9" radius={[0, 6, 6, 0]}>
                          <LabelList dataKey="units" position="right" formatter={(v: unknown) => formatInteger(v)} className="fill-slate-300 text-[10px]" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>

                <SectionCard title="Occupation du parc" subtitle={<><DataBadge type="jour" /> Stock occupe et reefers a la date du bulletin</>}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <OccupancyGauge
                      label="Occupation parc"
                      value={toNumber(situationParc.taux_occupation_parc)}
                      used={toNumber(situationParc.parc_conteneurs_utilise)}
                      capacity={toNumber(situationParc.parc_conteneurs_total)}
                      unit="EVP"
                    />
                    <OccupancyGauge
                      label="Occupation reefers"
                      value={toNumber(situationParc.taux_occupation_reefers)}
                      used={toNumber(situationParc.reefers_utilises)}
                      capacity={toNumber(situationParc.reefers_total)}
                      unit="prises"
                    />
                  </div>
                </SectionCard>
              </div>

              <div className="grid gap-5 xl:grid-cols-2">
                <SectionCard title="Croisement par ligne" subtitle={<><DataBadge type="jour" /> Parc, reefers, navires et flux rapproches par ligne</>}>
                  <DataTable
                    columns={[
                      { key: "shipping", label: "Ligne" },
                      { key: "parcTotal", label: "Pleins parc", align: "right", render: (r: any) => formatInteger(r.parcTotal) },
                      { key: "reefers", label: "Reefers", align: "right", render: (r: any) => formatInteger(r.reefers) },
                      { key: "naviresOperation", label: "En op.", align: "right", render: (r: any) => formatInteger(r.naviresOperation) },
                      { key: "naviresAttendus", label: "Att.", align: "right", render: (r: any) => formatInteger(r.naviresAttendus) },
                      { key: "naviresAppareilles", label: "App.", align: "right", render: (r: any) => formatInteger(r.naviresAppareilles) },
                      { key: "unitsDone", label: "Units", align: "right", render: (r: any) => formatInteger(r.unitsDone) },
                      { key: "productivity", label: "Prod.", align: "right", render: (r: any) => `${toNumber(r.productivity).toFixed(1)}` },
                    ]}
                    rows={yardLineRows as unknown as GenericRow[]}
                    compact
                  />
                </SectionCard>

                <SectionCard title="Escales croisees" subtitle={<><DataBadge type="jour" /> Import, export et transbordement au niveau navire</>}>
                  <DataTable
                    columns={[
                      { key: "nom_navire", label: "Navire" },
                      { key: "eta_escale", label: "ETA" },
                      { key: "import_total_teu", label: "Import", align: "right", render: (r: any) => formatInteger(r.import_total_teu) },
                      { key: "export_total_teu", label: "Export", align: "right", render: (r: any) => formatInteger(r.export_total_teu) },
                      { key: "transbo_total_teu", label: "Transbo", align: "right", render: (r: any) => formatInteger(r.transbo_total_teu) },
                      { key: "totalFluxTeu", label: "Total", align: "right", render: (r: any) => formatInteger(r.totalFluxTeu) },
                    ]}
                    rows={situationEscales as unknown as GenericRow[]}
                    compact
                  />
                </SectionCard>
              </div>

              <div className="grid gap-5 xl:grid-cols-2">
                <SectionCard title="Navires attendus du jour" subtitle={<><DataBadge type="jour" /> Bulletin du {formatDateLabel(situationReferenceDate)}</>}>
                  <DataTable
                    columns={[
                      { key: "nom_navire", label: "Navire" },
                      { key: "shipping", label: "Ligne", render: (r: any) => <ShippingBadge rawValue={r.shipping} /> },
                      { key: "service", label: "Service" },
                      { key: "eta", label: "ETA" },
                      { key: "t_units_prevu", label: "Units", align: "right", render: (r: any) => formatInteger(r.t_units_prevu) },
                    ]}
                    rows={situationAttendus}
                    compact
                  />
                </SectionCard>

                <SectionCard title="Navires appareilles du jour" subtitle={<><DataBadge type="jour" /> Bulletin du {formatDateLabel(situationReferenceDate)}</>}>
                  <DataTable
                    columns={[
                      { key: "nom_navire", label: "Navire" },
                      { key: "shipping", label: "Ligne", render: (r: any) => <ShippingBadge rawValue={r.shipping} /> },
                      { key: "service", label: "Service" },
                      { key: "atd", label: "ATD" },
                      { key: "net_prod", label: "Prod.", align: "right", render: (r: any) => `${toNumber(r.net_prod).toFixed(1)} mvts/h` },
                    ]}
                    rows={situationAppareilles}
                    compact
                  />
                </SectionCard>
              </div>

              <SectionCard title="Navires en operation" subtitle={<><DataBadge type="jour" /> Avancement, units restantes et productivite a la date du bulletin</>}>
                <DataTable
                  columns={[
                    { key: "nom_navire", label: "Navire" },
                    { key: "shipping", label: "Ligne", render: (r: any) => <ShippingBadge rawValue={r.shipping} /> },
                    { key: "service", label: "Service" },
                    { key: "t_units", label: "Units", align: "right", render: (r: any) => formatInteger(r.t_units) },
                    { key: "rem_units", label: "Restant", align: "right", render: (r: any) => formatInteger(r.rem_units) },
                    { key: "pct_complete", label: "Avanc.", align: "right", render: (r: any) => formatPercent(r.pct_complete) },
                    {
                      key: "net_prod",
                      label: "Prod.",
                      render: (r: any) => {
                        const appreciation = getProductivityAppreciation(r);
                        return (
                          <div className="flex items-center justify-end gap-2">
                            <span className="font-mono">{`${toNumber(r.net_prod).toFixed(1)} mvts/h`}</span>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${appreciation.className}`}>
                              <span>{appreciation.arrow}</span>
                              <span>{appreciation.label}</span>
                            </span>
                          </div>
                        );
                      },
                    },
                    { key: "etc", label: "ETC" },
                    {
                      key: "projectedCompletion",
                      label: "Fin estimee",
                      render: (r: any) => (
                        <div className="flex items-center gap-2">
                          <span>{formatDateTimeCompact(r.projectedCompletion as Date | null)}</span>
                        </div>
                      ),
                    },
                    {
                      key: "projectedDeparture",
                      label: "Appareillage estime",
                      render: (r: any) => formatDateTimeCompact(r.projectedDeparture as Date | null),
                    },
                    {
                      key: "jitStatus",
                      label: "Statut",
                      render: (r: any) => <JitStatusBadge active={isJustInTime(r)} />,
                    },
                  ]}
                  rows={situationOperationRowsEnriched as unknown as GenericRow[]}
                  compact
                />
              </SectionCard>
            </>


  );
}
