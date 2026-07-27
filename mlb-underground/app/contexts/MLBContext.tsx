'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// The MLB Okta token flow runs server-side (see lib/mlbAuth.ts +
// /api/mlb/refresh). This provider is just a thin client: while the site is
// active it pings the refresh route on mount and on an interval, and exposes
// the {title,status} the nav's status dot renders. No MLB credentials or PKCE
// ever touch the browser. "active" is true whenever content is visible — always
// when site auth is off, or once signed in when it's on.

export interface MLBContextType {
  title: string;
  status: string;
}

interface MLBContextProviderProps {
  active: boolean;
  children: ReactNode;
}

// Re-check a bit more often than the token lifetime so the dot reflects reality.
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

const MLBContext = createContext<MLBContextType>({ title: '', status: '' });

export const MLBContextProvider = ({ active, children }: MLBContextProviderProps) => {
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('normal');

  useEffect(() => {
    if (!active) {
      return;
    }

    let cancelled = false;

    const refresh = async () => {
      try {
        const response = await fetch('/api/mlb/refresh', { method: 'POST' });
        const data = await response.json();
        if (!cancelled) {
          setTitle(data.title || '');
          setStatus(data.status || 'error');
        }
      } catch {
        if (!cancelled) {
          setStatus('error');
        }
      }
    };

    refresh();
    const id = setInterval(refresh, REFRESH_INTERVAL);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [active]);

  return <MLBContext.Provider value={{ title, status }}>{children}</MLBContext.Provider>;
};

export const useMLBContext = () => {
  return useContext(MLBContext);
};

export default useMLBContext;
