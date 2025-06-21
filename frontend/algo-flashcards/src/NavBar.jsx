import { Link, useNavigate, useLocation } from 'react-router-dom';

export default function NavBar({ onLogout }) {
  const navigate  = useNavigate();
  const { pathname } = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    onLogout(null);
    navigate('/login');
  };

  const menu = [
    { to: '/',         label: 'Home'      },
    { to: '/generate', label: 'Generate'  },
    { to: '/about',    label: 'About'     },
    // { to: '/alarm',    label: 'Alarm'     },
    { to: '/profile',  label: 'Profile'   },
  ];

  return (
    <nav className="fixed inset-x-0 top-0 z-50 bg-white/80 backdrop-blur shadow-sm">
      <div className="mx-auto max-w-7xl h-16 flex items-center justify-between px-4">
        {/* -------- Left: logo and nav links -------- */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 group">
            <img src="/icon.png" alt="Card.io Logo" className="h-8 w-8" />
            <span className="font-extrabold text-lg text-indigo-700 group-hover:text-indigo-900 tracking-tight">Card.io</span>
          </Link>
          {/* Navigation links */}
          {menu.map(({ to, label }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`relative font-semibold text-sm transition
                  ${active ? 'text-indigo-600' : 'text-gray-700 hover:text-indigo-500'}
                  after:absolute after:-bottom-1 after:left-0 after:h-0.5
                  after:w-full after:scale-x-0 after:bg-current after:transition-transform
                  ${active ? 'after:scale-x-100' : 'hover:after:scale-x-100'}`}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {/* -------- Right: logout -------- */}
        <button
          onClick={handleLogout}
          className="rounded-md px-3 py-2 text-sm font-medium
                     text-gray-700 hover:bg-gray-100 transition
                     hover:text-red-600"
        >
          Logout
        </button>
      </div>
    </nav>
  )
}
