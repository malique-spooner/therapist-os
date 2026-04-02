'use client';

import { useCallback, useEffect, useState } from 'react';

export function useApiQuery<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const next = await fetcher();
      setData(next);
      return next;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, isLoading, error, refetch, setData };
}
