import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import SalaryReport from '../SalaryReport';
import { Printer, Search, RefreshCw, Download } from 'lucide-react';
import { useToast } from '../components/Toast';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function ReportPreview({ userPermissions }) {
  const { showToast } = useToast();
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

  // Fetch allowed salary records with optimized query
  useEffect(() => {
    if (!userPermissions || !userPermissions.depts) return;

    // Dynamically build query constraints to prevent unbounded reads
    const constraints = [
      where("dept", "in", userPermissions.depts)
    ];

    if (filterYear !== 'All') {
      constraints.push(where("year", "==", filterYear));
    }
    if (filterMonth !== 'All') {
      constraints.push(where("month", "==", filterMonth));
    }

    const q = query(
      collection(db, "salary_records"),
      ...constraints
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.error("Firestore query error:", err);
      showToast("Error loading records: " + err.message, 'error');
    });

    return unsub;
  }, [userPermissions, filterYear, filterMonth, showToast]);

  // Filter records client-side for search and shop filtering, excluding soft-deleted records
  const filteredRecords = records.filter(rec => {
    // Exclude soft-deleted / archived records
    if (rec.isDeleted) return false;

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

  // Determine which records to print / export
  const recordsToPrint = records
    .filter(rec => !rec.isDeleted)
    .filter(rec => selectedIds.length > 0 ? selectedIds.includes(rec.id) : filteredRecords.map(r => r.id).includes(rec.id));

  const handlePrint = () => {
    if (recordsToPrint.length === 0) {
      showToast("No records to print. Adjust your filters or select records first.", 'warning');
      return;
    }
    window.print();
  };

  // Export filtered or selected records to CSV
  const handleExportCSV = () => {
    if (recordsToPrint.length === 0) {
      showToast("No salary records to export. Adjust your filters first.", 'warning');
      return;
    }

    const headers = [
      "Employee Name",
      "Shop",
      "Month",
      "Year",
      "Days Worked",
      "Daily Rate",
      "Fixed Earnings",
      "Incentive",
      "L.Bonus",
      "TS Allowance",
      "RD Addition",
      "PF Deduction",
      "Advance Deduction",
      "J.Balance",
      "Penalty",
      "RD Deduction",
      "Gross Total",
      "Net Salary",
      "Remarks"
    ];

    const rows = recordsToPrint.map(r => [
      `"${(r.name || '').replace(/"/g, '""')}"`,
      `"${(r.dept || '').replace(/"/g, '""')}"`,
      `"${r.month || ''}"`,
      `"${r.year || ''}"`,
      Number(r.days) || 0,
      Number(r.baseSalary) || 0,
      Number(r.fixedEarnings) || 0,
      Number(r.incentive ?? r.insentive ?? 0),
      Number(r.lBonus) || 0,
      Number(r.ts) || 0,
      Number(r.rdAdd) || 0,
      Number(r.pf) || 0,
      Number(r.advance) || 0,
      Number(r.jBalance) || 0,
      Number(r.penalty) || 0,
      Number(r.rdDed) || 0,
      Number(r.gTotal) || 0,
      Number(r.net ?? r.gTotal ?? 0),
      `"${(r.remarks || 'GOOD').replace(/"/g, '""')}"`
    ]);

    const csvString = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Salary_Records_${filterMonth}_${filterYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Exported ${recordsToPrint.length} salary records to CSV!`, 'success');
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h2 style={{ margin: 0 }}>Salary Records</h2>
            <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: '13px' }}>
              Filter, search, print salary slips, and export to spreadsheets
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={handleExportCSV}
              style={exportBtn}
              disabled={recordsToPrint.length === 0}
              title="Export visible records to Excel/CSV"
            >
              <Download size={18} /> Export CSV ({recordsToPrint.length})
            </button>
            <button
              onClick={handlePrint}
              style={printBtn}
              disabled={recordsToPrint.length === 0}
              title="Print 6-per-sheet slips"
            >
              <Printer size={18} /> Print Slips ({recordsToPrint.length})
            </button>
          </div>
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
            <div style={{ textAlign: 'center', padding: '50px', color: '#666' }}>
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
  padding: '10px 20px',
  borderRadius: '6px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontWeight: 'bold',
  transition: '0.2s opacity',
  fontSize: '13px'
};

const exportBtn = {
  backgroundColor: '#222',
  color: '#fff',
  border: '1px solid #333',
  padding: '10px 18px',
  borderRadius: '6px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontWeight: '600',
  transition: '0.2s background-color',
  fontSize: '13px'
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