import { useState, useRef, useCallback } from 'react';
import TopBar from '../components/TopBar.jsx';
import { SquatIcon, BenchIcon, DeadliftIcon, UploadIcon } from '../components/Icons.jsx';
import { analyzeLift, checkBackendHealth } from '../lib/api.js';
import { load, save, LS_LIFTCHECKS } from '../lib/storage.js';
import { pickQuote, todayISO } from '../lib/data.js';
import { useToast } from '../lib/ToastContext.jsx';
import { logActivity, requestHumanReview, REVIEW_FEE_INR } from '../lib/authApi.js';

const LIFTS = [
  { id: 'squat', label: 'Squat', Icon: SquatIcon },
  { id: 'bench', label: 'Bench Press', Icon: BenchIcon },
  { id: 'deadlift', label: 'Deadlift', Icon: DeadliftIcon },
];

function scoreVerdict(score) {
  if (score >= 8) return 'good';
  if (score <= 3) return 'bad';
  return 'mid';
}

export default function LiftCheck({ onHome }) {
  const [lift, setLift] = useState('squat');
  const [file, setFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | checking-backend | analyzing | done | error
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef(null);
  const showToast = useToast();

  const pickFile = useCallback((f) => {
    if (!f) return;
    setFile(f);
    setVideoUrl(URL.createObjectURL(f));
    setResult(null);
    setStatus('idle');
    setSaved(false);
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) pickFile(f);
  };

  const runAnalysis = async () => {
    if (!file) return;
    setStatus('checking-backend');
    setErrorMsg('');
    const healthy = await checkBackendHealth();
    if (!healthy) {
      setStatus('error');
      setErrorMsg(
        'Cannot reach the analysis backend. Start it with: cd backend && uvicorn main:app --reload --port 8000'
      );
      return;
    }
    setStatus('analyzing');
    try {
      const report = await analyzeLift(file, lift, { annotate: false });
      setResult(report);
      setStatus('done');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message || 'Something went wrong during analysis.');
    }
  };

  const saveToHistory = () => {
    if (!result?.ok) return;
    const today = todayISO();
    const history = load(LS_LIFTCHECKS, []);
    history.push({ date: today, lift, score: result.score_out_of_10 });
    save(LS_LIFTCHECKS, history);
    setSaved(true);
    showToast(`${lift.charAt(0).toUpperCase() + lift.slice(1)} check saved`, { date: today, sub: `Scored ${result.score_out_of_10}/10` });
    logActivity('lift_check', today, `${lift} — scored ${result.score_out_of_10}/10`);
  };

  return (
    <>
      <TopBar tab="judge" onHome={onHome} />
      <p style={{ color: 'var(--ink-dim)', fontSize: 13.5, marginBottom: 16 }}>
        Upload a real lift video — this runs an actual pose-estimation pipeline (YOLOv8-Pose)
        on your own machine and scores it against measurable rules.
      </p>

      <div className="lift-row">
        {LIFTS.map(({ id, label, Icon }) => (
          <div
            key={id}
            className={`lift-pick ${lift === id ? 'active' : ''}`}
            onClick={() => { setLift(id); setResult(null); setStatus('idle'); }}
          >
            <Icon style={{ width: 34, height: 34 }} />
            <div className="name">{label.split(' ')[0]}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3>1. Upload your video</h3>
        <p style={{ fontSize: 13, color: 'var(--ink-dim)', marginBottom: 10 }}>
          Side-on, full body in frame, for the whole rep. Nothing uploads to any cloud — this
          goes straight to the backend running on your own computer.
        </p>

        {!videoUrl ? (
          <div
            className={`upload-drop ${dragging ? 'dragging' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <UploadIcon style={{ margin: '0 auto 8px' }} />
            <div className="u-title">Drop a video, or tap to browse</div>
            <div className="u-sub">MP4, MOV — any length, but shorter clips analyze faster</div>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              style={{ display: 'none' }}
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
          </div>
        ) : (
          <div>
            <video src={videoUrl} controls playsInline style={{ marginBottom: 10 }} />
            <button className="btn secondary" onClick={() => fileInputRef.current?.click()}>
              Choose a different video
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              style={{ display: 'none' }}
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
          </div>
        )}
      </div>

      {videoUrl && status !== 'analyzing' && status !== 'checking-backend' && (
        <button className="btn" onClick={runAnalysis} style={{ marginBottom: 14 }}>
          Analyze this {LIFTS.find((l) => l.id === lift).label}
        </button>
      )}

      {(status === 'checking-backend' || status === 'analyzing') && (
        <div className="card analyzing-box">
          <div className="spinner" />
          <div className="a-label">{status === 'checking-backend' ? 'Connecting to backend…' : 'Running pose estimation…'}</div>
          <div className="a-sub">
            {status === 'analyzing' ? 'This processes every frame — a few seconds to a minute depending on video length.' : ''}
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="verdict-box verdict-bad">
          <div className="v-title">Couldn't Analyze That</div>
          <div style={{ fontSize: 13, color: 'var(--ink-dim)' }}>{errorMsg}</div>
        </div>
      )}

      {status === 'done' && result && !result.ok && result.wrong_section && (
        <div className="verdict-box verdict-mid">
          <div className="v-title">Wrong Section</div>
          <div style={{ fontSize: 13, color: 'var(--ink-dim)' }}>{result.reason}</div>
        </div>
      )}

      {status === 'done' && result && !result.ok && !result.wrong_section && (
        <div className="verdict-box verdict-mid">
          <div className="v-title">Could Not Read The Lift</div>
          <div style={{ fontSize: 13, color: 'var(--ink-dim)' }}>{result.reason}</div>
        </div>
      )}

      {status === 'done' && result && result.ok && (
        <ResultCard result={result} lift={lift} file={file} onSave={saveToHistory} saved={saved} />
      )}
    </>
  );
}

function ResultCard({ result, lift, file, onSave, saved }) {
  const score = result.score_out_of_10;
  const verdict = scoreVerdict(score);
  const boxClass = verdict === 'good' ? 'verdict-good' : verdict === 'bad' ? 'verdict-bad' : 'verdict-mid';
  const color = verdict === 'good' ? 'var(--good)' : 'var(--iron)';
  const litCount = verdict === 'good' ? 3 : verdict === 'bad' ? 0 : 2;
  const titleText = verdict === 'good' ? 'Strong Lift' : verdict === 'bad' ? 'Needs Work' : 'Mixed Result';

  const [reviewState, setReviewState] = useState('idle'); // idle | confirm | sending | sent | error
  const [reviewError, setReviewError] = useState('');

  const confirmAndSend = async () => {
    setReviewState('sending');
    setReviewError('');
    try {
      await requestHumanReview(file, lift, score, result.score_notes.join('; '));
      setReviewState('sent');
    } catch (err) {
      setReviewState('error');
      setReviewError(err.message);
    }
  };

  return (
    <>
      <div className={`verdict-box ${boxClass}`}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div className="light-row">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="light-dot"
                style={{
                  background: i < litCount ? color : 'var(--surface-2)',
                  border: `1px solid ${i < litCount ? color : 'var(--line-strong)'}`,
                  boxShadow: i < litCount ? `0 0 8px ${color}` : 'none',
                }}
              />
            ))}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color }}>
            {score}<span style={{ fontSize: 13, color: 'var(--ink-faint)' }}>/10</span>
          </div>
        </div>
        <div className="v-title">{titleText}</div>
        <div style={{ fontSize: 12.5, color: 'var(--ink-dim)' }}>Time to bar release: {result.time_to_release_s}s (video start to lockout — nothing after counted)</div>
      </div>

      <div className="card">
        <h3>What the pipeline found</h3>
        {result.score_notes.map((n, i) => (
          <div key={i} style={{ fontSize: 13, color: 'var(--ink-dim)', padding: '6px 0', borderBottom: i < result.score_notes.length - 1 ? '1px solid var(--line)' : 'none' }}>
            {n}
          </div>
        ))}

        {lift === 'squat' && (
          <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--ink-faint)' }}>
            Knee angle at bottom: {result.depth?.knee_angle_at_bottom_deg ?? '—'}° · Knee angle at lockout: {result.lockout?.knee_angle_deg ?? '—'}°
          </div>
        )}
        {lift === 'deadlift' && (
          <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--ink-faint)' }}>
            Knee angle at lockout: {result.lockout?.knee_angle_deg ?? '—'}° · Hip extension: {result.lockout?.hip_extension_angle_deg ?? '—'}°
          </div>
        )}
        {lift === 'bench' && (
          <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--ink-faint)' }}>
            Lockout judged by: {result.lockout?.method}. Elbow angle reading: {result.lockout?.elbow_angle_deg ?? '—'}°
            {result.lockout?.elbow_angle_reliable === false && ' (flagged unreliable on this camera angle)'}
          </div>
        )}
      </div>

      {result.caveat && <div className="disclaimer">{result.caveat}</div>}
      {result.note && <div className="disclaimer" style={{ marginTop: 8 }}>{result.note}</div>}

      <div className="note-box" style={{ marginTop: 14 }}>{pickQuote()}</div>

      <button className="btn secondary" onClick={onSave} disabled={saved} style={{ marginBottom: 14 }}>
        {saved ? 'Saved to history' : 'Save this to my history'}
      </button>

      {/* Human review — the pose model can't tell a spotter-assisted rep from a solo one,
          and it has no way to verify the weight is real. This is the escape hatch. */}
      <div className="card" style={{ borderTopColor: 'var(--brass)' }}>
        <h3>Want a human to double-check?</h3>
        <p style={{ fontSize: 13, color: 'var(--ink-dim)', marginBottom: 12 }}>
          The automated score above is measured geometry — it can't tell whether a spotter
          gave you a small assist, or verify the weight is real. A coach can watch the actual
          video and give a real verdict for a small fee.
        </p>

        {reviewState === 'idle' && (
          <button className="btn secondary" style={{ width: '100%' }} onClick={() => setReviewState('confirm')}>
            Request Human Review — ₹{REVIEW_FEE_INR}
          </button>
        )}

        {reviewState === 'confirm' && (
          <div>
            <div className="disclaimer" style={{ marginBottom: 12 }}>
              This sends your uploaded video to a coach for manual review. ₹{REVIEW_FEE_INR} is a
              placeholder fee for this demo — no real payment is charged.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn secondary" style={{ flex: 1 }} onClick={() => setReviewState('idle')}>Cancel</button>
              <button className="btn" style={{ flex: 1 }} onClick={confirmAndSend}>Confirm & Send</button>
            </div>
          </div>
        )}

        {reviewState === 'sending' && (
          <div className="analyzing-box">
            <div className="spinner" />
            <div className="a-label">Sending to your coach…</div>
          </div>
        )}

        {reviewState === 'sent' && (
          <div className="verdict-box verdict-good" style={{ marginBottom: 0 }}>
            <div className="v-title">Sent for Review</div>
            <div style={{ fontSize: 13, color: 'var(--ink-dim)' }}>
              Your coach will review the actual video and give a verdict — check back on this
              screen or in Progress to see it once it's in.
            </div>
          </div>
        )}

        {reviewState === 'error' && (
          <div>
            <div className="verdict-box verdict-bad"><div style={{ fontSize: 13, color: 'var(--iron)' }}>{reviewError}</div></div>
            <button className="btn secondary" style={{ width: '100%' }} onClick={() => setReviewState('idle')}>Try again</button>
          </div>
        )}
      </div>
    </>
  );
}
