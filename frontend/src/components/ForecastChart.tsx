import { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer, Legend,
} from 'recharts';
import { api, type DataScope } from '../api';
import { useAsync, shortDate } from './hooks';
import { LoadingSpinner, ErrorBanner, Card, SectionTitle, ExplainerBox, NoData } from './ui';
import { Zap, Calendar, TrendingUp, Info } from 'lucide-react';

const COLOR_ACTUAL   = '#10b981'; // Green for actual power
const COLOR_FORECAST = '#38bdf8'; // Blue for forecast

export default function ForecastChart({ scope = 'jan2026' }: { scope?: DataScope }) {
  const actuals   = useAsync(() => api.actuals(scope), [scope]);
  const forecasts = useAsync(() => api.forecastLatest(scope), [scope]);
  const [rangeFilter, setRangeFilter] = useState<'all' | 'w1' | 'w2' | 'w3' | 'w4'>('all');

  const loading = actuals.loading || forecasts.loading;
  const error   = actuals.error   || forecasts.error;

  // Build merged series map
  const { chartData, peakActual, avgActual, maxForecast } = useMemo(() => {
    if (!actuals.data || !forecasts.data) {
      return { chartData: [], peakActual: 0, avgActual: 0, maxForecast: 0 };
    }

    const actualMap   = new Map(actuals.data.map(r => [r.startTime, r.generation]));
    const forecastMap = new Map(forecasts.data.map(r => [r.startTime, r.generation]));
    const allTimes    = [...new Set([...actualMap.keys(), ...forecastMap.keys()])].sort();

    // Filter by week if selected
    let filteredTimes = allTimes;
    if (rangeFilter === 'w1') filteredTimes = allTimes.filter(t => t.slice(8, 10) <= '07');
    else if (rangeFilter === 'w2') filteredTimes = allTimes.filter(t => t.slice(8, 10) > '07' && t.slice(8, 10) <= '14');
    else if (rangeFilter === 'w3') filteredTimes = allTimes.filter(t => t.slice(8, 10) > '14' && t.slice(8, 10) <= '21');
    else if (rangeFilter === 'w4') filteredTimes = allTimes.filter(t => t.slice(8, 10) > '21');

    // Sampling: if 'all', sample every 3rd point; if week, keep full hourly resolution
    const step = rangeFilter === 'all' ? 3 : 1;

    let peakAct = 0;
    let sumAct  = 0;
    let countAct = 0;
    let maxFcst = 0;

    const data = filteredTimes
      .filter((_, i) => i % step === 0)
      .map(st => {
        const act = actualMap.get(st);
        const fcst = forecastMap.get(st);

        if (act !== undefined) {
          if (act > peakAct) peakAct = act;
          sumAct += act;
          countAct++;
        }
        if (fcst !== undefined && fcst > maxFcst) maxFcst = fcst;

        return {
          rawTime: st,
          time: shortDate(st) + ' ' + st.slice(11, 16),
          actual: act !== undefined ? Math.round(act) : null,
          forecast: fcst !== undefined ? Math.round(fcst) : null,
          diff: (act !== undefined && fcst !== undefined) ? Math.round(fcst - act) : null,
        };
      });

    return {
      chartData: data,
      peakActual: peakAct,
      avgActual: countAct > 0 ? Math.round(sumAct / countAct) : 0,
      maxForecast: maxFcst,
    };
  }, [actuals.data, forecasts.data, rangeFilter]);

  if (loading) return <LoadingSpinner message="Merging National Grid meter readings & forecasts…" />;
  if (error)   return <ErrorBanner message={error} />;
  if (!chartData.length) return <NoData />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── Key Wind Statistics Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <Card style={{ borderTop: `3px solid ${COLOR_ACTUAL}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#34d399', textTransform: 'uppercase' }}>
            PEAK WIND OUTTURN
          </div>
          <div className="mono-num" style={{ fontSize: 28, fontWeight: 800, color: '#f8fafc', marginTop: 4 }}>
            {(peakActual / 1000).toFixed(1)} GW
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
            Peak generation: <strong>{peakActual.toLocaleString()} MW</strong>
          </div>
        </Card>

        <Card style={{ borderTop: `3px solid ${COLOR_FORECAST}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase' }}>
            AVERAGE GENERATION
          </div>
          <div className="mono-num" style={{ fontSize: 28, fontWeight: 800, color: '#f8fafc', marginTop: 4 }}>
            {(avgActual / 1000).toFixed(1)} GW
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
            Average wind output: <strong>{avgActual.toLocaleString()} MW</strong>
          </div>
        </Card>

        <Card style={{ borderTop: '3px solid #a855f7' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#c084fc', textTransform: 'uppercase' }}>
            ACTUAL METER READINGS
          </div>
          <div className="mono-num" style={{ fontSize: 28, fontWeight: 800, color: '#f8fafc', marginTop: 4 }}>
            {actuals.data?.length.toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
            From Elexon <code style={{ color: '#38bdf8' }}>FUELHH</code> dataset
          </div>
        </Card>
      </div>

      {/* ── Main Time Series Chart ── */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <SectionTitle
            subtitle="Comparing predicted wind generation against physical electricity delivered to Great Britain."
            badge="Time Series Analysis"
          >
            Wind Power Generation: Forecast vs Actuals
          </SectionTitle>

          {/* Time Filter Buttons */}
          <div style={{ display: 'flex', gap: 6, background: 'rgba(15, 23, 42, 0.8)', padding: 4, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
            {[
              { id: 'all', label: 'Full Month' },
              { id: 'w1',  label: 'Week 1 (1-7)' },
              { id: 'w2',  label: 'Week 2 (8-14)' },
              { id: 'w3',  label: 'Week 3 (15-21)' },
              { id: 'w4',  label: 'Week 4 (22-31)' },
            ].map(b => (
              <button
                key={b.id}
                onClick={() => setRangeFilter(b.id as any)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: rangeFilter === b.id ? '#0284c7' : 'transparent',
                  color: rangeFilter === b.id ? '#ffffff' : '#94a3b8',
                  fontSize: 12,
                  fontWeight: rangeFilter === b.id ? 700 : 500,
                  cursor: 'pointer',
                }}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        <ExplainerBox
          title="🧐 How to read this Forecast vs Actuals graph"
          whatIsIt="The green line is the actual physical power produced by all UK wind turbines (metered by National Grid). The dashed blue line is the prediction published beforehand. The area between the lines is the error."
          whyItMatters="When the blue line is higher than green, the utility over-estimated wind and didn't buy enough thermal power in advance — forcing expensive last-minute balancing action. When green is higher than blue, there was surplus clean wind power."
          example="Hover over any point to see the exact Megawatts and the surplus/deficit in the tooltip."
        />

        <ResponsiveContainer width="100%" height={380}>
          <LineChart data={chartData} margin={{ top: 10, right: 25, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="time"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              interval={Math.floor(chartData.length / 8)}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => `${(v / 1000).toFixed(0)} GW`}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  const diff = d.diff;
                  return (
                    <div style={{
                      background: '#0c1a2e',
                      border: '1px solid rgba(56, 189, 248, 0.4)',
                      borderRadius: 8,
                      padding: '12px 16px',
                      boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc', marginBottom: 8 }}>
                        {label}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                          <span style={{ color: COLOR_ACTUAL }}>● Actual Generation:</span>
                          <strong style={{ color: '#ffffff' }}>{d.actual?.toLocaleString()} MW</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                          <span style={{ color: COLOR_FORECAST }}>● Forecast Generation:</span>
                          <strong style={{ color: '#ffffff' }}>{d.forecast?.toLocaleString()} MW</strong>
                        </div>
                        {diff !== null && (
                          <div style={{
                            marginTop: 6,
                            paddingTop: 6,
                            borderTop: '1px solid rgba(255,255,255,0.1)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: 16,
                            color: diff > 0 ? '#f87171' : '#34d399',
                            fontWeight: 700,
                          }}>
                            <span>Mismatch:</span>
                            <span>
                              {diff > 0 ? `+${diff.toLocaleString()} MW (Over-forecast)` : `${diff.toLocaleString()} MW (Under-forecast)`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend
              wrapperStyle={{ color: '#cbd5e1', fontSize: 12, paddingTop: 14 }}
              formatter={(val) => <span style={{ color: '#cbd5e1', marginRight: 16 }}>{val}</span>}
            />
            <Line
              type="monotone"
              dataKey="actual"
              name="Actual Wind Outturn (FUELHH)"
              stroke={COLOR_ACTUAL}
              strokeWidth={2.5}
              dot={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="forecast"
              name="Latest Forecast (WINDFOR)"
              stroke={COLOR_FORECAST}
              strokeWidth={2}
              dot={false}
              connectNulls
              strokeDasharray="5 3"
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
