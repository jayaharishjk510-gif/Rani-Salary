import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { auth } from './firebase';
import { onAuthStateChanged, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { Users, IndianRupee, FileText, LayoutDashboard, LogOut, Menu, ChevronLeft } from 'lucide-react';

// Import the pages
import Dashboard from './pages/Dashboard';
import EmployeeRegistry from './pages/EmployeeRegistry';
import AdvanceTracker from './pages/AdvanceTracker';
import SalaryProcessor from './pages/SalaryProcessor';
import ReportPreview from './pages/ReportPreview';
import logoRani from './logo_rani.png';
import { ToastProvider } from './components/Toast';

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
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  const toggleSidebar = () => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

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
    <ToastProvider>
      <Router>
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#000', color: '#fff' }}>

          {/* SIDEBAR MENU */}
          <nav style={{
            ...sidebarStyle,
            width: collapsed ? '70px' : '250px',
            transition: 'width 0.3s ease',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '15px 20px',
              borderBottom: '1px solid #222',
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'space-between',
              gap: '12px',
              minHeight: '66px',
              boxSizing: 'border-box'
            }}>
              {!collapsed ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '18px', textTransform: 'uppercase', color: '#fff', letterSpacing: '0.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {getSidebarTitle()}
                    </span>
                  </div>
                  <button
                    onClick={toggleSidebar}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#888',
                      cursor: 'pointer',
                      padding: '5px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: '0.2s',
                      borderRadius: '4px'
                    }}
                    title="Collapse Sidebar"
                  >
                    <ChevronLeft size={20} />
                  </button>
                </>
              ) : (
                <button
                  onClick={toggleSidebar}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#888',
                    cursor: 'pointer',
                    padding: '5px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Expand Sidebar"
                >
                  <Menu size={20} />
                </button>
              )}
            </div>

            <div style={{ ...menuList, padding: collapsed ? '20px 10px' : '20px' }}>
              <NavLink to="/" end style={({ isActive }) => ({ ...navLink, ...(isActive ? navLinkActive : {}), ...(collapsed ? { justifyContent: 'center', padding: '12px 0' } : {}) })} title="Dashboard">
                <LayoutDashboard size={18} style={{ flexShrink: 0 }} /> {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>Dashboard</span>}
              </NavLink>
              <NavLink to="/employees" style={({ isActive }) => ({ ...navLink, ...(isActive ? navLinkActive : {}), ...(collapsed ? { justifyContent: 'center', padding: '12px 0' } : {}) })} title="Employees">
                <Users size={18} style={{ flexShrink: 0 }} /> {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>Employees</span>}
              </NavLink>
              <NavLink to="/advance" style={({ isActive }) => ({ ...navLink, ...(isActive ? navLinkActive : {}), ...(collapsed ? { justifyContent: 'center', padding: '12px 0' } : {}) })} title="Advance Register">
                <IndianRupee size={18} style={{ flexShrink: 0 }} /> {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>Advance Register</span>}
              </NavLink>
              <NavLink to="/salary" style={({ isActive }) => ({ ...navLink, ...(isActive ? navLinkActive : {}), ...(collapsed ? { justifyContent: 'center', padding: '12px 0' } : {}) })} title="Salary Entry">
                <FileText size={18} style={{ flexShrink: 0 }} /> {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>Salary Entry</span>}
              </NavLink>
              <NavLink to="/reports" style={({ isActive }) => ({ ...navLink, ...(isActive ? navLinkActive : {}), ...(collapsed ? { justifyContent: 'center', padding: '12px 0' } : {}) })} title="Salary Records">
                <FileText size={18} style={{ flexShrink: 0 }} /> {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>Salary Records</span>}
              </NavLink>
            </div>
            <button
              onClick={() => signOut(auth)}
              style={{
                ...logoutBtn,
                justifyContent: collapsed ? 'center' : 'flex-start',
                gap: collapsed ? '0' : '10px',
                padding: collapsed ? '20px 0' : '20px'
              }}
              title="Logout"
            >
              <LogOut size={18} style={{ flexShrink: 0 }} /> {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>Logout</span>}
            </button>
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
    </ToastProvider>
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
      <form onSubmit={handleLogin} style={{ padding: '40px', border: '1px solid #e0e0e0', borderRadius: '12px', width: '360px', backgroundColor: '#ffffff', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '25px' }}>
          <img src={logoRani} style={{ width: '220px', height: 'auto', marginBottom: '10px' }} alt="Rani Logo" />
        </div>
        {error && <div style={{ color: '#d32f2f', fontSize: '13px', marginBottom: '12px', textAlign: 'center', fontWeight: '500' }}>{error}</div>}
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
const sidebarStyle = { backgroundColor: '#0a0a0a', borderRight: '1px solid #222', display: 'flex', flexDirection: 'column' };
const menuList = { display: 'flex', flexDirection: 'column', gap: '5px', padding: '20px', flex: 1 };
const navLink = { color: '#888', textDecoration: 'none', padding: '12px', borderRadius: '5px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', transition: '0.3s' };
const navLinkActive = { color: '#fff', backgroundColor: '#1a1a1a', borderLeft: '3px solid #4caf50', paddingLeft: '9px' };
const logoutBtn = { padding: '20px', border: 'none', background: 'none', color: '#ff4d4d', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', borderTop: '1px solid #222' };

const loginInputStyle = { width: '100%', padding: '12px', marginBottom: '15px', backgroundColor: '#f9f9f9', border: '1px solid #ccc', color: '#000', borderRadius: '6px', boxSizing: 'border-box' };
const loginBtnStyle = { width: '100%', padding: '12px', backgroundColor: '#000', color: '#fff', border: 'none', fontWeight: 'bold', borderRadius: '6px' };

export default App;