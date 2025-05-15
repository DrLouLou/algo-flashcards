import { Link, useNavigate } from 'react-router-dom'
import './styles/NavBar.css'

export default function NavBar({ onLogout }) {
  const navigate = useNavigate()

  const handleLogout = () => {
    // Clear token and redirect to login
    localStorage.removeItem('accessToken')
    onLogout(null)
    navigate('/login')
  }

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link to="/">Home</Link>
      </div>
      <div className="navbar-right">
        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
      </div>
    </nav>
  )
}