import { useEffect, useState } from 'react';
import { profileApi } from '../api';
import { useAuthStore } from '../store/authStore';
import { User, Edit2, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import './ProfilePage.css';

interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    profileApi.getMe()
      .then(p => { setProfile(p); setDisplayName(p.display_name); })
      .catch(() => {
        // Profile doesn't exist yet — auto-create it
        const name = user?.email?.split('@')[0] ?? 'Player';
        profileApi.create(name)
          .then(p => { setProfile(p); setDisplayName(p.display_name); })
          .catch(() => {});
      })
      .finally(() => setLoading(false));
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await profileApi.update({ display_name: displayName });
      setProfile(updated);
      setEditing(false);
      toast.success('Profile updated!');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <main className="profile-page"><div className="container">
      <div className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-lg)' }} />
    </div></main>
  );

  return (
    <main className="profile-page">
      <div className="container">
        <div className="profile-card card fade-up">
          <div className="profile-avatar-lg">
            {profile?.display_name?.[0]?.toUpperCase() ?? '?'}
          </div>

          {editing ? (
            <div className="profile-edit-row">
              <input
                className="input"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                maxLength={64}
                style={{ maxWidth: 280 }}
                autoFocus
              />
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                <Save size={15} />{saving ? 'Saving…' : 'Save'}
              </button>
              <button className="btn btn-ghost" onClick={() => setEditing(false)}>
                <X size={15} />
              </button>
            </div>
          ) : (
            <div className="profile-name-row">
              <h1 className="profile-name">{profile?.display_name}</h1>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
                <Edit2 size={14} /> Edit
              </button>
            </div>
          )}

          <p className="profile-email">{user?.email}</p>

          <div className="profile-meta">
            <div className="profile-meta-item">
              <span className="meta-label">Member since</span>
              <span className="meta-value">
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', {
                  month: 'long', year: 'numeric'
                }) : '—'}
              </span>
            </div>
            <div className="profile-meta-item">
              <span className="meta-label">User ID</span>
              <span className="meta-value" style={{ fontFamily: 'monospace', fontSize: 12 }}>
                {profile?.id.slice(0, 8)}…
              </span>
            </div>
          </div>
        </div>

        <div className="profile-tip card fade-up" style={{ animationDelay: '100ms' }}>
          <User size={20} style={{ color: 'var(--accent-1)' }} />
          <p>Play any game to see your scores on the leaderboard. Scores are calculated server-side for fairness.</p>
        </div>
      </div>
    </main>
  );
}
