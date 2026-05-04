import { useState, useEffect, useCallback, useRef } from 'react';

export interface KeyStats {
  countA: number;
  countD: number;
  total: number;
  totalA: number;
  totalD: number;
  apm: number;
  lastPressTime: number | null;
  lastPressTimeA: number | null;
  lastPressTimeD: number | null;
  lastInterval: number;
  lastIntervalA: number;
  lastIntervalD: number;
  averageInterval: number;
  averageIntervalA: number;
  averageIntervalD: number;
  expectedKey: 'A' | 'D';
  history: { time: number; key: 'A' | 'D'; interval?: number }[];
}

export const useKeyTracker = (toleranceMs: number = 0) => {
  const [stats, setStats] = useState<KeyStats>({
    countA: 0,
    countD: 0,
    total: 0,
    totalA: 0,
    totalD: 0,
    apm: 0,
    lastPressTime: null,
    lastPressTimeA: null,
    lastPressTimeD: null,
    lastInterval: 0,
    lastIntervalA: 0,
    lastIntervalD: 0,
    averageInterval: 0,
    averageIntervalA: 0,
    averageIntervalD: 0,
    expectedKey: 'A',
    history: [],
  });

  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const activeKeysRef = useRef<Set<string>>(new Set());
  const historyRef = useRef<{ time: number; key: 'A' | 'D'; interval?: number }[]>([]);
  const lastPressRef = useRef<{ [key: string]: number }>({ A: 0, D: 0 });
  const prevPressTimeRef = useRef<number | null>(null);
  const expectedKeyRef = useRef<'A' | 'D'>('A');

  // Use performance.now() for high-resolution timing
  const getNow = () => performance.now();

  // Use a ref for stats to avoid triggering re-renders too frequently
  const statsRef = useRef<KeyStats>(stats);

  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  // Throttled stats update to prevent UI bottleneck during rapid key presses
  const pendingUpdateRef = useRef<boolean>(false);
  const triggerUIUpdate = useCallback(() => {
    if (pendingUpdateRef.current) return;
    pendingUpdateRef.current = true;
    
    // Use requestAnimationFrame for smooth UI sync at ~60fps max
    requestAnimationFrame(() => {
      // Only sync active keys and basic counts immediately for feedback
      // Performance-heavy history and averages sync via the timer loop (300ms)
      setActiveKeys(new Set(activeKeysRef.current));
      setStats(prev => ({
        ...prev,
        total: statsRef.current.total,
        countA: statsRef.current.countA,
        countD: statsRef.current.countD,
        lastInterval: statsRef.current.lastInterval,
        expectedKey: statsRef.current.expectedKey,
        lastPressTime: statsRef.current.lastPressTime
      }));
      pendingUpdateRef.current = false;
    });
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore if typing in an input/textarea
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    
    const key = e.key.toUpperCase();
    if (key !== 'A' && key !== 'D') return;

    const now = getNow();
    const isFirstPress = prevPressTimeRef.current === null;
    
    // Always update the spam filter regardless of whether it's expected
    if (now - lastPressRef.current[key] < 30) return; 
    lastPressRef.current[key] = now;

    if (activeKeysRef.current.has(key)) return;

    const isExpected = key === expectedKeyRef.current || isFirstPress;

    activeKeysRef.current.add(key);

    if (isExpected) {
      const interval = prevPressTimeRef.current ? now - prevPressTimeRef.current : 0;
      
      if (historyRef.current.length > 200) {
        historyRef.current.shift();
      }
      const newHistoryItem = { time: now, key: key as 'A' | 'D', interval: Math.round(interval) };
      historyRef.current.push(newHistoryItem);
      
      const isA = key === 'A';
      prevPressTimeRef.current = now;
      expectedKeyRef.current = isA ? 'D' : 'A';

      const prev = statsRef.current;
      const alpha = 0.25;
      const newAvg = prev.averageInterval === 0 ? interval : (prev.averageInterval * (1 - alpha) + interval * alpha);
      const newAvgA = isA ? (prev.averageIntervalA === 0 ? interval : (prev.averageIntervalA * (1 - alpha) + interval * alpha)) : prev.averageIntervalA;
      const newAvgD = !isA ? (prev.averageIntervalD === 0 ? interval : (prev.averageIntervalD * (1 - alpha) + interval * alpha)) : prev.averageIntervalD;

      const nextStats: KeyStats = {
        ...prev,
        countA: isA ? prev.countA + 1 : prev.countA,
        countD: !isA ? prev.countD + 1 : prev.countD,
        total: prev.total + 1,
        totalA: isA ? prev.totalA + 1 : prev.totalA,
        totalD: !isA ? prev.totalD + 1 : prev.totalD,
        lastPressTime: now,
        lastPressTimeA: isA ? now : prev.lastPressTimeA,
        lastPressTimeD: !isA ? now : prev.lastPressTimeD,
        lastInterval: Math.round(interval),
        lastIntervalA: isA ? Math.round(interval) : prev.lastIntervalA,
        lastIntervalD: !isA ? Math.round(interval) : prev.lastIntervalD,
        averageInterval: Math.round(newAvg),
        averageIntervalA: Math.round(newAvgA),
        averageIntervalD: Math.round(newAvgD),
        expectedKey: expectedKeyRef.current,
        // We update history only by timer to save CPU
      };

      statsRef.current = nextStats;
    }
    
    triggerUIUpdate();
  }, [triggerUIUpdate]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    const key = e.key.toUpperCase();
    if (key === 'A' || key === 'D') {
      if (activeKeysRef.current.has(key)) {
        activeKeysRef.current.delete(key);
        triggerUIUpdate();
      }
    }
  }, [triggerUIUpdate]);

  // Reset sequence after 3000ms of inactivity - Throttle to 2000ms check
  useEffect(() => {
    const checkReset = setInterval(() => {
      const now = performance.now();
      const currentStats = statsRef.current;
      if (currentStats.lastPressTime && now - currentStats.lastPressTime > 3000) {
        prevPressTimeRef.current = null;
        expectedKeyRef.current = 'A';
        activeKeysRef.current.clear();
        
        const nextStats = { ...currentStats, expectedKey: 'A' as const };
        statsRef.current = nextStats;
        triggerUIUpdate();
      }
    }, 2000);
    return () => clearInterval(checkReset);
  }, [triggerUIUpdate]);

  const clearKeys = useCallback(() => {
    activeKeysRef.current.clear();
    setActiveKeys(new Set());
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    // Electron Global Hook integration
    let removeElectronListener: (() => void) | undefined;
    
    if (window.electronAPI) {
      console.log('Electron API detected, setting up global hooks...');
      removeElectronListener = window.electronAPI.onGlobalKey((event: any) => {
        // Create a fake KeyboardEvent-like object that our handler understands
        const fakeEvent = {
          key: event.key.toUpperCase(),
          target: document.body,
          preventDefault: () => {},
          stopPropagation: () => {},
        } as unknown as KeyboardEvent;
        
        if (event.type === 'keydown') {
          handleKeyDown(fakeEvent);
        } else {
          handleKeyUp(fakeEvent);
        }
      });
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', clearKeys);
      window.removeEventListener('focus', clearKeys);
      if (removeElectronListener) removeElectronListener();
    };
  }, [handleKeyDown, handleKeyUp, clearKeys]);

  // APM and History Sync Loop - Decoupled from keyboard events for performance
  useEffect(() => {
    const timer = setInterval(() => {
      const now = performance.now();
      const windowStart = now - 60000;
      
      const filtered = historyRef.current.filter(h => h.time > windowStart);
      if (filtered.length !== historyRef.current.length) {
        historyRef.current = filtered;
      }
      
      setStats(prev => {
        // Only update if something changed to avoid unnecessary re-renders
        const nextApm = historyRef.current.length;
        const nextHistory = [...historyRef.current].slice(-50);
        
        // Use a simple check if history has changed (e.g. by total count)
        if (prev.apm === nextApm && prev.total === statsRef.current.total) {
          return prev;
        }
            
        return {
          ...statsRef.current,
          apm: nextApm,
          history: nextHistory
        };
      });
    }, 300); 

    return () => clearInterval(timer);
  }, []);

  const resetStats = () => {
    historyRef.current = [];
    prevPressTimeRef.current = null;
    expectedKeyRef.current = 'A';
    activeKeysRef.current.clear();
    setActiveKeys(new Set());
    setStats({
      countA: 0,
      countD: 0,
      total: 0,
      totalA: 0,
      totalD: 0,
      apm: 0,
      lastPressTime: null,
      lastPressTimeA: null,
      lastPressTimeD: null,
      lastInterval: 0,
      lastIntervalA: 0,
      lastIntervalD: 0,
      averageInterval: 0,
      averageIntervalA: 0,
      averageIntervalD: 0,
      expectedKey: 'A',
      history: [],
    });
  };

  return { stats, activeKeys, resetStats };
};
