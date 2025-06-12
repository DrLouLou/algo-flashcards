import { Link, useNavigate } from 'react-router-dom'
import './styles/NavBar.css'

export default function NavBar({ onLogout }) {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    onLogout(null);
    navigate('/login');
  };

  const menu = [
    { to: '/',         label: 'Home'      },
    { to: '/generate', label: 'Generate'  },
    { to: '/info',     label: 'Info'      },
    { to: '/about',    label: 'About'     },
    { to: '/profile',  label: 'Profile'   }, // new
  ];

  return (
    <nav className="navbar">
      <div className="navbar-left">
        {menu.map(({ to, label }) => (
          <Link key={to} to={to}>{label}</Link>
        ))}
      </div>
      <div className="navbar-right">
        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
      </div>
    </nav>
  )
}