import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { Save, CheckCircle, Clock, Archive } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import { useToast } from '../components/Toast';

function SalaryProcessor({ userPermissions }) {
  const { showToast } = useToast();
  const [employees, setEmployees] = useState([]);
  const [salaryRecords, setSalaryRecords] = useState([]);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, record: null });

  // Compute live month and year INSIDE the component so they always reflect current time
  const now = useMemo(() => new Date(), []);
  const [month, setMonth] = useState(() => now.toLocaleString('default', { month: 'long' }));
  const [year, setYear] = useState(() => now.getFullYear().toString());

  // Filter lists to exclude soft-deleted records
  const visibleEmployees = employees.filter(e => !e.isDeleted);
  const visibleSalaryRecords = salaryRecords.filter(r => !r.isDeleted);

  // Input States
  const [days, setDays] = useState(30);
  const [incentive, setIncentive] = useState(0);
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
    if (!userPermissions || !userPermissions.depts) return;
    const empQuery = query(
      collection(db, "employees"),
      where("dept", "in", userPermissions.depts)
    );
    const unsubEmps = onSnapshot(empQuery, (snap) => {
      setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      showToast("Error loading employees: " + err.message, 'error');
    });

    // Filter salary records by month, year, and department
    const q = query(
      collection(db, "salary_records"),
      where("dept", "in", userPermissions.depts),
      where("month", "==", month),
      where("year", "==", year)
    );
    const unsubRecs = onSnapshot(q, (snap) => {
      setSalaryRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      showToast("Error loading salary records: " + err.message, 'error');
    });

    return () => { unsubEmps(); unsubRecs(); };
  }, [month, year, userPermissions, showToast]);

  // Fetch advance amount filtered to the selected month + year (excluding soft-deleted advances)
  useEffect(() => {
    const fetchAdv = async () => {
      if (!selectedEmpId) return;
      const monthIndex = ['January','February','March','April','May','June',
        'July','August','September','October','November','December'].indexOf(month);
      const yearNum = Number(year);
      const pad = (num) => String(num).padStart(2, '0');
      const startDate = `${yearNum}-${pad(monthIndex + 1)}-01`;
      const lastDay = new Date(yearNum, monthIndex + 1, 0).getDate();
      const endDate = `${yearNum}-${pad(monthIndex + 1)}-${pad(lastDay)}`;

      const emp = employees.find(e => e.id === selectedEmpId);
      if (!emp) return;

      try {
        const q = query(
          collection(db, "advances"),
          where("employeeId", "==", selectedEmpId),
          where("dept", "==", emp.dept),
          where("date", ">=", startDate),
          where("date", "<=", endDate)
        );
        const snap = await getDocs(q);
        const activeAdvances = snap.docs
          .map(d => d.data())
          .filter(d => !d.isDeleted);
        setAdvance(activeAdvances.reduce((acc, d) => acc + (Number(d.amount) || 0), 0));
      } catch (err) {
        console.error("Error fetching advances:", err);
      }
    };
    fetchAdv();
  }, [selectedEmpId, month, year, employees]);

  const selectedEmp = employees.find(e => e.id === selectedEmpId);
  const baseSalary = selectedEmp ? (Number(selectedEmp.baseSalary) || 0) : 0;
  const fixedEarnings = baseSalary > 0 ? Math.round(baseSalary * (Number(days) || 0)) : 0;
  const lBonusAmount = lBonus ? baseSalary : 0;
  const totalAdd = (Number(incentive) || 0) + lBonusAmount + (Number(ts) || 0) + (Number(rdAdd) || 0);
  const totalDed = (Number(advance) || 0) + (Number(jBalance) || 0) + (Number(penalty) || 0) + (Number(rdDed) || 0) + (Number(pf) || 0);
  const gTotal = Math.round(fixedEarnings + totalAdd - totalDed);

  const handleSave = async () => {
    if (!selectedEmpId || saving) return;
    setSaving(true);

    try {
      // Guard against duplicate: check if an ACTIVE record for this employee+month+year already exists
      const dupCheck = query(
        collection(db, "salary_records"),
        where("employeeId", "==", selectedEmpId),
        where("month", "==", month),
        where("year", "==", year)
      );
      const dupSnap = await getDocs(dupCheck);
      const activeDups = dupSnap.docs.filter(d => !d.data().isDeleted);

      if (activeDups.length > 0) {
        showToast(`Salary for ${selectedEmp.name} in ${month} ${year} is already saved!`, 'warning');
        setSaving(false);
        return;
      }

      // Strictly cast all numeric fields to Numbers
      await addDoc(collection(db, "salary_records"), {
        employeeId: selectedEmpId,
        name: selectedEmp.name,
        dept: selectedEmp.dept,
        month,
        year,
        days: Number(days) || 0,
        incentive: Number(incentive) || 0,
        lBonus: Number(lBonusAmount) || 0,
        ts: Number(ts) || 0,
        rdAdd: Number(rdAdd) || 0,
        pf: Number(pf) || 0,
        advance: Number(advance) || 0,
        jBalance: Number(jBalance) || 0,
        penalty: Number(penalty) || 0,
        rdDed: Number(rdDed) || 0,
        gTotal: Number(gTotal) || 0,
        net: Number(gTotal) || 0,
        remarks: remarks || 'GOOD',
        baseSalary: Number(baseSalary) || 0,
        fixedEarnings: Number(fixedEarnings) || 0,
        createdAt: new Date(),
        isDeleted: false
      });

      // Reset Form
      setIncentive(0);
      setLBonus(false);
      setTs(0);
      setPenalty(0);
      setPf(0);
      setRdAdd(0);
      setRdDed(0);
      setJBalance(0);
      setSelectedEmpId('');
      showToast(`Salary record for ${selectedEmp.name} saved successfully!`, 'success');
    } catch (err) {
      showToast("Error saving salary: " + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Safe soft-delete / archive
  const handleArchiveRecord = async () => {
    const record = confirmModal.record;
    if (!record) return;
    setConfirmModal({ isOpen: false, record: null });

    try {
      await updateDoc(doc(db, "salary_records", record.id), {
        isDeleted: true,
        deletedAt: new Date().toISOString()
      });
      showToast(`Salary record for ${record.name} safely archived.`, 'info');
    } catch (err) {
      showToast("Archive failed: " + err.message, 'error');
    }
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
          <div>
            <h2 style={{ fontSize: '20px', margin: 0 }}>Salary Entry</h2>
            <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: '13px' }}>
              {selectedEmp ? `Calculating for: ${selectedEmp.name} (${selectedEmp.dept})` : 'Select an employee from the right panel'}
            </p>
          </div>
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
            <div style={field}><label>Days Worked</label><input type="number" min="0" max="31" value={days} onChange={e => setDays(e.target.value)} style={input} /></div>
            <div style={field}><label>Daily Rate</label><span>₹{baseSalary}/day</span></div>
            <div style={field}><label>Fixed Total ({days} days)</label><span style={{fontWeight:'bold'}}>₹{fixedEarnings}</span></div>
            <hr style={hrStyle}/>
            <div style={field}><label>Incentive</label><input type="number" min="0" value={incentive} onChange={e => setIncentive(e.target.value)} style={input} /></div>
            <div style={field}><label>L. Bonus (1 Day)</label><input type="checkbox" checked={lBonus} onChange={e => setLBonus(e.target.checked)} style={checkboxStyle} /></div>
            <div style={field}><label>TS Allowance</label><input type="number" min="0" value={ts} onChange={e => setTs(e.target.value)} style={input} /></div>
            <div style={field}><label>RD (Add)</label><input type="number" min="0" value={rdAdd} onChange={e => setRdAdd(e.target.value)} style={input} /></div>
          </div>

          <div style={sectionBox}>
            <h3 style={{ color: '#ea9999', fontSize: '13px', marginBottom: '15px' }}>DEDUCTIONS</h3>
            <div style={field}><label style={{color:'#ffd966', fontWeight:'bold'}}>PF (Fund)</label><input type="number" min="0" value={pf} onChange={e => setPf(e.target.value)} style={pfInput} /></div>
            <div style={field}><label>Advance (Auto – {month})</label><span style={{color:'#ff6b6b'}}>- ₹{advance}</span></div>
            <div style={field}><label>J. Balance</label><input type="number" min="0" value={jBalance} onChange={e => setJBalance(e.target.value)} style={input} /></div>
            <hr style={hrStyle}/>
            <div style={field}><label>Penalty</label><input type="number" min="0" value={penalty} onChange={e => setPenalty(e.target.value)} style={input} /></div>
            <div style={field}><label>RD (Ded)</label><input type="number" min="0" value={rdDed} onChange={e => setRdDed(e.target.value)} style={input} /></div>
            <div style={field}><label>Remarks</label><input type="text" value={remarks} onChange={e => setRemarks(e.target.value)} style={input} /></div>
          </div>
        </div>

        <div style={summaryBox}>
          <div>
            <div style={{fontSize:'10px', color:'#555', letterSpacing: '0.5px'}}>TOTAL NET PAYABLE</div>
            <div style={totalVal}>₹{gTotal}</div>
          </div>
          <button
            onClick={handleSave}
            disabled={!selectedEmpId || saving}
            style={{
              ...saveBtn,
              opacity: (!selectedEmpId || saving) ? 0.5 : 1,
              cursor: (!selectedEmpId || saving) ? 'not-allowed' : 'pointer'
            }}
          >
            <Save size={18}/> {saving ? 'Saving Record…' : 'Save Record'}
          </button>
        </div>

        <div style={tableContainer}>
          <h4 style={{fontSize:'12px', marginBottom:'10px', color: '#888'}}>Recent Entries ({month} {year})</h4>
          {visibleSalaryRecords.length > 0 ? (
            <table style={tableStyle}>
              <thead><tr><th style={th}>Name</th><th style={th}>Days</th><th style={th}>G.Total</th><th style={{ ...th, textAlign: 'center' }}>Action</th></tr></thead>
              <tbody>
                {visibleSalaryRecords.map(r => (
                  <tr key={r.id} style={{borderBottom:'1px solid #1a1a1a'}}>
                    <td style={td}>{r.name}</td>
                    <td style={td}>{r.days}</td>
                    <td style={{ ...td, color: '#4caf50', fontWeight: 'bold' }}>₹{r.gTotal}</td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      <button
                        onClick={() => setConfirmModal({
                          isOpen: true,
                          record: r,
                          title: `Archive Salary Record?`,
                          message: `Archive salary record for ${r.name} (${month} ${year})? The record will be hidden from active lists and slips, preserving database history.`
                        })}
                        style={iconBtnStyle}
                        title="Archive Record (Safe)"
                      >
                        <Archive size={14} color="#ff8533" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', color: '#555', fontSize: '13px' }}>
              No salary entries for {month} {year} yet.
            </div>
          )}
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
                <div style={{fontSize:'12px', color: isSelected ? '#fff' : '#888', fontWeight: isSelected ? 'bold' : 'normal'}}>
                  {emp.name}
                  <div style={{ fontSize: '10px', color: '#555' }}>{emp.dept}</div>
                </div>
                {isDone ? <CheckCircle size={14} color="#4caf50" /> : <Clock size={14} color="#333" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Archive Record"
        cancelText="Cancel"
        isDanger={false}
        onConfirm={handleArchiveRecord}
        onCancel={() => setConfirmModal({ isOpen: false, record: null })}
      />
    </div>
  );
}

// Styles
const headerRow = { display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' };
const selectStyle = { padding: '8px 12px', backgroundColor: '#111', color: '#fff', border: '1px solid #333', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' };
const gridContainer = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' };
const sectionBox = { backgroundColor: '#0a0a0a', padding: '15px', borderRadius: '10px', border: '1px solid #222' };
const field = { display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center', fontSize: '12px' };
const input = { width: '90px', backgroundColor: '#000', border: '1px solid #333', color: '#fff', padding: '6px', textAlign: 'right', borderRadius: '4px', fontSize: '12px' };
const pfInput = { ...input, border: '1px solid #ffd966', color: '#ffd966' };
const summaryBox = { marginTop: '15px', padding: '20px', backgroundColor: '#111', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #222' };
const totalVal = { fontSize: '28px', fontWeight: 'bold', color: '#4caf50' };
const saveBtn = { backgroundColor: '#4caf50', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', gap: '8px', fontSize: '13px', alignItems: 'center' };
const rightSidebar = { width: '240px', backgroundColor: '#050505', borderLeft: '1px solid #222', padding: '15px', display: 'flex', flexDirection: 'column' };
const scrollList = { overflowY: 'auto', flex: 1 };
const empItem = { padding: '10px', marginBottom: '5px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '4px' };
const tableContainer = { marginTop: '20px', backgroundColor: '#0a0a0a', padding: '15px', borderRadius: '10px' };
const tableStyle = { width: '100%', borderCollapse: 'collapse', textAlign: 'left' };
const th = { padding: '8px', color: '#666', fontSize: '10px', textTransform: 'uppercase' };
const td = { padding: '8px', fontSize: '12px', color: '#ccc' };
const hrStyle = { border: 'none', borderTop: '1px solid #222', margin: '10px 0' };
const checkboxStyle = { width: '16px', height: '16px', cursor: 'pointer', accentColor: '#4caf50' };
const iconBtnStyle = { background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };

export default SalaryProcessor;