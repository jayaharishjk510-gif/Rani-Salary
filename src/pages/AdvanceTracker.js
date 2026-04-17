import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { IndianRupee, Calendar, User, Trash2 } from 'lucide-react';

function AdvanceTracker() {
  const [employees, setEmployees] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

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

    const emp = employees.find(e => e.id === selectedEmp);
    await addDoc(collection(db, "advances"), {
      employeeId: selectedEmp,
      employeeName: emp.name,
      dept: emp.dept,
      amount: Number(amount),
      date: date,
      timestamp: new Date()
    });

    setAmount('');
    alert("Advance recorded!");
  };

  return (
    <div>
      <h2>Advance Register</h2>
      
      {/* Entry Form */}
      <form onSubmit={handleAddAdvance} style={formStyle}>
        <div style={inputGroup}>
          <User size={18} color="#888"/>
          <select value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)} style={selectStyle} required>
            <option value="">Select Employee</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name} ({emp.dept})</option>
            ))}
          </select>
        </div>

        <div style={inputGroup}>
          <IndianRupee size={18} color="#888"/>
          <input type="number" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} style={innerInput} required />
        </div>

        <div style={inputGroup}>
          <Calendar size={18} color="#888"/>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={innerInput} required />
        </div>

        <button type="submit" style={addBtn}>Record Advance</button>
      </form>

      {/* History Table */}
      <div style={tableContainer}>
        <h3>Recent Transactions</h3>
        <table style={tableStyle}>
          <thead>
            <tr style={headerRow}>
              <th style={thStyle}>DATE</th>
              <th style={thStyle}>NAME</th>
              <th style={thStyle}>DEPARTMENT</th>
              <th style={thStyle}>AMOUNT</th>
              <th style={thStyle}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {advances.map(adv => (
              <tr key={adv.id} style={trStyle}>
                <td style={tdStyle}>{adv.date}</td>
                <td style={tdStyle}>{adv.employeeName}</td>
                <td style={tdStyle}>{adv.dept}</td>
                <td style={{ ...tdStyle, color: '#ff6b6b', fontWeight: 'bold' }}>₹{adv.amount}</td>
                <td style={tdStyle}>
                  <Trash2 size={16} color="#444" style={{cursor:'pointer'}} onClick={() => deleteDoc(doc(db, "advances", adv.id))} />
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
const selectStyle = { ...innerInput, appearance: 'none' };
const addBtn = { backgroundColor: '#fff', color: '#000', border: 'none', padding: '10px 25px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
const tableContainer = { backgroundColor: '#111', borderRadius: '12px', border: '1px solid #222', padding: '20px' };
const tableStyle = { width: '100%', borderCollapse: 'collapse', marginTop: '10px' };
const headerRow = { textAlign: 'left', borderBottom: '1px solid #333' };
const thStyle = { padding: '15px', color: '#555', fontSize: '12px' };
const trStyle = { borderBottom: '1px solid #1a1a1a' };
const tdStyle = { padding: '15px', fontSize: '14px' };

export default AdvanceTracker;