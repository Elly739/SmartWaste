import { useState, useEffect } from 'react';

export interface NetworkState {
  isOnline: boolean;
  isSlow: boolean;
  effectiveType: string;
  downlink: number;
}

export function useNetwork(): NetworkState {
  const [state, setState] = useState<NetworkState>({
    isOnline: navigator.onLine,
    isSlow: false,
    effectiveType: '4g',
    downlink: 10,
  });

  useEffect(() => {
    const updateState = () => {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

      setState({
        isOnline: navigator.onLine,
        isSlow: connection ? connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g' : false,
        effectiveType: connection?.effectiveType || '4g',
        downlink: connection?.downlink || 10,
      });
    };

    updateState();

    window.addEventListener('online', updateState);
    window.addEventListener('offline', updateState);

    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', updateState);
    }

    return () => {
      window.removeEventListener('online', updateState);
      window.removeEventListener('offline', updateState);
      if (connection) {
        connection.removeEventListener('change', updateState);
      }
    };
  }, []);

  return state;
}

// Offline indicator component
export function OfflineIndicator() {
  const { isOnline, isSlow } = useNetwork();

  if (isOnline && !isSlow) return null;

  return (
    <div className={`fixed top-14 lg:top-0 left-0 right-0 z-50 px-4 py-2 text-center text-sm font-bold animate-fade-in ${
      !isOnline
        ? 'bg-red-500/95 text-white'
        : 'bg-amber-500/95 text-amber-950'
    }`}
    style={{ paddingTop: 'calc(3.5rem + env(safe-area-inset-top, 0px))' }}>
      {!isOnline ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="w-4 h-4 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.74m1.414 4.242a9.016 9.016 0 01-2.141-4.243m-2.828-2.828a5 5 0 017.072 0m0 0L8.464 9.536M5.636 5.636a9 9 0 1012.728 0" />
          </svg>
          You're offline — some features may be limited
        </span>
      ) : (
        <span>Slow connection detected — optimizing for speed</span>
      )}
    </div>
  );
}
