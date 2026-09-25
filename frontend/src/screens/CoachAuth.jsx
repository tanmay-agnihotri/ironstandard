import { useState } from 'react';
import { Barbell } from '../components/Icons.jsx';
import { coachLogin, setAuth } from '../lib/authApi.js';

export default function CoachAuth({ onAuthed, onUserMode }) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !password) { setError('Enter a name and password.'); return; }
    setLoading(true);
    try {
      const res = await coachLogin(name.trim(), password);
      setAuth(res.token, 'coach');
      onAuthed(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="card" style={{ maxWidth: 380, width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, justifyContent: 'center' }}>
          <Barbell style={{ width: 30, height: 30, color: 'var(--brass)' }} />
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            IRON <b style={{ color: 'var(--brass)' }}>STANDARD</b>
          </div>
        </div>
        <div className="badge-chip" style={{ display: 'flex', justifyContent: 'center', margin: '0 auto 20px', width: 'fit-content' }}>Coach Login</div>

        <form onSubmit={submit}>
          <div className="field">
            <label>Coach Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && (
            <div className="verdict-box verdict-bad" style={{ padding: 12, marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: 'var(--iron)' }}>{error}</div>
            </div>
          )}
          <button className="btn" type="submit" disabled={loading}>
            {loading ? 'Please wait…' : 'Log In'}
          </button>
        </form>

        <div className="disclaimer" style={{ marginTop: 14 }}>
          Coach accounts are created by an administrator (see seed_coach.py) — there's no coach sign-up here by design.
        </div>

        <button className="btn ghost-small" style={{ width: '100%', marginTop: 16 }} onClick={onUserMode}>
          Not a coach — go to lifter login
        </button>
      </div>
    </div>
  );
}
