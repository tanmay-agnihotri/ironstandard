import { useMemo } from 'react';
import TopBar from '../components/TopBar.jsx';
import { SquatIcon, BenchIcon, DeadliftIcon, PlateIcon } from '../components/Icons.jsx';
import { pickQuote } from '../lib/data.js';

const FEATURES = [
  { id: 'judge', title: 'Lift Check', desc: 'Upload a squat, bench or deadlift video and get a real pose-estimation analysis — depth, lockout, tempo, and a score out of 10.' },
  { id: 'plan', title: 'Training Plan', desc: 'A 5-day, 2-hour split built around squat, bench and deadlift — editable, dated, and exportable as a PDF.' },
  { id: 'trainlog', title: 'Workout Log', desc: 'Record exactly what you lifted today against what the plan called for.' },
  { id: 'diet', title: 'Diet', desc: 'Calorie and protein targets, a weekly meal planner, and a cheat-meal tracker.' },
  { id: 'checkin', title: 'Daily Check-in', desc: 'Sleep, water, caffeine, energy, stress, alcohol, smoking — the habits underneath your training.' },
  { id: 'progress', title: 'Progress', desc: 'Bodyweight and sleep charts, a day-by-day assigned-vs-completed report, and a PDF you can send your coach.' },
];

export default function Home({ onHome, onNav, onLogout }) {
  const quote = useMemo(() => pickQuote(), []);

  return (
    <>
      <TopBar tab="home" onHome={onHome} />
      <div className="hero">
        <div className="badge-chip">
          <PlateIcon style={{ color: 'var(--brass)' }} />
          Raw Powerlifting
        </div>
        <h1>Judge your own lift like the platform will.</h1>
        <p className="lede">
          A self-coaching tool for raw powerlifting: review your squat, bench and deadlift
          with a real computer-vision pipeline, log your training, plan your diet, and track
          the daily habits that decide whether any of it sticks.
        </p>
      </div>

      <div className="lift-row">
        <div className="lift-pick static"><SquatIcon style={{ width: 34, height: 34, color: 'var(--ink-dim)' }} /><div className="name">Squat</div></div>
        <div className="lift-pick static"><BenchIcon style={{ width: 34, height: 34, color: 'var(--ink-dim)' }} /><div className="name">Bench</div></div>
        <div className="lift-pick static"><DeadliftIcon style={{ width: 34, height: 34, color: 'var(--ink-dim)' }} /><div className="name">Deadlift</div></div>
      </div>

      <div className="note-box">{quote}</div>

      <div className="plate-divider">
        <PlateIcon style={{ color: 'var(--ink-faint)' }} />
        <div className="label">What is here</div>
        <div className="rule" />
      </div>

      <div className="feature-grid">
        {FEATURES.map((f) => (
          <div key={f.id} className="card clickable" onClick={() => onNav(f.id)}>
            <h3>{f.title}</h3>
            <p style={{ fontSize: 13.5, color: 'var(--ink-dim)' }}>{f.desc}</p>
          </div>
        ))}
      </div>

      <div className="disclaimer">
        Your training data (profile, logs, check-ins) stays in this browser's local storage.
        Lift Check videos are sent to the analysis backend running on your own machine —
        nothing leaves your computer.
      </div>
      <button className="btn ghost-small" style={{ width: '100%', marginTop: 14 }} onClick={onLogout}>Log out</button>
    </>
  );
}
