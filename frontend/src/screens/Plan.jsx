import { useState } from 'react';
import TopBar from '../components/TopBar.jsx';
import ProfileIntake from '../components/ProfileIntake.jsx';
import { load, save, LS_PROFILE, LS_PROGRAM } from '../lib/storage.js';
import { PROGRAM_TEMPLATE, todayISO } from '../lib/data.js';
import { generatePlanPDF, downloadPDF, sharePDF } from '../lib/pdf.js';
import { useToast } from '../lib/ToastContext.jsx';

const LS_START_DATE = 'iron_plan_startdate';

function weeklyCoachingNote(trainlogs) {
  const recent = trainlogs.slice(-7);
  if (recent.length < 3) return null;
  const full = recent.filter((c) => c.completion === 'full').length;
  const rate = full / recent.length;
  if (rate < 0.6) {
    return "Adjusted for you: your last week's completion rate was under 60%, so this week's sets are trimmed slightly in your head — better to finish four solid sets than miss five planned ones. Rebuild volume once your workout log improves.";
  } else if (rate > 0.9) {
    return 'You are completing sessions well. Try adding a small amount of weight or one extra rep per set this week on your main lifts.';
  }
  return null;
}

function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d;
}

function dayDateLabel(startDate, i) {
  if (!startDate) return '';
  return addDays(startDate, i).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function Plan({ onHome }) {
  const [profile, setProfile] = useState(() => load(LS_PROFILE, null));
  const [program, setProgram] = useState(() => load(LS_PROGRAM, PROGRAM_TEMPLATE));
  const [startDate, setStartDate] = useState(() => load(LS_START_DATE, todayISO()));
  const [editing, setEditing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const showToast = useToast();
  const trainlogs = load('iron_trainlogs', []);

  const saveProfile = (draft) => {
    setProfile(draft);
    save(LS_PROFILE, draft);
    save(LS_PROGRAM, PROGRAM_TEMPLATE);
    setProgram(PROGRAM_TEMPLATE);
  };

  const updateStartDate = (val) => {
    setStartDate(val);
    save(LS_START_DATE, val);
  };

  const updateExercise = (dayIdx, exIdx, field, value) => {
    setProgram((p) => {
      const next = p.map((d, i) => {
        if (i !== dayIdx) return d;
        const exercises = d.exercises.map((e, j) => (j === exIdx ? { ...e, [field]: value } : e));
        return { ...d, exercises };
      });
      return next;
    });
  };

  const addExercise = (dayIdx) => {
    setProgram((p) => p.map((d, i) => (i === dayIdx ? { ...d, exercises: [...d.exercises, { name: 'New Exercise', sets: '3x8', note: '' }] } : d)));
  };

  const removeExercise = (dayIdx, exIdx) => {
    setProgram((p) => p.map((d, i) => (i === dayIdx ? { ...d, exercises: d.exercises.filter((_, j) => j !== exIdx) } : d)));
  };

  const saveChanges = () => {
    save(LS_PROGRAM, program);
    setEditing(false);
    showToast('Training plan updated', { sub: 'Changes saved to your plan' });
  };

  const cancelEditing = () => {
    setProgram(load(LS_PROGRAM, PROGRAM_TEMPLATE));
    setEditing(false);
  };

  const handleDownload = () => {
    downloadPDF(generatePlanPDF(program, startDate), 'iron-standard-training-plan.pdf');
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      await sharePDF(generatePlanPDF(program, startDate), 'iron-standard-training-plan.pdf', 'Iron Standard Training Plan');
    } catch (err) {
      alert('Could not generate the PDF: ' + err.message);
    } finally {
      setSharing(false);
    }
  };

  if (!profile) {
    return (
      <>
        <TopBar tab="plan" onHome={onHome} />
        <ProfileIntake context="plan" initial={profile} onSave={saveProfile} />
      </>
    );
  }

  const note = weeklyCoachingNote(trainlogs);

  return (
    <>
      <TopBar tab="plan" onHome={onHome} />
      <p style={{ color: 'var(--ink-dim)', fontSize: 13.5, marginBottom: 14 }}>
        {profile.currentWeight}kg working toward {profile.goalWeight}kg — five sessions a week, about two hours each.
      </p>
      {note && <div className="note-box">{note}</div>}

      <div className="card">
        <label>Week start date</label>
        <input type="date" value={startDate} onChange={(e) => updateStartDate(e.target.value)} />
        <p style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 8, marginBottom: 0 }}>
          Day 1 lands on this date, Day 2 the day after, and so on through the week — shown on each day below.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {!editing ? (
          <button className="btn secondary" onClick={() => setEditing(true)} style={{ flex: 1 }}>Edit exercises</button>
        ) : (
          <>
            <button className="btn" onClick={saveChanges} style={{ flex: 1 }}>Save changes</button>
            <button className="btn secondary" onClick={cancelEditing} style={{ flex: 1 }}>Cancel</button>
          </>
        )}
      </div>

      {program.map((d, i) => (
        <div key={i} className="card day-card">
          <div className="day-head">
            <div>
              <div className="num">DAY {i + 1} {startDate && <span style={{ color: 'var(--ink-faint)', fontWeight: 400 }}>· {dayDateLabel(startDate, i)}</span>}</div>
              <div className="focus">{d.focus}</div>
            </div>
          </div>

          {!editing ? (
            <table className="plan-table">
              <tbody>
                <tr><th>Exercise</th><th>Sets</th><th>Note</th></tr>
                {d.exercises.map((e, j) => (
                  <tr key={j}>
                    <td className="ex-name">{e.name}</td>
                    <td>{e.sets}</td>
                    <td>{e.note || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div>
              {d.exercises.map((e, j) => (
                <div key={j} className="exercise-row">
                  <div className="mini-field-row">
                    <div className="mini-field" style={{ flex: 2 }}>
                      <label>Exercise</label>
                      <input value={e.name} onChange={(ev) => updateExercise(i, j, 'name', ev.target.value)} />
                    </div>
                    <div className="mini-field">
                      <label>Sets</label>
                      <input value={e.sets} onChange={(ev) => updateExercise(i, j, 'sets', ev.target.value)} />
                    </div>
                  </div>
                  <div className="mini-field-row" style={{ marginTop: 6 }}>
                    <div className="mini-field" style={{ flex: 1 }}>
                      <label>Note</label>
                      <input value={e.note || ''} onChange={(ev) => updateExercise(i, j, 'note', ev.target.value)} />
                    </div>
                  </div>
                  <button className="remove-ex" onClick={() => removeExercise(i, j)}>Remove exercise</button>
                </div>
              ))}
              <button className="btn ghost-small" onClick={() => addExercise(i)}>+ Add exercise</button>
            </div>
          )}
        </div>
      ))}

      <div className="disclaimer">
        Sets and reps use RPE (effort level) instead of fixed kg because starting loads depend on
        your history — pick a weight each set where you could do one or two more reps if you had to.
        Warm up with the bar and build up in the first fifteen minutes of each session.
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button className="btn secondary" onClick={handleDownload} style={{ flex: 1 }}>Save to Downloads</button>
        <button className="btn" onClick={handleShare} disabled={sharing} style={{ flex: 1 }}>
          {sharing ? 'Preparing…' : 'Share PDF'}
        </button>
      </div>
      <button className="btn secondary" onClick={() => setProfile(null)} style={{ marginTop: 10 }}>
        Edit my profile
      </button>
    </>
  );
}
