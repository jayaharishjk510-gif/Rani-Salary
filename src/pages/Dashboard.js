import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Users, TrendingUp, Landmark } from 'lucide-react';

function Dashboard({ userPermissions }) {
  // Track current month and year for correct filtering
  const now = new Date();
  const currentMonth = now.toLocaleString('default', { month: 'long' });
  const currentYear = now.getFullYear().toString();

  const [employees, setEmployees] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [monthlyPayout, setMonthlyPayout] = useState(0);

  useEffect(() => {
    if (!userPermissions || !userPermissions.depts) return;

    // 1. Listen to Employees
    const unsubEmps = onSnapshot(collection(db, "employees"), (snapshot) => {
      setEmployees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 2. Listen to Advances — filtered to current month using date range
    const monthIndex = now.getMonth(); // 0-based
    const startDate = new Date(now.getFullYear(), monthIndex, 1).toISOString().split('T')[0];
    const endDate = new Date(now.getFullYear(), monthIndex + 1, 0).toISOString().split('T')[0];
    const advQuery = query(
      collection(db, "advances"),
      where("date", ">=", startDate),
      where("date", "<=", endDate)
    );
    const unsubAdv = onSnapshot(advQuery, (snapshot) => {
      setAdvances(snapshot.docs.map(doc => doc.data()));
    });

    // 3. Listen to Salary Records — filtered to current month + year
    const salQuery = query(
      collection(db, "salary_records"),
      where("month", "==", currentMonth),
      where("year", "==", currentYear)
    );
    const unsubSal = onSnapshot(salQuery, (snapshot) => {
      const sals = snapshot.docs.map(doc => doc.data());
      const visibleSals = sals.filter(sal => userPermissions.depts.includes(sal.dept));
      const total = visibleSals.reduce((acc, sal) => acc + (Number(sal.gTotal) || 0), 0);
      setMonthlyPayout(total);
    });

    return () => { unsubEmps(); unsubAdv(); unsubSal(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPermissions]);

  // Apply department filters
  const visibleEmployees = employees.filter(emp => 
    userPermissions?.depts?.includes(emp.dept)
  );

  const visibleAdvances = advances.filter(adv => 
    userPermissions?.depts?.includes(adv.dept)
  );

  // Calculate totals
  const totalAdvancesSum = visibleAdvances.reduce((acc, adv) => acc + (Number(adv.amount) || 0), 0);

  // Helper to calculate an employee's total advances for the current month
  const getEmployeeAdvances = (empId) => {
    return visibleAdvances
      .filter(adv => adv.employeeId === empId)
      .reduce((acc, adv) => acc + (Number(adv.amount) || 0), 0);
  };

  return (
    <div>
      <h2 style={{ marginBottom: '10px' }}>Overview</h2>
      <p style={{ color: '#555', fontSize: '13px', marginBottom: '30px' }}>Showing data for {currentMonth} {currentYear}</p>

      {/* Metric Cards */}
      <div style={gridStyle}>
        <div style={cardStyle}>
          <Users size={24} color="#3d85c6" />
          <div style={labelStyle}>Total Employees</div>
          <div style={valStyle}>{visibleEmployees.length}</div>
        </div>

        <div style={cardStyle}>
          <TrendingUp size={24} color="#ff6b6b" />
          <div style={labelStyle}>Total Advance ({currentMonth})</div>
          <div style={valStyle}>₹{totalAdvancesSum}</div>
        </div>

        <div style={cardStyle}>
          <Landmark size={24} color="#4caf50" />
          <div style={labelStyle}>Total Monthly Salary ({currentMonth})</div>
          <div style={valStyle}>₹{monthlyPayout}</div>
        </div>
      </div>

      {/* Employee List Table */}
      <div style={tableContainer}>
        <h3 style={{ marginBottom: '15px', color: '#fff' }}>Employee Shop & Advance Status</h3>
        {visibleEmployees.length > 0 ? (
          <table style={tableStyle}>
            <thead>
              <tr style={headerRow}>
                <th style={thStyle}>NAME</th>
                <th style={thStyle}>SHOP</th>
                <th style={thStyle}>DAILY RATE</th>
                <th style={thStyle}>MONTHLY ADVANCE ({currentMonth})</th>
              </tr>
            </thead>
            <tbody>
              {visibleEmployees.map(emp => {
                const advAmount = getEmployeeAdvances(emp.id);
                return (
                  <tr key={emp.id} style={trStyle}>
                    <td style={{ ...tdStyle, fontWeight: 'bold', color: '#fff' }}>{emp.name}</td>
                    <td style={tdStyle}>{emp.dept}</td>
                    <td style={tdStyle}>₹{emp.baseSalary}/day</td>
                    <td style={{ ...tdStyle, color: advAmount > 0 ? '#ff6b6b' : '#666', fontWeight: advAmount > 0 ? 'bold' : 'normal' }}>
                      {advAmount > 0 ? `₹${advAmount}` : '₹0'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', padding: '30px', color: '#555' }}>
            No employees found in your permitted shops.
          </div>
        )}
      </div>
    </div>
  );
}

// Styles
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' };
const cardStyle = { backgroundColor: '#111', padding: '25px', borderRadius: '15px', border: '1px solid #222', display: 'flex', flexDirection: 'column', gap: '10px' };
const labelStyle = { fontSize: '14px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px' };
const valStyle = { fontSize: '32px', fontWeight: 'bold', color: '#fff' };

const tableContainer = { backgroundColor: '#0a0a0a', padding: '20px', borderRadius: '12px', border: '1px solid #222', marginTop: '30px' };
const tableStyle = { width: '100%', borderCollapse: 'collapse', textAlign: 'left' };
const headerRow = { borderBottom: '1px solid #333' };
const thStyle = { padding: '12px 15px', color: '#555', fontSize: '12px', textTransform: 'uppercase' };
const trStyle = { borderBottom: '1px solid #111' };
const tdStyle = { padding: '14px 15px', fontSize: '13px', color: '#ccc' };

export default Dashboard;