import { JudgeIcon, PlanIcon, WorkoutIcon, DietIcon, CheckinIcon, ProgressIcon } from './Icons.jsx';

const TABS = [
  { id: 'judge', label: 'Judge', Icon: JudgeIcon },
  { id: 'plan', label: 'Plan', Icon: PlanIcon },
  { id: 'trainlog', label: 'Workout', Icon: WorkoutIcon },
  { id: 'diet', label: 'Diet', Icon: DietIcon },
  { id: 'checkin', label: 'Check-in', Icon: CheckinIcon },
  { id: 'progress', label: 'Progress', Icon: ProgressIcon },
];

export default function TabBar({ tab, onChange }) {
  return (
    <nav id="tabbar">
      <div className="tabbar-inner">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`tab-btn ${tab === id ? 'active' : ''}`}
            onClick={() => onChange(id)}
          >
            <Icon />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
