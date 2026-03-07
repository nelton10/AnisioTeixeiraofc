import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

interface LiveTimerProps {
  startTime: number;
  limitSeconds: number;
}

const LiveTimer: React.FC<LiveTimerProps> = ({ startTime, limitSeconds }) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const update = () => setElapsed(Math.floor((Date.now() - (startTime || Date.now())) / 1000));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const isOvertime = elapsed > (limitSeconds || 900);
  const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const secs = (elapsed % 60).toString().padStart(2, '0');

  return (
    <div className={`flex items-center gap-1.5 font-mono text-sm font-bold tracking-tight px-2.5 py-1 rounded-lg transition-colors
      ${isOvertime ? 'bg-destructive/10 text-destructive animate-pulse-glow' : 'bg-muted text-muted-foreground'}`}>
      {isOvertime && <AlertTriangle size={14} />}
      <span>{mins}:{secs}</span>
    </div>
  );
};

export default LiveTimer;
