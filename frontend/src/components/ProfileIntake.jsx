import { useState } from 'react';
import { DIET_LABELS } from '../lib/data.js';

const SEX_OPTIONS = ['Male', 'Female'];
const EXPERIENCE_OPTIONS = ['New to lifting', 'Some gym experience'];

export default function ProfileIntake({ context, initial, onSave }) {
  const [draft, setDraft] = useState(initial || {});
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  const submit = () => {
    if (!draft.currentWeight || !draft.goalWeight || !draft.height || !draft.age || !draft.sex || !draft.diet) {
      alert('Fill in every field so the plan and calorie target are accurate.');
      return;
    }
    onSave(draft);
  };

  return (
    <div className="card">
      <h3>Set up your profile</h3>
      <p style={{ fontSize: 13, color: 'var(--ink-dim)', marginBottom: 12 }}>
        Used for both your {context === 'diet' ? 'diet targets and your ' : ''}training plan
        {context === 'plan' ? ' and your diet targets' : ''} — fill it in once.
      </p>
      <div className="field-row">
        <div className="field"><label>Current weight (kg)</label><input type="number" value={draft.currentWeight || ''} onChange={(e) => set('currentWeight', e.target.value)} /></div>
        <div className="field"><label>Goal weight (kg)</label><input type="number" value={draft.goalWeight || ''} onChange={(e) => set('goalWeight', e.target.value)} /></div>
      </div>
      <div className="field-row">
        <div className="field"><label>Height (cm)</label><input type="number" value={draft.height || ''} onChange={(e) => set('height', e.target.value)} /></div>
        <div className="field"><label>Age</label><input type="number" value={draft.age || ''} onChange={(e) => set('age', e.target.value)} /></div>
      </div>
      <div className="field">
        <label>Sex (for calorie estimate)</label>
        <div className="radio-group">
          {SEX_OPTIONS.map((s) => (
            <div key={s} className={`radio-chip ${draft.sex === s ? 'active' : ''}`} onClick={() => set('sex', s)}>{s}</div>
          ))}
        </div>
      </div>
      <div className="field">
        <label>Diet</label>
        <div className="radio-group">
          {Object.entries(DIET_LABELS).map(([k, v]) => (
            <div key={k} className={`radio-chip ${draft.diet === k ? 'active' : ''}`} onClick={() => set('diet', k)}>{v}</div>
          ))}
        </div>
      </div>
      <div className="field">
        <label>Experience</label>
        <div className="radio-group">
          {EXPERIENCE_OPTIONS.map((s) => (
            <div key={s} className={`radio-chip ${draft.experience === s ? 'active' : ''}`} onClick={() => set('experience', s)}>{s}</div>
          ))}
        </div>
      </div>
      <button className="btn" onClick={submit}>Save profile</button>
    </div>
  );
}
