import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, doc, updateDoc, query, orderBy, where } from 'firebase/firestore';
import { IndianRupee, Calendar, User, FileText, Download, Archive } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import { useToast } from '../components/Toast';

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

  // Filter lists to exclude soft-deleted records
  const visibleEmployees = employees.filter(e => !e.isDeleted);
  const visibleAdvances = advances.filter(a => !a.isDeleted);

  // Fetch Employees for dropdown
  useEffect(() => {
    if (!userPermissions || !userPermissions.depts) return;
    const q = query(
      collection(db, "employees"),
      where("dept", "in", userPermissions.depts)
    );
    return onSnapshot(q, (snapshot) => {
      setEmployees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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

    const headers = ["Date", "Employee Name", "Shop", "Amount (INR)", "Notes"];
    const rows = visibleAdvances.map(a => [
      `"${a.date || ''}"`,
      `"${(a.employeeName || '').replace(/"/g, '""')}"`,
      `"${(a.dept || '').replace(/"/g, '""')}"`,
      Number(a.amount) || 0,
      `"${(a.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvString = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Advances_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Advances exported to CSV successfully!", "success");
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ margin: 0 }}>Advance Register</h2>
          <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: '13px' }}>
            Record cash advances and track monthly deductions
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
          <Download size={16} /> Export to CSV ({visibleAdvances.length})
        </button>
      </div>

      {/* Entry Form */}
      <form onSubmit={handleAddAdvance} style={formStyle}>
        <div style={inputGroup}>
          <User size={18} color="#888" />
          <select value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)} style={selectStyle} required>
            <option value="" style={optionStyle}>Select Employee</option>
            {visibleEmployees.map(emp => (
              <option key={emp.id} value={emp.id} style={optionStyle}>{emp.name} ({emp.dept})</option>
            ))}
          </select>
        </div>

        <div style={inputGroup}>
          <IndianRupee size={18} color="#888" />
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
          <Calendar size={18} color="#888" />
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={innerInput}
            required
          />
        </div>

        <div style={inputGroup}>
          <FileText size={18} color="#888" />
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

      {/* History Table */}
      <div style={tableContainer}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '16px' }}>Recent Records</h3>
          <span style={{ fontSize: '12px', color: '#666' }}>Showing {visibleAdvances.length} entries</span>
        </div>

        {visibleAdvances.length > 0 ? (
          <table style={tableStyle}>
            <thead>
              <tr style={headerRow}>
                <th style={thStyle}>DATE</th>
                <th style={thStyle}>NAME</th>
                <th style={thStyle}>SHOP</th>
                <th style={thStyle}>AMOUNT</th>
                <th style={thStyle}>NOTES</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {visibleAdvances.map(adv => (
                <tr key={adv.id} style={trStyle}>
                  <td style={tdStyle}>{adv.date}</td>
                  <td style={{ ...tdStyle, fontWeight: '500', color: '#fff' }}>{adv.employeeName}</td>
                  <td style={tdStyle}>{adv.dept}</td>
                  <td style={{ ...tdStyle, color: '#ff6b6b', fontWeight: 'bold' }}>₹{adv.amount}</td>
                  <td style={{ ...tdStyle, color: adv.notes ? '#ccc' : '#555', fontStyle: adv.notes ? 'normal' : 'italic' }}>
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
                      <Archive size={15} color="#ff8533" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            No advance records found.
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
const formStyle = { display: 'flex', gap: '15px', backgroundColor: '#111', padding: '20px', borderRadius: '12px', border: '1px solid #222', marginBottom: '30px', flexWrap: 'wrap' };
const inputGroup = { display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#000', border: '1px solid #333', padding: '10px 15px', borderRadius: '8px', flex: 1, minWidth: '200px' };
const innerInput = { background: 'none', border: 'none', color: '#fff', width: '100%', outline: 'none', fontSize: '13px' };
const selectStyle = { ...innerInput, appearance: 'none', backgroundColor: '#000', cursor: 'pointer' };
const optionStyle = { backgroundColor: '#1a1a1a', color: '#fff' };
const addBtn = { backgroundColor: '#fff', color: '#000', border: 'none', padding: '10px 25px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
const exportBtnStyle = { backgroundColor: '#222', color: '#fff', border: '1px solid #333', padding: '10px 18px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' };
const tableContainer = { backgroundColor: '#111', borderRadius: '12px', border: '1px solid #222', padding: '20px' };
const tableStyle = { width: '100%', borderCollapse: 'collapse', marginTop: '10px' };
const headerRow = { textAlign: 'left', borderBottom: '1px solid #333' };
const thStyle = { padding: '15px', color: '#666', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' };
const trStyle = { borderBottom: '1px solid #1a1a1a' };
const tdStyle = { padding: '15px', fontSize: '13px', color: '#ccc' };
const iconBtnStyle = { background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };

export default AdvanceTracker;