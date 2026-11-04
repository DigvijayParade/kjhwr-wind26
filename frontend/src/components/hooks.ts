import { useEffect, useState } from 'react';

export function useAsync<T>(
  fn: () => Promise<T>,
  deps: React.DependencyList = [],
): { data: T | null; loading: boolean; error: string | null } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fn()
      .then(d => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch(e => { if (!cancelled) { setError(String(e)); setLoading(false); } });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error };
}

export function formatMW(val: number): string {
  return `${val.toLocaleString(undefined, { maximumFractionDigits: 0 })} MW`;
}

export function formatPct(val: number): string {
  return `${val.toFixed(1)}%`;
}

export function shortDate(isoStr: string): string {
  if (!isoStr) return '';
  return isoStr.slice(5, 10); // MM-DD
}

export function shortDateTime(isoStr: string): string {
  if (!isoStr) return '';
  return isoStr.slice(0, 16).replace('T', ' ');
}
