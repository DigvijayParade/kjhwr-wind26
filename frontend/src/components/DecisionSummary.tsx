import { useState, useCallback, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer, Legend,
} from 'recharts';
import { api, type DataScope } from '../api';
import { useAsync, shortDate } from './hooks';
import { LoadingSpinner, ErrorBanner, Card, SectionTitle, KpiCard, ExplainerBox, NoData } from './ui';
import type { ForecastRecord, VintageGroup } from '../types';
import { calculateLocalMetrics } from './vintageMetrics';
import { Calculator, ShieldCheck, Clock, Zap, ArrowRight, HelpCircle } from 'lucide-react';

export default function DecisionSummary({ scope = 'jan2026' }: { scope?: DataScope }) {
  const vintages = useAsync(() => api.vintages(scope), [scope]);
  const actuals  = useAsync(() => api.actuals(scope), [scope]);

  const [selectedVintage, setSelectedVintage] = useState('');
  const [vintageFcst, setVintageFcst]         = useState<ForecastRecord[] | null>(null);
  const [vintageLoading, setVintageLoading]   = useState(false);
  const [vintageError, setVintageError]       = useState<string | null>(null);

  // Procurement Simulator state
  const [consumerDemand, setConsumerDemand]   = useState<number>(28000); // 28,000 MW typical UK winter demand

  const loadVintage = useCallback(async (publishBefore: string) => {
    if (!publishBefore) return;
    setVintageLoading(true);
    setVintageError(null);
    try {
      const data = await api.forecastByVintage(publishBefore, scope);
      setVintageFcst(data);
    } catch (e) {
      setVintageError(String(e));
    } finally {
      setVintageLoading(false);
    }
  }, [scope]);

  const handleSelect = (v: string) => {
    setSelectedVintage(v);
    loadVintage(v);
  };

  // Collect unique publish times
  const allTimes = useMemo(() => {
    if (!vintages.data) return [];
    return [...new Set(vintages.data.flatMap(v => v.publishTimes))].sort().reverse();
  }, [vintages.data]);

  // Set default vintage once loaded
  if (allTimes.length > 0 && !selectedVintage && !vintageLoading && !vintageFcst) {
    const defaultTime = allTimes[Math.floor(allTimes.length / 2)] || allTimes[0];
    if (defaultTime) {
      setSelectedVintage(defaultTime);
      loadVintage(defaultTime);
    }
  }

  if (vintages.loading || actuals.loading) return <LoadingSpinner message="Loading Day-Ahead market vintages…" />;
  if (vintages.error) return <ErrorBanner message={vintages.error} />;
  if (!vintages.data?.length) return <NoData />;

  // Compute metrics for selected vintage vs actuals
  const metrics = vintageFcst && actuals.data
    ? calculateLocalMetrics(actuals.data, vintageFcst)
    : null;

  // Build chart data
  const actualMap   = new Map((actuals.data ?? []).map(r => [r.startTime, r.generation]));
  const vintageMap  = new Map((vintageFcst ?? []).map(r => [r.startTime, r.generation]));
  const allChartTimes = [...new Set([...actualMap.keys(), ...vintageMap.keys()])].sort();
  const chartData   = allChartTimes
    .filter((_, i) => i % 3 === 0)
    .map(st => ({
      time:     shortDate(st) + ' ' + st.slice(11, 16),
      actual:   actualMap.has(st)  ? Math.round(actualMap.get(st)!)  : null,
      vintage:  vintageMap.has(st) ? Math.round(vintageMap.get(st)!) : null,
    }));

  // Average forecast generation for simulation
  const avgForecastGen = vintageFcst && vintageFcst.length > 0
    ? Math.round(vintageFcst.reduce((sum, r) => sum + r.generation, 0) / vintageFcst.length)
    : 12000;

  const netThermalNeeded = Math.max(0, consumerDemand - avgForecastGen);
  const safetyBuffer = metrics ? Math.round(metrics.mae) : 1764;
  const recommendedProcurement = netThermalNeeded + safetyBuffer;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── Executive Pitch Explainer ── */}
      <Card style={{
        background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.12) 0%, rgba(168, 85, 247, 0.08) 100%)',
        border: '1px solid rgba(56, 189, 248, 0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Clock size={20} color="#38bdf8" />
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', margin: 0 }}>
            Simulate a Procurement Decision: "What forecast did the trading desk see?"
          </h2>
        </div>
        <p style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
          In electricity trading, forecasts update continuously. You must not evaluate a decision using a forecast published <em>after</em> the trading deadline!
          This <strong>Vintage Simulator</strong> lets you roll back time to any specific publish moment in January 2026 to see exactly what intelligence was available when purchase orders were placed.
        </p>
      </Card>

      {/* ── Vintage Selector Controls ── */}
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SectionTitle
            subtitle="Pick an exact historical forecast snapshot (timestamp when Elexon published the forecast)."
            badge="Time Travel Simulation"
          >
            Select Trading Decision Cutoff
          </SectionTitle>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={selectedVintage}
              onChange={e => handleSelect(e.target.value)}
              style={{
                background: '#0c1a2e',
                color: '#f8fafc',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 13,
                minWidth: 320,
                outline: 'none',
              }}
            >
              {allTimes.map(pt => (
                <option key={pt} value={pt}>
                  Cutoff: {pt.replace('T', ' ')} UTC
                </option>
              ))}
            </select>

            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              Showing forecast available strictly before selected moment.
            </span>
          </div>

          {/* Quick presets */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>PRESET SNAPSHOTS:</span>
            {allTimes.slice(0, 4).map(pt => (
              <button
                key={pt}
                onClick={() => handleSelect(pt)}
                style={{
                  background: selectedVintage === pt ? 'rgba(14,165,233,0.3)' : 'rgba(255,255,255,0.05)',
                  border: selectedVintage === pt ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 6,
                  padding: '4px 10px',
                  color: selectedVintage === pt ? '#38bdf8' : '#94a3b8',
                  fontSize: 11,
                  cursor: 'pointer',
                }}
              >
                {pt.slice(0, 16).replace('T', ' ')}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* ── Vintage Accuracy KPI Strip ── */}
      {selectedVintage && (
        <>
          {vintageLoading && <LoadingSpinner message="Simulating historical forecast vintage…" />}
          {vintageError   && <ErrorBanner message={vintageError} />}

          {!vintageLoading && !vintageError && metrics && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                <KpiCard
                  label="Simulated Vintage MAE"
                  value={metrics.mae.toFixed(0)}
                  unit="MW"
                  sub="Accuracy of this specific vintage"
                  plainMeaning="The mean error of this specific forecast run."
                  color="#0ea5e9"
                />
                <KpiCard
                  label="Simulated RMSE"
                  value={metrics.rmse.toFixed(0)}
                  unit="MW"
                  sub="Outlier penalty"
                  plainMeaning="Captures volatility risk for this publication batch."
                  color="#f59e0b"
                />
                <KpiCard
                  label="Vintage MAPE"
                  value={metrics.mape.toFixed(1)}
                  unit="%"
                  sub="Percentage accuracy"
                  plainMeaning="Relative accuracy for this vintage snapshot."
                  color="#10b981"
                />
                <KpiCard
                  label="Periods Available"
                  value={vintageFcst?.length.toLocaleString() ?? '0'}
                  unit="Hours"
                  sub="Target timestamps predicted"
                  plainMeaning="Horizon of hours covered by this vintage."
                  color="#a855f7"
                />
              </div>

              {/* ── Interactive Power Procurement Calculator ── */}
              <Card style={{
                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(12, 33, 56, 0.75) 100%)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <Calculator size={20} color="#34d399" />
                  <SectionTitle
                    subtitle="Interactive tool showing how the utility uses this forecast and error metric to decide how much thermal power to purchase."
                    badge="Client Application"
                  >
                    Wholesale Power Purchase Recommendation Engine
                  </SectionTitle>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, alignItems: 'center' }}>
                  <div>
                    <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>
                      Expected Consumer Demand for Great Britain (MW):
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input
                        type="range"
                        min="20000"
                        max="42000"
                        step="500"
                        value={consumerDemand}
                        onChange={e => setConsumerDemand(Number(e.target.value))}
                        style={{ flex: 1, accentColor: '#0ea5e9' }}
                      />
                      <span className="mono-num" style={{ fontSize: 16, fontWeight: 700, color: '#38bdf8', minWidth: 90 }}>
                        {consumerDemand.toLocaleString()} MW
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                      Typical UK winter peak: ~30,000–35,000 MW. Off-peak: ~22,000 MW.
                    </div>
                  </div>

                  {/* Math Breakdown Flow */}
                  <div style={{
                    background: 'rgba(10, 18, 30, 0.7)',
                    padding: '16px',
                    borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    fontSize: 12.5,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                      <span>1. Total Consumer Demand:</span>
                      <strong className="mono-num">{consumerDemand.toLocaleString()} MW</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#34d399' }}>
                      <span>2. (-) Wind Forecast Output:</span>
                      <strong className="mono-num">- {avgForecastGen.toLocaleString()} MW</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 6 }}>
                      <span>Net Thermal Deficit Needed:</span>
                      <strong className="mono-num">{netThermalNeeded.toLocaleString()} MW</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f59e0b' }}>
                      <span>(+) Quantified Safety Buffer (MAE):</span>
                      <strong className="mono-num">+ {safetyBuffer.toLocaleString()} MW</strong>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      color: '#38bdf8',
                      fontSize: 14,
                      fontWeight: 800,
                      borderTop: '1px solid rgba(56,189,248,0.3)',
                      paddingTop: 8,
                      marginTop: 4,
                    }}>
                      <span>Recommended Buy Order:</span>
                      <span className="mono-num">{recommendedProcurement.toLocaleString()} MW</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* ── Vintage Chart ── */}
              <Card>
                <SectionTitle
                  subtitle={`Comparing the forecast published before ${selectedVintage.slice(0, 16).replace('T', ' ')} against what was delivered.`}
                  badge="Vintage Verification"
                >
                  Vintage Forecast vs Delivery
                </SectionTitle>

                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                      dataKey="time"
                      tick={{ fill: '#94a3b8', fontSize: 10 }}
                      tickLine={false}
                      interval={Math.floor(chartData.length / 8)}
                    />
                    <YAxis
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      tickLine={false} axisLine={false}
                      tickFormatter={v => `${(v / 1000).toFixed(0)} GW`}
                    />
                    <Tooltip
                      contentStyle={{ background: '#0c1a2e', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: 8 }}
                      formatter={(v: number) => [`${v.toLocaleString()} MW`, undefined]}
                    />
                    <Legend wrapperStyle={{ color: '#cbd5e1', fontSize: 12, paddingTop: 12 }} />
                    <Line type="monotone" dataKey="actual"  name="Actual Wind Delivered (FUELHH)" stroke="#10b981" strokeWidth={2.5} dot={false} connectNulls />
                    <Line type="monotone" dataKey="vintage" name="Simulated Vintage Forecast" stroke="#a855f7" strokeWidth={2} dot={false} connectNulls strokeDasharray="5 3" />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </>
          )}
        </>
      )}

      {/* ── Available Vintages Log ── */}
      <Card>
        <SectionTitle
          subtitle="All publication batches issued by Elexon for January 2026."
          badge="Audit Registry"
        >
          Forecast Publish History (WINDFOR Vintages)
        </SectionTitle>

        <div style={{ overflowX: 'auto', maxHeight: 280, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead style={{ position: 'sticky', top: 0, background: '#111e33', zIndex: 1 }}>
              <tr style={{ color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ padding: '9px 14px', textAlign: 'left', fontWeight: 600 }}>Target Settlement Date</th>
                <th style={{ padding: '9px 14px', textAlign: 'left', fontWeight: 600 }}>Forecast Cycles Issued</th>
                <th style={{ padding: '9px 14px', textAlign: 'left', fontWeight: 600 }}>Earliest Publish</th>
                <th style={{ padding: '9px 14px', textAlign: 'left', fontWeight: 600 }}>Latest Publish</th>
              </tr>
            </thead>
            <tbody>
              {vintages.data.map((v, i) => (
                <tr key={v.targetDate} style={{
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                }}>
                  <td className="mono-num" style={{ padding: '8px 14px', color: '#cbd5e1', fontWeight: 600 }}>{v.targetDate}</td>
                  <td style={{ padding: '8px 14px', color: '#38bdf8' }}>{v.publishTimes.length} updates</td>
                  <td className="mono-num" style={{ padding: '8px 14px', color: '#94a3b8' }}>{v.publishTimes[0]?.slice(0, 16).replace('T', ' ') ?? '—'}</td>
                  <td className="mono-num" style={{ padding: '8px 14px', color: '#94a3b8' }}>{v.publishTimes[v.publishTimes.length - 1]?.slice(0, 16).replace('T', ' ') ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
