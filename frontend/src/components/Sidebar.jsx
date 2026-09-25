import { Barbell, JudgeIcon, PlanIcon, WorkoutIcon, DietIcon, CheckinIcon, ProgressIcon, HomeIcon } from './Icons.jsx';

const NAV = [
  { id: 'home', label: 'Home', Icon: HomeIcon },
  { id: 'judge', label: 'Lift Check', Icon: JudgeIcon },
  { id: 'plan', label: 'Plan', Icon: PlanIcon },
  { id: 'trainlog', label: 'Workout Log', Icon: WorkoutIcon },
  { id: 'diet', label: 'Diet', Icon: DietIcon },
  { id: 'checkin', label: 'Check-in', Icon: CheckinIcon },
  { id: 'progress', label: 'Progress', Icon: ProgressIcon },
];

export default function Sidebar({ tab, onChange, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand" onClick={() => onChange('home')}>
        <Barbell style={{ width: 30, height: 30, color: 'var(--brass)' }} />
        <div className="sidebar-word">IRON<br /><b>STANDARD</b></div>
      </div>
      <nav className="sidebar-nav">
        {NAV.map(({ id, label, Icon }) => (
          <button key={id} className={`sidebar-link ${tab === id ? 'active' : ''}`} onClick={() => onChange(id)}>
            <Icon />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-foot">
        <button className="btn ghost-small" style={{ width: '100%', marginBottom: 12 }} onClick={onLogout}>Log out</button>
        <div className="sidebar-tagline">Train raw.<br />Judge honest.<br />Track everything.</div>
      </div>
    </aside>
  );
}
