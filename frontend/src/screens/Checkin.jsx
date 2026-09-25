import { useState } from 'react';
import TopBar from '../components/TopBar.jsx';
import { CheckinIcon } from '../components/Icons.jsx';
import { load, save, LS_CHECKINS } from '../lib/storage.js';
import { todayISO, fmtDate } from '../lib/data.js';
import { useToast } from '../lib/ToastContext.jsx';
import { logActivity } from '../lib/authApi.js';

function emptyForm() {
  return { bw: '', water: '', sleep: '', sleepq: '', energy: '', stress: '', caffeine: '', alc: '0', cig: '0', substances: '', notes: '' };
}

export default function Checkin({ onHome }) {
  const [checkins, setCheckins] = useState(() => load(LS_CHECKINS, []));
  const [form, setForm] = useState(emptyForm);
  const showToast = useToast();

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    const entry = {
      date: todayISO(),
      bodyweight: parseFloat(form.bw) || null,
      water: parseFloat(form.water) || null,
      sleep: parseFloat(form.sleep) || null,
      sleepQuality: parseFloat(form.sleepq) || null,
      energy: parseFloat(form.energy) || null,
      stress: parseFloat(form.stress) || null,
      caffeine: parseFloat(form.caffeine) || 0,
      alcohol: parseFloat(form.alc) || 0,
      cigarettes: parseFloat(form.cig) || 0,
      substances: form.substances || '',
      notes: form.notes || '',
    };
    const updated = [...checkins, entry];
    setCheckins(updated);
    save(LS_CHECKINS, updated);
    showToast('Daily check-in logged', { date: entry.date });
    logActivity('checkin', entry.date, `Sleep ${entry.sleep ?? '—'}h, Energy ${entry.energy ?? '—'}/5, Stress ${entry.stress ?? '—'}/5`);
    setForm(emptyForm());
  };

  return (
    <>
      <TopBar tab="checkin" onHome={onHome} />
      <p style={{ color: 'var(--ink-dim)', fontSize: 13.5, marginBottom: 16 }}>Just today's habits — nothing about training goes here.</p>

      <div className="card">
        <div className="field-row">
          <div className="field"><label>Bodyweight (kg)</label><input type="number" value={form.bw} onChange={(e) => set('bw', e.target.value)} /></div>
          <div className="field"><label>Water (litres)</label><input type="number" step="0.1" value={form.water} onChange={(e) => set('water', e.target.value)} /></div>
        </div>
        <div className="field-row">
          <div className="field"><label>Sleep (hours)</label><input type="number" step="0.5" value={form.sleep} onChange={(e) => set('sleep', e.target.value)} /></div>
          <div className="field"><label>Sleep quality (1 to 5)</label><input type="number" min="1" max="5" value={form.sleepq} onChange={(e) => set('sleepq', e.target.value)} /></div>
        </div>
        <div className="field-row">
          <div className="field"><label>Energy (1 to 5)</label><input type="number" min="1" max="5" value={form.energy} onChange={(e) => set('energy', e.target.value)} /></div>
          <div className="field"><label>Stress (1 to 5)</label><input type="number" min="1" max="5" value={form.stress} onChange={(e) => set('stress', e.target.value)} /></div>
        </div>
        <div className="field-row">
          <div className="field"><label>Caffeine (mg, approx)</label><input type="number" placeholder="~95mg per coffee" value={form.caffeine} onChange={(e) => set('caffeine', e.target.value)} /></div>
          <div className="field"><label>Alcohol (units)</label><input type="number" value={form.alc} onChange={(e) => set('alc', e.target.value)} /></div>
        </div>
        <div className="field"><label>Cigarettes today</label><input type="number" value={form.cig} onChange={(e) => set('cig', e.target.value)} /></div>
        <div className="field">
          <label>Other substance use (optional, private, just for your own tracking)</label>
          <input type="text" placeholder="Leave blank if none" value={form.substances} onChange={(e) => set('substances', e.target.value)} />
        </div>
        <div className="field"><label>Notes (optional)</label><textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} /></div>
        <button className="btn" onClick={submit}>Save today's check-in</button>
      </div>

      <div className="plate-divider"><div className="label">Recent history</div><div className="rule" /></div>
      {checkins.length === 0 ? (
        <div className="empty-state"><CheckinIcon style={{ width: 38, height: 38, color: 'var(--ink-faint)' }} /><div>No check-ins yet — log today's to start your history.</div></div>
      ) : (
        checkins.slice().reverse().slice(0, 14).map((c, i) => (
          <div key={i} className="history-item">
            <div><div className="d">{fmtDate(c.date)}</div>Sleep {c.sleep ?? '—'}h · Energy {c.energy ?? '—'}/5 · Stress {c.stress ?? '—'}/5</div>
          </div>
        ))
      )}
    </>
  );
}
