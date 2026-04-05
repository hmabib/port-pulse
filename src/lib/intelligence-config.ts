export const INTELLIGENCE_THRESHOLDS = {
  parkCriticalPct: 95,
  parkWarningPct: 85,
  reeferWarningPct: 80,
  operationalWarningPct: 80,
  budgetWarningPct: 85,
  budgetTargetPct: 95,
  productivityWarningMvtsPerHour: 20,
  underperformingLoaRatio: 0.85,
  tttSpikeMultiplier: 1.5,
  productivityModelToleranceRatio: 0.05,
  pearsonMinPoints: 8,
} as const;

export const ETC_MODEL = {
  observedProductivityWeight: 0.7,
  historicalProductivityWeight: 0.3,
  defaultPostOpsHours: 1.5,
  bulletinAmHourUtc: 10,
  bulletinPmHourUtc: 18,
} as const;

export function hasSufficientPearsonSample(count: number): boolean {
  return count >= INTELLIGENCE_THRESHOLDS.pearsonMinPoints;
}
