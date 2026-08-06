import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { auth } from './firebase';
import { onAuthStateChanged, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { Users, IndianRupee, FileText, LayoutDashboard, LogOut } from 'lucide-react';

// Import the pages
import Dashboard from './pages/Dashboard';
import EmployeeRegistry from './pages/EmployeeRegistry';
import AdvanceTracker from './pages/AdvanceTracker';
import SalaryProcessor from './pages/SalaryProcessor';
import ReportPreview from './pages/ReportPreview';

// 1. Define Access Levels (Add your emails here)
const PERMISSIONS = {
  'admin@rani.com': { depts: ['Rani Javuli', 'Rani Readymade', 'New Rani'], canEdit: true },
  'javuli@rani.com': { depts: ['Rani Javuli'], canEdit: true },
  'readymade@rani.com': { depts: ['Rani Readymade'], canEdit: true },
  'readymades@rani.com': { depts: ['Rani Readymade'], canEdit: true },
  'newrani@rani.com': { depts: ['New Rani'], canEdit: true }
};

function App() {
  const [user, setUser] = useState(null);
  // Track auth loading state to avoid flashing login screen on reload
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Show nothing while Firebase resolves the auth state
  if (authLoading) {
    return (
      <div style={{ backgroundColor: '#000', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#555' }}>
        Loading…
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  // Derive the user's permission set (default to empty if email not in PERMISSIONS)
  const normalizedEmail = user.email ? user.email.toLowerCase().trim() : '';
  const userPermissions = PERMISSIONS[normalizedEmail] || { depts: [], canEdit: false };

  const getSidebarTitle = () => {
    if (normalizedEmail === 'javuli@rani.com') return 'RANI JAVULI';
    if (normalizedEmail === 'readymade@rani.com' || normalizedEmail === 'readymades@rani.com') return 'RANI READYMADES';
    if (normalizedEmail === 'newrani@rani.com') return 'NEW RANI';
    return 'RANI MIS';
  };

  return (
    <Router>
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#000', color: '#fff' }}>

        {/* SIDEBAR MENU */}
        <nav style={sidebarStyle}>
          <div style={{ padding: '20px', fontWeight: 'bold', fontSize: '20px', borderBottom: '1px solid #222', textTransform: 'uppercase' }}>
            {getSidebarTitle()}
          </div>
          <div style={menuList}>
            <NavLink to="/" end style={({ isActive }) => ({ ...navLink, ...(isActive ? navLinkActive : {}) })}>
              <LayoutDashboard size={18}/> Dashboard
            </NavLink>
            <NavLink to="/employees" style={({ isActive }) => ({ ...navLink, ...(isActive ? navLinkActive : {}) })}>
              <Users size={18}/> Employees
            </NavLink>
            <NavLink to="/advance" style={({ isActive }) => ({ ...navLink, ...(isActive ? navLinkActive : {}) })}>
              <IndianRupee size={18}/> Advance Register
            </NavLink>
            <NavLink to="/salary" style={({ isActive }) => ({ ...navLink, ...(isActive ? navLinkActive : {}) })}>
              <FileText size={18}/> Salary Entry
            </NavLink>
            <NavLink to="/reports" style={({ isActive }) => ({ ...navLink, ...(isActive ? navLinkActive : {}) })}>
              <FileText size={18}/> Salary Records
            </NavLink>
          </div>
          <button onClick={() => signOut(auth)} style={logoutBtn}><LogOut size={18}/> Logout</button>
        </nav>

        {/* MAIN CONTENT AREA */}
        <main style={{ flex: 1, padding: '30px', overflowY: 'auto' }}>
          <Routes>
            <Route path="/" element={<Dashboard userPermissions={userPermissions} />} />
            <Route path="/employees" element={<EmployeeRegistry userPermissions={userPermissions} />} />
            <Route path="/advance" element={<AdvanceTracker userPermissions={userPermissions} />} />
            <Route path="/salary" element={<SalaryProcessor userPermissions={userPermissions} />} />
            <Route path="/reports" element={<ReportPreview userPermissions={userPermissions} />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

// 2. THE LOGIN SCREEN COMPONENT
function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return; // prevent double-submit
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#000', color: '#fff', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <form onSubmit={handleLogin} style={{ padding: '40px', border: '1px solid #222', borderRadius: '8px', width: '320px', backgroundColor: '#0a0a0a' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Rani</h2>
        {error && <div style={{ color: '#ff6b6b', fontSize: '13px', marginBottom: '12px', textAlign: 'center' }}>{error}</div>}
        <input
          type="email"
          placeholder="Email Address"
          onChange={e => setEmail(e.target.value)}
          style={loginInputStyle}
          required
        />
        <input
          type="password"
          placeholder="Password"
          onChange={e => setPassword(e.target.value)}
          style={loginInputStyle}
          required
        />
        <button type="submit" disabled={loading} style={{ ...loginBtnStyle, opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Signing in…' : 'Access Dashboard'}
        </button>
      </form>
    </div>
  );
}

// Styles
const sidebarStyle = { width: '250px', backgroundColor: '#0a0a0a', borderRight: '1px solid #222', display: 'flex', flexDirection: 'column' };
const menuList = { display: 'flex', flexDirection: 'column', gap: '5px', padding: '20px', flex: 1 };
const navLink = { color: '#888', textDecoration: 'none', padding: '12px', borderRadius: '5px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', transition: '0.3s' };
const navLinkActive = { color: '#fff', backgroundColor: '#1a1a1a', borderLeft: '3px solid #4caf50', paddingLeft: '9px' };
const logoutBtn = { padding: '20px', border: 'none', background: 'none', color: '#ff4d4d', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', borderTop: '1px solid #222' };

const loginInputStyle = { width: '100%', padding: '12px', marginBottom: '15px', backgroundColor: '#000', border: '1px solid #333', color: '#fff', borderRadius: '4px', boxSizing: 'border-box' };
const loginBtnStyle = { width: '100%', padding: '12px', backgroundColor: '#fff', color: '#000', border: 'none', fontWeight: 'bold', borderRadius: '4px' };

export default App;