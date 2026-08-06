import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import SalaryReport from '../SalaryReport';
import { Printer, Search, RefreshCw } from 'lucide-react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function ReportPreview({ userPermissions }) {
  const [records, setRecords] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  
  // Access check definitions
  const defaultDept = userPermissions?.depts?.[0] || 'Rani Javuli';
  const isAdmin = userPermissions?.depts?.length > 1;

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState(isAdmin ? 'All' : defaultDept);
  const [filterMonth, setFilterMonth] = useState(MONTHS[new Date().getMonth()]);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());

  // Fetch all salary records in real-time
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "salary_records"), (snapshot) => {
      setRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsub;
  }, []);

  // Filter records client-side for instant search & feedback
  const filteredRecords = records.filter(rec => {
    const matchesName = rec.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Security: Limit data matching to allowed departments
    const isDeptAllowed = userPermissions?.depts?.includes(rec.dept);
    const matchesDept = isDeptAllowed && (filterDept === 'All' || rec.dept === filterDept);

    const matchesMonth = filterMonth === 'All' || rec.month === filterMonth;
    const matchesYear = filterYear === 'All' || rec.year === filterYear;
    return matchesName && matchesDept && matchesMonth && matchesYear;
  });

  // Handle select all checkbox
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredRecords.map(r => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  // Handle individual checkbox change
  const handleSelectRecord = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Determine which records to print (selected ones, or all filtered ones if none selected)
  const recordsToPrint = records.filter(rec => 
    selectedIds.length > 0 ? selectedIds.includes(rec.id) : filteredRecords.map(r => r.id).includes(rec.id)
  );

  const handlePrint = () => {
    if (recordsToPrint.length === 0) {
      alert("No records to print. Adjust your filters or select records first.");
      return;
    }
    window.print();
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterDept(isAdmin ? 'All' : defaultDept);
    setFilterMonth(MONTHS[new Date().getMonth()]);
    setFilterYear(new Date().getFullYear().toString());
    setSelectedIds([]);
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = [
    String(currentYear - 1),
    String(currentYear),
    String(currentYear + 1)
  ];

  return (
    <div>
      {/* SCREEN UI */}
      <div className="no-print">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Salary Records</h2>
          <button onClick={handlePrint} style={printBtn} disabled={recordsToPrint.length === 0}>
            <Printer size={18} /> Print Slips ({recordsToPrint.length})
          </button>
        </div>

        {/* Filter Toolbar */}
        <div style={filterBar}>
          <div style={searchContainer}>
            <Search size={16} color="#888" style={{ marginLeft: '10px' }} />
            <input
              type="text"
              placeholder="Search employee name..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={searchInput}
            />
          </div>

          <div style={dropdownGroup}>
            {isAdmin && (
              <select value={filterDept} onChange={e => setFilterDept(e.target.value)} style={selectStyle}>
                <option value="All">All Shops</option>
                <option value="Rani Javuli">Rani Javuli</option>
                <option value="Rani Readymade">Rani Readymade</option>
                <option value="New Rani">New Rani</option>
              </select>
            )}

            <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={selectStyle}>
              <option value="All">All Months</option>
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>

            <select value={filterYear} onChange={e => setFilterYear(e.target.value)} style={selectStyle}>
              <option value="All">All Years</option>
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>

            <button onClick={handleResetFilters} style={resetBtn} title="Reset Filters">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {/* Records Table */}
        <div style={tableContainer}>
          {filteredRecords.length > 0 ? (
            <table style={tableStyle}>
              <thead>
                <tr style={headerRow}>
                  <th style={{ ...thStyle, width: '40px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={filteredRecords.length > 0 && selectedIds.length === filteredRecords.length}
                      onChange={handleSelectAll}
                      style={checkboxStyle}
                    />
                  </th>
                  <th style={thStyle}>EMPLOYEE</th>
                  <th style={thStyle}>SHOP</th>
                  <th style={thStyle}>PERIOD</th>
                  <th style={thStyle}>DAYS</th>
                  <th style={thStyle}>GROSS TOTAL</th>
                  <th style={thStyle}>NET SALARY</th>
                  <th style={thStyle}>REMARKS</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map(rec => {
                  const isChecked = selectedIds.includes(rec.id);
                  return (
                    <tr key={rec.id} style={{ ...trStyle, backgroundColor: isChecked ? '#1a1a1a' : 'transparent' }}>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleSelectRecord(rec.id)}
                          style={checkboxStyle}
                        />
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 'bold', color: '#fff' }}>{rec.name}</td>
                      <td style={tdStyle}>{rec.dept}</td>
                      <td style={tdStyle}>{rec.month} {rec.year}</td>
                      <td style={tdStyle}>{rec.days}</td>
                      <td style={{ ...tdStyle, color: '#b6d7a8' }}>₹{rec.gTotal}</td>
                      <td style={{ ...tdStyle, color: '#4caf50', fontWeight: 'bold' }}>₹{rec.net ?? rec.gTotal}</td>
                      <td style={tdStyle}>
                        <span style={rec.remarks === 'GOOD' ? remarkGoodTag : remarkOtherTag}>
                          {rec.remarks}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', padding: '50px', color: '#555' }}>
              No salary records found matching filters.
            </div>
          )}
        </div>
      </div>

      {/* PRINT AREA (Hidden on Screen, Visible on Print) */}
      <div className="print-only">
        {recordsToPrint.length > 0 && <SalaryReport data={recordsToPrint} />}
      </div>

      {/* Printing and print-preview layout styles */}
      <style>{`
        .print-only {
          display: none;
        }
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background-color: white !important; color: black !important; }
          nav { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; }
        }
      `}</style>
    </div>
  );
}

// Styling definitions
const filterBar = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: '#111',
  padding: '15px 20px',
  borderRadius: '8px',
  marginBottom: '20px',
  border: '1px solid #222',
  flexWrap: 'wrap',
  gap: '15px'
};

const searchContainer = {
  display: 'flex',
  alignItems: 'center',
  backgroundColor: '#000',
  border: '1px solid #333',
  borderRadius: '6px',
  flex: 1,
  minWidth: '250px'
};

const searchInput = {
  background: 'none',
  border: 'none',
  color: '#fff',
  padding: '10px',
  outline: 'none',
  width: '100%',
  fontSize: '14px'
};

const dropdownGroup = {
  display: 'flex',
  gap: '10px',
  alignItems: 'center',
  flexWrap: 'wrap'
};

const selectStyle = {
  padding: '10px 15px',
  backgroundColor: '#000',
  color: '#fff',
  border: '1px solid #333',
  borderRadius: '6px',
  cursor: 'pointer',
  outline: 'none',
  fontSize: '13px'
};

const printBtn = {
  backgroundColor: '#3d85c6',
  color: '#fff',
  border: 'none',
  padding: '12px 24px',
  borderRadius: '6px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  fontWeight: 'bold',
  transition: '0.2s opacity',
  fontSize: '14px'
};

const resetBtn = {
  padding: '10px',
  backgroundColor: '#222',
  color: '#aaa',
  border: '1px solid #333',
  borderRadius: '6px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: '0.2s background-color'
};

const tableContainer = {
  backgroundColor: '#111',
  borderRadius: '12px',
  border: '1px solid #222',
  padding: '20px',
  overflowX: 'auto'
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  textAlign: 'left'
};

const headerRow = {
  borderBottom: '2px solid #333'
};

const thStyle = {
  padding: '12px 15px',
  color: '#888',
  fontSize: '11px',
  textTransform: 'uppercase',
  fontWeight: 'bold',
  letterSpacing: '0.5px'
};

const trStyle = {
  borderBottom: '1px solid #222',
  transition: 'background-color 0.2s'
};

const tdStyle = {
  padding: '14px 15px',
  fontSize: '13px',
  color: '#ccc'
};

const checkboxStyle = {
  width: '16px',
  height: '16px',
  cursor: 'pointer',
  accentColor: '#3d85c6'
};

const remarkGoodTag = {
  backgroundColor: 'rgba(76, 175, 80, 0.1)',
  color: '#4caf50',
  padding: '4px 8px',
  borderRadius: '4px',
  fontSize: '11px',
  fontWeight: 'bold'
};

const remarkOtherTag = {
  backgroundColor: 'rgba(255, 193, 7, 0.1)',
  color: '#ffc107',
  padding: '4px 8px',
  borderRadius: '4px',
  fontSize: '11px',
  fontWeight: 'bold'
};

export default ReportPreview;