import { useState, useEffect } from 'react';
import { Barbell, CheckinIcon } from '../components/Icons.jsx';
import { coachListUsers, coachApprove, coachReject, coachUserActivities, coachListReviews, coachReviewVideoUrl, coachSubmitVerdict, clearAuth } from '../lib/authApi.js';
import { fmtDate } from '../lib/data.js';

export default function CoachDashboard({ coachName, onLogout }) {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [activities, setActivities] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [reviews, setReviews] = useState(null);
  const [openReview, setOpenReview] = useState(null);
  const [verdictNotes, setVerdictNotes] = useState('');
  const [verdictBusy, setVerdictBusy] = useState(false);

  const load = async () => {
    try {
      const data = await coachListUsers();
      setUsers(data);
    } catch (err) {
      setError(err.message);
    }
  };
  const loadReviews = async () => {
    try {
      setReviews(await coachListReviews());
    } catch (err) {
      console.warn('Could not load reviews:', err.message);
    }
  };

  useEffect(() => { load(); loadReviews(); }, []);

  const handleApprove = async (id) => {
    setBusyId(id);
    try { await coachApprove(id); await load(); } catch (err) { alert(err.message); }
    setBusyId(null);
  };
  const handleReject = async (id) => {
    setBusyId(id);
    try { await coachReject(id); await load(); } catch (err) { alert(err.message); }
    setBusyId(null);
  };
  const toggleExpand = async (id) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    try { setActivities(await coachUserActivities(id)); } catch { setActivities([]); }
  };

  const openReviewFor = (id) => {
    setOpenReview(openReview === id ? null : id);
    setVerdictNotes('');
  };
  const submitVerdict = async (id, verdict) => {
    setVerdictBusy(true);
    try {
      await coachSubmitVerdict(id, verdict, verdictNotes);
      setOpenReview(null);
      await loadReviews();
    } catch (err) {
      alert(err.message);
    }
    setVerdictBusy(false);
  };

  if (error) {
    return <div style={{ padding: 40, textAlign: 'center' }}>
      <p style={{ color: 'var(--iron)' }}>{error}</p>
      <button className="btn secondary" onClick={() => { clearAuth(); onLogout(); }}>Log out</button>
    </div>;
  }
  if (!users) return <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div>;

  const pending = users.filter((u) => u.status === 'pending');
  const approved = users.filter((u) => u.status === 'approved');
  const rejected = users.filter((u) => u.status === 'rejected');

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '28px 20px 60px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <Barbell style={{ width: 26, height: 26, color: 'var(--brass)' }} />
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          IRON <b style={{ color: 'var(--brass)' }}>STANDARD</b>
        </div>
        <div className="badge-chip" style={{ marginLeft: 8, marginBottom: 0 }}>Coach Dashboard</div>
        <button className="btn ghost-small" style={{ marginLeft: 'auto' }} onClick={() => { clearAuth(); onLogout(); }}>Log out</button>
      </div>
      <p style={{ color: 'var(--ink-dim)', fontSize: 14, marginBottom: 20 }}>Logged in as {coachName}</p>

      <div className="stat-row">
        <div className="stat-box"><div className="n">{pending.length}</div><div className="l">Pending</div></div>
        <div className="stat-box"><div className="n">{approved.length}</div><div className="l">Approved</div></div>
        <div className="stat-box"><div className="n">{rejected.length}</div><div className="l">Rejected</div></div>
      </div>

      {reviews && reviews.some((r) => r.status === 'pending') && (
        <>
          <div className="plate-divider"><div className="label">Lift reviews — paid requests</div><div className="rule" /></div>
          {reviews.filter((r) => r.status === 'pending').map((r) => (
            <div key={r._id} className="card" style={{ borderTopColor: 'var(--brass)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{r.user_name} — {r.lift}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>
                    Automated score: {r.cv_score}/10 · ₹{r.fee_inr} paid · {fmtDate(r.created_at)}
                  </div>
                </div>
                <button className="btn secondary" style={{ width: 'auto', padding: '9px 16px' }} onClick={() => openReviewFor(r._id)}>
                  {openReview === r._id ? 'Close' : 'Review'}
                </button>
              </div>

              {openReview === r._id && (
                <div style={{ marginTop: 10, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                  <video src={coachReviewVideoUrl(r._id)} controls playsInline style={{ marginBottom: 12 }} />
                  <div className="disclaimer" style={{ marginBottom: 12 }}>
                    Automated notes: {r.cv_summary}
                  </div>
                  <div className="field">
                    <label>Notes for the lifter (optional)</label>
                    <textarea rows={2} value={verdictNotes} onChange={(e) => setVerdictNotes(e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn secondary" style={{ flex: 1 }} disabled={verdictBusy} onClick={() => submitVerdict(r._id, 'no_lift')}>No Lift</button>
                    <button className="btn" style={{ flex: 1 }} disabled={verdictBusy} onClick={() => submitVerdict(r._id, 'good_lift')}>Good Lift</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {pending.length > 0 && (
        <>
          <div className="plate-divider"><div className="label">Pending sign-ups</div><div className="rule" /></div>
          {pending.map((u) => (
            <div key={u.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{u.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>Signed up {fmtDate(u.created_at)}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn secondary" style={{ width: 'auto', padding: '9px 16px' }} disabled={busyId === u.id} onClick={() => handleReject(u.id)}>Reject</button>
                  <button className="btn" style={{ width: 'auto', padding: '9px 16px' }} disabled={busyId === u.id} onClick={() => handleApprove(u.id)}>Approve</button>
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      <div className="plate-divider"><div className="label">All users</div><div className="rule" /></div>
      {approved.length === 0 && rejected.length === 0 ? (
        <div className="empty-state"><CheckinIcon style={{ width: 38, height: 38, color: 'var(--ink-faint)' }} /><div>No approved users yet.</div></div>
      ) : (
        [...approved, ...rejected].map((u) => (
          <div key={u.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => toggleExpand(u.id)}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{u.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>
                  {u.activity_count} activities logged{u.last_activity ? ` · last on ${fmtDate(u.last_activity)}` : ''}
                </div>
              </div>
              <span className={`pill ${u.status === 'approved' ? 'full' : 'missed'}`}>{u.status}</span>
            </div>
            {expanded === u.id && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                {activities.length === 0 ? (
                  <p style={{ fontSize: 12.5, color: 'var(--ink-faint)' }}>No activity logged yet.</p>
                ) : (
                  activities.map((a, i) => (
                    <div key={i} className="history-item">
                      <div><div className="d">{fmtDate(a.date)} · {a.type}</div>{a.summary}</div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
