import { useState } from 'react';
import { Barbell } from '../components/Icons.jsx';
import { signup, login, setAuth } from '../lib/authApi.js';

export default function UserAuth({ onAuthed, onCoachMode }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
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
      const fn = mode === 'login' ? login : signup;
      const res = await fn(name.trim(), password);
      setAuth(res.token, 'user');
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22, justifyContent: 'center' }}>
          <Barbell style={{ width: 30, height: 30, color: 'var(--brass)' }} />
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            IRON <b style={{ color: 'var(--brass)' }}>STANDARD</b>
          </div>
        </div>

        <div className="seg-tabs" style={{ marginBottom: 20 }}>
          <div className={`seg-tab ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')}>Log In</div>
          <div className={`seg-tab ${mode === 'signup' ? 'active' : ''}`} onClick={() => setMode('signup')}>Sign Up</div>
        </div>

        <form onSubmit={submit}>
          <div className="field">
            <label>Name</label>
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
            {loading ? 'Please wait…' : mode === 'login' ? 'Log In' : 'Sign Up'}
          </button>
        </form>

        {mode === 'signup' && (
          <div className="disclaimer" style={{ marginTop: 14 }}>
            New accounts need a coach to approve them before you can use the app — you'll see a waiting screen until that happens.
          </div>
        )}

        <button className="btn ghost-small" style={{ width: '100%', marginTop: 16 }} onClick={onCoachMode}>
          I'm a coach — log in here instead
        </button>
      </div>
    </div>
  );
}
