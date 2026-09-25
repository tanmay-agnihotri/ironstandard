import { Barbell } from '../components/Icons.jsx';
import { clearAuth } from '../lib/authApi.js';

export default function PendingApproval({ name, status, onLogout }) {
  const rejected = status === 'rejected';
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="card" style={{ maxWidth: 400, width: '100%', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, justifyContent: 'center' }}>
          <Barbell style={{ width: 30, height: 30, color: 'var(--brass)' }} />
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            IRON <b style={{ color: 'var(--brass)' }}>STANDARD</b>
          </div>
        </div>
        {rejected ? (
          <>
            <h1 style={{ fontSize: 22, marginBottom: 10, color: 'var(--iron)' }}>Request Not Approved</h1>
            <p style={{ fontSize: 14, color: 'var(--ink-dim)', marginBottom: 18 }}>
              Hi <strong style={{ color: 'var(--ink)' }}>{name}</strong>, your coach did not approve this account.
              If you think that's a mistake, reach out to them directly.
            </p>
          </>
        ) : (
          <>
            <div className="spinner" style={{ marginBottom: 18 }} />
            <h1 style={{ fontSize: 22, marginBottom: 10 }}>Wait for Approval</h1>
            <p style={{ fontSize: 14, color: 'var(--ink-dim)', marginBottom: 18 }}>
              Thanks for signing up, <strong style={{ color: 'var(--ink)' }}>{name}</strong>. Your account needs a
              coach to approve it before you can use the app. This usually doesn't take long — check back soon,
              or refresh this page.
            </p>
          </>
        )}
        <button className="btn secondary" onClick={() => window.location.reload()} style={{ marginBottom: 10 }}>
          Refresh
        </button>
        <button className="btn ghost-small" style={{ width: '100%' }} onClick={() => { clearAuth(); onLogout(); }}>
          Log out
        </button>
      </div>
    </div>
  );
}
