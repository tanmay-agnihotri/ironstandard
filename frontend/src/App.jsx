import { useState, useEffect } from 'react';
import LivelyBackground from './components/LivelyBackground.jsx';
import TabBar from './components/TabBar.jsx';
import Sidebar from './components/Sidebar.jsx';
import { ToastProvider } from './lib/ToastContext.jsx';
import { getToken, getRole, clearAuth, me } from './lib/authApi.js';
import UserAuth from './screens/UserAuth.jsx';
import CoachAuth from './screens/CoachAuth.jsx';
import PendingApproval from './screens/PendingApproval.jsx';
import CoachDashboard from './screens/CoachDashboard.jsx';
import Home from './screens/Home.jsx';
import LiftCheck from './screens/LiftCheck.jsx';
import Plan from './screens/Plan.jsx';
import WorkoutLog from './screens/WorkoutLog.jsx';
import Diet from './screens/Diet.jsx';
import Checkin from './screens/Checkin.jsx';
import Progress from './screens/Progress.jsx';

export default function App() {
  const [authState, setAuthState] = useState('loading'); // loading | signed-out | pending | rejected | user | coach
  const [authView, setAuthView] = useState('user'); // which login form to show when signed-out: 'user' | 'coach'
  const [identity, setIdentity] = useState(null); // {name, role, status}
  const [tab, setTab] = useState('home');

  const checkAuth = async () => {
    const token = getToken();
    if (!token) { setAuthState('signed-out'); return; }
    try {
      const data = await me();
      setIdentity(data);
      if (data.role === 'coach') setAuthState('coach');
      else if (data.status === 'approved') setAuthState('user');
      else if (data.status === 'rejected') setAuthState('rejected');
      else setAuthState('pending');
    } catch {
      clearAuth();
      setAuthState('signed-out');
    }
  };

  useEffect(() => { checkAuth(); }, []);

  const handleAuthed = (res) => {
    setIdentity({ name: res.name, role: res.role, status: res.status });
    if (res.role === 'coach') setAuthState('coach');
    else if (res.status === 'approved') setAuthState('user');
    else if (res.status === 'rejected') setAuthState('rejected');
    else setAuthState('pending');
  };

  const handleLogout = () => { clearAuth(); setIdentity(null); setAuthState('signed-out'); setAuthView('user'); };
  const goHome = () => setTab('home');

  if (authState === 'loading') {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" /></div>;
  }

  if (authState === 'signed-out') {
    return authView === 'coach'
      ? <CoachAuth onAuthed={handleAuthed} onUserMode={() => setAuthView('user')} />
      : <UserAuth onAuthed={handleAuthed} onCoachMode={() => setAuthView('coach')} />;
  }

  if (authState === 'pending' || authState === 'rejected') {
    return <PendingApproval name={identity?.name} status={identity?.status} onLogout={handleLogout} />;
  }

  if (authState === 'coach') {
    return <CoachDashboard coachName={identity?.name} onLogout={handleLogout} />;
  }

  // authState === 'user' (approved) — the full app
  return (
    <ToastProvider onNavigate={setTab}>
      <LivelyBackground />
      <div className="app-root">
        <Sidebar tab={tab} onChange={setTab} onLogout={handleLogout} />
        <div className="main-col">
          <div id="app-shell">
            <div id="app">
              {tab === 'home' && <Home onHome={goHome} onNav={setTab} onLogout={handleLogout} />}
              {tab === 'judge' && <LiftCheck onHome={goHome} />}
              {tab === 'plan' && <Plan onHome={goHome} />}
              {tab === 'trainlog' && <WorkoutLog onHome={goHome} />}
              {tab === 'diet' && <Diet onHome={goHome} />}
              {tab === 'checkin' && <Checkin onHome={goHome} />}
              {tab === 'progress' && <Progress onHome={goHome} />}
            </div>
          </div>
        </div>
      </div>
      <TabBar tab={tab} onChange={setTab} />
    </ToastProvider>
  );
}
