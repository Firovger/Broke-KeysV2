/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useCallback, useRef, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Keyboard, 
  Activity, 
  Settings, 
  RefreshCcw, 
  Zap, 
  Github,
  ChevronUp,
  Monitor,
  Volume2,
  VolumeX,
  Clock,
  Save,
  RefreshCw,
  Trash2,
  Gamepad2,
  X,
  Info,
  Minus,
  Move,
  Eye,
  EyeOff,
  Maximize2
} from 'lucide-react';
import { useKeyTracker } from './hooks/useKeyTracker';
import { ClockProvider, useClockContext } from './contexts/ClockContext';

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [themeColor, setThemeColor] = useState('#F97316'); // Default Orange
  const [intervalMs, setIntervalMs] = useState(1000);
  const [toleranceMs, setToleranceMs] = useState(0);
  const [targetIntervalAD, setTargetIntervalAD] = useState(200);
  const [targetIntervalDA, setTargetIntervalDA] = useState(200);
  const [isCompact, setIsCompact] = useState(false);
  const [isOverlay, setIsOverlay] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [isStealthMode, setIsStealthMode] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isGTARunning, setIsGTARunning] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 1000, height: 700 });
  const [profiles, setProfiles] = useState<{name: string, settings: any}[]>([]);
  const [scaleFactor, setScaleFactor] = useState(1);
  const [isAutoScale, setIsAutoScale] = useState(true);

  // Sync stealth mode with Electron's mouse-ignore setting
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.setIgnoreMouse(isStealthMode);
    }
  }, [isStealthMode]);

  // Auto-scaling logic
  useEffect(() => {
    const handleResize = () => {
      if (!isAutoScale) return;
      
      const baseW = 1000;
      const baseH = 700;
      const sw = window.innerWidth / baseW;
      const sh = window.innerHeight / baseH;
      
      // Calculate scale to fit content while maintaining aspect ratio
      const scale = Math.max(0.4, Math.min(sw, sh, 2)); 
      setScaleFactor(scale);
    };
    
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call
    return () => window.removeEventListener('resize', handleResize);
  }, [isAutoScale]);

  const viewportRef = useRef<HTMLDivElement>(null);

  // GTA detection effect
  useEffect(() => {
    let unsubs: (() => void)[] = [];
    if (window.electronAPI) {
      unsubs.push(window.electronAPI.onGTAStatus((isRunning) => {
        setIsGTARunning(isRunning);
      }));
      if (window.electronAPI.onDisplayResize) {
        unsubs.push(window.electronAPI.onDisplayResize((size: { width: number, height: number }) => {
          console.log('Display resized:', size);
        }));
      }
    }
    return () => unsubs.forEach(u => u());
  }, []);

  // Window resize effect
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.setWindowSize(windowSize.width, windowSize.height);
    }
  }, [windowSize]);

  // Toggle overlay click-through
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.setIgnoreMouse(isOverlay);
    }
  }, [isOverlay]);

  useEffect(() => {
    if (window.electronAPI) {
      const unsub = window.electronAPI.onToggleOverlay(() => {
        setIsOverlay(prev => {
          const next = !prev;
          // When toggling via hotkey, we might want to show HUD if it was hidden
          if (next) setShowControls(true);
          return next;
        });
      });
      return () => unsub();
    }
  }, []);

  const [isFocused, setIsFocused] = useState(document.hasFocus());

  useEffect(() => {
    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => setIsFocused(false);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F3') {
        e.preventDefault();
        setIsSidebarOpen(prev => !prev);
      }
      if (e.key === 'F4') {
        e.preventDefault();
        setIsStealthMode(prev => !prev);
      }
      if (e.key === 'F5') {
        e.preventDefault();
        resetStats();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const { stats, activeKeys, resetStats } = useKeyTracker(toleranceMs);
 
   // Load basic settings on mount
  useEffect(() => {
    const saved = localStorage.getItem('broke-keys-config');
    if (saved) {
      const config = JSON.parse(saved);
      if (config.targetIntervalAD) setTargetIntervalAD(Number(config.targetIntervalAD));
      if (config.targetIntervalDA) setTargetIntervalDA(Number(config.targetIntervalDA));
      if (config.toleranceMs) setToleranceMs(config.toleranceMs);
      if (config.themeColor) setThemeColor(config.themeColor);
      if (config.soundEnabled) setSoundEnabled(config.soundEnabled);
      if (config.windowSize) setWindowSize(config.windowSize);
      if (config.scaleFactor) setScaleFactor(config.scaleFactor);
      if (config.isAutoScale !== undefined) setIsAutoScale(config.isAutoScale);
    }

    const savedProfiles = localStorage.getItem('broke-keys-profiles');
    if (savedProfiles) setProfiles(JSON.parse(savedProfiles));
  }, []);

  // Performance Optimization: Removing frame-by-frame state updates from main App component
  // We'll move the runner and display ms into a sub-component

  // Auto-save basic settings
  useEffect(() => {
    localStorage.setItem('broke-keys-config', JSON.stringify({
      targetIntervalAD,
      targetIntervalDA,
      toleranceMs,
      themeColor,
      soundEnabled,
      windowSize,
      scaleFactor,
      isAutoScale
    }));
  }, [targetIntervalAD, targetIntervalDA, toleranceMs, themeColor, soundEnabled, windowSize, scaleFactor, isAutoScale]);

  const saveProfile = (name: string) => {
    const newProfiles = [...profiles, {
      name,
      settings: { targetIntervalAD, targetIntervalDA, toleranceMs, themeColor, soundEnabled }
    }];
    setProfiles(newProfiles);
    localStorage.setItem('broke-keys-profiles', JSON.stringify(newProfiles));
  };

  const loadProfile = (profile: any) => {
    setTargetIntervalAD(profile.settings.targetIntervalAD || profile.settings.targetIntervalA || 200);
    setTargetIntervalDA(profile.settings.targetIntervalDA || profile.settings.targetIntervalD || 200);
    setToleranceMs(profile.settings.toleranceMs);
    setThemeColor(profile.settings.themeColor);
    setSoundEnabled(profile.settings.soundEnabled);
  };

  const deleteProfile = (index: number) => {
    const newProfiles = profiles.filter((_, i) => i !== index);
    setProfiles(newProfiles);
    localStorage.setItem('broke-keys-profiles', JSON.stringify(newProfiles));
  };

  const isIntervalPerfect = useMemo(() => {
    // If next is D, we just hit A. The target for DA (D to A) just finished? No.
    // stats.expectedKey is 'D' means we are waiting for D (movement is A -> D).
    // stats.expectedKey is 'A' means we are waiting for A (movement is D -> A).
    // If we are NOW waiting for A, it means we JUST hit D.
    // The interval just completed was A -> D (targetIntervalAD).
    const lastTarget = Math.max(1, stats.expectedKey === 'A' ? targetIntervalAD : targetIntervalDA);
    if (stats.total <= 1 || stats.lastInterval === 0) return true;
    const diff = Math.abs(stats.lastInterval - lastTarget);
    return diff <= (lastTarget * 0.15);
  }, [stats.lastInterval, targetIntervalAD, targetIntervalDA, stats.total, stats.expectedKey]);

  const isIntervalPerfectA = isIntervalPerfect;
  const isIntervalPerfectD = isIntervalPerfect;

  const activeThemeColor = isIntervalPerfect ? themeColor : '#EF4444';

  const toggleFullscreen = () => {
    const doc = document as any;
    const docEl = document.documentElement as any;

    const isFullscreen = !!(doc.fullscreenElement || doc.mozFullScreenElement || doc.webkitFullscreenElement || doc.msFullscreenElement);

    if (!isFullscreen) {
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch((err: any) => console.warn("Fullscreen request failed", err));
      } else if (docEl.mozRequestFullScreen) {
        docEl.mozRequestFullScreen();
      } else if (docEl.webkitRequestFullscreen) {
        docEl.webkitRequestFullscreen();
      } else if (docEl.msRequestFullscreen) {
        docEl.msRequestFullscreen();
      }
    } else {
      if (doc.exitFullscreen) {
        doc.exitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        doc.mozCancelFullScreen();
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      } else if (doc.msExitFullscreen) {
        doc.msExitFullscreen();
      }
    }
  };

  const audioCtxRef = useRef<AudioContext | null>(null);
  
  const playTone = useCallback((freq: number, type: 'perfect' | 'miss') => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      if (type === 'perfect') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq * 1.5, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
      } else {
        osc.type = 'sawtooth'; // Rougher sound for miss
        osc.frequency.setValueAtTime(freq * 0.5, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.1);
      }
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) {
      console.error("Audio failed", e);
    }
  }, [soundEnabled]);

  const lastTotalRef = useRef(0);
  useEffect(() => {
    if (stats.total === 0) {
      lastTotalRef.current = 0;
      return;
    }

    if (stats.total > lastTotalRef.current) {
      const lastKey = stats.history[stats.history.length - 1]?.key;
      const type = isIntervalPerfect ? 'perfect' : 'miss';
      if (lastKey === 'A') playTone(440, type);
      if (lastKey === 'D') playTone(540, type);
      lastTotalRef.current = stats.total;
    }
  }, [stats.total, isIntervalPerfect, playTone, stats.history]);


  const resetAllSettings = () => {
    if (confirm('Are you sure you want to reset ALL settings and profiles?')) {
      localStorage.removeItem('broke-keys-config');
      localStorage.removeItem('broke-keys-profiles');
      window.location.reload();
    }
  };

  const isNanoWidth = windowSize.width < 280;
  const isTinyWidth = windowSize.width < 480;
  const isSmallWidth = windowSize.width < 720;

  return (
    <ClockProvider>
      <div 
        className={`min-h-screen font-sans selection:bg-orange-500/30 overflow-hidden transition-colors relative ${
          isOverlay ? 'bg-transparent' : 'bg-[#0A0A0B] text-[#E4E4E7]'
        }`}
        style={{ '--accent': activeThemeColor } as any}
      >
        <div className="fixed inset-0 pointer-events-none flex flex-col items-center justify-center overflow-hidden">
          {/* Main Content Area (Background) - Hidden in stealth mode */}
          <GameplayHUD 
            isStealthMode={isStealthMode}
            scaleFactor={scaleFactor}
            activeThemeColor={activeThemeColor}
            stats={stats}
            activeKeys={activeKeys}
            themeColor={themeColor}
            targetIntervalAD={targetIntervalAD}
            targetIntervalDA={targetIntervalDA}
            isIntervalPerfect={isIntervalPerfect}
            showHeatmap={showHeatmap}
          />
        </div>

      <div className="fixed inset-0 pointer-events-none z-[100]">
         {/* Unscaled floating elements outside of scaling logic */}
         {/* GTA Injected Badge */}
        <AnimatePresence>
          {isGTARunning && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-4 right-4 z-[150] pointer-events-none"
            >
              <div className="bg-emerald-500/10 backdrop-blur-md border border-emerald-500/30 px-4 py-1.5 rounded-lg flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-500 text-[10px] font-black uppercase tracking-widest font-mono">
                  GTA V Injected HUD
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ... rest of non-scaled overlays ... */}
        {/* Focus Warning */}
        <AnimatePresence>
          {!isFocused && !isStealthMode && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-x-0 top-12 flex justify-center z-[100] pointer-events-none"
            >
              <div className={`backdrop-blur-md border px-6 py-2 rounded-full flex items-center gap-3 ${
                window.electronAPI ? 'bg-orange-500/10 border-orange-500/30' : 'bg-red-500/10 border-red-500/30'
              }`}>
                <div className={`w-2 h-2 rounded-full animate-ping ${
                  window.electronAPI ? 'bg-orange-500' : 'bg-red-500'
                }`} />
                <span className={`text-xs font-black uppercase tracking-widest ${
                  window.electronAPI ? 'text-orange-500' : 'text-red-500'
                }`}>
                  {window.electronAPI ? 'Global' : 'Inactive'}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Move & Eye Buttons */}
        <AnimatePresence>
          {!showControls && !isStealthMode && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              className={`fixed ${isNanoWidth ? 'inset-x-0 bottom-4 px-4' : 'bottom-8 left-8'} z-[110] flex items-center gap-3 justify-center sm:justify-start pointer-events-auto`}
              onMouseEnter={() => isOverlay && window.electronAPI?.setIgnoreMouse(false)}
              onMouseLeave={() => isOverlay && window.electronAPI?.setIgnoreMouse(true)}
            >
              <div 
                id="move-handle"
                style={{ WebkitAppRegion: 'drag' } as any}
                className={`p-3 sm:p-4 rounded-2xl bg-zinc-900/90 backdrop-blur-xl border border-white/20 cursor-move hover:bg-black transition-all shadow-2xl flex items-center justify-center active:scale-95`}
                title="Drag to move"
              >
                <Move className="w-5 h-5 text-white/60 pointer-events-none" />
              </div>
              <button 
                onClick={() => setShowControls(true)}
                className={`flex-1 sm:flex-none p-3 sm:p-5 rounded-2xl bg-emerald-500 border border-emerald-400 hover:bg-emerald-400 transition-all group shadow-2xl flex items-center justify-center gap-3`}
                style={{ WebkitAppRegion: 'no-drag' } as any}
                title="Show HUD"
              >
                <Eye className="w-5 h-5 sm:w-6 h-6 text-black" />
                {!isNanoWidth && <span className="text-xs sm:text-sm text-black font-black uppercase tracking-[0.2em] pr-2">Show HUD</span>}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stealth Mode Indicator */}
        <AnimatePresence>
          {isStealthMode && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center z-[200] pointer-events-none"
            >
              <div style={{ transform: `scale(${scaleFactor})`, transformOrigin: 'center' }}>
                <StealthMetronome 
                  stats={stats} 
                  themeColor={themeColor} 
                  targetIntervalAD={targetIntervalAD} 
                  targetIntervalDA={targetIntervalDA} 
                  activeKeys={activeKeys} 
                />
              </div>
              
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 pointer-events-none text-center">
                <MetronomeTiny stats={stats} themeColor={themeColor} isIntervalPerfect={isIntervalPerfect} />
                <div className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest opacity-30 mt-1">Stealth (F4 to exit)</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Dashboard - Fixed at bottom, independently scaled if needed?
          User said interface should disappear when scaling.
      */}
      <AnimatePresence mode="wait">
        {showControls && !isStealthMode && (
          <motion.div 
            key="hud-dashboard"
            id="dashboard"
            initial={{ y: 50, opacity: 0 }}
            animate={{ 
              y: 0, 
              opacity: 1,
              backgroundColor: isOverlay ? '#000000CC' : (isCompact ? '#000000EE' : '#121214')
            }}
            exit={{ y: 50, opacity: 0 }}
            className={`fixed bottom-0 left-0 right-0 border-t border-white/10 z-[150] transition-all duration-300 pointer-events-auto`}
            style={{ 
              borderTopColor: !isIntervalPerfect ? '#EF444466' : undefined, 
              paddingBottom: window.electronAPI ? '2px' : '0',
              backdropFilter: isGTARunning ? 'none' : 'blur(20px)' // DISABLE BLUR DURING GAME
            }}
            onMouseEnter={() => isOverlay && window.electronAPI?.setIgnoreMouse(false)}
            onMouseLeave={() => isOverlay && window.electronAPI?.setIgnoreMouse(true)}
          >
            {/* GTA V Guidance */}
            {isGTARunning && isOverlay && (
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 pointer-events-none">
                <div className="bg-blue-600/90 text-white px-3 py-1.5 rounded-full text-[9px] font-bold shadow-2xl backdrop-blur-md flex items-center gap-2 border border-blue-400/30 whitespace-nowrap">
                  <Gamepad2 className="w-3.5 h-3.5" />
                  <span>GTA V INJECTED: RUN GAME IN "WINDOWED BORDERLESS"</span>
                  <div className="w-px h-2.5 bg-white/20" />
                  <span className="opacity-70">CTRL+SHIFT+G TO TOGGLE CLICKS</span>
                </div>
              </div>
            )}
              <div className={`mx-auto flex items-center px-4 sm:px-8 gap-4 sm:gap-12 ${isCompact || isNanoWidth ? 'h-16' : 'h-24'}`}>
                {/* Dashboard contents ... */}
                {/* Nano Mode HUD */}
                {isNanoWidth ? (
                  <div 
                    className="w-full flex items-center gap-4 px-2 h-full"
                    style={{ WebkitAppRegion: 'drag' } as any}
                  >
                    <MetronomeMini stats={stats} themeColor={themeColor} isIntervalPerfect={isIntervalPerfect} />
                    
                    <div className="w-px h-8 bg-white/10" />
                    
                    <div className="flex flex-col justify-center">
                      <span className="text-sm font-bold tabular-nums leading-none text-white/80">
                        {stats.total}
                      </span>
                      <span className="text-[8px] text-zinc-600 font-bold uppercase">Hits</span>
                    </div>

                    <div className="flex-1" />

                    {window.electronAPI && (
                      <button 
                        onClick={() => setIsOverlay(!isOverlay)}
                        className={`p-2 rounded-lg transition-colors group flex-shrink-0 ${isOverlay ? 'bg-blue-500 text-black' : 'bg-white/5 hover:bg-blue-500/20 text-zinc-500'}`}
                        style={{ WebkitAppRegion: 'no-drag' } as any}
                        title={isOverlay ? "Disable Click-through (Ctrl+Shift+G)" : "Enable Click-through Overlay"}
                      >
                        <Gamepad2 className={`w-5 h-5 ${isOverlay ? 'text-black' : 'group-hover:text-blue-400'}`} />
                      </button>
                    )}

                    <button 
                      onClick={() => setShowControls(false)}
                      className="p-2 bg-white/5 hover:bg-emerald-500/20 rounded-lg transition-colors group flex-shrink-0"
                      style={{ WebkitAppRegion: 'no-drag' } as any}
                    >
                      <EyeOff className="w-5 h-5 text-zinc-500 group-hover:text-emerald-400" />
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Logo/Status Section */}
                    <div 
                      className={`flex items-center gap-4 ${isTinyWidth ? 'min-w-0' : 'min-w-[180px]'}`}
                      style={{ WebkitAppRegion: 'drag' } as any}
                    >
                      <div 
                        className="group cursor-move p-1 -ml-4 flex items-center gap-1 opacity-20 hover:opacity-100 transition-opacity"
                        style={{ WebkitAppRegion: 'drag' } as any}
                      >
                        <Move className="w-4 h-4 pointer-events-none" />
                      </div>
                      <motion.div 
                        animate={{ 
                          backgroundColor: activeThemeColor,
                          boxShadow: isIntervalPerfect ? `0 0 30px ${activeThemeColor}66` : 'none',
                          scale: isIntervalPerfect ? 1 : 0.95
                        }}
                        className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transition-all duration-300 pointer-events-none"
                      >
                        <Zap className="w-7 h-7 text-black fill-current" />
                      </motion.div>
                      {!isCompact && !isTinyWidth && (
                        <div className="pointer-events-none">
                          <h2 className="font-black text-xl tracking-tighter leading-none uppercase italic">Broke Keys</h2>
                          <div className="flex items-center gap-2 mt-1">
                            <div className={`w-1.5 h-1.5 rounded-full ${isGTARunning ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-white/20'}`} />
                            <span className="text-[9px] font-mono text-zinc-500 tracking-[0.1em] uppercase">
                              {isGTARunning ? 'GTA V Active' : 'GTA V Ready'}
                            </span>
                            {isGTARunning && (
                              <span className="text-[8px] bg-blue-500/20 text-blue-400 px-1 rounded border border-blue-500/30 font-bold ml-1">
                                USE WINDOWED BORDERLESS
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Vertical Divider */}
                    <div className="w-px h-14 bg-white/5 mx-2" />

                    {/* Stats Section */}
                    <DashboardStats 
                      stats={stats} 
                      themeColor={themeColor} 
                      isIntervalPerfect={isIntervalPerfect} 
                      isCompact={isCompact} 
                      isTinyWidth={isTinyWidth} 
                      isSmallWidth={isSmallWidth}
                      intervalMs={intervalMs}
                    />

                    {/* Actions Section */}
                    <div className="flex items-center gap-2 sm:gap-3">
                      {!isTinyWidth && (
                        <ActionButton 
                          icon={<Monitor className="w-5 h-5" />} 
                          onClick={toggleFullscreen} 
                        />
                      )}
                      <ActionButton 
                        icon={soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 opacity-50" />} 
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        active={soundEnabled}
                        tooltip={soundEnabled ? "Disable Sound" : "Enable Sound"}
                      />
                      <ActionButton 
                        icon={<EyeOff className="w-5 h-5" />} 
                        onClick={() => setShowControls(false)} 
                      />
                      <ActionButton 
                        icon={<Maximize2 className="w-5 h-5" />} 
                        onClick={() => setIsStealthMode(true)}
                        tooltip="Enter Stealth Mode (F4)"
                      />
                      <ActionButton 
                        icon={<RefreshCcw className="w-5 h-5" />} 
                        onClick={resetStats} 
                      />
                      {window.electronAPI && (
                        <ActionButton 
                          icon={<Gamepad2 className="w-5 h-5" />} 
                          onClick={() => setIsOverlay(!isOverlay)} 
                          active={isOverlay}
                          accentColor="#3b82f6"
                          tooltip={isOverlay ? "Disable Click-through (Ctrl+Shift+G)" : "Enable Click-through Overlay"}
                        />
                      )}
                      {window.electronAPI && (
                        <ActionButton 
                          icon={<X className="w-5 h-5" />} 
                          onClick={() => window.electronAPI?.closeApp()} 
                          accentColor="#ef4444"
                        />
                      )}
                      <button 
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-3 sm:p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 group shadow-xl"
                      >
                        <Settings className="w-5 h-5 sm:w-6 h-6 group-hover:rotate-90 transition-transform duration-700" />
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Footer info */}
              <div className="bg-black/40 px-6 py-1.5 border-t border-white/5 flex justify-between items-center text-[10px] text-zinc-600 font-mono tracking-wider">
                <div className="flex gap-4">
                  <span>STABLE_RELEASE: 03-MAY-2026</span>
                  <span className="flex items-center gap-1"><Github className="w-3 h-3" /> OPEN_SOURCE</span>
                </div>
                <div className="hover:text-zinc-400 transition-colors">
                  LATENCY: 0.12MS
                </div>
              </div>
          </motion.div>
        )}
      </AnimatePresence>



      {/* Settings Modal (Unscaled for usability) */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[160] pointer-events-auto"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 inset-y-0 w-80 bg-[#121214] z-[170] border-l border-white/10 p-8 flex flex-col pointer-events-auto"
            >
              <div className="flex justify-between items-center mb-12">
                <h3 className="text-xl font-bold tracking-tight">System Settings</h3>
                <div className="flex gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center border border-white/10 ${activeKeys.has('A') ? 'bg-[var(--accent)] text-black' : 'bg-white/5 text-zinc-500'}`}>
                    <span className="text-xs font-black">A</span>
                  </div>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center border border-white/10 ${activeKeys.has('D') ? 'bg-[var(--accent)] text-black' : 'bg-white/5 text-zinc-500'}`}>
                    <span className="text-xs font-black">D</span>
                  </div>
                  <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors ml-2">
                    <ChevronUp className="w-6 h-6 rotate-90" />
                  </button>
                </div>
              </div>

              <div className="space-y-8 flex-1 overflow-y-auto no-scrollbar pb-8">
                <div className="space-y-3">
                  <label className="text-[10px] text-zinc-500 uppercase font-mono tracking-widest">UI Scale</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" 
                      min="10" 
                      max="200" 
                      step="1"
                      value={Math.round(scaleFactor * 100)}
                      onChange={(e) => {
                        setIsAutoScale(false);
                        const newScale = Number(e.target.value) / 100;
                        setScaleFactor(newScale);
                      }}
                      className="flex-1 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer"
                      style={{ accentColor: themeColor }}
                    />
                    <span className="text-sm font-mono w-12 text-right">{Math.round(scaleFactor * 100)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-zinc-500 uppercase">Auto-scale</span>
                    <button 
                      onClick={() => setIsAutoScale(!isAutoScale)}
                      className={`w-8 h-4 rounded-full relative transition-colors ${isAutoScale ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                    >
                      <motion.div animate={{ x: isAutoScale ? 16 : 0 }} className="absolute inset-y-0.5 left-0.5 w-3 h-3 bg-white rounded-full" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] text-zinc-500 uppercase font-mono tracking-widest">Target A-D (ms)</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" 
                      min="50" 
                      max="1000" 
                      step="10"
                      value={targetIntervalAD}
                      onChange={(e) => setTargetIntervalAD(Number(e.target.value))}
                      className="flex-1 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer"
                      style={{ accentColor: themeColor }}
                    />
                    <span className="text-sm font-mono w-12 text-right">{targetIntervalAD}ms</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] text-zinc-500 uppercase font-mono tracking-widest">Target D-A (ms)</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" 
                      min="50" 
                      max="1000" 
                      step="10"
                      value={targetIntervalDA}
                      onChange={(e) => setTargetIntervalDA(Number(e.target.value))}
                      className="flex-1 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer"
                      style={{ accentColor: themeColor }}
                    />
                    <span className="text-sm font-mono w-12 text-right">{targetIntervalDA}ms</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] text-zinc-500 uppercase font-mono tracking-widest">Tolerance (ms)</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" 
                      min="0" 
                      max="500" 
                      step="10"
                      value={toleranceMs}
                      onChange={(e) => setToleranceMs(Number(e.target.value))}
                      className="flex-1 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer"
                      style={{ accentColor: themeColor }}
                    />
                    <span className="text-sm font-mono w-12 text-right">{toleranceMs}ms</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] text-zinc-500 uppercase font-mono tracking-widest">Theme Accent</label>
                  <div className="flex gap-2">
                    {['#F97316', '#3B82F6', '#10B981', '#EF4444', '#A855F7'].map(color => (
                       <button 
                        key={color}
                        onClick={() => setThemeColor(color)}
                        className={`w-8 h-8 rounded-full border-2 ${themeColor === color ? 'border-white' : 'border-transparent'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                {window.electronAPI && (
                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <label className="text-[10px] text-zinc-500 uppercase font-mono tracking-widest">Window Dimensions</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <span className="text-[8px] text-zinc-600 uppercase font-mono">Width</span>
                        <input 
                          type="number"
                          value={windowSize.width}
                          onChange={(e) => setWindowSize(prev => ({ ...prev, width: Math.max(100, Number(e.target.value)) }))}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono outline-none focus:border-white/20"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <span className="text-[8px] text-zinc-600 uppercase font-mono">Height</span>
                        <input 
                          type="number"
                          value={windowSize.height}
                          onChange={(e) => setWindowSize(prev => ({ ...prev, height: Math.max(100, Number(e.target.value)) }))}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono outline-none focus:border-white/20"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4 pt-4 border-t border-white/5">
                  <label className="text-[10px] text-zinc-500 uppercase font-mono tracking-widest">Shared Profiles</label>
                  <div className="flex gap-2">
                    <input 
                      id="profile-name-input-sidebar"
                      type="text" 
                      placeholder="Name"
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:border-white/20 transition-colors"
                      onKeyDown={(e) => e.stopPropagation()}
                    />
                    <button 
                      onClick={() => {
                        const input = document.getElementById('profile-name-input-sidebar') as HTMLInputElement;
                        if (input.value) {
                          saveProfile(input.value);
                          input.value = '';
                        }
                      }}
                      className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-lg border border-emerald-500/20 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-2 mt-2">
                    {profiles.map((profile, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 group">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold">{profile.name}</span>
                          <span className="text-[10px] font-mono text-zinc-500">AD: {profile.settings.targetIntervalAD}ms</span>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => loadProfile(profile)} className="p-1.5 hover:bg-white/10 rounded-md"><RefreshCw className="w-3 h-3" /></button>
                          <button onClick={() => deleteProfile(i)} className="p-1.5 hover:bg-red-500/10 rounded-md text-red-500"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-white/5">
                  <label className="text-[10px] text-zinc-500 uppercase font-mono tracking-widest">Active Hotkeys</label>
                  <div className="space-y-2">
                    <HotkeyRow keyName="F3" desc="Settings Sidebar" />
                    <HotkeyRow keyName="F4" desc="Stealth Mode" />
                    <HotkeyRow keyName="F5" desc="Reset Statistics" />
                    <HotkeyRow keyName="Ctrl+Shift+G" desc="Overlay Toggle" />
                    <div className="mt-4 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
                      <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <Info size={10} className="text-blue-400" />
                        Overlay Tip
                      </div>
                      <p className="text-[10px] text-zinc-500 leading-relaxed">
                        If the app is hidden in-game, please switch your game to <span className="text-zinc-300">"Borderless Windowed"</span> (Оконный без рамки) mode.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  <button 
                    onClick={resetAllSettings}
                    className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-xs font-bold border border-red-500/20"
                  >
                    Factory Reset
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  </ClockProvider>
);
}

const GameplayHUD = React.memo(({ 
  isStealthMode, scaleFactor, activeThemeColor, stats, 
  activeKeys, themeColor, targetIntervalAD, targetIntervalDA, 
  isIntervalPerfect, showHeatmap 
}: any) => {
  return (
    <AnimatePresence>
      {!isStealthMode && (
        <motion.div 
          initial={{ opacity: 0, scale: scaleFactor * 0.9 }}
          animate={{ opacity: 1, scale: scaleFactor }}
          exit={{ opacity: 0, scale: scaleFactor * 0.9 }}
          className="flex flex-col items-center justify-center pointer-events-none w-full h-full relative"
          style={{ transformOrigin: 'center' }}
        >
          {/* Glow Effects */}
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] blur-[120px] rounded-full pointer-events-none z-0" 
            style={{ backgroundColor: `${activeThemeColor}10` }}
          />
          <div className="w-full max-w-4xl px-8 flex flex-col items-center gap-12 z-10 pointer-events-auto">
            <div className="flex flex-col items-center gap-12 w-full max-w-2xl">
              {/* Unified Hitbar Flow */}
              <div className="flex items-center gap-8">
                <div className={`transition-all duration-300 ${stats.expectedKey === 'A' ? 'scale-125 opacity-100' : 'scale-90 opacity-20 filter grayscale'}`}>
                  <KeyVisualizer 
                    label="A" 
                    active={activeKeys.has('A')} 
                    accentColor={themeColor}
                    isTarget={stats.expectedKey === 'A'}
                  />
                </div>
                <ChevronUp className="w-8 h-8 rotate-90 text-zinc-800" />
                <div className={`transition-all duration-300 ${stats.expectedKey === 'D' ? 'scale-125 opacity-100' : 'scale-90 opacity-20 filter grayscale'}`}>
                  <KeyVisualizer 
                    label="D" 
                    active={activeKeys.has('D')} 
                    accentColor={themeColor}
                    isTarget={stats.expectedKey === 'D'}
                  />
                </div>
              </div>

              <div className="w-full space-y-6">
                <MetronomeStatus 
                  stats={stats} 
                  themeColor={themeColor} 
                  targetIntervalAD={targetIntervalAD} 
                  targetIntervalDA={targetIntervalDA}
                  isIntervalPerfect={isIntervalPerfect}
                />
                
                <div className="flex justify-between w-full px-2 text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
                  <span className={stats.expectedKey === 'D' ? 'text-zinc-400' : 'text-zinc-700'}>
                    {stats.expectedKey === 'D' ? 'Start' : 'Target'}
                  </span>
                  <span className="text-zinc-500">
                    {stats.expectedKey === 'D' ? `Next: D (${targetIntervalAD}ms)` : `Next: A (${targetIntervalDA}ms)`}
                  </span>
                  <span className={stats.expectedKey === 'A' ? 'text-zinc-400' : 'text-zinc-700'}>
                    {stats.expectedKey === 'A' ? 'Start' : 'Target'}
                  </span>
                </div>
              </div>
            </div>

            {/* Static Hit/Miss Indicator */}
            {showHeatmap && (
              <div className="w-full h-32 flex items-center justify-center">
                <AnimatePresence mode="wait">
                  {stats.total > 0 ? (
                    <motion.div
                      key={stats.total}
                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.1 }}
                      className="flex flex-col items-center gap-2"
                    >
                      <div 
                        className="text-4xl font-black uppercase tracking-[0.2em] shadow-2xl"
                        style={{ 
                          color: isIntervalPerfect ? themeColor : '#EF4444',
                          textShadow: isIntervalPerfect ? `0 0 30px ${themeColor}66` : `0 0 30px #EF444466`
                        }}
                      >
                        {isIntervalPerfect ? 'Broke' : 'No Broke'}
                      </div>
                      <div className="text-zinc-500 font-mono text-xs uppercase tracking-widest">
                        {stats.lastInterval}ms
                      </div>
                    </motion.div>
                  ) : (
                    <div className="text-zinc-800 font-black uppercase tracking-[0.3em] text-xl opacity-20">
                      Ожидание нажатия
                    </div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

const DashboardStats = React.memo(({ stats, themeColor, isIntervalPerfect, isCompact, isTinyWidth, isSmallWidth, intervalMs }: any) => {
  const [kps, setKps] = useState("0.0");
  const statsRef = useRef(stats);

  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  useEffect(() => {
    const updateKps = () => {
      const now = performance.now();
      const recent = statsRef.current.history.filter((h: any) => h.time > now - intervalMs);
      setKps((recent.length / (intervalMs / 1000)).toFixed(1));
    };

    updateKps();
    const interval = setInterval(updateKps, 1500); // Rare updates for ultra performance
    return () => clearInterval(interval);
  }, [intervalMs]);

  return (
    <div className="flex-1 flex items-center gap-6 sm:gap-14 overflow-x-auto no-scrollbar py-2">
      <StatItem 
        icon={<Keyboard className="w-5 h-5" />} 
        label={isTinyWidth ? "Hits" : "Total Hits"} 
        value={stats.total} 
      />

      <StatItem 
        icon={<Zap className="w-5 h-5" />} 
        label={isTinyWidth ? "Gap" : "Interval"} 
        value={`${stats.averageInterval}ms`} 
        accent={isIntervalPerfect ? themeColor : '#EF4444'}
      />
      
      {!isTinyWidth && (
        <>
          {!isCompact && <StatItem icon={<Activity className="w-5 h-5" />} label="KPS" value={kps} />}
          <StatItem icon={<Clock className="w-5 h-5" />} label="APM" value={stats.apm} />
        </>
      )}
      
      {!isSmallWidth && (
        <div className="flex flex-col gap-1.5 min-w-[180px]">
          <div className="flex justify-between text-[11px] font-mono text-zinc-500 uppercase tracking-tighter">
            <span>A: {stats.countA}</span>
            <span>D: {stats.countD}</span>
          </div>
          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden flex">
            <div style={{ width: `${(stats.countA / (stats.total || 1)) * 100}%`, backgroundColor: themeColor }} className="h-full transition-all duration-500" />
            <div style={{ width: `${(stats.countD / (stats.total || 1)) * 100}%`, backgroundColor: themeColor, filter: 'brightness(0.6)' }} className="h-full transition-all duration-500" />
          </div>
        </div>
      )}
    </div>
  );
});

const KeyVisualizer = React.memo(({ label, active, accentColor, isTarget, progress = 0 }: { label: string, active: boolean, accentColor: string, isTarget?: boolean, progress?: number }) => {
  const isNearHit = progress > 90;
  
  return (
    <div className="flex flex-col items-center gap-4">
      <motion.div 
        animate={{ 
          scale: active ? 0.95 : isNearHit ? 1.05 : 1,
          backgroundColor: active ? accentColor : '#18181B',
          borderColor: isTarget ? accentColor : 'rgba(255,255,255,0.05)',
          boxShadow: isTarget ? `0 0 ${isNearHit ? '60px' : '40px'} ${accentColor}${isNearHit ? '66' : '33'}` : 'none'
        }}
        className={`w-40 h-40 rounded-3xl flex items-center justify-center border-2 shadow-2xl relative overflow-hidden`}
      >
        {/* Progress Fill for Target Key */}
        {isTarget && !active && (
          <>
            <motion.div 
              className="absolute bottom-0 left-0 right-0 bg-white/5"
              style={{ height: `${progress}%` }}
            />
            {/* Target Line (Perfect Zone Indicator) */}
            <div 
              className="absolute left-0 right-0 h-0.5 z-20"
              style={{ 
                bottom: '95%', 
                backgroundColor: accentColor,
                boxShadow: `0 0 10px ${accentColor}`
              }}
            />
            <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase tracking-tighter opacity-40 text-white">Target</div>
          </>
        )}
        
        {/* Edge highlight when near hit */}
        {isTarget && !active && isNearHit && (
          <motion.div 
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 0.2, repeat: Infinity }}
            className="absolute inset-0 border-4 rounded-3xl"
            style={{ borderColor: accentColor }}
          />
        )}

        <span className={`text-5xl font-black transition-colors ${active ? 'text-black' : isTarget ? (isNearHit ? 'text-white' : 'text-white/60') : 'text-zinc-600'}`}>{label}</span>
        {active && (
          <motion.div 
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1.5 }}
            className="absolute inset-0 bg-white/20 blur-xl"
          />
        )}
      </motion.div>
    </div>
  );
});

const MetronomeStatus = React.memo(({ stats, themeColor, targetIntervalAD, targetIntervalDA, isIntervalPerfect }: any) => {
  const currentTime = useClockContext();
  const [displayMs, setDisplayMs] = useState(0);
  const [isSticking, setIsSticking] = useState(false);

  const timeSinceLast = stats.lastPressTime ? Math.min(currentTime - stats.lastPressTime, 3000) : 0;
  const currentTarget = stats.expectedKey === 'D' ? targetIntervalAD : targetIntervalDA;
  const progress = Math.min((timeSinceLast / currentTarget) * 100, 100);
  const visualRunnerProgress = stats.expectedKey === 'D' ? progress : 100 - progress;

  useEffect(() => {
    if (!isSticking) setDisplayMs(Math.round(timeSinceLast));
  }, [timeSinceLast, isSticking]);

  useEffect(() => {
    if (stats.total > 0) {
      setDisplayMs(stats.lastInterval);
      setIsSticking(true);
      const timer = setTimeout(() => setIsSticking(false), 400);
      return () => clearTimeout(timer);
    }
  }, [stats.total, stats.lastInterval]);

  const lastHitMarkerProgress = useMemo(() => {
    if (stats.total === 0) return 50;
    const lastTarget = Math.max(1, stats.expectedKey === 'A' ? targetIntervalAD : targetIntervalDA);
    const p = Math.min((stats.lastInterval / (lastTarget * 2)) * 100, 100);
    return stats.expectedKey === 'A' ? p : 100 - p;
  }, [stats.total, stats.lastInterval, stats.expectedKey, targetIntervalAD, targetIntervalDA]);

  return (
    <>
      <div className="flex flex-col items-center gap-2">
        <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.3em]">
          Wait for <span className="text-white font-black">{stats.expectedKey}</span>
        </div>
        <motion.div 
          animate={{ 
            scale: isSticking ? 1.1 : 1, 
            color: isSticking ? (isIntervalPerfect ? themeColor : '#EF4444') : '#fff' 
          }}
          className="text-6xl font-black tabular-nums tracking-tighter"
        >
          {displayMs}<span className="text-2xl text-zinc-600 ml-1">ms</span>
        </motion.div>
      </div>

      <div className="relative h-28 w-full bg-[#0A0A0B] rounded-2xl border-2 border-white/10 overflow-hidden flex items-center justify-center shadow-[inset_0_0_60px_rgba(0,0,0,0.9)]">
        <div className="absolute inset-0 flex justify-between px-2 opacity-5 pointer-events-none">
          {Array.from({ length: 40 }).map((_, i) => <div key={i} className="h-full w-px bg-white" />)}
        </div>
        
        <div className="absolute h-full w-[15%] bg-white/5 border-x border-white/10" style={{ left: '42.5%' }} />
        <div className="absolute top-0 bottom-0 w-1.5 bg-white/70 z-10 shadow-[0_0_20px_rgba(255,255,255,0.5)]" style={{ left: `${visualRunnerProgress}%` }} />

        <AnimatePresence mode="popLayout">
          <motion.div 
            key={stats.total}
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ 
              opacity: [0, 1, 1, 0], 
              scaleY: 1, 
              left: `${lastHitMarkerProgress}%` 
            }}
            transition={{ duration: 1, times: [0, 0.1, 0.8, 1] }}
            className="absolute h-full w-0.5 z-20 flex flex-col items-center"
            style={{ 
              backgroundColor: isIntervalPerfect ? themeColor : '#EF4444', 
              boxShadow: isIntervalPerfect ? `0 0 30px ${themeColor}` : 'none' 
            }}
          >
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: -40, opacity: 1 }}
              className="absolute whitespace-nowrap text-[11px] font-black uppercase tracking-widest shadow-2xl"
              style={{ color: isIntervalPerfect ? themeColor : '#EF4444' }}
            >
              {isIntervalPerfect ? 'Broke' : 'No Broke'}
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
});

const MetronomeMini = React.memo(({ stats, themeColor, isIntervalPerfect }: any) => {
  const currentTime = useClockContext();
  const timeSinceLast = stats.lastPressTime ? Math.min(currentTime - stats.lastPressTime, 3000) : 0;
  
  return (
    <div className="flex flex-col justify-center">
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-black tabular-nums leading-none" style={{ color: isIntervalPerfect ? themeColor : '#EF4444' }}>
          {Math.round(timeSinceLast)}
        </span>
        <span className="text-[10px] text-zinc-500 font-bold uppercase">ms</span>
      </div>
      <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-tighter leading-none">{stats.expectedKey}</span>
    </div>
  );
});

const MetronomeTiny = React.memo(({ stats, themeColor, isIntervalPerfect }: any) => {
  const currentTime = useClockContext();
  const timeSinceLast = stats.lastPressTime ? Math.min(currentTime - stats.lastPressTime, 3000) : 0;
  
  return (
    <span className="text-sm font-black tabular-nums opacity-40" style={{ color: isIntervalPerfect ? themeColor : '#EF4444' }}>
      {Math.round(timeSinceLast)}ms
    </span>
  );
});

const StealthMetronome = React.memo(({ stats, themeColor, targetIntervalAD, targetIntervalDA, activeKeys }: any) => {
  const currentTime = useClockContext();
  const currentTarget = stats.expectedKey === 'D' ? targetIntervalAD : targetIntervalDA;
  const timeSinceLast = stats.lastPressTime ? Math.min(currentTime - stats.lastPressTime, 3000) : 0;
  const progress = Math.min((timeSinceLast / currentTarget) * 100, 100);

  return (
    <div className="flex gap-12">
      <div className={`transition-all duration-200 ${activeKeys.has('A') ? 'scale-125 opacity-100' : stats.expectedKey === 'A' ? 'scale-110 opacity-100' : 'scale-90 opacity-20 filter grayscale'}`}>
        <KeyVisualizer 
          label="A" 
          active={activeKeys.has('A')} 
          accentColor={themeColor} 
          isTarget={stats.expectedKey === 'A'} 
          progress={stats.expectedKey === 'A' ? progress : 0}
        />
      </div>
      <div className={`transition-all duration-200 ${activeKeys.has('D') ? 'scale-125 opacity-100' : stats.expectedKey === 'D' ? 'scale-110 opacity-100' : 'scale-90 opacity-20 filter grayscale'}`}>
        <KeyVisualizer 
          label="D" 
          active={activeKeys.has('D')} 
          accentColor={themeColor} 
          isTarget={stats.expectedKey === 'D'} 
          progress={stats.expectedKey === 'D' ? progress : 0}
        />
      </div>
    </div>
  );
});

const StatItem = React.memo(({ icon, label, value, subValue, accent }: { icon: ReactNode, label: string, value: string | number, subValue?: string, accent?: string }) => {
  return (
    <div className="flex items-center gap-4 group">
      <div 
        className="p-2.5 bg-white/5 rounded-xl border border-white/5 group-hover:bg-white/10 transition-colors"
        style={{ color: accent }}
      >
        {icon}
      </div>
      <div>
        <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-tighter leading-none mb-1">{label}</div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold tabular-nums tracking-tight">{value}</span>
          {subValue && <span className="text-[9px] text-zinc-600 font-mono tracking-widest">{subValue}</span>}
        </div>
      </div>
    </div>
  );
});

const ActionButton = React.memo(({ icon, onClick, tooltip, active, accentColor }: { icon: ReactNode, onClick: () => void, tooltip: string, active?: boolean, accentColor?: string }) => {
  return (
    <button 
      onClick={onClick}
      title={tooltip}
      className={`p-3 rounded-xl transition-all border border-white/5 ${active ? 'text-black' : 'bg-white/5 hover:bg-white/10'}`}
      style={{ backgroundColor: active ? accentColor : undefined }}
    >
      {icon}
    </button>
  );
});

function HotkeyRow({ keyName, desc }: { keyName: string, desc: string }) {
  return (
    <div className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-lg border border-white/5">
      <span className="text-[10px] text-zinc-400 font-medium">{desc}</span>
      <span className="text-[10px] font-mono text-white bg-white/10 px-1.5 py-0.5 rounded border border-white/10">{keyName}</span>
    </div>
  );
}

function PulseBar({ isActive, accentColor }: { isActive: boolean, accentColor: string, key?: any }) {
  return (
    <motion.div 
      animate={{ 
        height: isActive ? '100%' : '10%',
        backgroundColor: isActive ? accentColor : 'rgba(255, 255, 255, 0.05)'
      }}
      className="w-full flex-1 rounded-t-sm"
    />
  );
}
