import { Barbell } from './Icons.jsx';

const TAB_TITLES = {
  home: '', judge: 'Lift Check', plan: 'Training Plan', trainlog: 'Workout Log',
  diet: 'Diet', checkin: 'Daily Check-in', progress: 'Progress',
};

export default function TopBar({ tab, onHome }) {
  const title = TAB_TITLES[tab] || '';
  return (
    <div className="topbar" onClick={onHome}>
      <Barbell style={{ width: 24, height: 24, color: 'var(--brass)' }} />
      <div className="tb-word">IRON <b>STANDARD</b></div>
      {title && <div className="tb-title">{title}</div>}
    </div>
  );
}
