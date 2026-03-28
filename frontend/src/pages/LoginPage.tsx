import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Zap, Mail, Lock, User } from 'lucide-react';
import toast from 'react-hot-toast';
import './LoginPage.css';

type Mode = 'login' | 'signup';

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  const { signIn, signUp } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) { toast.error(error); return; }
        toast.success('Welcome back! 🎮');
        navigate('/');
      } else {
        if (!displayName.trim()) { toast.error('Display name is required'); return; }
        const { error } = await signUp(email, password, displayName);
        if (error) { toast.error(error); return; }
        toast.success('Account created! Check your email to confirm. 🎉');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Animated background orbs */}
      <div className="orbs">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      <div className="login-card card fade-up">
        {/* Logo */}
        <div className="login-logo">
          <div className="logo-icon-lg"><Zap size={28} /></div>
          <h1 className="login-title">ShunyaArcade</h1>
          <p className="login-subtitle">The employee gaming league 🏆</p>
        </div>

        {/* Tabs */}
        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => setMode('login')}
          >
            Sign In
          </button>
          <button
            className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => setMode('signup')}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {mode === 'signup' && (
            <div className="form-group">
              <label className="form-label">Display Name</label>
              <div className="input-icon-wrapper">
                <User size={16} className="input-icon" />
                <input
                  id="display-name"
                  type="text"
                  className="input has-icon"
                  placeholder="e.g. Alex Thunder"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required={mode === 'signup'}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Work Email</label>
            <div className="input-icon-wrapper">
              <Mail size={16} className="input-icon" />
              <input
                id="email"
                type="email"
                className="input has-icon"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-icon-wrapper">
              <Lock size={16} className="input-icon" />
              <input
                id="password"
                type="password"
                className="input has-icon"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          </div>

          <button
            id="auth-submit-btn"
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '13px', marginTop: 8 }}
            disabled={loading}
          >
            {loading ? 'Loading...' : mode === 'login' ? 'Enter the Arcade 🎮' : 'Join the League 🏆'}
          </button>
        </form>
      </div>
    </div>
  );
}
