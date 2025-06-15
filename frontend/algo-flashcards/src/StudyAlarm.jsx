import { useState, useRef, useEffect } from "react";

export default function StudyAlarm() {
  // Timer in seconds
  const [duration, setDuration] = useState(25 * 60); // default 25 min
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);

  // Format seconds as MM:SS
  function formatTime(secs) {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  // Start/stop logic
  function handleStartStop() {
    if (running) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      setRunning(false);
      return;
    }
    setRunning(true);
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          setRunning(false);
          alert('⏰ Time is up!');
          return duration;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function handleReset() {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    setRunning(false);
    setRemaining(duration);
  }

  // Update remaining if duration changes
  useEffect(() => {
    setRemaining(duration);
  }, [duration]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1rem' }}>
      <input
        type="number"
        min={1}
        max={120}
        value={Math.floor(duration / 60)}
        disabled={running}
        onChange={e => {
          const mins = Math.max(1, Math.min(120, Number(e.target.value)));
          setDuration(mins * 60);
        }}
        style={{ width: 48, textAlign: 'right', fontSize: '1rem', padding: 2, borderRadius: 4, border: '1px solid #ccc' }}
        aria-label="Timer minutes"
      />
      <span style={{ fontWeight: 500 }}>min</span>
      <span style={{ fontFamily: 'monospace', fontSize: '1.1em', margin: '0 8px' }}>{formatTime(remaining)}</span>
      <button onClick={handleStartStop} style={{ padding: '2px 10px', borderRadius: 4, background: running ? '#f87171' : '#4ade80', color: '#fff', border: 'none', fontWeight: 500 }}>
        {running ? 'Stop' : 'Start'}
      </button>
      <button onClick={handleReset} style={{ padding: '2px 10px', borderRadius: 4, background: '#e5e7eb', color: '#222', border: 'none', fontWeight: 500 }}>
        Reset
      </button>
    </div>
  );
}
