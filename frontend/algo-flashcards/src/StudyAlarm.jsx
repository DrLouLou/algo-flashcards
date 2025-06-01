import { useState, useEffect, useRef } from 'react'
// import './styles/StudyAlarm.css'

export default function StudyAlarm() {
  const [timer, setTimer] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);

    function handleStart() {
        if (running) return;
        intervalRef = setInterval(() => {setTimer((prev) => prev+1)}, 1000)
    }

    function handleStop() {
        clearInterval(intervalRef)
        intervalRef.current = null;
        setRunning(false);
    }

    function handleReset() {
        if (intervalRef.current !== null) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setRunning(false);
        setTimer(0);
    }

    useEffect(() => {
        return () => {
            if (intervalRef.current !== null) {
            clearInterval(intervalRef.current);
            }
        };
    }, []);

    return (
        <>
            <h2>Stopwatch: {timer}</h2>
            <div className="buttons">
                {running ? <button onClick={handleStop}>Stop</button> : <button onClick={handleStart}>Start</button>}
                <button onClick={handleReset}>Reset</button>
            </div>
        </>
    )
}