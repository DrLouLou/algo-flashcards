import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <div className="min-h-screen w-full bg-gray-100">
      <App />
    </div>
  </StrictMode>,
)

