// API types matching backend response shapes

export interface ActualRecord {
  startTime: string;
  generation: number;
}

export interface ForecastRecord {
  startTime: string;
  generation: number;
  publishTime: string;
}

export interface MetricsSeries {
  startTime: string;
  actual: number;
  forecast: number;
  error: number;
}

export interface DailyMetrics {
  date: string;
  mae: number;
  rmse: number;
  mape: number;
  n: number;
}

export interface MetricsResponse {
  mae: number;
  rmse: number;
  mape: number;
  n: number;
  daily: DailyMetrics[];
  series: MetricsSeries[];
}

export interface VintageGroup {
  targetDate: string;
  publishTimes: string[];
}

export type TabId = 'overview' | 'forecast' | 'errors' | 'decision';
