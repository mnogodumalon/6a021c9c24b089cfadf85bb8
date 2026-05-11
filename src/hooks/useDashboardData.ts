import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Testeingabe } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [testeingabe, setTesteingabe] = useState<Testeingabe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [testeingabeData] = await Promise.all([
        LivingAppsService.getTesteingabe(),
      ]);
      setTesteingabe(testeingabeData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [testeingabeData] = await Promise.all([
          LivingAppsService.getTesteingabe(),
        ]);
        setTesteingabe(testeingabeData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  return { testeingabe, setTesteingabe, loading, error, fetchAll };
}