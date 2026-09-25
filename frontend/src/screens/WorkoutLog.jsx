import { useState } from 'react';
import TopBar from '../components/TopBar.jsx';
import { WorkoutIcon } from '../components/Icons.jsx';
import { load, save, LS_PROGRAM, LS_TRAINLOGS } from '../lib/storage.js';
import { PROGRAM_TEMPLATE, todayISO, fmtDate } from '../lib/data.js';
import { useToast } from '../lib/ToastContext.jsx';
import { logActivity } from '../lib/authApi.js';

const LS_START_DATE = 'iron_plan_startdate';

function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d;
}
function dayDateLabel(startDate, i) {
  if (!startDate) return '';
  return addDays(startDate, i).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function newDraft() {
  return { date: todayISO(), dayRef: null, completion: null, exercises: [], customText: '', notes: '' };
}

export default function WorkoutLog({ onHome }) {
  const program = load(LS_PROGRAM, PROGRAM_TEMPLATE);
  const startDate = load(LS_START_DATE, null);
  const [trainlogs, setTrainlogs] = useState(() => load(LS_TRAINLOGS, []));
  const [draft, setDraft] = useState(newDraft);
  const showToast = useToast();

  const patch = (p) => setDraft((d) => ({ ...d, ...p }));

  const pickDay = (val) => patch({ dayRef: val, exercises: [] });

  const setExerciseField = (name, field, value) => {
    setDraft((d) => {
      const exercises = d.exercises.filter((e) => e.name !== name);
      const existing = d.exercises.find((e) => e.name === name) || { name };
      exercises.push({ ...existing, [field]: value });
      return { ...d, exercises };
    });
  };

  const addExtra = () => {
    const name = prompt('Exercise name');
    if (name) setDraft((d) => ({ ...d, exercises: [...d.exercises, { name, custom: true, weight: '', sets: '', reps: '', rpe: '' }] }));
  };

  const removeExtra = (idx) => {
    setDraft((d) => {
      const customOnes = d.exercises.filter((e) => e.custom);
      const target = customOnes[idx];
      return { ...d, exercises: d.exercises.filter((e) => e !== target) };
    });
  };

  const submit = () => {
    if (draft.dayRef == null) { alert('Choose which session this was.'); return; }
    if (!draft.completion) { alert('Select how the session went overall.'); return; }

    let dayLabel, exercises;
    if (draft.dayRef === 'custom') {
      dayLabel = 'Off-plan';
      exercises = [{ name: 'Custom', notes: draft.customText }];
    } else {
      const day = program[parseInt(draft.dayRef)];
      dayLabel = `Day ${parseInt(draft.dayRef) + 1}: ${day.focus.replace(' Day', '')}`;
      exercises = draft.exercises;
    }

    const entry = { date: draft.date || todayISO(), dayRef: draft.dayRef, dayLabel, completion: draft.completion, exercises, notes: draft.notes };
    const updated = [...trainlogs, entry];
    setTrainlogs(updated);
    save(LS_TRAINLOGS, updated);
    showToast('Workout logged', { date: entry.date, sub: `Marked ${draft.completion}` });
    logActivity('workout', entry.date, `${entry.dayLabel} — ${entry.completion}`);
    setDraft(newDraft());
  };

  const plannedExercises = draft.dayRef != null && draft.dayRef !== 'custom' ? program[parseInt(draft.dayRef)].exercises : [];
  const extraExercises = draft.exercises.filter((e) => e.custom);

  return (
    <>
      <TopBar tab="trainlog" onHome={onHome} />
      <p style={{ color: 'var(--ink-dim)', fontSize: 13.5, marginBottom: 16 }}>
        Log exactly what you did today — this is what your plan and progress are built from.
      </p>

      <div className="card">
        <div className="field">
          <label>Date</label>
          <input type="date" value={draft.date} onChange={(e) => patch({ date: e.target.value })} />
        </div>
        <div className="field">
          <label>Which session was this?</label>
          <div className="radio-group">
            {program.map((d, i) => (
              <div key={i} className={`radio-chip ${draft.dayRef === String(i) ? 'active' : ''}`} onClick={() => pickDay(String(i))}>
                Day {i + 1}: {d.focus.replace(' Day', '')}{startDate ? ` · ${dayDateLabel(startDate, i)}` : ''}
              </div>
            ))}
            <div className={`radio-chip ${draft.dayRef === 'custom' ? 'active' : ''}`} onClick={() => pickDay('custom')}>Off-plan</div>
          </div>
        </div>

        {draft.dayRef === 'custom' && (
          <div className="field">
            <label>What did you train? (name, sets x reps, weight — one line each)</label>
            <textarea rows={3} placeholder="Squat 5x5 at 80kg" value={draft.customText} onChange={(e) => patch({ customText: e.target.value })} />
          </div>
        )}

        {plannedExercises.map((e) => {
          const logged = draft.exercises.find((x) => x.name === e.name) || {};
          return (
            <div key={e.name} className="exercise-row">
              <div className="ex-title">{e.name}</div>
              <div className="ex-target">Planned: {e.sets}{e.note ? ` — ${e.note}` : ''}</div>
              <div className="mini-field-row">
                <div className="mini-field"><label>Weight (kg)</label><input type="number" value={logged.weight || ''} onChange={(ev) => setExerciseField(e.name, 'weight', ev.target.value)} /></div>
                <div className="mini-field"><label>Sets done</label><input type="number" value={logged.sets || ''} onChange={(ev) => setExerciseField(e.name, 'sets', ev.target.value)} /></div>
                <div className="mini-field"><label>Reps done</label><input type="number" value={logged.reps || ''} onChange={(ev) => setExerciseField(e.name, 'reps', ev.target.value)} /></div>
                <div className="mini-field"><label>RPE</label><input type="number" value={logged.rpe || ''} onChange={(ev) => setExerciseField(e.name, 'rpe', ev.target.value)} /></div>
              </div>
            </div>
          );
        })}

        {draft.dayRef != null && (
          <>
            {extraExercises.map((e, i) => (
              <div key={i} className="exercise-row">
                <div className="ex-title">{e.name || 'Extra exercise'}</div>
                <div className="mini-field-row">
                  <div className="mini-field"><label>Weight (kg)</label><input type="number" value={e.weight} onChange={(ev) => setExerciseField(e.name, 'weight', ev.target.value)} /></div>
                  <div className="mini-field"><label>Sets</label><input type="number" value={e.sets} onChange={(ev) => setExerciseField(e.name, 'sets', ev.target.value)} /></div>
                  <div className="mini-field"><label>Reps</label><input type="number" value={e.reps} onChange={(ev) => setExerciseField(e.name, 'reps', ev.target.value)} /></div>
                  <div className="mini-field"><label>RPE</label><input type="number" value={e.rpe} onChange={(ev) => setExerciseField(e.name, 'rpe', ev.target.value)} /></div>
                </div>
                <button className="remove-ex" onClick={() => removeExtra(i)}>Remove</button>
              </div>
            ))}
            <button className="btn ghost-small" onClick={addExtra} type="button">+ Add extra exercise</button>
          </>
        )}

        <div className="field" style={{ marginTop: 14 }}>
          <label>Overall, how did the session go?</label>
          <div className="radio-group">
            {[['full', 'Full — as planned'], ['partial', 'Partial'], ['missed', 'Missed / skipped']].map(([id, label]) => (
              <div key={id} className={`radio-chip ${draft.completion === id ? 'active' : ''}`} onClick={() => patch({ completion: id })}>{label}</div>
            ))}
          </div>
        </div>
        <div className="field"><label>Notes (optional)</label><textarea rows={2} value={draft.notes} onChange={(e) => patch({ notes: e.target.value })} /></div>
        <button className="btn" onClick={submit}>Save today's workout</button>
      </div>

      <div className="plate-divider"><div className="label">Recent sessions</div><div className="rule" /></div>
      {trainlogs.length === 0 ? (
        <div className="empty-state"><WorkoutIcon style={{ width: 38, height: 38, color: 'var(--ink-faint)' }} /><div>No sessions logged yet.</div></div>
      ) : (
        trainlogs.slice().reverse().slice(0, 14).map((t, i) => (
          <div key={i} className="history-item">
            <div><div className="d">{fmtDate(t.date)}</div>{t.dayLabel}</div>
            <span className={`pill ${t.completion}`}>{t.completion}</span>
          </div>
        ))
      )}
    </>
  );
}
