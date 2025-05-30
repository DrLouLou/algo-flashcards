import { useState } from 'react'
// import './styles/StudyAlarm.css'

export default function StudyAlarm() {
    const [timer, setTimer] = useState(0)
    const id = setInterval(() => {setTimer(prev => prev + 1)})
    
    return (
        <>
            <div className="buttons">
                <button>Start</button>
                <button>Stop</button>
                <button>Reset</button>
            </div>
        </>
    )
}