import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { Users, IndianRupee, TrendingUp, Landmark } from 'lucide-react';

function Dashboard() {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    totalAdvances: 0,
    monthlyPayout: 0,
    deptCounts: {}
  });

  useEffect(() => {
    // 1. Listen to Employees
    const unsubEmps = onSnapshot(collection(db, "employees"), (snapshot) => {
      const emps = snapshot.docs.map(doc => doc.data());
      const counts = emps.reduce((acc, emp) => {
        acc[emp.dept] = (acc[emp.dept] || 0) + 1;
        return acc;
      }, {});
      
      setStats(prev => ({ ...prev, totalEmployees: emps.length, deptCounts: counts }));
    });

    // 2. Listen to Advances (Current Month)
    const unsubAdv = onSnapshot(collection(db, "advances"), (snapshot) => {
      const total = snapshot.docs.reduce((acc, doc) => acc + (Number(doc.data().amount) || 0), 0);
      setStats(prev => ({ ...prev, totalAdvances: total }));
    });

    // 3. Listen to Salary Records
    const unsubSal = onSnapshot(collection(db, "salary_records"), (snapshot) => {
      const total = snapshot.docs.reduce((acc, doc) => acc + (Number(doc.data().gTotal) || 0), 0);
      setStats(prev => ({ ...prev, monthlyPayout: total }));
    });

    return () => { unsubEmps(); unsubAdv(); unsubSal(); };
  }, []);

  return (
    <div>
      <h2 style={{ marginBottom: '30px' }}>Institutional Overview</h2>
      
      {/* Metric Cards */}
      <div style={gridStyle}>
        <div style={cardStyle}>
          <Users size={24} color="#3d85c6" />
          <div style={labelStyle}>Total Employees</div>
          <div style={valStyle}>{stats.totalEmployees}</div>
        </div>
        
        <div style={cardStyle}>
          <TrendingUp size={24} color="#ff6b6b" />
          <div style={labelStyle}>Total Advance (Out)</div>
          <div style={valStyle}>₹{stats.totalAdvances}</div>
        </div>

        <div style={cardStyle}>
          <Landmark size={24} color="#4caf50" />
          <div style={labelStyle}>Total Monthly Payout</div>
          <div style={valStyle}>₹{stats.monthlyPayout}</div>
        </div>
      </div>

      {/* Department Breakdown */}
      <h3 style={{ marginTop: '40px', color: '#666' }}>Department Breakdown</h3>
      <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
        {Object.entries(stats.deptCounts).map(([dept, count]) => (
          <div key={dept} style={deptCard}>
            <div style={{ fontSize: '12px', color: '#888' }}>{dept}</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{count} Staff</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Styles
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' };
const cardStyle = { backgroundColor: '#111', padding: '25px', borderRadius: '15px', border: '1px solid #222', display: 'flex', flexDirection: 'column', gap: '10px' };
const labelStyle = { fontSize: '14px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px' };
const valStyle = { fontSize: '32px', fontWeight: 'bold', color: '#fff' };
const deptCard = { flex: 1, backgroundColor: '#0a0a0a', padding: '20px', borderRadius: '10px', borderLeft: '4px solid #3d85c6' };

export default Dashboard;