import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Info, AlertTriangle, CheckCircle2, Wind } from 'lucide-react';

interface LoadingProps {
  message?: string;
}

export function LoadingSpinner({ message = 'Loading data…' }: LoadingProps) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      minHeight: 300, gap: 16, color: '#94a3b8',
    }}>
      <div style={{ position: 'relative', width: 50, height: 50 }}>
        <div style={{
          position: 'absolute', inset: 0,
          border: '3px solid #1e3a5f',
          borderTop: '3px solid #0ea5e9',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'spinReverse 3s linear infinite',
        }}>
          <Wind size={22} color="#38bdf8" />
        </div>
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes spinReverse { to { transform: rotate(-360deg); } }
      `}</style>
      <span style={{ fontSize: 14, fontWeight: 500, color: '#cbd5e1' }}>{message}</span>
      <span style={{ fontSize: 12, color: '#64748b' }}>Pulling official records from Elexon BMRS</span>
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div style={{
      background: 'rgba(239, 68, 68, 0.1)',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      borderRadius: 10, padding: '16px 20px',
      color: '#fca5a5', fontSize: 13,
      display: 'flex', alignItems: 'flex-start', gap: 12,
    }}>
      <AlertTriangle size={20} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
      <div>
        <strong style={{ display: 'block', color: '#f87171', marginBottom: 4 }}>Error loading data</strong>
        <span>{message}</span>
      </div>
    </div>
  );
}

export function Card({
  children, style, className = '',
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        background: 'rgba(30, 41, 59, 0.75)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 14,
        padding: '22px 24px',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.25)',
        transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function KpiCard({
  label, value, unit, sub, plainMeaning, color = '#0ea5e9', icon,
}: {
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
  plainMeaning?: string;
  color?: string;
  icon?: React.ReactNode;
}) {
  return (
    <Card style={{ flex: 1, minWidth: 220, borderTop: `3px solid ${color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </div>
        {icon && <div style={{ color }}>{icon}</div>}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 30, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>{value}</span>
        {unit && <span style={{ fontSize: 14, fontWeight: 600, color }}>{unit}</span>}
      </div>

      {sub && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{sub}</div>}

      {plainMeaning && (
        <div style={{
          marginTop: 10,
          paddingTop: 8,
          borderTop: '1px dashed rgba(255,255,255,0.08)',
          fontSize: 11,
          color: '#38bdf8',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
        }}>
          <Info size={13} style={{ flexShrink: 0 }} />
          <span>{plainMeaning}</span>
        </div>
      )}
    </Card>
  );
}

export function SectionTitle({
  children, subtitle, badge,
}: {
  children: React.ReactNode;
  subtitle?: string;
  badge?: string;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <h2 style={{
          fontSize: 16, fontWeight: 700, color: '#f8fafc',
          letterSpacing: '-0.01em', margin: 0,
        }}>{children}</h2>
        {badge && (
          <span style={{
            background: 'rgba(14, 165, 233, 0.15)',
            border: '1px solid rgba(14, 165, 233, 0.3)',
            color: '#38bdf8',
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            padding: '2px 8px',
            borderRadius: 20,
          }}>
            {badge}
          </span>
        )}
      </div>
      {subtitle && (
        <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 4, margin: '4px 0 0' }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

/**
 * ExplainerBox: designed to provide intuitive, plain-language guidance.
 * Breaks down any chart or metric in plain terms.
 */
export function ExplainerBox({
  title = "🧐 How to read this (Plain English Guide)",
  whatIsIt,
  whyItMatters,
  example,
  defaultOpen = false,
}: {
  title?: string;
  whatIsIt: string;
  whyItMatters: string;
  example?: string;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div style={{
      background: 'rgba(15, 31, 53, 0.6)',
      border: '1px solid rgba(56, 189, 248, 0.2)',
      borderRadius: 10,
      margin: '14px 0',
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 14px',
          background: 'rgba(56, 189, 248, 0.05)',
          border: 'none',
          color: '#38bdf8',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <HelpCircle size={15} color="#38bdf8" />
          {title}
        </span>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {isOpen && (
        <div style={{
          padding: '14px 16px',
          fontSize: 12,
          lineHeight: 1.6,
          color: '#cbd5e1',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          borderTop: '1px solid rgba(56, 189, 248, 0.1)',
        }}>
          <div>
            <strong style={{ color: '#f8fafc' }}>📊 What you are looking at: </strong>
            <span>{whatIsIt}</span>
          </div>
          <div>
            <strong style={{ color: '#38bdf8' }}>💡 Why it matters for buying electricity: </strong>
            <span>{whyItMatters}</span>
          </div>
          {example && (
            <div style={{
              background: 'rgba(2, 132, 199, 0.1)',
              padding: '8px 12px',
              borderRadius: 6,
              borderLeft: '3px solid #0284c7',
              color: '#bae6fd',
              fontSize: 11.5,
            }}>
              <strong>Takeaway example: </strong>{example}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function NoData({ message = 'No data available for January 2026.' }: { message?: string }) {
  return (
    <div style={{
      color: '#94a3b8',
      padding: '50px 20px',
      textAlign: 'center',
      background: 'rgba(30, 41, 59, 0.5)',
      borderRadius: 12,
      border: '1px dashed #334155',
    }}>
      <Wind size={36} color="#64748b" style={{ margin: '0 auto 12px', opacity: 0.7 }} />
      <div style={{ fontSize: 14, fontWeight: 600, color: '#cbd5e1' }}>{message}</div>
      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
        Check connection to Elexon BMRS API or try refreshing.
      </div>
    </div>
  );
}
