// Local (browser-side) metric calculation for vintage comparisons
import type { ActualRecord, ForecastRecord } from '../types';

export function calculateLocalMetrics(
  actuals: ActualRecord[],
  forecasts: ForecastRecord[],
): { mae: number; rmse: number; mape: number; n: number } {
  const actualMap   = new Map(actuals.map(r  => [r.startTime, r.generation]));
  const forecastMap = new Map(forecasts.map(r => [r.startTime, r.generation]));

  const common = [...actualMap.keys()].filter(k => forecastMap.has(k));
  const n = common.length;
  if (n === 0) return { mae: 0, rmse: 0, mape: 0, n: 0 };

  let sumAbs = 0, sumSq = 0, sumMape = 0, mapeCount = 0;
  for (const st of common) {
    const a = actualMap.get(st)!;
    const f = forecastMap.get(st)!;
    const e = f - a;
    sumAbs += Math.abs(e);
    sumSq  += e * e;
    if (a !== 0) { sumMape += Math.abs(e / a) * 100; mapeCount++; }
  }

  return {
    mae:  sumAbs / n,
    rmse: Math.sqrt(sumSq / n),
    mape: mapeCount > 0 ? sumMape / mapeCount : 0,
    n,
  };
}
