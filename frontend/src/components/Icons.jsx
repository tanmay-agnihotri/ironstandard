export function Barbell(props) {
  return (
    <svg viewBox="0 0 100 100" {...props}>
      <circle cx="16" cy="50" r="12" fill="currentColor" stroke="none" />
      <circle cx="16" cy="50" r="5" fill="var(--bg)" stroke="none" />
      <circle cx="84" cy="50" r="12" fill="currentColor" stroke="none" />
      <circle cx="84" cy="50" r="5" fill="var(--bg)" stroke="none" />
      <rect x="26" y="46" width="48" height="8" fill="currentColor" stroke="none" />
    </svg>
  );
}
export function HomeIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" />
    </svg>
  );
}
export function JudgeIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="M4 4l4 8-4 0z" /><path d="M16 4l4 8-4 0z" />
      <path d="M8 8a4 4 0 0 0 8 0" /><path d="M6 4h12" /><path d="M12 4v16" /><path d="M8 20h8" />
    </svg>
  );
}
export function PlanIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <rect x="3" y="4" width="18" height="17" rx="1" /><path d="M3 9h18" /><path d="M8 2v4M16 2v4" />
    </svg>
  );
}
export function WorkoutIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <rect x="1.5" y="9" width="3" height="6" rx="0.5" /><rect x="19.5" y="9" width="3" height="6" rx="0.5" />
      <rect x="5" y="7" width="3" height="10" rx="0.5" /><rect x="16" y="7" width="3" height="10" rx="0.5" />
      <path d="M8 12h8" />
    </svg>
  );
}
export function DietIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="M6 2v7a2 2 0 0 0 4 0V2" /><path d="M8 9v13" />
      <path d="M17 2c-2 0-3 3-3 6s1 4 3 4" /><path d="M17 2v19" />
    </svg>
  );
}
export function CheckinIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="M9 11l2 2 4-4" /><rect x="3" y="3" width="18" height="18" rx="1" />
    </svg>
  );
}
export function ProgressIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="M4 19V9M11 19V5M18 19v-7" />
    </svg>
  );
}
export function PlateIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <circle cx="12" cy="12" r="9" fill="none" strokeWidth="2" />
      <circle cx="12" cy="12" r="3" fill="none" strokeWidth="2" />
    </svg>
  );
}
export function SquatIcon(props) {
  return (
    <svg viewBox="0 0 100 100" {...props}>
      <circle cx="50" cy="26" r="8" fill="none" strokeWidth="3" />
      <path d="M30 34c8 3 12 3 20 3s12 0 20-3" fill="none" strokeWidth="3" strokeLinecap="round" />
      <path d="M50 37v16" strokeWidth="3" />
      <path d="M50 53l-13 14M50 53l13 14" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M37 67l-4 15M63 67l4 15" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M14 34h72" strokeWidth="3" />
      <circle cx="14" cy="34" r="7" fill="currentColor" /><circle cx="86" cy="34" r="7" fill="currentColor" />
    </svg>
  );
}
export function BenchIcon(props) {
  return (
    <svg viewBox="0 0 100 100" {...props}>
      <circle cx="26" cy="58" r="8" fill="none" strokeWidth="3" />
      <path d="M34 58h32" strokeWidth="3" />
      <path d="M50 58l-4 -28M50 58l4 -28" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M46 30h24" strokeWidth="3" />
      <circle cx="46" cy="30" r="7" fill="currentColor" /><circle cx="70" cy="30" r="7" fill="currentColor" />
      <path d="M66 58l16 4M58 58l4 18" strokeWidth="3" fill="none" strokeLinecap="round" />
      <rect x="18" y="63" width="60" height="6" fill="none" strokeWidth="3" />
    </svg>
  );
}
export function DeadliftIcon(props) {
  return (
    <svg viewBox="0 0 100 100" {...props}>
      <circle cx="46" cy="24" r="8" fill="none" strokeWidth="3" />
      <path d="M46 32l6 20" strokeWidth="3" fill="none" />
      <path d="M52 52l-4 30" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M52 52l-22 22" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M14 78h72" strokeWidth="3" />
      <circle cx="14" cy="78" r="10" fill="currentColor" /><circle cx="86" cy="78" r="10" fill="currentColor" />
    </svg>
  );
}
export function UploadIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 16V4M12 4l-5 5M12 4l5 5" />
      <path d="M3 16v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}
export function CheckIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="M4 12l5 5 11-11" />
    </svg>
  );
}

export const LIFT_ICONS = { squat: SquatIcon, bench: BenchIcon, deadlift: DeadliftIcon };
