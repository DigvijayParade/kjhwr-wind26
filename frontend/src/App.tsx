import { useState } from 'react';
import {
  Wind, BarChart2, TrendingUp, Layers, Activity,
  Info, ShieldCheck, Zap, HelpCircle, ExternalLink, Sparkles
} from 'lucide-react';
import type { TabId } from './types';
import type { DataScope } from './api';
import OverviewTab from './components/OverviewTab';
import ForecastChart from './components/ForecastChart';
import ErrorMetrics from './components/ErrorMetrics';
import DecisionSummary from './components/DecisionSummary';

const TABS: { id: TabId; label: string; icon: React.ReactNode; desc: string; badge: string }[] = [
  { id: 'overview',  label: 'Executive Overview',   icon: <Activity size={18} />,  desc: 'Key KPIs & summary insights', badge: 'Summary' },
  { id: 'forecast',  label: 'Forecast vs Actuals',  icon: <TrendingUp size={18} />, desc: 'Compare predictions to reality', badge: 'Time Series' },
  { id: 'errors',    label: 'Accuracy & Error Drilldown', icon: <BarChart2 size={18} />, desc: 'MAE, RMSE, and error trends', badge: 'Quantified Error' },
  { id: 'decision',  label: 'Day-Ahead Decision Desk', icon: <Layers size={18} />, desc: 'Simulate trading decision point', badge: 'Simulation' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [scope, setScope] = useState<DataScope>('jan2026');
  const activeTabInfo = TABS.find(t => t.id === activeTab)!;

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #070d19 0%, #0a1426 50%, #091220 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* ── Global Sky & Wind Atmosphere Background ── */}
      <div style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: '100%',
        height: '380px',
        background: 'radial-gradient(ellipse 80% 50% at 70% -20%, rgba(14, 165, 233, 0.15), transparent 70%), radial-gradient(ellipse 60% 40% at 30% -10%, rgba(16, 185, 129, 0.08), transparent 60%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* ── Sidebar ── */}
      <aside style={{
        width: 280,
        background: 'rgba(10, 18, 33, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        zIndex: 10,
      }}>
        {/* Sky + Windmill Brand Header */}
        <div style={{
          position: 'relative',
          padding: '24px 20px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'linear-gradient(180deg, rgba(14, 165, 233, 0.12) 0%, rgba(15, 23, 42, 0) 100%)',
          overflow: 'hidden',
        }}>
          {/* Animated Sky Windmill Silhouettes in Sidebar */}
          <svg style={{ position: 'absolute', right: 6, bottom: 0, opacity: 0.28, pointerEvents: 'none' }} width="130" height="95" viewBox="0 0 130 95">
            {/* Turbine 1 */}
            <polygon points="48,95 52,95 51,35 49,35" fill="#38bdf8" />
            <g transform="translate(50,35)" className="spin-fast">
              <ellipse cx="0" cy="-24" rx="3.5" ry="24" fill="#38bdf8" />
              <ellipse cx="0" cy="-24" rx="3.5" ry="24" fill="#38bdf8" transform="rotate(120)" />
              <ellipse cx="0" cy="-24" rx="3.5" ry="24" fill="#38bdf8" transform="rotate(240)" />
              <circle cx="0" cy="0" r="4.5" fill="#f8fafc" />
            </g>
            {/* Turbine 2 */}
            <polygon points="98,95 101,95 100,50 99,50" fill="#94a3b8" />
            <g transform="translate(100,50)" className="spin-slow">
              <ellipse cx="0" cy="-16" rx="2.5" ry="16" fill="#94a3b8" />
              <ellipse cx="0" cy="-16" rx="2.5" ry="16" fill="#94a3b8" transform="rotate(120)" />
              <ellipse cx="0" cy="-16" rx="2.5" ry="16" fill="#94a3b8" transform="rotate(240)" />
              <circle cx="0" cy="0" r="3" fill="#cbd5e1" />
            </g>
            {/* Hill line */}
            <path d="M0,95 Q50,88 130,95" fill="none" stroke="#334155" strokeWidth="2" />
          </svg>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
            <div style={{
              background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
              borderRadius: 12,
              padding: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 25px rgba(14, 165, 233, 0.45)',
            }}>
              <Wind size={24} color="#ffffff" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17, color: '#f8fafc', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 6 }}>
                AeroCast <span style={{ color: '#38bdf8', fontSize: 13, background: 'rgba(56,189,248,0.15)', padding: '2px 6px', borderRadius: 6 }}>UK</span>
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                Wind Procurement Intelligence
              </div>
            </div>
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: 20,
            padding: '3px 10px',
            marginTop: 14,
            fontSize: 11,
            color: '#34d399',
            fontWeight: 500,
          }}>
            <span className="pulse-dot" />
            January 2026 Elexon BMRS Live
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ padding: '16px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 10, color: '#475569', padding: '0 10px 4px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            WORKSPACE MODULES
          </div>

          {TABS.map(tab => {
            const active = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: active ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent',
                  background: active ? 'linear-gradient(90deg, rgba(14, 165, 233, 0.18), rgba(14, 165, 233, 0.05))' : 'transparent',
                  color: active ? '#f8fafc' : '#94a3b8',
                  fontWeight: active ? 600 : 500,
                  fontSize: 13,
                  textAlign: 'left',
                  cursor: 'pointer',
                  position: 'relative',
                }}
              >
                <div style={{ color: active ? '#38bdf8' : '#64748b' }}>
                  {tab.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: active ? '#ffffff' : '#cbd5e1' }}>{tab.label}</div>
                  <div style={{ fontSize: 10.5, color: active ? '#7dd3fc' : '#64748b', marginTop: 1 }}>
                    {tab.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>

        {/* UK Utility Context Box */}
        <div style={{
          margin: '0 14px 16px',
          padding: '14px',
          background: 'rgba(15, 25, 45, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: 10,
          fontSize: 11,
          color: '#94a3b8',
          lineHeight: 1.5,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#38bdf8', fontWeight: 600, marginBottom: 4 }}>
            <Zap size={13} />
            Market Balancing Mechanism
          </div>
          UK day-ahead auctions close at 12:00 UTC. Procurement desks buy thermal power to cover consumer demand minus forecast wind generation to prevent high cashout penalties.
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          fontSize: 11,
          color: '#475569',
          display: 'flex',
          justifyContent: 'space-between',
        }}>
          <span>National Grid Elexon</span>
          <span>Docker Ready</span>
        </div>
      </aside>

      {/* ── Main Content Area with Sky Panorama ── */}
      <main style={{ flex: 1, overflow: 'auto', minWidth: 0, position: 'relative', zIndex: 1 }}>
        {/* Top Atmosphere Banner with Wind Turbines & Cloudscape */}
        <div style={{
          position: 'relative',
          padding: '28px 36px 24px',
          background: 'linear-gradient(180deg, rgba(12, 28, 52, 0.85) 0%, rgba(9, 18, 32, 0.4) 100%)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          overflow: 'hidden',
        }}>
          {/* Panoramic Wind Turbine Silhouette Backdrop */}
          <svg style={{ position: 'absolute', right: 20, top: 0, height: '100%', opacity: 0.15, pointerEvents: 'none' }} viewBox="0 0 500 120" preserveAspectRatio="none">
            {/* Turbine A */}
            <polygon points="380,120 383,120 382,30 381,30" fill="#38bdf8" />
            <g transform="translate(381.5,30)" className="spin-fast">
              <ellipse cx="0" cy="-28" rx="4" ry="28" fill="#38bdf8" />
              <ellipse cx="0" cy="-28" rx="4" ry="28" fill="#38bdf8" transform="rotate(120)" />
              <ellipse cx="0" cy="-28" rx="4" ry="28" fill="#38bdf8" transform="rotate(240)" />
              <circle cx="0" cy="0" r="5" fill="#f8fafc" />
            </g>
            {/* Turbine B */}
            <polygon points="440,120 443,120 442,50 441,50" fill="#94a3b8" />
            <g transform="translate(441.5,50)" className="spin-slow">
              <ellipse cx="0" cy="-20" rx="3" ry="20" fill="#94a3b8" />
              <ellipse cx="0" cy="-20" rx="3" ry="20" fill="#94a3b8" transform="rotate(120)" />
              <ellipse cx="0" cy="-20" rx="3" ry="20" fill="#94a3b8" transform="rotate(240)" />
              <circle cx="0" cy="0" r="4" fill="#cbd5e1" />
            </g>
            {/* Soft rolling hills */}
            <path d="M0,120 Q150,90 300,110 T500,105 L500,120 Z" fill="rgba(15, 23, 42, 0.4)" />
          </svg>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em', margin: 0 }}>
                  {activeTabInfo.label}
                </h1>
                <span style={{
                  background: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  color: '#38bdf8',
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 12,
                }}>
                  {activeTabInfo.badge}
                </span>
              </div>
              <p style={{ color: '#94a3b8', marginTop: 6, fontSize: 13, maxWidth: 640 }}>
                {activeTabInfo.desc} · National Grid Wind Generation & Day-Ahead Settlement Analytics.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {/* Mode Toggle: Jan 2026 vs Live Today */}
              <div style={{
                display: 'flex',
                gap: 4,
                background: 'rgba(15, 23, 42, 0.9)',
                padding: '4px 6px',
                borderRadius: 10,
                border: '1px solid rgba(255, 255, 255, 0.12)',
              }}>
                <button
                  onClick={() => setScope('jan2026')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 7,
                    border: 'none',
                    background: scope === 'jan2026' ? '#0284c7' : 'transparent',
                    color: scope === 'jan2026' ? '#ffffff' : '#94a3b8',
                    fontSize: 12,
                    fontWeight: scope === 'jan2026' ? 700 : 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  📅 January 2026
                </button>
                <button
                  onClick={() => setScope('live')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 7,
                    border: 'none',
                    background: scope === 'live' ? 'linear-gradient(135deg, #10b981, #059669)' : 'transparent',
                    color: scope === 'live' ? '#ffffff' : '#94a3b8',
                    fontSize: 12,
                    fontWeight: scope === 'live' ? 700 : 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span className="pulse-dot" />
                  <span>⚡ Live Outturn (Today)</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Body */}
        <div style={{ padding: '28px 36px 60px' }}>
          {activeTab === 'overview'  && <OverviewTab scope={scope} />}
          {activeTab === 'forecast'  && <ForecastChart scope={scope} />}
          {activeTab === 'errors'    && <ErrorMetrics scope={scope} />}
          {activeTab === 'decision'  && <DecisionSummary scope={scope} />}
        </div>
      </main>

      {/* Turbine Blade Spin Animations */}
      <style>{`
        @keyframes rotateBlades {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .spin-fast {
          animation: rotateBlades 4s linear infinite;
          transform-origin: 0 0;
        }
        .spin-slow {
          animation: rotateBlades 8s linear infinite;
          transform-origin: 0 0;
        }
      `}</style>
    </div>
  );
}
