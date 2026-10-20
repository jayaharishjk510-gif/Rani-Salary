import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { auth } from './firebase';
import { onAuthStateChanged, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { Users, IndianRupee, FileText, LayoutDashboard, LogOut, Menu, ChevronLeft, Search, Download, X } from 'lucide-react';
import { notifyLogin } from './services/telegramService';
import NetworkStatus from './components/NetworkStatus';
import PWAUpdateToast from './components/PWAUpdateToast';
import PWAInstallPrompt, { usePWAInstall } from './components/PWAInstallPrompt';

// Import the pages
import Dashboard from './pages/Dashboard';
import EmployeeRegistry from './pages/EmployeeRegistry';
import AdvanceTracker from './pages/AdvanceTracker';
import SalaryProcessor from './pages/SalaryProcessor';
import ReportPreview from './pages/ReportPreview';
import Search360 from './pages/Search360';
import NotFound from './pages/NotFound';
import AccessDenied from './components/AccessDenied';
import ErrorBoundary from './components/ErrorBoundary';
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
  const { canInstall, triggerInstall } = usePWAInstall();
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 768 : false));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) setMobileMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      if (u && u.email) {
        const norm = u.email.toLowerCase().trim();
        let shopTitle = 'RANI MIS';
        if (norm === 'javuli@rani.com') shopTitle = 'RANI JAVULI';
        else if (norm === 'readymade@rani.com' || norm === 'readymades@rani.com') shopTitle = 'RANI READYMADES';
        else if (norm === 'newrani@rani.com') shopTitle = 'NEW RANI';
        notifyLogin({ email: u.email, dept: shopTitle });
      }
    });
    return () => unsubscribe();
  }, []);

  // Show clean loading state while Firebase resolves the auth state
  if (authLoading) {
    return (
      <div style={{
        backgroundColor: '#f8fafc',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '16px',
        color: '#64748b',
        fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif"
      }}>
        {logoRani && (
          <img src={logoRani} alt="Rani Logo" style={{ width: '180px', height: 'auto', opacity: 0.9 }} />
        )}
        <div style={{
          width: '28px',
          height: '28px',
          border: '3px solid #e2e8f0',
          borderTopColor: '#0f172a',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <div style={{ fontSize: '13px', fontWeight: '600', color: '#94a3b8' }}>
          Loading application…
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LoginScreen />
        <NetworkStatus />
        <PWAUpdateToast />
        <PWAInstallPrompt />
      </>
    );
  }

  // Derive the user's permission set (default to empty if email not in PERMISSIONS)
  const normalizedEmail = user.email ? user.email.toLowerCase().trim() : '';
  const userPermissions = PERMISSIONS[normalizedEmail] || { depts: [], canEdit: false };

  // If user is authenticated but has no department permissions assigned
  if (!userPermissions.depts || userPermissions.depts.length === 0) {
    return <AccessDenied email={user.email} />;
  }

  const getSidebarTitle = () => {
    if (normalizedEmail === 'javuli@rani.com') return 'RANI JAVULI';
    if (normalizedEmail === 'readymade@rani.com' || normalizedEmail === 'readymades@rani.com') return 'RANI READYMADES';
    if (normalizedEmail === 'newrani@rani.com') return 'NEW RANI';
    return 'RANI MIS';
  };

  return (
    <ToastProvider>
      <Router>
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          height: '100vh',
          width: '100vw',
          overflow: 'hidden',
          backgroundColor: '#f8fafc',
          color: '#0f172a'
        }}>

          {/* MOBILE TOP APP BAR */}
          {isMobile && (
            <header style={{
              height: '56px',
              backgroundColor: '#ffffff',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 16px',
              flexShrink: 0,
              zIndex: 100,
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0f172a',
                    cursor: 'pointer',
                    padding: '8px',
                    marginLeft: '-8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '8px'
                  }}
                  title="Open Navigation"
                  aria-label="Open Navigation"
                >
                  <Menu size={22} />
                </button>
                <span style={{ fontWeight: '800', fontSize: '15px', textTransform: 'uppercase', color: '#0f172a', letterSpacing: '0.4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {getSidebarTitle()}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                {canInstall && (
                  <button
                    onClick={triggerInstall}
                    style={{
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      color: '#16a34a',
                      cursor: 'pointer',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px',
                      fontWeight: '700'
                    }}
                    title="Install App"
                  >
                    <Download size={14} /> Install
                  </button>
                )}
                <button
                  onClick={() => {
                    sessionStorage.clear();
                    signOut(auth);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                    padding: '8px',
                    marginRight: '-8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '8px'
                  }}
                  title="Logout"
                  aria-label="Logout"
                >
                  <LogOut size={19} />
                </button>
              </div>
            </header>
          )}

          {/* MOBILE SLIDE-OVER DRAWER BACKDROP */}
          {isMobile && mobileMenuOpen && (
            <div
              onClick={() => setMobileMenuOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.55)',
                backdropFilter: 'blur(3px)',
                zIndex: 9998
              }}
            />
          )}

          {/* SIDEBAR NAVIGATION (DRAWER ON MOBILE, STATIC ON DESKTOP) */}
          <nav style={isMobile ? {
            position: 'fixed',
            top: 0,
            left: 0,
            bottom: 0,
            width: '280px',
            maxWidth: '85vw',
            backgroundColor: '#ffffff',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '4px 0 24px rgba(0, 0, 0, 0.15)',
            transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            visibility: mobileMenuOpen ? 'visible' : 'hidden'
          } : {
            ...sidebarStyle,
            width: collapsed ? '72px' : '255px',
            height: '100vh',
            maxHeight: '100vh',
            transition: 'width 0.25s ease',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isMobile ? 'space-between' : (collapsed ? 'center' : 'space-between'),
              gap: '12px',
              minHeight: '66px',
              boxSizing: 'border-box',
              flexShrink: 0
            }}>
              {isMobile ? (
                <>
                  <span style={{ fontWeight: '800', fontSize: '16px', textTransform: 'uppercase', color: '#0f172a', letterSpacing: '0.5px' }}>
                    {getSidebarTitle()}
                  </span>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}
                    title="Close Menu"
                  >
                    <X size={20} />
                  </button>
                </>
              ) : !collapsed ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                    <span style={{ fontWeight: '800', fontSize: '17px', textTransform: 'uppercase', color: '#0f172a', letterSpacing: '0.6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {getSidebarTitle()}
                    </span>
                  </div>
                  <button
                    onClick={toggleSidebar}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      padding: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: '0.2s',
                      borderRadius: '6px'
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
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '6px'
                  }}
                  title="Expand Sidebar"
                >
                  <Menu size={20} />
                </button>
              )}
            </div>

            <div style={{ ...menuList, padding: isMobile ? '16px 12px' : (collapsed ? '20px 10px' : '20px 16px') }}>
              <NavLink to="/" end onClick={() => isMobile && setMobileMenuOpen(false)} style={({ isActive }) => ({ ...navLink, ...(isActive ? navLinkActive : {}), ...(!isMobile && collapsed ? { justifyContent: 'center', padding: '12px 0' } : {}) })} title="Dashboard">
                <LayoutDashboard size={18} style={{ flexShrink: 0 }} /> {(isMobile || !collapsed) && <span style={{ whiteSpace: 'nowrap' }}>Dashboard</span>}
              </NavLink>
              <NavLink to="/employees" onClick={() => isMobile && setMobileMenuOpen(false)} style={({ isActive }) => ({ ...navLink, ...(isActive ? navLinkActive : {}), ...(!isMobile && collapsed ? { justifyContent: 'center', padding: '12px 0' } : {}) })} title="Employees">
                <Users size={18} style={{ flexShrink: 0 }} /> {(isMobile || !collapsed) && <span style={{ whiteSpace: 'nowrap' }}>Employees</span>}
              </NavLink>
              <NavLink to="/advance" onClick={() => isMobile && setMobileMenuOpen(false)} style={({ isActive }) => ({ ...navLink, ...(isActive ? navLinkActive : {}), ...(!isMobile && collapsed ? { justifyContent: 'center', padding: '12px 0' } : {}) })} title="Advance Register">
                <IndianRupee size={18} style={{ flexShrink: 0 }} /> {(isMobile || !collapsed) && <span style={{ whiteSpace: 'nowrap' }}>Advance Register</span>}
              </NavLink>
              <NavLink to="/salary" onClick={() => isMobile && setMobileMenuOpen(false)} style={({ isActive }) => ({ ...navLink, ...(isActive ? navLinkActive : {}), ...(!isMobile && collapsed ? { justifyContent: 'center', padding: '12px 0' } : {}) })} title="Salary Entry">
                <FileText size={18} style={{ flexShrink: 0 }} /> {(isMobile || !collapsed) && <span style={{ whiteSpace: 'nowrap' }}>Salary Entry</span>}
              </NavLink>
              <NavLink to="/reports" onClick={() => isMobile && setMobileMenuOpen(false)} style={({ isActive }) => ({ ...navLink, ...(isActive ? navLinkActive : {}), ...(!isMobile && collapsed ? { justifyContent: 'center', padding: '12px 0' } : {}) })} title="Salary Records">
                <FileText size={18} style={{ flexShrink: 0 }} /> {(isMobile || !collapsed) && <span style={{ whiteSpace: 'nowrap' }}>Salary Records</span>}
              </NavLink>
              <NavLink to="/search-360" onClick={() => isMobile && setMobileMenuOpen(false)} style={({ isActive }) => ({ ...navLink, ...(isActive ? navLinkActive : {}), ...(!isMobile && collapsed ? { justifyContent: 'center', padding: '12px 0' } : {}) })} title="360 Search">
                <Search size={18} style={{ flexShrink: 0 }} /> {(isMobile || !collapsed) && <span style={{ whiteSpace: 'nowrap' }}>360 Search</span>}
              </NavLink>
            </div>

            {/* STATIC PINNED BOTTOM ACTIONS */}
            <div style={{
              marginTop: 'auto',
              flexShrink: 0,
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#ffffff'
            }}>
              {canInstall && (
                <button
                  onClick={() => { if (isMobile) setMobileMenuOpen(false); triggerInstall(); }}
                  style={{
                    ...installBtn,
                    justifyContent: !isMobile && collapsed ? 'center' : 'flex-start',
                    gap: !isMobile && collapsed ? '0' : '10px',
                    padding: !isMobile && collapsed ? '14px 0' : '14px 24px'
                  }}
                  title="Install Rani Salary App"
                >
                  <Download size={18} style={{ flexShrink: 0 }} /> {(isMobile || !collapsed) && <span style={{ whiteSpace: 'nowrap' }}>Install App</span>}
                </button>
              )}
              <button
                onClick={() => {
                  sessionStorage.clear();
                  signOut(auth);
                }}
                style={{
                  ...logoutBtn,
                  justifyContent: !isMobile && collapsed ? 'center' : 'flex-start',
                  gap: !isMobile && collapsed ? '0' : '10px',
                  padding: !isMobile && collapsed ? '16px 0' : '16px 24px',
                  borderTop: canInstall ? '1px solid #f1f5f9' : 'none'
                }}
                title="Logout"
              >
                <LogOut size={18} style={{ flexShrink: 0 }} /> {(isMobile || !collapsed) && <span style={{ whiteSpace: 'nowrap' }}>Logout</span>}
              </button>
            </div>
          </nav>

          <NetworkStatus />
          <PWAUpdateToast />
          <PWAInstallPrompt />

          {/* MAIN CONTENT AREA */}
          <main style={{
            flex: 1,
            height: isMobile ? 'calc(100vh - 56px)' : '100vh',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            padding: isMobile ? '16px 12px' : '32px',
            backgroundColor: '#f8fafc',
            boxSizing: 'border-box',
            width: isMobile ? '100vw' : 'auto'
          }}>
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<Dashboard userPermissions={userPermissions} />} />
                <Route path="/employees" element={<EmployeeRegistry userPermissions={userPermissions} />} />
                <Route path="/advance" element={<AdvanceTracker userPermissions={userPermissions} />} />
                <Route path="/salary" element={<SalaryProcessor userPermissions={userPermissions} />} />
                <Route path="/reports" element={<ReportPreview userPermissions={userPermissions} />} />
                <Route path="/search-360" element={<Search360 userPermissions={userPermissions} />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ErrorBoundary>
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
      sessionStorage.clear();
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#f8fafc', background: 'radial-gradient(circle at 50% 30%, #ffffff 0%, #f1f5f9 100%)', color: '#0f172a', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px', boxSizing: 'border-box' }}>
      <form onSubmit={handleLogin} style={{ padding: '32px 22px', border: '1px solid #e2e8f0', borderRadius: '16px', width: '100%', maxWidth: '380px', backgroundColor: '#ffffff', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
          <img src={logoRani} style={{ maxWidth: '180px', width: '80%', height: 'auto', marginBottom: '10px' }} alt="Rani Logo" />
        </div>
        {error && <div style={{ color: '#ef4444', fontSize: '13px', marginBottom: '14px', textAlign: 'center', fontWeight: '600' }}>{error}</div>}
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
const sidebarStyle = { backgroundColor: '#ffffff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', boxShadow: '2px 0 8px rgba(0, 0, 0, 0.02)' };
const menuList = { display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, overflowY: 'auto', minHeight: 0 };
const navLink = { color: '#64748b', textDecoration: 'none', padding: '10px 14px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', fontWeight: '500', transition: 'all 0.2s ease', flexShrink: 0 };
const navLinkActive = { color: '#15803d', backgroundColor: '#f0fdf4', fontWeight: '600', borderLeft: '3px solid #16a34a', paddingLeft: '11px' };
const installBtn = { border: 'none', background: 'none', color: '#047857', cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '13px', fontWeight: '600', transition: '0.2s', width: '100%' };
const logoutBtn = { border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '14px', fontWeight: '600', transition: '0.2s', width: '100%' };

const loginInputStyle = { width: '100%', padding: '12px 14px', marginBottom: '16px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' };
const loginBtnStyle = { width: '100%', padding: '13px', backgroundColor: '#0f172a', color: '#fff', border: 'none', fontWeight: '700', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', transition: 'background-color 0.2s', boxShadow: '0 4px 6px -1px rgba(15, 23, 42, 0.15)' };

export default App;