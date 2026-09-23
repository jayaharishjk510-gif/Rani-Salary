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

    // 1. Listen to Employees — filtered by department
    const empQuery = query(
      collection(db, "employees"),
      where("dept", "in", userPermissions.depts)
    );
    const unsubEmps = onSnapshot(empQuery, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      list.sort((a, b) => {
        if (a.employeeId && b.employeeId) {
          return a.employeeId.localeCompare(b.employeeId, undefined, { numeric: true });
        }
        if (a.employeeId) return -1;
        if (b.employeeId) return 1;
        return (a.name || '').localeCompare(b.name || '');
      });
      setEmployees(list);
    });

    // 2. Listen to Advances — filtered to current month and department
    const monthIndex = now.getMonth(); // 0-based
    const yearNum = now.getFullYear();
    const pad = (num) => String(num).padStart(2, '0');
    const startDate = `${yearNum}-${pad(monthIndex + 1)}-01`;
    const lastDay = new Date(yearNum, monthIndex + 1, 0).getDate();
    const endDate = `${yearNum}-${pad(monthIndex + 1)}-${pad(lastDay)}`;

    const advQuery = query(
      collection(db, "advances"),
      where("dept", "in", userPermissions.depts),
      where("date", ">=", startDate),
      where("date", "<=", endDate)
    );
    const unsubAdv = onSnapshot(advQuery, (snapshot) => {
      setAdvances(snapshot.docs.map(doc => doc.data()));
    });

    // 3. Listen to Salary Records — filtered to current month, year, and department
    const salQuery = query(
      collection(db, "salary_records"),
      where("dept", "in", userPermissions.depts),
      where("month", "==", currentMonth),
      where("year", "==", currentYear)
    );
    const unsubSal = onSnapshot(salQuery, (snapshot) => {
      const sals = snapshot.docs.map(doc => doc.data()).filter(sal => !sal.isDeleted);
      const total = sals.reduce((acc, sal) => acc + (Number(sal.gTotal) || 0), 0);
      setMonthlyPayout(total);
    });

    return () => { unsubEmps(); unsubAdv(); unsubSal(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPermissions]);

  // Apply department filters and exclude soft-deleted records
  const visibleEmployees = employees.filter(emp => !emp.isDeleted);
  const visibleAdvances = advances.filter(adv => !adv.isDeleted);

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
      <h2 style={{ marginBottom: '6px', color: '#0f172a', fontWeight: '800', fontSize: '24px' }}>Overview</h2>
      <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '28px' }}>Showing data for {currentMonth} {currentYear}</p>

      {/* Metric Cards */}
      <div style={gridStyle}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={labelStyle}>Total Employees</span>
            <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: '#eff6ff' }}>
              <Users size={20} color="#2563eb" />
            </div>
          </div>
          <div style={valStyle}>{visibleEmployees.length}</div>
        </div>

        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={labelStyle}>Total Advance ({currentMonth})</span>
            <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: '#fef2f2' }}>
              <TrendingUp size={20} color="#ef4444" />
            </div>
          </div>
          <div style={valStyle}>₹{totalAdvancesSum.toLocaleString()}</div>
        </div>

        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={labelStyle}>Total Monthly Salary ({currentMonth})</span>
            <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: '#f0fdf4' }}>
              <Landmark size={20} color="#16a34a" />
            </div>
          </div>
          <div style={valStyle}>₹{monthlyPayout.toLocaleString()}</div>
        </div>
      </div>

      {/* Employee List Table */}
      <div style={tableContainer}>
        <h3 style={{ margin: '0 0 16px 0', color: '#0f172a', fontSize: '16px', fontWeight: '700' }}>Employee & Advance Status</h3>
        {visibleEmployees.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr style={headerRow}>
                  <th style={thStyle}>EMP ID</th>
                  <th style={thStyle}>NAME</th>
                  <th style={thStyle}>SHOP</th>
                  <th style={thStyle}>RATE / SALARY</th>
                  <th style={thStyle}>MONTHLY ADVANCE ({currentMonth})</th>
                </tr>
              </thead>
              <tbody>
                {visibleEmployees.map(emp => {
                  const advAmount = getEmployeeAdvances(emp.id);
                  return (
                    <tr key={emp.id} style={trStyle}>
                      <td style={{ ...tdStyle, color: '#2563eb', fontFamily: 'monospace', fontWeight: '600' }}>
                        {emp.employeeId || '—'}
                      </td>
                      <td style={{ ...tdStyle, fontWeight: '600', color: '#0f172a' }}>{emp.name}</td>
                      <td style={tdStyle}>{emp.dept}</td>
                      <td style={tdStyle}>
                        ₹{emp.baseSalary}{emp.salaryType === 'monthly' ? '/mo' : '/day'}
                      </td>
                      <td style={{ ...tdStyle, color: advAmount > 0 ? '#ef4444' : '#94a3b8', fontWeight: advAmount > 0 ? '700' : 'normal' }}>
                        {advAmount > 0 ? `₹${advAmount.toLocaleString()}` : '₹0'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
            No employees found in your permitted shops.
          </div>
        )}
      </div>
    </div>
  );
}

// Styles
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' };
const cardStyle = { backgroundColor: '#ffffff', padding: '22px', borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' };
const labelStyle = { fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: '600' };
const valStyle = { fontSize: '30px', fontWeight: '800', color: '#0f172a' };

const tableContainer = { backgroundColor: '#ffffff', padding: '22px', borderRadius: '14px', border: '1px solid #e2e8f0', marginTop: '28px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' };
const tableStyle = { width: '100%', borderCollapse: 'collapse', textAlign: 'left' };
const headerRow = { borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' };
const thStyle = { padding: '12px 16px', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' };
const trStyle = { borderBottom: '1px solid #f1f5f9' };
const tdStyle = { padding: '14px 16px', fontSize: '13px', color: '#334155' };

export default Dashboard;