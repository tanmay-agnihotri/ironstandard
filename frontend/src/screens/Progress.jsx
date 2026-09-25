import { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import TopBar from '../components/TopBar.jsx';
import { ProgressIcon } from '../components/Icons.jsx';
import { load, LS_CHECKINS, LS_TRAINLOGS, LS_LIFTCHECKS, LS_PROGRAM, LS_MEALPLAN, LS_DIETLOG, LS_PROFILE } from '../lib/storage.js';
import { fmtDate, todayISO, PROGRAM_TEMPLATE } from '../lib/data.js';
import { buildDailyReports, generateProgressReportPDF, downloadPDF, sharePDF } from '../lib/pdf.js';
import { myReviews } from '../lib/authApi.js';

function BodyweightChart({ checkins }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  useEffect(() => {
    const withBW = checkins.filter((c) => c.bodyweight);
    if (withBW.length < 2 || !canvasRef.current) return;
    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: { labels: withBW.map((c) => fmtDate(c.date)), datasets: [{ data: withBW.map((c) => c.bodyweight), borderColor: '#e0222c', backgroundColor: 'rgba(224,34,44,0.15)', tension: 0.3, fill: true, pointRadius: 3 }] },
      options: { plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#918c7d', font: { size: 10 } }, grid: { color: 'rgba(245,244,240,0.06)' } }, y: { ticks: { color: '#918c7d', font: { size: 10 } }, grid: { color: 'rgba(245,244,240,0.06)' } } } },
    });
    return () => chartRef.current?.destroy();
  }, [checkins]);
  const withBW = checkins.filter((c) => c.bodyweight);
  if (withBW.length < 2) return <p style={{ fontSize: 13, color: 'var(--ink-faint)' }}>Log bodyweight in at least two check-ins to see a trend.</p>;
  return <canvas ref={canvasRef} height={180} />;
}

function SleepChart({ checkins }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  useEffect(() => {
    if (checkins.length < 2 || !canvasRef.current) return;
    const recent = checkins.slice(-14);
    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: { labels: recent.map((c) => fmtDate(c.date)), datasets: [{ data: recent.map((c) => c.sleep || 0), backgroundColor: 'rgba(224,34,44,0.55)' }] },
      options: { plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#918c7d', font: { size: 10 } }, grid: { display: false } }, y: { ticks: { color: '#918c7d', font: { size: 10 } }, grid: { color: 'rgba(245,244,240,0.06)' } } } },
    });
    return () => chartRef.current?.destroy();
  }, [checkins]);
  if (checkins.length < 2) return <p style={{ fontSize: 13, color: 'var(--ink-faint)' }}>Log sleep in at least two check-ins to see a trend.</p>;
  return <canvas ref={canvasRef} height={180} />;
}

function isoDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function dateRangeArray(from, to) {
  const range = [];
  let cur = new Date(from + 'T00:00:00');
  const end = new Date(to + 'T00:00:00');
  while (cur <= end) {
    range.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return range;
}

function completionColor(status) {
  if (status === 'full') return 'var(--good)';
  if (status === 'partial') return 'var(--brass)';
  if (status === 'missed' || status === 'none') return 'var(--iron)';
  return 'var(--ink-faint)';
}

export default function Progress({ onHome }) {
  const [checkins] = useState(() => load(LS_CHECKINS, []));
  const [trainlogs] = useState(() => load(LS_TRAINLOGS, []));
  const [liftchecks] = useState(() => load(LS_LIFTCHECKS, []));
  const [mealPlan] = useState(() => load(LS_MEALPLAN, {}));
  const [dietLog] = useState(() => load(LS_DIETLOG, []));
  const [program] = useState(() => load(LS_PROGRAM, PROGRAM_TEMPLATE));
  const [profile] = useState(() => load(LS_PROFILE, null));
  const [reviews, setReviews] = useState(null);
  useEffect(() => { myReviews().then(setReviews).catch(() => setReviews([])); }, []);

  const [rangeFrom, setRangeFrom] = useState(isoDaysAgo(6));
  const [rangeTo, setRangeTo] = useState(todayISO());
  const [exporting, setExporting] = useState(false);

  if (checkins.length === 0 && trainlogs.length === 0) {
    return (
      <>
        <TopBar tab="progress" onHome={onHome} />
        <div className="empty-state">
          <ProgressIcon style={{ width: 38, height: 38, color: 'var(--ink-faint)' }} />
          <div>Log a few check-ins and workouts and your trends will show up here.</div>
        </div>
      </>
    );
  }

  const last28 = trainlogs.slice(-28);
  const fullCount = last28.filter((c) => c.completion === 'full').length;
  const adherence = last28.length ? Math.round((fullCount / last28.length) * 100) : 0;

  const dateRange = dateRangeArray(rangeFrom, rangeTo);
  const reports = buildDailyReports(dateRange, trainlogs, dietLog, mealPlan, program);

  const setQuickRange = (days) => {
    setRangeFrom(isoDaysAgo(days - 1));
    setRangeTo(todayISO());
  };

  const buildReportDoc = () => generateProgressReportPDF({ dateRange, trainlogs, dietLog, mealPlan, program, profile });

  const handleDownload = () => {
    downloadPDF(buildReportDoc(), `iron-standard-report-${rangeFrom}-to-${rangeTo}.pdf`);
  };

  const handleShare = async () => {
    setExporting(true);
    try {
      await sharePDF(buildReportDoc(), `iron-standard-report-${rangeFrom}-to-${rangeTo}.pdf`, 'Iron Standard Progress Report');
    } catch (err) {
      alert('Could not generate the report: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <TopBar tab="progress" onHome={onHome} />
      <div className="stat-row">
        <div className="stat-box"><div className="n">{trainlogs.length}</div><div className="l">Sessions logged</div></div>
        <div className="stat-box"><div className="n">{adherence}%</div><div className="l">Adherence (28d)</div></div>
        <div className="stat-box"><div className="n">{liftchecks.length}</div><div className="l">Lifts reviewed</div></div>
      </div>
      <div className="card"><h3>Bodyweight</h3><BodyweightChart checkins={checkins} /></div>
      <div className="card"><h3>Sleep (hours)</h3><SleepChart checkins={checkins} /></div>

      <div className="plate-divider"><div className="label">Daily report — exercise & diet</div><div className="rule" /></div>

      <div className="card">
        <h3>Select a range</h3>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button className="radio-chip" style={{ flex: 1, textAlign: 'center' }} onClick={() => setQuickRange(4)}>Mid-week (4d)</button>
          <button className="radio-chip" style={{ flex: 1, textAlign: 'center' }} onClick={() => setQuickRange(7)}>This week (7d)</button>
          <button className="radio-chip" style={{ flex: 1, textAlign: 'center' }} onClick={() => setQuickRange(14)}>2 weeks (14d)</button>
        </div>
        <div className="field-row">
          <div className="field"><label>From</label><input type="date" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} /></div>
          <div className="field"><label>To</label><input type="date" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} /></div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn secondary" onClick={handleDownload} style={{ flex: 1 }}>Save to Downloads</button>
          <button className="btn" onClick={handleShare} disabled={exporting} style={{ flex: 1 }}>
            {exporting ? 'Preparing…' : 'Share with Coach'}
          </button>
        </div>
      </div>

      {reports.map((r) => (
        <div key={r.date} className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, textTransform: 'uppercase' }}>{fmtDate(r.date)}</div>
            {r.workout && (
              <span className="pill" style={{ background: 'transparent', border: `1px solid ${completionColor(r.workout.completion)}`, color: completionColor(r.workout.completion) }}>
                {r.workout.completion}
              </span>
            )}
          </div>

          <div style={{ fontSize: 12.5, color: 'var(--ink-dim)', marginBottom: 6 }}>
            <strong style={{ color: 'var(--ink)' }}>Workout: </strong>
            {r.workout ? r.workout.dayLabel : <span style={{ color: 'var(--ink-faint)' }}>not logged</span>}
          </div>
          {r.assignedExercises.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              {r.assignedExercises.map((assigned) => {
                const done = r.workout.exercises.find((e) => e.name === assigned.name);
                const doneOk = done && (done.weight || done.sets || done.reps);
                return (
                  <div key={assigned.name} style={{ fontSize: 11.5, color: 'var(--ink-faint)', paddingLeft: 10, borderLeft: `2px solid ${doneOk ? 'var(--good)' : 'var(--line-strong)'}`, marginBottom: 4 }}>
                    {assigned.name} — assigned {assigned.sets}
                    {doneOk ? ` · done ${done.weight || '—'}kg × ${done.sets || '—'}×${done.reps || '—'} (RPE ${done.rpe || '—'})` : ' · not logged'}
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ fontSize: 12.5, color: 'var(--ink-dim)' }}>
            <strong style={{ color: 'var(--ink)' }}>Diet: </strong>
            {r.plannedMeals.length ? r.plannedMeals.map((m) => m.name).join(', ') : <span style={{ color: 'var(--ink-faint)' }}>nothing planned</span>}
          </div>
          {r.dietEntry && (
            <span className="pill" style={{ marginTop: 4, display: 'inline-block', background: 'transparent', border: `1px solid ${completionColor(r.dietEntry.followed)}`, color: completionColor(r.dietEntry.followed) }}>
              {r.dietEntry.followed === 'full' ? 'followed' : r.dietEntry.followed}
            </span>
          )}
        </div>
      ))}

      <div className="card">
        <h3>Lift check history</h3>
        {liftchecks.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--ink-faint)' }}>No lift reviews saved yet.</p>
        ) : (
          liftchecks.slice().reverse().slice(0, 8).map((l, i) => (
            <div key={i} className="history-item">
              <div><div className="d">{fmtDate(l.date)}</div>{l.lift}</div>
              <span style={{ fontFamily: 'var(--font-display)', color: 'var(--brass)' }}>{l.score}/10</span>
            </div>
          ))
        )}
      </div>

      {reviews && reviews.length > 0 && (
        <div className="card" style={{ borderTopColor: 'var(--brass)' }}>
          <h3>Human review requests</h3>
          {reviews.map((r) => (
            <div key={r._id} className="history-item">
              <div>
                <div className="d">{fmtDate(r.created_at)} · {r.lift}</div>
                {r.status === 'pending' ? 'Waiting for your coach' : (r.coach_notes || 'Reviewed')}
              </div>
              {r.status === 'pending' ? (
                <span className="pill partial">pending</span>
              ) : (
                <span className={`pill ${r.verdict === 'good_lift' ? 'full' : 'missed'}`}>
                  {r.verdict === 'good_lift' ? 'good lift' : 'no lift'}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
