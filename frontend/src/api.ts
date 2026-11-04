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

export const api = {
  health: () => get<{ status: string }>('/api/health'),
  actuals: () => get<ActualRecord[]>('/api/actuals'),
  forecastLatest: () => get<ForecastRecord[]>('/api/forecast/latest'),
  metrics: () => get<MetricsResponse>('/api/metrics'),
  vintages: () => get<VintageGroup[]>('/api/forecast/vintages'),
  forecastByVintage: (publishBefore: string) =>
    get<ForecastRecord[]>(`/api/forecast/by-vintage?publishBefore=${encodeURIComponent(publishBefore)}`),
};
