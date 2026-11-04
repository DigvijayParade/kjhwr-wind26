import type {
  ActualRecord,
  ForecastRecord,
  MetricsResponse,
  VintageGroup,
} from './types';

const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${path} → ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export type DataScope = 'jan2026' | 'live';

export const api = {
  health: () => get<{ status: string }>('/api/health'),
  actuals: (scope: DataScope = 'jan2026') => get<ActualRecord[]>(`/api/actuals?scope=${scope}`),
  forecastLatest: (scope: DataScope = 'jan2026') => get<ForecastRecord[]>(`/api/forecast/latest?scope=${scope}`),
  metrics: (scope: DataScope = 'jan2026') => get<MetricsResponse>(`/api/metrics?scope=${scope}`),
  vintages: (scope: DataScope = 'jan2026') => get<VintageGroup[]>(`/api/forecast/vintages?scope=${scope}`),
  forecastByVintage: (publishBefore: string, scope: DataScope = 'jan2026') =>
    get<ForecastRecord[]>(`/api/forecast/by-vintage?publishBefore=${encodeURIComponent(publishBefore)}&scope=${scope}`),
};
