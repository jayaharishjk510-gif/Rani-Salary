import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { IndianRupee, Calendar, User, Trash2, FileText } from 'lucide-react';

function AdvanceTracker({ userPermissions }) {
  const [employees, setEmployees] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Filter lists based on user department permissions
  const visibleEmployees = employees.filter(emp =>
    userPermissions?.depts?.includes(emp.dept)
  );

  const visibleAdvances = advances.filter(adv =>
    userPermissions?.depts?.includes(adv.dept)
  );

  // Fetch Employees for the dropdown
  useEffect(() => {
    return onSnapshot(collection(db, "employees"), (snapshot) => {
      setEmployees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  // Fetch Advance History (Sorted by date)
  useEffect(() => {
    const q = query(collection(db, "advances"), orderBy("date", "desc"));
    return onSnapshot(q, (snapshot) => {
      setAdvances(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  const handleAddAdvance = async (e) => {
    e.preventDefault();
    if (!selectedEmp || !amount) return;
    setSaving(true);

    const emp = employees.find(e => e.id === selectedEmp);
    try {
      await addDoc(collection(db, "advances"), {
        employeeId: selectedEmp,
        employeeName: emp.name,
        dept: emp.dept,
        amount: Number(amount),
        date: date,
        notes: notes.trim(),
        timestamp: new Date()
      });
      setAmount('');
      setNotes('');
      setSelectedEmp(''); // reset employee after successful submission
      alert("Advance recorded!");
    } catch (err) {
      alert("Failed to record advance: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (adv) => {
    if (!window.confirm(`Delete advance of ₹${adv.amount} for ${adv.employeeName} on ${adv.date}? This cannot be undone.`)) return;
    deleteDoc(doc(db, "advances", adv.id)).catch(err => alert("Delete failed: " + err.message));
  };

  return (
    <div>
      <h2>Advance Register</h2>

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
          <input type="number" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} style={innerInput} required />
        </div>

        <div style={inputGroup}>
          <Calendar size={18} color="#888" />
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={innerInput} required />
        </div>

        <div style={inputGroup}>
          <FileText size={18} color="#888" />
          <input type="text" placeholder="Notes (Optional)" value={notes} onChange={e => setNotes(e.target.value)} style={innerInput} />
        </div>

        <button type="submit" disabled={saving} style={{ ...addBtn, opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Saving…' : 'Record Advance'}
        </button>
      </form>

      {/* History Table */}
      <div style={tableContainer}>
        <h3>Recent Records</h3>
        <table style={tableStyle}>
          <thead>
            <tr style={headerRow}>
              <th style={thStyle}>DATE</th>
              <th style={thStyle}>NAME</th>
              <th style={thStyle}>SHOP</th>
              <th style={thStyle}>AMOUNT</th>
              <th style={thStyle}>NOTES</th>
              <th style={thStyle}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {visibleAdvances.map(adv => (
              <tr key={adv.id} style={trStyle}>
                <td style={tdStyle}>{adv.date}</td>
                <td style={tdStyle}>{adv.employeeName}</td>
                <td style={tdStyle}>{adv.dept}</td>
                <td style={{ ...tdStyle, color: '#ff6b6b', fontWeight: 'bold' }}>₹{adv.amount}</td>
                <td style={{ ...tdStyle, color: adv.notes ? '#ccc' : '#555', fontStyle: adv.notes ? 'normal' : 'italic' }}>
                  {adv.notes || 'No notes'}
                </td>
                <td style={tdStyle}>
                  <Trash2 size={16} color="#444" style={{ cursor: 'pointer' }} onClick={() => handleDelete(adv)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Styles
const formStyle = { display: 'flex', gap: '15px', backgroundColor: '#111', padding: '20px', borderRadius: '12px', border: '1px solid #222', marginBottom: '30px', flexWrap: 'wrap' };
const inputGroup = { display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#000', border: '1px solid #333', padding: '10px 15px', borderRadius: '8px', flex: 1, minWidth: '200px' };
const innerInput = { background: 'none', border: 'none', color: '#fff', width: '100%', outline: 'none' };
const selectStyle = { ...innerInput, appearance: 'none', backgroundColor: '#000' };
const optionStyle = { backgroundColor: '#1a1a1a', color: '#fff' };
const addBtn = { backgroundColor: '#fff', color: '#000', border: 'none', padding: '10px 25px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
const tableContainer = { backgroundColor: '#111', borderRadius: '12px', border: '1px solid #222', padding: '20px' };
const tableStyle = { width: '100%', borderCollapse: 'collapse', marginTop: '10px' };
const headerRow = { textAlign: 'left', borderBottom: '1px solid #333' };
const thStyle = { padding: '15px', color: '#555', fontSize: '12px' };
const trStyle = { borderBottom: '1px solid #1a1a1a' };
const tdStyle = { padding: '15px', fontSize: '14px' };

export default AdvanceTracker;