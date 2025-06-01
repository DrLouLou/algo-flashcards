import { useState, useEffect, useRef } from "react";

export default function StudyAlarm() {
  const [alarmTime, setAlarmTime] = useState("");

  const [running, setRunning] = useState(false);

  const [triggered, setTriggered] = useState(false);

  const intervalRef = useRef(null);

  function timeStringToSeconds(str) {
    if (!str) return null;
    const [hh, mm] = str.split(":").map((v) => parseInt(v, 10));
    if (isNaN(hh) || isNaN(mm)) return null;
    return hh * 3600 + mm * 60;
  }

  function nowInSeconds() {
    const now = new Date();
    return now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  }

  function handleStart() {
    if (running || !alarmTime) return;

    const targetSeconds = timeStringToSeconds(alarmTime);
    if (targetSeconds === null) {
      alert("Please enter a valid HH:MM time first.");
      return;
    }

    setTriggered(false);
    setRunning(true);

    intervalRef.current = window.setInterval(() => {
      const current = nowInSeconds();
      if (current >= targetSeconds && !triggered) {
        setTriggered(true);
        alert(`⏰ Alarm! It is now ${alarmTime}.`);
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        setRunning(false);
      }
    }, 1000);
  }

  function handleStop() {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setRunning(false);
  }

  function handleReset() {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setAlarmTime("");
    setRunning(false);
    setTriggered(false);
  }

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

      <label htmlFor="alarm-input" style={{ display: "block", marginBottom: "0.5rem" }}>
        Set Alarm Time (HH:MM):
      </label>
      <input
        id="alarm-input"
        type="time"
        value={alarmTime}
        onChange={(e) => {
          setAlarmTime(e.target.value);
          setTriggered(false);
        }}
        style={{ fontSize: "1rem", padding: "0.25rem", marginBottom: "1rem" }}
      />

      {alarmTime && !triggered && (
        <p>
          Alarm is set for <strong>{alarmTime}</strong>.{" "}
          {running ? "Monitoring..." : "Not running."}
        </p>
      )}
      {triggered && <p style={{ color: "crimson" }}>Alarm triggered at {alarmTime}!</p>}
      {!alarmTime && <p style={{ color: "#555" }}>No alarm time chosen.</p>}

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
