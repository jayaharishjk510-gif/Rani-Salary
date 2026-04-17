import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { auth } from './firebase';
import { onAuthStateChanged, signOut, signInWithEmailAndPassword } from 'firebase/auth'; // Added sign-in import
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
  'newrani@rani.com': { depts: ['New Rani'], canEdit: true }
};

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  if (!user) {
    return <LoginScreen />; 
  }

  return (
    <Router>
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#000', color: '#fff' }}>
        
        {/* SIDEBAR MENU */}
        <nav style={sidebarStyle}>
          <div style={{ padding: '20px', fontWeight: 'bold', fontSize: '20px', borderBottom: '1px solid #222' }}>
            RANI MIS
          </div>
          <div style={menuList}>
            <Link to="/" style={navLink}><LayoutDashboard size={18}/> Dashboard</Link>
            <Link to="/employees" style={navLink}><Users size={18}/> Employees</Link>
            <Link to="/advance" style={navLink}><IndianRupee size={18}/> Advance Register</Link>
            <Link to="/salary" style={navLink}><FileText size={18}/> Salary Entry</Link>
            <Link to="/reports" style={navLink}><FileText size={18}/> Print Reports</Link>
          </div>
          <button onClick={() => signOut(auth)} style={logoutBtn}><LogOut size={18}/> Logout</button>
        </nav>

        {/* MAIN CONTENT AREA */}
        <main style={{ flex: 1, padding: '30px', overflowY: 'auto' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/employees" element={<EmployeeRegistry />} />
            <Route path="/advance" element={<AdvanceTracker />} />
            <Route path="/salary" element={<SalaryProcessor />} />
            <Route path="/reports" element={<ReportPreview />} />
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

  const handleLogin = (e) => {
    e.preventDefault();
    signInWithEmailAndPassword(auth, email, password)
      .catch(err => alert("Login Failed: " + err.message));
  };

  return (
    <div style={{ backgroundColor: '#000', color: '#fff', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <form onSubmit={handleLogin} style={{ padding: '40px', border: '1px solid #222', borderRadius: '8px', width: '320px', backgroundColor: '#0a0a0a' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Rani</h2>
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
        <button type="submit" style={loginBtnStyle}>Access Dashboard</button>
      </form>
    </div>
  );
}

// Styles
const sidebarStyle = { width: '250px', backgroundColor: '#0a0a0a', borderRight: '1px solid #222', display: 'flex', flexDirection: 'column' };
const menuList = { display: 'flex', flexDirection: 'column', gap: '5px', padding: '20px', flex: 1 };
const navLink = { color: '#888', textDecoration: 'none', padding: '12px', borderRadius: '5px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', transition: '0.3s' };
const logoutBtn = { padding: '20px', border: 'none', background: 'none', color: '#ff4d4d', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', borderTop: '1px solid #222' };

const loginInputStyle = { width: '100%', padding: '12px', marginBottom: '15px', backgroundColor: '#000', border: '1px solid #333', color: '#fff', borderRadius: '4px', boxSizing: 'border-box' };
const loginBtnStyle = { width: '100%', padding: '12px', backgroundColor: '#fff', color: '#000', border: 'none', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' };

export default App;