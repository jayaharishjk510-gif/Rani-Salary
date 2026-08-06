import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { Save, CheckCircle, Clock, Trash2 } from 'lucide-react';

function SalaryProcessor({ userPermissions }) {
  const [employees, setEmployees] = useState([]);
  const [salaryRecords, setSalaryRecords] = useState([]);
  const [selectedEmpId, setSelectedEmpId] = useState('');

  // Compute live month and year INSIDE the component so they always reflect current time
  const now = useMemo(() => new Date(), []);
  const [month, setMonth] = useState(() => now.toLocaleString('default', { month: 'long' }));
  const [year, setYear] = useState(() => now.getFullYear().toString());

  // Filter lists based on user department permissions
  const visibleEmployees = employees.filter(emp =>
    userPermissions?.depts?.includes(emp.dept)
  );

  const visibleSalaryRecords = salaryRecords.filter(rec =>
    userPermissions?.depts?.includes(rec.dept)
  );

  // Input States
  const [days, setDays] = useState(30);
  const [incentive, setIncentive] = useState(0);   // fixed typo: insentive → incentive
  const [lBonus, setLBonus] = useState(false);
  const [ts, setTs] = useState(0);
  const [rdAdd, setRdAdd] = useState(0);
  const [pf, setPf] = useState(0);
  const [advance, setAdvance] = useState(0);
  const [jBalance, setJBalance] = useState(0);
  const [penalty, setPenalty] = useState(0);
  const [rdDed, setRdDed] = useState(0);
  const [remarks, setRemarks] = useState('GOOD');

  useEffect(() => {
    const unsubEmps = onSnapshot(collection(db, "employees"), (snap) => {
      setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    // Filter salary records by both month AND year to avoid cross-year clashes
    const q = query(
      collection(db, "salary_records"),
      where("month", "==", month),
      where("year", "==", year)
    );
    const unsubRecs = onSnapshot(q, (snap) => {
      setSalaryRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubEmps(); unsubRecs(); };
  }, [month, year]);

  // Fetch advance amount filtered to the selected month + year
  useEffect(() => {
    const fetchAdv = async () => {
      if (!selectedEmpId) return;
      // Parse month name to number for date-range filtering
      const monthIndex = ['January','February','March','April','May','June',
        'July','August','September','October','November','December'].indexOf(month);
      const yearNum = Number(year);
      const startDate = new Date(yearNum, monthIndex, 1).toISOString().split('T')[0];
      const endDate = new Date(yearNum, monthIndex + 1, 0).toISOString().split('T')[0];

      const q = query(
        collection(db, "advances"),
        where("employeeId", "==", selectedEmpId),
        where("date", ">=", startDate),
        where("date", "<=", endDate)
      );
      const snap = await getDocs(q);
      setAdvance(snap.docs.reduce((acc, d) => acc + Number(d.data().amount), 0));
    };
    fetchAdv();
  }, [selectedEmpId, month, year]);

  const selectedEmp = employees.find(e => e.id === selectedEmpId);
  // baseSalary is a monthly flat amount; daily earnings = baseSalary / 26 * days
  const baseSalary = selectedEmp ? Number(selectedEmp.baseSalary) : 0;
  // baseSalary is a daily rate; fixedEarnings = dailyRate × days worked
  const fixedEarnings = baseSalary > 0 ? Math.round(baseSalary * Number(days)) : 0;
  const lBonusAmount = lBonus ? baseSalary : 0;
  const totalAdd = Number(incentive) + lBonusAmount + Number(ts) + Number(rdAdd);
  const totalDed = Number(advance) + Number(jBalance) + Number(penalty) + Number(rdDed) + Number(pf);
  const gTotal = Math.round(fixedEarnings + totalAdd - totalDed);

  const handleSave = async () => {
    if (!selectedEmpId) return;

    // Guard against duplicate: check if a record for this employee+month+year already exists
    const dupCheck = query(
      collection(db, "salary_records"),
      where("employeeId", "==", selectedEmpId),
      where("month", "==", month),
      where("year", "==", year)
    );
    const dupSnap = await getDocs(dupCheck);
    if (!dupSnap.empty) {
      alert(`Salary for ${selectedEmp.name} in ${month} ${year} is already saved. Delete the existing record first.`);
      return;
    }

    await addDoc(collection(db, "salary_records"), {
      employeeId: selectedEmpId,
      name: selectedEmp.name,
      dept: selectedEmp.dept,
      month,
      year,               // year now saved to Firestore
      days,
      incentive,          // fixed spelling in Firestore field
      lBonus: lBonusAmount,
      ts,
      rdAdd,
      pf,
      advance,
      jBalance,
      penalty,
      rdDed,
      gTotal,
      net: gTotal,        // net is the same as gTotal
      remarks,
      baseSalary,
      fixedEarnings
    });
    setIncentive(0); setLBonus(false); setTs(0); setPenalty(0); setPf(0);
    setRdAdd(0); setRdDed(0); setJBalance(0);
    setSelectedEmpId('');
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 120px)', gap: '20px' }}>
      {/* Hide scrollbars */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }} className="no-scrollbar">
        <div style={headerRow}>
          <h2 style={{ fontSize: '20px' }}>Salary Entry</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            <select value={month} onChange={e => setMonth(e.target.value)} style={selectStyle}>
              {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => <option key={m}>{m}</option>)}
            </select>
            <select value={year} onChange={e => setYear(e.target.value)} style={selectStyle}>
              {[String(now.getFullYear() - 1), String(now.getFullYear()), String(now.getFullYear() + 1)].map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <div style={gridContainer}>
          <div style={sectionBox}>
            <h3 style={{ color: '#b6d7a8', fontSize: '13px', marginBottom: '15px' }}>EARNINGS</h3>
            <div style={field}><label>Days Worked</label><input type="number" value={days} onChange={e => setDays(e.target.value)} style={input} /></div>
            <div style={field}><label>Daily Rate</label><span>₹{baseSalary}/day</span></div>
            <div style={field}><label>Fixed Total ({days} days)</label><span style={{fontWeight:'bold'}}>₹{fixedEarnings}</span></div>
            <hr style={hrStyle}/>
            <div style={field}><label>Incentive</label><input type="number" value={incentive} onChange={e => setIncentive(e.target.value)} style={input} /></div>
            <div style={field}><label>L. Bonus (1 Day)</label><input type="checkbox" checked={lBonus} onChange={e => setLBonus(e.target.checked)} style={checkboxStyle} /></div>
            <div style={field}><label>TS Allowance</label><input type="number" value={ts} onChange={e => setTs(e.target.value)} style={input} /></div>
            <div style={field}><label>RD (Add)</label><input type="number" value={rdAdd} onChange={e => setRdAdd(e.target.value)} style={input} /></div>
          </div>

          <div style={sectionBox}>
            <h3 style={{ color: '#ea9999', fontSize: '13px', marginBottom: '15px' }}>DEDUCTIONS</h3>
            <div style={field}><label style={{color:'#ffd966', fontWeight:'bold'}}>PF (Fund)</label><input type="number" value={pf} onChange={e => setPf(e.target.value)} style={pfInput} /></div>
            <div style={field}><label>Advance (Auto – {month})</label><span style={{color:'#ff6b6b'}}>- ₹{advance}</span></div>
            <div style={field}><label>J. Balance</label><input type="number" value={jBalance} onChange={e => setJBalance(e.target.value)} style={input} /></div>
            <hr style={hrStyle}/>
            <div style={field}><label>Penalty</label><input type="number" value={penalty} onChange={e => setPenalty(e.target.value)} style={input} /></div>
            <div style={field}><label>RD (Ded)</label><input type="number" value={rdDed} onChange={e => setRdDed(e.target.value)} style={input} /></div>
            <div style={field}><label>Remarks</label><input type="text" value={remarks} onChange={e => setRemarks(e.target.value)} style={input} /></div>
          </div>
        </div>

        <div style={summaryBox}>
          <div>
            <div style={{fontSize:'10px', color:'#555'}}>TOTAL PAYABLE</div>
            <div style={totalVal}>₹{gTotal}</div>
          </div>
          <button onClick={handleSave} style={saveBtn}><Save size={18}/> Save Record</button>
        </div>

        <div style={tableContainer}>
          <h4 style={{fontSize:'12px', marginBottom:'10px'}}>Recent Entries ({month} {year})</h4>
          <table style={tableStyle}>
            <thead><tr><th style={th}>Name</th><th style={th}>Days</th><th style={th}>G.Total</th><th style={th}>Action</th></tr></thead>
            <tbody>
              {visibleSalaryRecords.map(r => (
                <tr key={r.id} style={{borderBottom:'1px solid #1a1a1a'}}>
                  <td style={td}>{r.name}</td><td style={td}>{r.days}</td><td style={td}>₹{r.gTotal}</td>
                  <td style={td}><Trash2 size={14} color="#444" style={{cursor:'pointer'}} onClick={() => {
                    if (window.confirm(`Delete salary record for ${r.name}?`)) deleteDoc(doc(db, "salary_records", r.id));
                  }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RIGHT SIDEBAR */}
      <div style={rightSidebar}>
        <h4 style={{fontSize:'13px', marginBottom:'15px', color:'#fff'}}>Select Employee</h4>
        <div style={scrollList} className="no-scrollbar">
          {visibleEmployees.map(emp => {
            const isDone = visibleSalaryRecords.some(r => r.employeeId === emp.id);
            const isSelected = selectedEmpId === emp.id;
            return (
              <div key={emp.id} onClick={() => setSelectedEmpId(emp.id)} style={{
                ...empItem,
                backgroundColor: isSelected ? '#222' : '#111',
                borderLeft: isSelected ? '4px solid #4caf50' : '4px solid transparent'
              }}>
                <div style={{fontSize:'11px', color: isSelected ? '#fff' : '#888'}}>{emp.name}</div>
                {isDone ? <CheckCircle size={14} color="#4caf50" /> : <Clock size={14} color="#333" />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Styles
const headerRow = { display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' };
const selectStyle = { padding: '5px 10px', backgroundColor: '#111', color: '#fff', border: '1px solid #333', borderRadius: '5px', fontSize: '12px' };
const gridContainer = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' };
const sectionBox = { backgroundColor: '#0a0a0a', padding: '15px', borderRadius: '10px', border: '1px solid #222' };
const field = { display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center', fontSize: '12px' };
const input = { width: '90px', backgroundColor: '#000', border: '1px solid #333', color: '#fff', padding: '6px', textAlign: 'right', borderRadius: '4px', fontSize: '12px' };
const pfInput = { ...input, border: '1px solid #ffd966', color: '#ffd966' };
const summaryBox = { marginTop: '15px', padding: '20px', backgroundColor: '#111', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #222' };
const totalVal = { fontSize: '28px', fontWeight: 'bold', color: '#4caf50' };
const saveBtn = { backgroundColor: '#4caf50', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', gap: '8px', fontSize: '13px' };
const rightSidebar = { width: '220px', backgroundColor: '#050505', borderLeft: '1px solid #222', padding: '15px', display: 'flex', flexDirection: 'column' };
const scrollList = { overflowY: 'auto', flex: 1 };
const empItem = { padding: '10px', marginBottom: '5px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '4px' };
const tableContainer = { marginTop: '20px', backgroundColor: '#0a0a0a', padding: '15px', borderRadius: '10px' };
const tableStyle = { width: '100%', borderCollapse: 'collapse', textAlign: 'left' };
const th = { padding: '8px', color: '#444', fontSize: '10px', textTransform: 'uppercase' };
const td = { padding: '8px', fontSize: '12px', color: '#ccc' };
const hrStyle = { border: 'none', borderTop: '1px solid #222', margin: '10px 0' };
const checkboxStyle = { width: '16px', height: '16px', cursor: 'pointer', accentColor: '#4caf50' };

export default SalaryProcessor;