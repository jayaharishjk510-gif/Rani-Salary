import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import SalaryReport from '../SalaryReport'; // Import the card design
import { Printer, Search } from 'lucide-react';

function ReportPreview() {
  const [records, setRecords] = useState([]);
  const [filterMonth, setFilterMonth] = useState('May');
  const [filterDept, setFilterDept] = useState('Rani Javuli');

  useEffect(() => {
    // Fetch records based on selected month and department
    const q = query(
      collection(db, "salary_records"),
      where("month", "==", filterMonth),
      where("dept", "==", filterDept)
    );

    return onSnapshot(q, (snapshot) => {
      setRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, [filterMonth, filterDept]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <div className="no-print" style={filterBar}>
        <div style={{ display: 'flex', gap: '15px' }}>
          <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={selectStyle}>
            {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => <option key={m}>{m}</option>)}
          </select>
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)} style={selectStyle}>
            <option>Rani Javuli</option>
            <option>Rani Readymade</option>
            <option>New Rani</option>
          </select>
        </div>
        <button onClick={handlePrint} style={printBtn}>
          <Printer size={18} /> Print 4-Per-Page
        </button>
      </div>

      <div className="print-area">
        {records.length > 0 ? (
          <SalaryReport data={records} />
        ) : (
          <div style={{ textAlign: 'center', padding: '50px', color: '#555' }}>
            No records found for {filterMonth} in {filterDept}.
          </div>
        )}
      </div>

      {/* CSS to handle the printing layout */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background-color: white !important; color: black !important; }
          nav { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; }
          .print-area { width: 100%; }
        }
      `}</style>
    </div>
  );
}

const filterBar = { 
  display: 'flex', 
  justifyContent: 'space-between', 
  backgroundColor: '#111', 
  padding: '20px', 
  borderRadius: '8px', 
  marginBottom: '20px',
  border: '1px solid #222'
};

const selectStyle = { padding: '10px', backgroundColor: '#000', color: '#fff', border: '1px solid #333', borderRadius: '5px' };
const printBtn = { 
  backgroundColor: '#3d85c6', 
  color: '#fff', 
  border: 'none', 
  padding: '10px 20px', 
  borderRadius: '5px', 
  cursor: 'pointer', 
  display: 'flex', 
  alignItems: 'center', 
  gap: '10px', 
  fontWeight: 'bold' 
};

export default ReportPreview;