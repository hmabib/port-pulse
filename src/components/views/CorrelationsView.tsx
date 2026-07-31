/* eslint-disable @typescript-eslint/no-explicit-any */


export default function CorrelationsView({ ctx }: { ctx: any }) {
  const { CHART_AXIS_PROPS, CHART_GRID_PROPS, CartesianGrid, CorrelationBadge, ResponsiveContainer, Scatter, ScatterChart, SectionCard, Tooltip, XAxis, YAxis, ZAxis, crossAnalyses, formatInteger, getCorrelationWarning, hasSufficientPearsonSample } = ctx;
  return (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {crossAnalyses.map((ca: any, index: any) => (
                  <SectionCard key={index} title={ca.title} subtitle={<span>{ca.xLabel} vs {ca.yLabel} <CorrelationBadge value={ca.correlation} /></span>}>
                    <div className="h-[320px] min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart>
                          <CartesianGrid {...CHART_GRID_PROPS} />
                          <XAxis type="number" dataKey="x" name={ca.xLabel} {...CHART_AXIS_PROPS} />
                          <YAxis type="number" dataKey="y" name={ca.yLabel} {...CHART_AXIS_PROPS} />
                          <ZAxis range={[40, 120]} />
                          <Tooltip
                            content={({ payload }: { payload?: any[] }) => {
                              if (!payload?.length) return null;
                              const p = payload[0]?.payload;
                              return (
                                <div className="rounded-lg border border-[var(--card-border)] bg-[var(--tooltip-bg)] p-3 text-[12px] shadow-xl">
                                  <p className="font-medium text-[var(--text-primary)]">{p?.label}</p>
                                  <p className="text-[var(--text-secondary)]">{ca.xLabel}: {formatInteger(p?.x)}</p>
                                  <p className="text-[var(--text-secondary)]">{ca.yLabel}: {formatInteger(p?.y)}</p>
                                </div>
                              );
                            }}
                          />
                          <Scatter data={ca.points} fill="#164b7e" fillOpacity={0.6} />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                    {getCorrelationWarning(ca.points.length) && (
                      <p className="mt-3 text-[12px] text-amber-400">{getCorrelationWarning(ca.points.length)}</p>
                    )}
                  </SectionCard>
                ))}
              </div>

              {crossAnalyses.length === 0 && (
                <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-12 text-center">
                  <p className="text-[var(--text-muted)]">Pas assez de donnees pour les analyses croisees. Selectionnez une periode plus large.</p>
                </div>
              )}

              {crossAnalyses.length > 0 && (
                <SectionCard title="Matrice de correlations" subtitle="Resume des liens entre indicateurs">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {crossAnalyses.map((ca: any, i: any) => {
                      const abs = Math.abs(ca.correlation);
                      const bg = abs > 0.7 ? "rgba(16,185,129,0.08)" : abs > 0.4 ? "rgba(245,158,11,0.08)" : "rgba(100,116,139,0.05)";
                      return (
                        <div key={i} className="rounded-xl border border-[var(--card-border)] p-4" style={{ backgroundColor: bg }}>
                          <p className="text-[13px] font-semibold text-[var(--text-primary)]">{ca.title}</p>
                          <div className="mt-2 flex items-center justify-between">
                            <CorrelationBadge value={ca.correlation} />
                            <span className="text-[11px] text-[var(--text-muted)]">{ca.points.length} pts</span>
                          </div>
                          <p className="mt-2 text-[11px] text-[var(--text-secondary)]">
                            {!hasSufficientPearsonSample(ca.points.length)
                              ? "Echantillon insuffisant pour interpreter la correlation."
                              : abs > 0.7
                              ? `Lien ${ca.correlation > 0 ? "positif" : "negatif"} fort. Les deux indicateurs evoluent ${ca.correlation > 0 ? "ensemble" : "inversement"}.`
                              : abs > 0.4
                                ? `Lien modere entre ${ca.xLabel} et ${ca.yLabel}.`
                                : `Pas de lien significatif entre ces indicateurs.`}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </SectionCard>
              )}
            </>

  );
}
