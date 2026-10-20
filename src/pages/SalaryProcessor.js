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
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 768 : false));

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => {
        if (a.employeeId && b.employeeId) {
          return a.employeeId.localeCompare(b.employeeId, undefined, { numeric: true });
        }
        if (a.employeeId) return -1;
        if (b.employeeId) return 1;
        return (a.name || '').localeCompare(b.name || '');
      });
      setEmployees(list);
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
  const isMonthly = selectedEmp?.salaryType === 'monthly' || (Number(selectedEmp?.baseSalary) > 1500 && selectedEmp?.salaryType !== 'daily');
  const baseSalary = selectedEmp ? (Number(selectedEmp.baseSalary) || 0) : 0;
  const dailyRateEquiv = isMonthly ? (baseSalary > 0 ? Math.round(baseSalary / 30) : 0) : baseSalary;
  const fixedEarnings = isMonthly
    ? (Number(days) === 30 ? baseSalary : Math.round((baseSalary / 30) * (Number(days) || 0)))
    : (baseSalary > 0 ? Math.round(baseSalary * (Number(days) || 0)) : 0);
  const lBonusAmount = lBonus ? dailyRateEquiv : 0;
  const totalAdd = (Number(incentive) || 0) + lBonusAmount + (Number(ts) || 0) + (Number(rdAdd) || 0);
  const totalDed = (Number(advance) || 0) + (Number(jBalance) || 0) + (Number(penalty) || 0) + (Number(rdDed) || 0) + (Number(pf) || 0);
  const gTotal = Math.round(fixedEarnings + totalAdd - totalDed);

  const handleSave = async () => {
    if (!selectedEmpId || saving) return;
    setSaving(true);

    try {
      // Guard against duplicate: check if an ACTIVE record for this employee+month+year already exists in loaded records
      const isAlreadySaved = visibleSalaryRecords.some(
        r => r.employeeId === selectedEmpId && r.month === month && r.year === year
      );

      if (isAlreadySaved) {
        showToast(`Salary for ${selectedEmp.name} in ${month} ${year} is already saved!`, 'warning');
        setSaving(false);
        return;
      }

      // Extra check directly in Firestore scoped to the employee's department to comply with security rules
      try {
        const dupCheck = query(
          collection(db, "salary_records"),
          where("dept", "==", selectedEmp.dept),
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
      } catch (checkErr) {
        // In-memory check already validated duplicates; ignore network or index query errors
        console.warn("Duplicate query check skipped:", checkErr);
      }

      // Strictly cast all numeric fields to Numbers
      await addDoc(collection(db, "salary_records"), {
        employeeId: selectedEmpId,
        employeeCode: selectedEmp.employeeId || '',
        name: selectedEmp.name,
        dept: selectedEmp.dept,
        salaryType: isMonthly ? 'monthly' : 'daily',
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
        dailyRateEquiv: Number(dailyRateEquiv) || 0,
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
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: isMobile ? 'auto' : 'calc(100vh - 120px)', gap: '20px' }}>
      {/* Hide scrollbars */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div style={{ flex: 1, overflowY: isMobile ? 'visible' : 'auto', paddingRight: isMobile ? '0' : '10px' }} className="no-scrollbar">
        {/* Mobile Employee Selector */}
        {isMobile && (
          <div style={{ marginBottom: '16px', backgroundColor: '#ffffff', padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Select Employee ({visibleEmployees.length})
            </label>
            <select
              value={selectedEmpId}
              onChange={e => setSelectedEmpId(e.target.value)}
              style={{ ...selectStyle, width: '100%', padding: '12px 14px', fontSize: '14px', fontWeight: '600' }}
            >
              <option value="">-- Choose Employee --</option>
              {visibleEmployees.map(emp => {
                const isProcessed = visibleSalaryRecords.some(r => r.employeeId === emp.id);
                return (
                  <option key={emp.id} value={emp.id}>
                    {isProcessed ? '✓ ' : '• '}{emp.employeeId ? `[${emp.employeeId}] ` : ''}{emp.name} ({emp.dept})
                  </option>
                );
              })}
            </select>
          </div>
        )}

        <div style={{ ...headerRow, flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '24px', margin: 0, color: '#0f172a', fontWeight: '800' }}>Salary Entry</h2>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>
              {selectedEmp ? `Calculating for: ${selectedEmp.name}${selectedEmp.employeeId ? ` [${selectedEmp.employeeId}]` : ''} (${selectedEmp.dept})` : (isMobile ? 'Select an employee above to start' : 'Select an employee from the right panel')}
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

        <div style={{ ...gridContainer, gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr' }}>
          <div style={sectionBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>
              <span style={{ color: '#166534', fontSize: '12px', fontWeight: '700', letterSpacing: '0.5px' }}>EARNINGS</span>
              {selectedEmp && (
                <span style={{ fontSize: '11px', color: isMonthly ? '#1e40af' : '#166534', backgroundColor: isMonthly ? '#eff6ff' : '#f0fdf4', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>
                  {isMonthly ? 'Monthly Staff' : 'Daily Staff'}
                </span>
              )}
            </div>
            <div style={field}><label style={{ color: '#475569', fontWeight: '500' }}>Days Worked</label><input type="number" min="0" max="31" value={days} onChange={e => setDays(e.target.value)} style={input} /></div>
            <div style={field}>
              <label style={{ color: '#475569', fontWeight: '500' }}>{isMonthly ? 'Monthly Salary' : 'Daily Rate'}</label>
              <span style={{ color: '#0f172a', fontWeight: '600' }}>₹{baseSalary}{isMonthly ? '/month' : '/day'}</span>
            </div>
            {isMonthly && (
              <div style={field}>
                <label style={{ color: '#94a3b8' }}>Daily Equivalent (÷30)</label>
                <span style={{ color: '#94a3b8' }}>₹{dailyRateEquiv}/day</span>
              </div>
            )}
            <div style={field}>
              <label style={{ color: '#475569', fontWeight: '500' }}>Fixed Total ({days} days)</label>
              <span style={{ fontWeight: '700', color: '#0f172a' }}>₹{fixedEarnings}</span>
            </div>
            <hr style={hrStyle}/>
            <div style={field}><label style={{ color: '#475569', fontWeight: '500' }}>Incentive</label><input type="number" min="0" value={incentive} onChange={e => setIncentive(e.target.value)} style={input} /></div>
            <div style={field}>
              <label style={{ color: '#475569', fontWeight: '500' }}>
                L. Bonus (1 Day)
                {lBonus && <span style={{ color: '#16a34a', marginLeft: '6px', fontSize: '11px', fontWeight: '700' }}>(+₹{lBonusAmount})</span>}
              </label>
              <input type="checkbox" checked={lBonus} onChange={e => setLBonus(e.target.checked)} style={checkboxStyle} />
            </div>
            <div style={field}><label style={{ color: '#475569', fontWeight: '500' }}>TS Allowance</label><input type="number" min="0" value={ts} onChange={e => setTs(e.target.value)} style={input} /></div>
            <div style={field}><label style={{ color: '#475569', fontWeight: '500' }}>RD (Add)</label><input type="number" min="0" value={rdAdd} onChange={e => setRdAdd(e.target.value)} style={input} /></div>
          </div>

          <div style={sectionBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>
              <span style={{ color: '#991b1b', fontSize: '12px', fontWeight: '700', letterSpacing: '0.5px' }}>DEDUCTIONS</span>
            </div>
            <div style={field}><label style={{ color: '#854d0e', fontWeight: '700' }}>PF (Fund)</label><input type="number" min="0" value={pf} onChange={e => setPf(e.target.value)} style={pfInput} /></div>
            <div style={field}><label style={{ color: '#475569', fontWeight: '500' }}>Advance (Auto – {month})</label><span style={{ color: '#ef4444', fontWeight: '700' }}>- ₹{advance}</span></div>
            <div style={field}><label style={{ color: '#475569', fontWeight: '500' }}>J. Balance</label><input type="number" min="0" value={jBalance} onChange={e => setJBalance(e.target.value)} style={input} /></div>
            <hr style={hrStyle}/>
            <div style={field}><label style={{ color: '#475569', fontWeight: '500' }}>Penalty</label><input type="number" min="0" value={penalty} onChange={e => setPenalty(e.target.value)} style={input} /></div>
            <div style={field}><label style={{ color: '#475569', fontWeight: '500' }}>RD (Ded)</label><input type="number" min="0" value={rdDed} onChange={e => setRdDed(e.target.value)} style={input} /></div>
            <div style={field}><label style={{ color: '#475569', fontWeight: '500' }}>Remarks</label><input type="text" value={remarks} onChange={e => setRemarks(e.target.value)} style={input} /></div>
          </div>
        </div>

        <div style={{
          ...summaryBox,
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'center',
          gap: isMobile ? '16px' : '20px'
        }}>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', letterSpacing: '0.6px', fontWeight: '700' }}>TOTAL NET PAYABLE</div>
            <div style={totalVal}>₹{gTotal}</div>
          </div>
          <button
            onClick={handleSave}
            disabled={!selectedEmpId || saving}
            style={{
              ...saveBtn,
              opacity: (!selectedEmpId || saving) ? 0.5 : 1,
              cursor: (!selectedEmpId || saving) ? 'not-allowed' : 'pointer',
              width: isMobile ? '100%' : 'auto',
              justifyContent: 'center'
            }}
          >
            <Save size={18}/> {saving ? 'Saving Record…' : 'Save Record'}
          </button>
        </div>

        <div style={tableContainer}>
          <h4 style={{ fontSize: '13px', margin: '0 0 12px 0', color: '#0f172a', fontWeight: '700' }}>Recent Entries ({month} {year})</h4>
          {visibleSalaryRecords.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={th}>EMP ID</th>
                    <th style={th}>Name</th>
                    <th style={th}>Days</th>
                    <th style={th}>G.Total</th>
                    <th style={{ ...th, textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleSalaryRecords.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ ...td, color: '#2563eb', fontFamily: 'monospace', fontSize: '12px', fontWeight: '600' }}>{r.employeeCode || '—'}</td>
                      <td style={{ ...td, fontWeight: '600', color: '#0f172a' }}>{r.name}</td>
                      <td style={td}>{r.days}</td>
                      <td style={{ ...td, color: '#16a34a', fontWeight: '700' }}>₹{r.gTotal}</td>
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
                          <Archive size={14} color="#ea580c" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px', color: '#64748b', fontSize: '13px' }}>
              No salary entries for {month} {year} yet.
            </div>
          )}
        </div>
      </div>

      {/* RIGHT SIDEBAR (Desktop Only) */}
      {!isMobile && (
        <div style={rightSidebar}>
          <h4 style={{ fontSize: '14px', margin: '0 0 14px 0', color: '#0f172a', fontWeight: '700' }}>Select Employee</h4>
          <div style={scrollList} className="no-scrollbar">
            {visibleEmployees.map(emp => {
              const isDone = visibleSalaryRecords.some(r => r.employeeId === emp.id);
              const isSelected = selectedEmpId === emp.id;
              return (
                <div key={emp.id} onClick={() => setSelectedEmpId(emp.id)} style={{
                  ...empItem,
                  backgroundColor: isSelected ? '#f0fdf4' : '#f8fafc',
                  borderLeft: isSelected ? '4px solid #16a34a' : '4px solid transparent',
                  border: isSelected ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                  borderLeftWidth: '4px'
                }}>
                  <div style={{ fontSize: '12px', color: isSelected ? '#166534' : '#0f172a', fontWeight: isSelected ? '700' : '500' }}>
                    {emp.name}
                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                      {emp.employeeId ? <span style={{ color: '#2563eb', fontFamily: 'monospace', fontWeight: '600' }}>{emp.employeeId} • </span> : null}{emp.dept}
                    </div>
                  </div>
                  {isDone ? <CheckCircle size={15} color="#16a34a" /> : <Clock size={15} color="#cbd5e1" />}
                </div>
              );
            })}
          </div>
        </div>
      )}

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
const selectStyle = { padding: '8px 14px', backgroundColor: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', outline: 'none', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)' };
const gridContainer = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' };
const sectionBox = { backgroundColor: '#ffffff', padding: '18px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' };
const field = { display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center', fontSize: '12px' };
const input = { width: '95px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', padding: '6px 8px', textAlign: 'right', borderRadius: '6px', fontSize: '12px', outline: 'none' };
const pfInput = { ...input, border: '1px solid #facc15', color: '#854d0e', backgroundColor: '#fefce8' };
const summaryBox = { marginTop: '18px', padding: '20px 24px', backgroundColor: '#ffffff', borderRadius: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' };
const totalVal = { fontSize: '28px', fontWeight: '800', color: '#16a34a' };
const saveBtn = { backgroundColor: '#16a34a', color: '#ffffff', border: 'none', padding: '11px 22px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', display: 'flex', gap: '8px', fontSize: '13px', alignItems: 'center', boxShadow: '0 2px 4px rgba(22, 163, 74, 0.2)' };
const rightSidebar = { width: '250px', backgroundColor: '#ffffff', borderLeft: '1px solid #e2e8f0', padding: '18px', display: 'flex', flexDirection: 'column', borderRadius: '14px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' };
const scrollList = { overflowY: 'auto', flex: 1 };
const empItem = { padding: '10px 12px', marginBottom: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '8px', transition: 'all 0.15s ease' };
const tableContainer = { marginTop: '20px', backgroundColor: '#ffffff', padding: '18px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' };
const tableStyle = { width: '100%', borderCollapse: 'collapse', textAlign: 'left' };
const th = { padding: '10px 12px', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' };
const td = { padding: '11px 12px', fontSize: '13px', color: '#334155' };
const hrStyle = { border: 'none', borderTop: '1px solid #f1f5f9', margin: '12px 0' };
const checkboxStyle = { width: '16px', height: '16px', cursor: 'pointer', accentColor: '#16a34a' };
const iconBtnStyle = { background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };

export default SalaryProcessor;