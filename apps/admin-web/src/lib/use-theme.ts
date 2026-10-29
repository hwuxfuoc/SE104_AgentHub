import { useCallback, useEffect, useState } from 'react';

const KEY = 'agenthub.admin.theme';

export function useTheme() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem(KEY);
    return saved ? saved === 'dark' : window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem(KEY, dark ? 'dark' : 'light');
  }, [dark]);

  const toggle = useCallback(() => setDark((d) => !d), []);
  return { dark, toggle };
}
