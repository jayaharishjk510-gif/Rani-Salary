import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { Save, CheckCircle, Clock, Trash2 } from 'lucide-react';

// 1. Get Live Month and Year
const now = new Date();
const liveMonth = now.toLocaleString('default', { month: 'long' }); // e.g., "April"
const liveYear = now.getFullYear().toString(); // e.g., "2026"

function SalaryProcessor() {
  const [employees, setEmployees] = useState([]);
  const [salaryRecords, setSalaryRecords] = useState([]);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  
  // Dynamic initial states
  const [month, setMonth] = useState(liveMonth);
  const [year, setYear] = useState(liveYear);
  
  // Input States
  const [days, setDays] = useState(30);
  const [insentive, setInsentive] = useState(0);
  const [lBonus, setLBonus] = useState(0);
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
    const q = query(collection(db, "salary_records"), where("month", "==", month));
    const unsubRecs = onSnapshot(q, (snap) => {
      setSalaryRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubEmps(); unsubRecs(); };
  }, [month]);

  useEffect(() => {
    const fetchAdv = async () => {
      if (!selectedEmpId) return;
      const q = query(collection(db, "advances"), where("employeeId", "==", selectedEmpId));
      const snap = await getDocs(q);
      setAdvance(snap.docs.reduce((acc, d) => acc + Number(d.data().amount), 0));
    };
    fetchAdv();
  }, [selectedEmpId]);

  const selectedEmp = employees.find(e => e.id === selectedEmpId);
  const dailyRate = selectedEmp ? Number(selectedEmp.baseSalary) : 0;
  const fixedEarnings = dailyRate * Number(days); 
  const totalAdd = Number(insentive) + Number(lBonus) + Number(ts) + Number(rdAdd);
  const totalDed = Number(advance) + Number(jBalance) + Number(penalty) + Number(rdDed) + Number(pf);
  const gTotal = Math.round(fixedEarnings + totalAdd - totalDed);

  const handleSave = async () => {
    if (!selectedEmpId) return;
    await addDoc(collection(db, "salary_records"), {
      employeeId: selectedEmpId, name: selectedEmp.name, dept: selectedEmp.dept,
      month, year, days, insentive, lBonus, ts, rdAdd, pf, advance, jBalance, penalty, rdDed, gTotal, remarks
    });
    setInsentive(0); setLBonus(0); setPenalty(0); setPf(0); setRdAdd(0); setRdDed(0);
    setSelectedEmpId(''); 
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 120px)', gap: '20px' }}>
      {/* 2. Global Style Tag to Hide Scrollbars */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }} className="no-scrollbar">
        <div style={headerRow}>
          <h2 style={{ fontSize: '20px' }}>Salary Entry</h2>
          <select value={month} onChange={e => setMonth(e.target.value)} style={selectStyle}>
            {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => <option key={m}>{m}</option>)}
          </select>
        </div>

        <div style={gridContainer}>
          <div style={sectionBox}>
            <h3 style={{ color: '#b6d7a8', fontSize: '13px', marginBottom: '15px' }}>EARNINGS</h3>
            <div style={field}><label>Days Worked</label><input type="number" value={days} onChange={e => setDays(e.target.value)} style={input} /></div>
            <div style={field}><label>Daily Rate</label><span>₹{dailyRate}</span></div>
            <div style={field}><label>Fixed Total</label><span style={{fontWeight:'bold'}}>₹{fixedEarnings}</span></div>
            <hr style={hrStyle}/>
            <div style={field}><label>Incentive</label><input type="number" value={insentive} onChange={e => setInsentive(e.target.value)} style={input} /></div>
            <div style={field}><label>L. Bonus</label><input type="number" value={lBonus} onChange={e => setLBonus(e.target.value)} style={input} /></div>
            <div style={field}><label>RD (Add)</label><input type="number" value={rdAdd} onChange={e => setRdAdd(e.target.value)} style={input} /></div>
          </div>

          <div style={sectionBox}>
            <h3 style={{ color: '#ea9999', fontSize: '13px', marginBottom: '15px' }}>DEDUCTIONS</h3>
            <div style={field}><label style={{color:'#ffd966', fontWeight:'bold'}}>PF (Fund)</label><input type="number" value={pf} onChange={e => setPf(e.target.value)} style={pfInput} /></div>
            <div style={field}><label>Advance (Auto)</label><span style={{color:'#ff6b6b'}}>- ₹{advance}</span></div>
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
          <h4 style={{fontSize:'12px', marginBottom:'10px'}}>Recent Entries ({month})</h4>
          <table style={tableStyle}>
            <thead><tr><th style={th}>Name</th><th style={th}>Days</th><th style={th}>G.Total</th><th style={th}>Action</th></tr></thead>
            <tbody>
              {salaryRecords.map(r => (
                <tr key={r.id} style={{borderBottom:'1px solid #1a1a1a'}}>
                  <td style={td}>{r.name}</td><td style={td}>{r.days}</td><td style={td}>₹{r.gTotal}</td>
                  <td style={td}><Trash2 size={14} color="#444" style={{cursor:'pointer'}} onClick={() => deleteDoc(doc(db, "salary_records", r.id))} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RIGHT SIDEBAR WITH HIDDEN SCROLLBAR */}
      <div style={rightSidebar}>
        <h4 style={{fontSize:'13px', marginBottom:'15px', color:'#fff'}}>Select Employee</h4>
        <div style={scrollList} className="no-scrollbar">
          {employees.map(emp => {
            const isDone = salaryRecords.some(r => r.employeeId === emp.id);
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

// --- UPDATED STYLES ---
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

export default SalaryProcessor;