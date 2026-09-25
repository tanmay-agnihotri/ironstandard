import { useState } from 'react';
import TopBar from '../components/TopBar.jsx';
import ProfileIntake from '../components/ProfileIntake.jsx';
import { CheckinIcon } from '../components/Icons.jsx';
import { load, save, LS_PROFILE, LS_PROGRAM, LS_MEALPLAN, LS_DIETLOG, LS_CHEATMEALS } from '../lib/storage.js';
import {
  DIET_LABELS, FOOD_SOURCES, DIET_FAQ, MEAL_TYPES, WEEK_DAYS, PROGRAM_TEMPLATE,
  computeDiet, getMealsFor, findMeal, dateForDay, todayDayKey, todayISO, fmtDate,
} from '../lib/data.js';
import { useToast } from '../lib/ToastContext.jsx';
import { logActivity } from '../lib/authApi.js';

const SUBTABS = [
  { id: 'targets', label: 'Targets' },
  { id: 'weekplan', label: 'Weekly Plan' },
  { id: 'cheat', label: 'Cheat Meals' },
];

export default function Diet({ onHome }) {
  const [profile, setProfile] = useState(() => load(LS_PROFILE, null));
  const [subtab, setSubtab] = useState('targets');

  const saveProfile = (draft) => {
    setProfile(draft);
    save(LS_PROFILE, draft);
    if (!load(LS_PROGRAM, null)) save(LS_PROGRAM, PROGRAM_TEMPLATE);
  };

  if (!profile) {
    return (
      <>
        <TopBar tab="diet" onHome={onHome} />
        <ProfileIntake context="diet" initial={profile} onSave={saveProfile} />
      </>
    );
  }

  return (
    <>
      <TopBar tab="diet" onHome={onHome} />
      <div className="seg-tabs">
        {SUBTABS.map((t) => (
          <div key={t.id} className={`seg-tab ${subtab === t.id ? 'active' : ''}`} onClick={() => setSubtab(t.id)}>{t.label}</div>
        ))}
      </div>
      {subtab === 'targets' && <DietTargets profile={profile} onEdit={() => setProfile(null)} />}
      {subtab === 'weekplan' && <MealPlanner profile={profile} />}
      {subtab === 'cheat' && <CheatMeals />}
    </>
  );
}

function DietTargets({ profile, onEdit }) {
  const diet = computeDiet(profile);
  return (
    <>
      <p style={{ color: 'var(--ink-dim)', fontSize: 13.5, marginBottom: 14 }}>{diet.goalLabel} target for {DIET_LABELS[profile.diet]}.</p>
      <div className="stat-row">
        <div className="stat-box"><div className="n">{diet.calories}</div><div className="l">kcal / day</div></div>
        <div className="stat-box"><div className="n">{diet.protein}g</div><div className="l">Protein</div></div>
        <div className="stat-box"><div className="n">{diet.carbs}g</div><div className="l">Carbs</div></div>
        <div className="stat-box"><div className="n">{diet.fat}g</div><div className="l">Fat</div></div>
      </div>
      <div className="card">
        <h3>{DIET_LABELS[profile.diet]} protein sources</h3>
        <p style={{ fontSize: 13, color: 'var(--ink-dim)', marginBottom: 8 }}>Build meals around these to hit your protein number without much fuss:</p>
        <div className="grid-2">
          {FOOD_SOURCES[profile.diet].map((f, i) => (
            <div key={i} style={{ fontSize: 12.5, color: 'var(--ink-dim)', padding: '5px 0', borderBottom: '1px solid var(--line)' }}>{f}</div>
          ))}
        </div>
      </div>
      <div className="plate-divider"><div className="label">Common questions</div><div className="rule" /></div>
      <div className="card">
        {DIET_FAQ.map((f, i) => (
          <div key={i} className="faq-item"><div className="fq">{f.q}</div><div className="fa">{f.a}</div></div>
        ))}
      </div>
      <div className="disclaimer">General sports-nutrition guidance, not personalised medical or dietetic advice. If you have a health condition affecting diet, check with a doctor or registered dietitian.</div>
      <button className="btn secondary" onClick={onEdit} style={{ marginTop: 14 }}>Edit my profile</button>
    </>
  );
}

function MealPlanner({ profile }) {
  const [mealPlan, setMealPlan] = useState(() => load(LS_MEALPLAN, {}));
  const [dietLog, setDietLog] = useState(() => load(LS_DIETLOG, []));
  const [picker, setPicker] = useState(null); // {day, mealType}
  const showToast = useToast();

  const todayKey = todayDayKey();
  const monthKey = todayISO().slice(0, 7);
  const followedCount = dietLog.filter((d) => d.date.startsWith(monthKey) && d.followed === 'full').length;

  const diet = computeDiet(profile);
  const goalHint = diet.goalLabel === 'Lean gain' ? 'hearty' : diet.goalLabel === 'Fat loss' ? 'light' : null;

  const pickMeal = (day, mealType, mealId) => {
    const updated = { ...mealPlan, [day]: { ...(mealPlan[day] || {}), [mealType]: mealId } };
    setMealPlan(updated);
    save(LS_MEALPLAN, updated);
    setPicker(null);
  };

  const logDiet = (day, followed) => {
    const date = dateForDay(day);
    const existing = dietLog.find((d) => d.date === date);
    const updated = existing
      ? dietLog.map((d) => (d.date === date ? { ...d, followed } : d))
      : [...dietLog, { date, followed }];
    setDietLog(updated);
    save(LS_DIETLOG, updated);
    showToast('Diet check-in logged', { date, sub: followed === 'full' ? 'Followed the plan' : 'Noted' });
    logActivity('diet', date, `Diet plan — ${followed}`);
  };

  return (
    <>
      <div className="stat-row">
        <div className="stat-box"><div className="n">{followedCount}</div><div className="l">Days on plan ({monthKey})</div></div>
        <div className="stat-box"><div className="n">{new Date().getDate()}</div><div className="l">Days so far this month</div></div>
      </div>
      <p style={{ color: 'var(--ink-dim)', fontSize: 13, marginBottom: 14 }}>
        Pick a meal for each slot, each day — it saves as you go, and carries over week to week until you change it.
      </p>

      {WEEK_DAYS.map((day) => {
        const plan = mealPlan[day.id] || {};
        const isToday = day.id === todayKey;
        const dayFollow = dietLog.find((d) => d.date === dateForDay(day.id));

        return (
          <div key={day.id} className="card day-plan-card">
            <div className="day-plan-head">
              <div className="dname" style={{ fontFamily: 'var(--font-display)', fontSize: 15, textTransform: 'uppercase' }}>{day.label}</div>
              {isToday && <div className="dtoday" style={{ fontSize: 10, color: 'var(--brass)', border: '1px solid var(--brass)', borderRadius: 99, padding: '2px 8px', textTransform: 'uppercase' }}>Today</div>}
            </div>

            {MEAL_TYPES.map((mt) => {
              const chosen = plan[mt.id] ? findMeal(mt.id, plan[mt.id]) : null;
              const pickerActive = picker && picker.day === day.id && picker.mealType === mt.id;
              return (
                <div key={mt.id}>
                  <div className="meal-slot">
                    <div className="m-icon" style={chosen ? {} : { opacity: 0.3 }}>{chosen ? chosen.icon : '🍽️'}</div>
                    <div className="m-body">
                      <div className="m-type">{mt.label}</div>
                      <div className="m-name" style={chosen ? {} : { color: 'var(--ink-faint)', fontWeight: 400 }}>{chosen ? chosen.name : 'Not chosen yet'}</div>
                      {chosen && <div className="m-meta">{chosen.protein}g protein · {chosen.kcal} kcal</div>}
                    </div>
                    <button className="choose-btn" onClick={() => setPicker(pickerActive ? null : { day: day.id, mealType: mt.id })}>
                      {chosen ? 'Change' : 'Choose'}
                    </button>
                  </div>
                  {pickerActive && (
                    <div className="meal-option-grid">
                      {getMealsFor(mt.id, profile.diet).map((o) => (
                        <div key={o.id} className="meal-option" onClick={() => pickMeal(day.id, mt.id, o.id)}>
                          <div className="mo-icon">{o.icon}</div>
                          <div>
                            <div className="mo-name">{o.name}</div>
                            <div className="mo-meta">{o.protein}g protein · {o.kcal} kcal</div>
                          </div>
                          {goalHint && o.band === goalHint && (
                            <div className="mo-badge">{goalHint === 'hearty' ? 'Good for gaining' : 'Good for cutting'}</div>
                          )}
                        </div>
                      ))}
                      <button className="btn secondary" onClick={() => setPicker(null)} style={{ marginTop: 2 }}>Cancel</button>
                    </div>
                  )}
                </div>
              );
            })}

            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
              <label style={{ marginBottom: 7 }}>Did you actually eat this on {day.label.slice(0, 3)}?</label>
              <div className="radio-group">
                {[['full', 'Yes, followed it'], ['partial', 'Partially'], ['none', 'No, off plan']].map(([id, label]) => (
                  <div key={id} className={`radio-chip ${dayFollow?.followed === id ? 'active' : ''}`} onClick={() => logDiet(day.id, id)}>{label}</div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

function CheatMeals() {
  const [cheatMeals, setCheatMeals] = useState(() => load(LS_CHEATMEALS, { allowedPerMonth: 4, used: [] }));
  const showToast = useToast();
  const monthKey = todayISO().slice(0, 7);
  const usedThisMonth = cheatMeals.used.filter((d) => d.startsWith(monthKey));
  const remaining = Math.max(0, cheatMeals.allowedPerMonth - usedThisMonth.length);

  const logCheat = () => {
    const today = todayISO();
    if (cheatMeals.used.includes(today)) return;
    const updated = { ...cheatMeals, used: [...cheatMeals.used, today] };
    setCheatMeals(updated);
    save(LS_CHEATMEALS, updated);
    showToast('Cheat meal logged', { date: today, sub: `${remaining - 1} remaining this month` });
  };

  const removeCheat = (date) => {
    const updated = { ...cheatMeals, used: cheatMeals.used.filter((d) => d !== date) };
    setCheatMeals(updated);
    save(LS_CHEATMEALS, updated);
  };

  const setAllowed = (val) => {
    const updated = { ...cheatMeals, allowedPerMonth: parseInt(val) || 0 };
    setCheatMeals(updated);
    save(LS_CHEATMEALS, updated);
  };

  return (
    <>
      <div className="card">
        <h3>This month's cheat meals</h3>
        <div className="stat-row" style={{ marginTop: 10 }}>
          <div className="stat-box"><div className="n">{remaining}</div><div className="l">Remaining</div></div>
          <div className="stat-box"><div className="n">{usedThisMonth.length}</div><div className="l">Used</div></div>
          <div className="stat-box"><div className="n">{cheatMeals.allowedPerMonth}</div><div className="l">Allowed</div></div>
        </div>
        <div className="cheat-tally">
          {Array.from({ length: cheatMeals.allowedPerMonth }).map((_, i) => (
            <div key={i} className={`cheat-box ${i < usedThisMonth.length ? 'used' : ''}`}>{i < usedThisMonth.length ? '✕' : ''}</div>
          ))}
        </div>
        <button className="btn" onClick={logCheat} disabled={remaining <= 0} style={{ marginBottom: 12 }}>Log a cheat meal today</button>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Change monthly allowance</label>
          <input type="number" min="0" max="15" value={cheatMeals.allowedPerMonth} onChange={(e) => setAllowed(e.target.value)} />
        </div>
      </div>
      {usedThisMonth.length > 0 && (
        <>
          <div className="plate-divider"><div className="label">Used this month</div><div className="rule" /></div>
          {usedThisMonth.slice().reverse().map((d, i) => (
            <div key={i} className="history-item">
              <div className="d">{fmtDate(d)}</div>
              <button className="remove-ex" onClick={() => removeCheat(d)}>Remove</button>
            </div>
          ))}
        </>
      )}
      <div className="disclaimer">A planned cheat meal now and then keeps a diet sustainable — this just keeps the count honest instead of losing track.</div>
    </>
  );
}
