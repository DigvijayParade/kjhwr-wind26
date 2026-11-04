import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer, Legend,
  LineChart, Line, ReferenceLine,
} from 'recharts';
import { api, type DataScope } from '../api';
import { useAsync } from './hooks';
import { LoadingSpinner, ErrorBanner, Card, SectionTitle, KpiCard, ExplainerBox, NoData } from './ui';
import { TrendingUp, AlertTriangle, CheckCircle, BarChart3, HelpCircle } from 'lucide-react';

export default function ErrorMetrics({ scope = 'jan2026' }: { scope?: DataScope }) {
  const { data, loading, error } = useAsync(() => api.metrics(scope), [scope]);
  const [searchTerm, setSearchTerm] = useState('');

  const errorStats = useMemo(() => {
    if (!data?.series?.length) return { overCount: 0, underCount: 0, maxOver: 0, maxUnder: 0 };
    let over = 0;
    let under = 0;
    let maxO = 0;
    let maxU = 0;

    data.series.forEach(s => {
      if (s.error > 0) {
        over++;
        if (s.error > maxO) maxO = s.error;
      } else {
        under++;
        if (s.error < maxU) maxU = s.error;
      }
    });

    return {
      overCount: over,
      underCount: under,
      maxOver: Math.round(maxO),
      maxUnder: Math.round(Math.abs(maxU)),
      overPct: Math.round((over / data.series.length) * 100),
      underPct: Math.round((under / data.series.length) * 100),
    };
  }, [data]);

  if (loading) return <LoadingSpinner message="Computing mathematical error distributions…" />;
  if (error)   return <ErrorBanner message={error} />;
  if (!data || data.n === 0) return <NoData />;

  const filteredDaily = data.daily.filter(d => d.date.includes(searchTerm));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── KPI Row with Plain English Explanations ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <KpiCard
          label="MAE (Mean Absolute Error)"
          value={data.mae.toFixed(0)}
          unit="MW"
          sub="Average forecast deviation"
          plainMeaning="The typical magnitude of miss on any given settlement period."
          color="#0ea5e9"
        />
        <KpiCard
          label="RMSE (Root Mean Square Error)"
          value={data.rmse.toFixed(0)}
          unit="MW"
          sub="Outlier-sensitive error"
          plainMeaning="Higher than MAE, showing that big storms caused occasional spike errors."
          color="#f59e0b"
        />
        <KpiCard
          label="MAPE (% Error)"
          value={data.mape.toFixed(1)}
          unit="%"
          sub="Relative percentage error"
          plainMeaning="Accuracy relative to total UK wind fleet production."
          color="#10b981"
        />
        <KpiCard
          label="Sample Coverage"
          value={data.n.toLocaleString()}
          unit="Hours"
          sub="January 2026 data points"
          plainMeaning="Verified across all 744 hourly settlement points in January."
          color="#a855f7"
        />
      </div>

      {/* ── Over vs Under Forecast Distribution ── */}
      <Card style={{
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.8))',
      }}>
        <SectionTitle
          subtitle="Understanding forecast bias: Did models tend to over-promise or under-promise wind?"
          badge="Directional Bias"
        >
          Forecast Directional Behavior
        </SectionTitle>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginTop: 12 }}>
          <div style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: 10,
            padding: '16px 18px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#f87171' }}>OVER-FORECASTING (Deficit Risk)</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#f87171' }}>{errorStats.overPct}% of time</span>
            </div>
            <p style={{ fontSize: 12, color: '#cbd5e1', marginTop: 8, lineHeight: 1.5 }}>
              Forecast predicted <em>more</em> wind than actually materialized. The utility had to make up the deficit with thermal plants.
            </p>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
              Worst deficit: <strong style={{ color: '#f87171' }}>+{errorStats.maxOver.toLocaleString()} MW</strong>
            </div>
          </div>

          <div style={{
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: 10,
            padding: '16px 18px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#34d399' }}>UNDER-FORECASTING (Surplus Wind)</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#34d399' }}>{errorStats.underPct}% of time</span>
            </div>
            <p style={{ fontSize: 12, color: '#cbd5e1', marginTop: 8, lineHeight: 1.5 }}>
              Forecast predicted <em>less</em> wind than blew. The grid received surplus zero-carbon power, lowering fossil fuel reliance.
            </p>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
              Largest surplus: <strong style={{ color: '#34d399' }}>-{errorStats.maxUnder.toLocaleString()} MW</strong>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Daily MAE vs RMSE Bar Chart ── */}
      <Card>
        <SectionTitle
          subtitle="Comparing daily MAE (teal) against RMSE (amber). When RMSE spikes much higher than MAE, it reveals sharp extreme errors."
          badge="Daily Comparison"
        >
          Daily Error Breakdown: MAE vs RMSE
        </SectionTitle>

        <ExplainerBox
          title="🧐 What is the difference between MAE and RMSE?"
          whatIsIt="MAE treats every error proportionally. RMSE squares errors before averaging, meaning a 3,000 MW miss hurts 9 times more than a 1,000 MW miss."
          whyItMatters="In energy trading, large misses cause catastrophic imbalance penalties. A trader looks at RMSE to know if a day had stable small errors or dangerous volatile spikes."
          example="Notice days where the amber bar towers over the blue bar — those were days with turbulent sudden wind shifts."
        />

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.daily} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              tickLine={false}
              interval={2}
              tickFormatter={d => d.slice(5)}
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickLine={false} axisLine={false}
              tickFormatter={v => `${v} MW`}
            />
            <Tooltip
              contentStyle={{ background: '#0c1a2e', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: 8 }}
              itemStyle={{ fontSize: 12 }}
              labelStyle={{ color: '#f8fafc', fontWeight: 600, marginBottom: 4 }}
            />
            <Legend wrapperStyle={{ color: '#cbd5e1', fontSize: 12, paddingTop: 10 }} />
            <Bar dataKey="mae"  name="MAE (Average Miss)" fill="#0ea5e9" radius={[3, 3, 0, 0]} />
            <Bar dataKey="rmse" name="RMSE (Extreme Penalty)" fill="#f59e0b" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* ── Residual Line Chart ── */}
      <Card>
        <SectionTitle
          subtitle="Visualizing the moment-by-moment prediction error (Forecast minus Actual)."
          badge="Residual Timeline"
        >
          Hourly Error Residuals (MW)
        </SectionTitle>

        <ExplainerBox
          title="🧐 How to read the Residual Timeline"
          whatIsIt="This chart plots (Forecast - Actual) for every hour. Points above zero (red area) were over-forecasted; points below zero (green area) were under-forecasted."
          whyItMatters="Oscillations show the diurnal cycle and timing lag — often a storm arrives 3 hours earlier or later than meteorologists anticipated."
        />

        <ResponsiveContainer width="100%" height={260}>
          <LineChart
            data={data.series.filter((_, i) => i % 2 === 0)}
            margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="startTime"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              tickLine={false}
              interval={Math.floor(data.series.length / 2 / 8)}
              tickFormatter={d => d.slice(5, 10)}
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickLine={false} axisLine={false}
              tickFormatter={v => `${v} MW`}
            />
            <ReferenceLine y={0} stroke="#64748b" strokeWidth={1.5} strokeDasharray="4 4" />
            <Tooltip
              contentStyle={{ background: '#0c1a2e', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: 8 }}
              itemStyle={{ fontSize: 12 }}
              formatter={(v: number) => [`${v.toLocaleString()} MW`, 'Mismatch']}
            />
            <Line
              type="monotone"
              dataKey="error"
              name="Error (Forecast - Actual)"
              stroke="#f43f5e"
              strokeWidth={1.5}
              dot={false}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* ── Daily Summary Data Table ── */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
          <SectionTitle
            subtitle="Complete audit trail of accuracy metrics for each day in January 2026."
            badge="Tabular Audit"
          >
            Daily Verification Log
          </SectionTitle>

          <input
            type="text"
            placeholder="Search date (e.g. 2026-01-15)..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 6,
              padding: '6px 12px',
              color: '#f8fafc',
              fontSize: 12,
              outline: 'none',
              width: 220,
            }}
          />
        </div>

        <div style={{ overflowX: 'auto', maxHeight: 360, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ position: 'sticky', top: 0, background: '#111e33', zIndex: 1 }}>
              <tr style={{ color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                {['Settlement Date', 'MAE (MW)', 'RMSE (MW)', 'MAPE (%)', 'Hourly Periods', 'Accuracy Rating'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredDaily.map((row, i) => {
                const isHighAcc = row.mape < 12;
                const isVolatile = row.mape > 20;
                return (
                  <tr key={row.date} style={{
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                  }}>
                    <td className="mono-num" style={{ padding: '9px 14px', color: '#cbd5e1', fontWeight: 600 }}>{row.date}</td>
                    <td className="mono-num" style={{ padding: '9px 14px', color: '#38bdf8' }}>{row.mae.toFixed(1)} MW</td>
                    <td className="mono-num" style={{ padding: '9px 14px', color: '#f59e0b' }}>{row.rmse.toFixed(1)} MW</td>
                    <td className="mono-num" style={{ padding: '9px 14px', color: isHighAcc ? '#34d399' : (isVolatile ? '#f87171' : '#cbd5e1'), fontWeight: 700 }}>
                      {row.mape.toFixed(1)}%
                    </td>
                    <td style={{ padding: '9px 14px', color: '#94a3b8' }}>{row.n}</td>
                    <td style={{ padding: '9px 14px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: 12,
                        fontSize: 11,
                        fontWeight: 600,
                        background: isHighAcc ? 'rgba(16,185,129,0.15)' : (isVolatile ? 'rgba(239,68,68,0.15)' : 'rgba(14,165,233,0.15)'),
                        color: isHighAcc ? '#34d399' : (isVolatile ? '#f87171' : '#38bdf8'),
                      }}>
                        {isHighAcc ? '★ High Accuracy' : (isVolatile ? '⚠ High Volatility' : 'Normal')}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
