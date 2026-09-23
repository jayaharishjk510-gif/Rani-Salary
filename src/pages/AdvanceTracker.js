import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, doc, updateDoc, query, orderBy, where } from 'firebase/firestore';
import { IndianRupee, Calendar, User, FileText, Download, Archive, Filter } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import { useToast } from '../components/Toast';

const getCurrentMonthStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

function AdvanceTracker({ userPermissions }) {
  const { showToast } = useToast();
  const [employees, setEmployees] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, adv: null });
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthStr());

  // Map for fast, reliable employee details lookup (e.g. employeeId code like NRJ01)
  const empMap = new Map(employees.map(e => [e.id, e]));

  // Filter lists to exclude soft-deleted records and show only current/selected month advances
  const visibleEmployees = employees.filter(e => !e.isDeleted);
  const visibleAdvances = advances.filter(a => {
    if (a.isDeleted) return false;
    if (selectedMonth === 'all') return true;
    return a.date && a.date.startsWith(selectedMonth);
  });

  const totalMonthAdvance = visibleAdvances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

  // Fetch Employees for dropdown
  useEffect(() => {
    if (!userPermissions || !userPermissions.depts) return;
    const q = query(
      collection(db, "employees"),
      where("dept", "in", userPermissions.depts)
    );
    return onSnapshot(q, (snapshot) => {
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
    }, (err) => {
      showToast("Error loading employees: " + err.message, 'error');
    });
  }, [userPermissions, showToast]);

  // Fetch Advance History (Sorted by date)
  useEffect(() => {
    if (!userPermissions || !userPermissions.depts) return;
    const q = query(
      collection(db, "advances"),
      where("dept", "in", userPermissions.depts),
      orderBy("date", "desc")
    );
    return onSnapshot(q, (snapshot) => {
      setAdvances(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      showToast("Error loading advances: " + err.message, 'error');
    });
  }, [userPermissions, showToast]);

  const handleAddAdvance = async (e) => {
    e.preventDefault();
    if (!selectedEmp || !amount || saving) return;
    setSaving(true);

    const emp = employees.find(e => e.id === selectedEmp);
    if (!emp) {
      showToast("Please select a valid employee", 'warning');
      setSaving(false);
      return;
    }

    try {
      await addDoc(collection(db, "advances"), {
        employeeId: selectedEmp,
        employeeCode: emp.employeeId || '',
        employeeName: emp.name,
        dept: emp.dept,
        amount: Number(amount) || 0,
        date: date,
        notes: notes.trim(),
        timestamp: new Date(),
        isDeleted: false
      });
      setAmount('');
      setNotes('');
      setSelectedEmp('');
      showToast(`Advance of ₹${amount} recorded for ${emp.name}!`, 'success');
    } catch (err) {
      showToast("Failed to record advance: " + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Safe soft-delete / archive
  const handleArchiveAdvance = async () => {
    const adv = confirmModal.adv;
    if (!adv) return;
    setConfirmModal({ isOpen: false, adv: null });

    try {
      await updateDoc(doc(db, "advances", adv.id), {
        isDeleted: true,
        deletedAt: new Date().toISOString()
      });
      showToast(`Advance of ₹${adv.amount} for ${adv.employeeName} archived safely.`, 'info');
    } catch (err) {
      showToast("Archive failed: " + err.message, 'error');
    }
  };

  // Export advance history to CSV
  const handleExportCSV = () => {
    if (visibleAdvances.length === 0) {
      showToast("No advance records to export", "warning");
      return;
    }

    const headers = ["Date", "Employee ID", "Employee Name", "Shop", "Amount (INR)", "Notes"];
    const rows = visibleAdvances.map(a => {
      const empCode = a.employeeCode || empMap.get(a.employeeId)?.employeeId || '';
      return [
        `"${a.date || ''}"`,
        `"${empCode.replace(/"/g, '""')}"`,
        `"${(a.employeeName || '').replace(/"/g, '""')}"`,
        `"${(a.dept || '').replace(/"/g, '""')}"`,
        Number(a.amount) || 0,
        `"${(a.notes || '').replace(/"/g, '""')}"`
      ];
    });

    const csvString = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const fileSuffix = selectedMonth === 'all' ? 'All_Months' : selectedMonth;
    link.setAttribute("download", `Advances_${fileSuffix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Advances exported to CSV successfully!", "success");
  };

  const currentMonth = getCurrentMonthStr();
  const isCurrentMonth = selectedMonth === currentMonth;

  // Format month for display
  const getMonthLabel = () => {
    if (selectedMonth === 'all') return 'All Historical Advances';
    try {
      const [y, m] = selectedMonth.split('-');
      const dateObj = new Date(Number(y), Number(m) - 1, 1);
      return dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } catch (e) {
      return selectedMonth;
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#0f172a', fontWeight: '800', fontSize: '24px' }}>Advance Register</h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>
            Record cash advances and track deductions for the current pay cycle
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={visibleAdvances.length === 0}
          style={{
            ...exportBtnStyle,
            opacity: visibleAdvances.length === 0 ? 0.5 : 1,
            cursor: visibleAdvances.length === 0 ? 'not-allowed' : 'pointer'
          }}
        >
          <Download size={16} /> Export CSV ({visibleAdvances.length})
        </button>
      </div>

      {/* Entry Form */}
      <form onSubmit={handleAddAdvance} style={formStyle}>
        <div style={inputGroup}>
          <User size={18} color="#64748b" />
          <select value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)} style={selectStyle} required>
            <option value="" style={optionStyle}>Select Employee</option>
            {visibleEmployees.map(emp => (
              <option key={emp.id} value={emp.id} style={optionStyle}>
                {emp.employeeId ? `[${emp.employeeId}] ` : ''}{emp.name} ({emp.dept})
              </option>
            ))}
          </select>
        </div>

        <div style={inputGroup}>
          <IndianRupee size={18} color="#64748b" />
          <input
            type="number"
            placeholder="Amount (₹)"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            style={innerInput}
            required
            min="1"
          />
        </div>

        <div style={inputGroup}>
          <Calendar size={18} color="#64748b" />
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={innerInput}
            required
          />
        </div>

        <div style={inputGroup}>
          <FileText size={18} color="#64748b" />
          <input
            type="text"
            placeholder="Notes (Optional)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            style={innerInput}
          />
        </div>

        <button type="submit" disabled={saving} style={{ ...addBtn, opacity: saving ? 0.6 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? 'Saving…' : 'Record Advance'}
        </button>
      </form>

      {/* Month Filter Bar */}
      <div style={monthFilterBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <Filter size={16} color="#64748b" />
          <span style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>Filter Month:</span>

          {/* Quick Current Month Button */}
          <button
            type="button"
            onClick={() => setSelectedMonth(currentMonth)}
            style={{
              ...filterPill,
              backgroundColor: isCurrentMonth ? '#0f172a' : '#ffffff',
              color: isCurrentMonth ? '#ffffff' : '#64748b',
              borderColor: isCurrentMonth ? '#0f172a' : '#cbd5e1',
              fontWeight: isCurrentMonth ? '700' : '500'
            }}
          >
            Current Month
          </button>

          {/* Month Selector Input */}
          <div style={monthInputWrapper}>
            <input
              type="month"
              value={selectedMonth === 'all' ? '' : selectedMonth}
              onChange={e => {
                if (e.target.value) setSelectedMonth(e.target.value);
              }}
              style={monthInput}
            />
          </div>

          {/* All Months Toggle Button */}
          <button
            type="button"
            onClick={() => setSelectedMonth('all')}
            style={{
              ...filterPill,
              backgroundColor: selectedMonth === 'all' ? '#2563eb' : '#ffffff',
              color: selectedMonth === 'all' ? '#ffffff' : '#64748b',
              borderColor: selectedMonth === 'all' ? '#2563eb' : '#cbd5e1',
              fontWeight: selectedMonth === 'all' ? '700' : '500'
            }}
          >
            All Months
          </button>
        </div>

        {/* Selected Month Summary */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ fontSize: '13px', color: '#64748b' }}>
            Period: <span style={{ color: '#0f172a', fontWeight: '700' }}>{getMonthLabel()}</span>
          </div>
          <div style={totalBadge}>
            Total: <span style={{ color: '#ef4444', fontWeight: '800', marginLeft: '4px' }}>₹{totalMonthAdvance.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div style={tableContainer}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a', fontWeight: '700' }}>{getMonthLabel()}</h3>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Showing {visibleAdvances.length} entries</span>
        </div>

        {visibleAdvances.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr style={headerRow}>
                  <th style={thStyle}>DATE</th>
                  <th style={thStyle}>EMP ID</th>
                  <th style={thStyle}>NAME</th>
                  <th style={thStyle}>SHOP</th>
                  <th style={thStyle}>AMOUNT</th>
                  <th style={thStyle}>NOTES</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {visibleAdvances.map(adv => {
                  const empCode = adv.employeeCode || empMap.get(adv.employeeId)?.employeeId || '—';
                  return (
                    <tr key={adv.id} style={trStyle}>
                      <td style={tdStyle}>{adv.date}</td>
                      <td style={{ ...tdStyle, color: '#2563eb', fontFamily: 'monospace', fontSize: '12px', fontWeight: '700' }}>
                        {empCode}
                      </td>
                      <td style={{ ...tdStyle, fontWeight: '600', color: '#0f172a' }}>{adv.employeeName}</td>
                      <td style={tdStyle}>{adv.dept}</td>
                      <td style={{ ...tdStyle, color: '#ef4444', fontWeight: '700' }}>₹{adv.amount.toLocaleString()}</td>
                      <td style={{ ...tdStyle, color: adv.notes ? '#475569' : '#94a3b8', fontStyle: adv.notes ? 'normal' : 'italic' }}>
                        {adv.notes || 'No notes'}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <button
                          onClick={() => setConfirmModal({
                            isOpen: true,
                            adv,
                            title: `Archive Advance Record?`,
                            message: `Archive advance of ₹${adv.amount} for ${adv.employeeName} on ${adv.date}? This safely archives the entry without permanent database deletion.`
                          })}
                          style={iconBtnStyle}
                          title="Archive Advance (Safe)"
                        >
                          <Archive size={15} color="#ea580c" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: '#64748b' }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: '600', color: '#334155' }}>No advance records found for {getMonthLabel()}.</p>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              Select a different month above, click "All Months" to view past history, or add a new advance using the form above.
            </p>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Archive Advance"
        cancelText="Cancel"
        isDanger={false}
        onConfirm={handleArchiveAdvance}
        onCancel={() => setConfirmModal({ isOpen: false, adv: null })}
      />
    </div>
  );
}

// Styles
const formStyle = { display: 'flex', gap: '15px', backgroundColor: '#ffffff', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '22px', flexWrap: 'wrap', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' };
const inputGroup = { display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', padding: '10px 14px', borderRadius: '8px', flex: 1, minWidth: '200px' };
const innerInput = { background: 'none', border: 'none', color: '#0f172a', width: '100%', outline: 'none', fontSize: '13px' };
const selectStyle = { ...innerInput, appearance: 'none', backgroundColor: '#ffffff', cursor: 'pointer' };
const optionStyle = { backgroundColor: '#ffffff', color: '#0f172a' };
const addBtn = { backgroundColor: '#0f172a', color: '#ffffff', border: 'none', padding: '10px 22px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '13px', boxShadow: '0 2px 4px rgba(15, 23, 42, 0.15)' };
const exportBtnStyle = { backgroundColor: '#ffffff', color: '#334155', border: '1px solid #cbd5e1', padding: '10px 18px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)' };

const monthFilterBar = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: '#ffffff',
  padding: '14px 20px',
  borderRadius: '14px',
  border: '1px solid #e2e8f0',
  marginBottom: '22px',
  flexWrap: 'wrap',
  gap: '15px',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
};

const filterPill = {
  border: '1px solid #cbd5e1',
  padding: '6px 14px',
  borderRadius: '20px',
  fontSize: '12px',
  cursor: 'pointer',
  transition: '0.2s'
};

const monthInputWrapper = {
  backgroundColor: '#ffffff',
  border: '1px solid #cbd5e1',
  padding: '4px 10px',
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center'
};

const monthInput = {
  background: 'none',
  border: 'none',
  color: '#0f172a',
  fontSize: '12px',
  outline: 'none',
  cursor: 'pointer',
  colorScheme: 'light'
};

const totalBadge = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  padding: '6px 14px',
  borderRadius: '8px',
  fontSize: '13px',
  color: '#334155'
};

const tableContainer = { backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '22px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' };
const tableStyle = { width: '100%', borderCollapse: 'collapse' };
const headerRow = { textAlign: 'left', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' };
const thStyle = { padding: '12px 16px', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700' };
const trStyle = { borderBottom: '1px solid #f1f5f9' };
const tdStyle = { padding: '14px 16px', fontSize: '13px', color: '#334155' };
const iconBtnStyle = { background: 'none', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };

export default AdvanceTracker;