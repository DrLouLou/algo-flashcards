import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <div className="min-h-screen w-full bg-gradient-subtle font-sans">
      <App />
    </div>
  </StrictMode>,
)

