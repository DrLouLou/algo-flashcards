import { useState, useEffect, useRef } from "react";

export default function StudyAlarm() {
  // The time string in "HH:MM" format (24‐hour clock). Empty = no time chosen yet.
  const [alarmTime, setAlarmTime] = useState("");

  // Whether the alarm monitor is currently running
  const [running, setRunning] = useState(false);

  // Whether we've already triggered the alarm (so we only fire once)
  const [triggered, setTriggered] = useState(false);

  // Will hold the interval ID returned by setInterval
  const intervalRef = useRef(null);

  // Convert the "HH:MM" string into a number of seconds since midnight, e.g. "07:30" → 7*3600 + 30*60
  function timeStringToSeconds(str) {
    if (!str) return null;
    const [hh, mm] = str.split(":").map((v) => parseInt(v, 10));
    if (isNaN(hh) || isNaN(mm)) return null;
    return hh * 3600 + mm * 60;
  }

  // Grabs the current time of day in seconds since midnight
  function nowInSeconds() {
    const now = new Date();
    return now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  }

  // Called when you click “Start”
  function handleStart() {
    // Don’t start if already running or no valid alarmTime chosen
    if (running || !alarmTime) return;

    const targetSeconds = timeStringToSeconds(alarmTime);
    if (targetSeconds === null) {
      alert("Please enter a valid HH:MM time first.");
      return;
    }

    setTriggered(false);
    setRunning(true);

    // Every second, check if we've reached or passed the target time
    intervalRef.current = window.setInterval(() => {
      const current = nowInSeconds();
      // If current time-of-day >= target, trigger once
      if (current >= targetSeconds && !triggered) {
        setTriggered(true);
        alert(`⏰ Alarm! It is now ${alarmTime}.`);
        // After alert, stop checking further
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        setRunning(false);
      }
    }, 1000);
  }

  // Called when you click “Stop”
  function handleStop() {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setRunning(false);
  }

  // Called when you click “Reset”
  function handleReset() {
    // Clear any running interval
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    // Clear all state
    setAlarmTime("");
    setRunning(false);
    setTriggered(false);
  }

  // Cleanup if the component ever unmounts
  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <div style={{ display: "inline-block", textAlign: "left" }}>
      <h2>Alarm Clock</h2>

      {/* 1. Time Picker */}
      <label htmlFor="alarm-input" style={{ display: "block", marginBottom: "0.5rem" }}>
        Set Alarm Time (HH:MM):
      </label>
      <input
        id="alarm-input"
        type="time"
        value={alarmTime}
        onChange={(e) => {
          // Reset triggered state if user picks a new time
          setAlarmTime(e.target.value);
          setTriggered(false);
        }}
        style={{ fontSize: "1rem", padding: "0.25rem", marginBottom: "1rem" }}
      />

      {/* 2. Status Display */}
      {alarmTime && !triggered && (
        <p>
          Alarm is set for <strong>{alarmTime}</strong>.{" "}
          {running ? "Monitoring..." : "Not running."}
        </p>
      )}
      {triggered && <p style={{ color: "crimson" }}>Alarm triggered at {alarmTime}!</p>}
      {!alarmTime && <p style={{ color: "#555" }}>No alarm time chosen.</p>}

      {/* 3. Buttons */}
      <div style={{ marginTop: "0.5rem" }}>
        {running ? (
          <button onClick={handleStop} style={{ marginRight: "0.5rem" }}>
            Stop
          </button>
        ) : (
          <button onClick={handleStart} style={{ marginRight: "0.5rem" }}>
            Start
          </button>
        )}
        <button onClick={handleReset}>Reset</button>
      </div>
    </div>
  );
}
