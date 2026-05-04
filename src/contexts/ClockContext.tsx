import React, { createContext, useContext, useState, useEffect } from 'react';

const ClockContext = createContext<number>(0);

export const ClockProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTime, setCurrentTime] = useState(performance.now());

  useEffect(() => {
    let lastTime = 0;
    let frame: number;
    const update = (time: number) => {
      // Set to 60 FPS (approx 16.6ms) as requested
      if (time - lastTime >= 16.6) {
        setCurrentTime(time);
        lastTime = time;
      }
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <ClockContext.Provider value={currentTime}>
      {children}
    </ClockContext.Provider>
  );
};

export const useClockContext = () => useContext(ClockContext);
