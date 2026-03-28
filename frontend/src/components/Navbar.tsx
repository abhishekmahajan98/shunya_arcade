import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Gamepad2, Trophy, User, LogOut, Zap } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import './Navbar.css';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out');
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <nav className="navbar">
      <div className="navbar-inner container">
        <Link to="/" className="navbar-logo">
          <div className="logo-icon"><Zap size={18} strokeWidth={2.5} /></div>
          <span className="logo-text">Shunya<span className="logo-accent">Arcade</span></span>
        </Link>

        <div className="navbar-links">
          <Link to="/" className={`nav-link ${isActive('/') && location.pathname === '/' ? 'active' : ''}`}>
            <Gamepad2 size={16} />
            Games
          </Link>
          <Link to="/leaderboard" className={`nav-link ${isActive('/leaderboard') ? 'active' : ''}`}>
            <Trophy size={16} />
            Leaderboard
          </Link>
          <Link to="/profile" className={`nav-link ${isActive('/profile') ? 'active' : ''}`}>
            <User size={16} />
            Profile
          </Link>
        </div>

        <div className="navbar-right">
          <div className="user-chip">
            <div className="user-avatar">{user?.email?.[0]?.toUpperCase() ?? '?'}</div>
            <span className="user-email">{user?.email?.split('@')[0]}</span>
          </div>
          <button className="btn btn-ghost signout-btn" onClick={handleSignOut} title="Sign out">
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </nav>
  );
}
