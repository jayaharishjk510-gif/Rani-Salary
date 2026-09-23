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

    const term = searchTerm.toLowerCase().trim();
    const matchesSearch = !term ||
      (rec.name && rec.name.toLowerCase().includes(term)) ||
      (rec.employeeCode && rec.employeeCode.toLowerCase().includes(term));
    
    // Security: Limit data matching to allowed departments
    const isDeptAllowed = userPermissions?.depts?.includes(rec.dept);
    const matchesDept = isDeptAllowed && (filterDept === 'All' || rec.dept === filterDept);

    const matchesMonth = filterMonth === 'All' || rec.month === filterMonth;
    const matchesYear = filterYear === 'All' || rec.year === filterYear;
    return matchesSearch && matchesDept && matchesMonth && matchesYear;
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
      "Employee ID",
      "Employee Name",
      "Shop",
      "Month",
      "Year",
      "Days Worked",
      "Pay Type",
      "Rate / Salary",
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
      `"${(r.employeeCode || '').replace(/"/g, '""')}"`,
      `"${(r.name || '').replace(/"/g, '""')}"`,
      `"${(r.dept || '').replace(/"/g, '""')}"`,
      `"${r.month || ''}"`,
      `"${r.year || ''}"`,
      Number(r.days) || 0,
      `"${r.salaryType === 'monthly' || Number(r.baseSalary) > 1500 ? 'Monthly' : 'Daily'}"`,
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
            <h2 style={{ margin: 0, color: '#0f172a', fontWeight: '800', fontSize: '24px' }}>Salary Records</h2>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>
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
            <Search size={16} color="#64748b" style={{ marginLeft: '12px' }} />
            <input
              type="text"
              placeholder="Search by ID or name..."
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
                  <th style={thStyle}>EMP ID</th>
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
                    <tr key={rec.id} style={{ ...trStyle, backgroundColor: isChecked ? '#f0fdf4' : 'transparent' }}>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleSelectRecord(rec.id)}
                          style={checkboxStyle}
                        />
                      </td>
                      <td style={{ ...tdStyle, color: '#2563eb', fontFamily: 'monospace', fontSize: '12px', fontWeight: '600' }}>
                        {rec.employeeCode || '—'}
                      </td>
                      <td style={{ ...tdStyle, fontWeight: '600', color: '#0f172a' }}>{rec.name}</td>
                      <td style={tdStyle}>{rec.dept}</td>
                      <td style={tdStyle}>{rec.month} {rec.year}</td>
                      <td style={tdStyle}>{rec.days}</td>
                      <td style={{ ...tdStyle, color: '#0f172a' }}>₹{rec.gTotal}</td>
                      <td style={{ ...tdStyle, color: '#16a34a', fontWeight: '700' }}>₹{rec.net ?? rec.gTotal}</td>
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
            <div style={{ textAlign: 'center', padding: '50px', color: '#64748b' }}>
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
          @page {
            size: A4 portrait;
            margin: 5mm 6mm;
          }
          .no-print { display: none !important; }
          .print-only {
            display: block !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          body, html {
            background-color: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }
          nav { display: none !important; }
          main {
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            display: block !important;
          }
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
  backgroundColor: '#ffffff',
  padding: '16px 20px',
  borderRadius: '14px',
  marginBottom: '22px',
  border: '1px solid #e2e8f0',
  flexWrap: 'wrap',
  gap: '15px',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
};

const searchContainer = {
  display: 'flex',
  alignItems: 'center',
  backgroundColor: '#ffffff',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  flex: 1,
  minWidth: '250px'
};

const searchInput = {
  background: 'none',
  border: 'none',
  color: '#0f172a',
  padding: '10px 12px',
  outline: 'none',
  width: '100%',
  fontSize: '13px'
};

const dropdownGroup = {
  display: 'flex',
  gap: '10px',
  alignItems: 'center',
  flexWrap: 'wrap'
};

const selectStyle = {
  padding: '10px 14px',
  backgroundColor: '#ffffff',
  color: '#0f172a',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  cursor: 'pointer',
  outline: 'none',
  fontSize: '13px',
  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)'
};

const printBtn = {
  backgroundColor: '#2563eb',
  color: '#ffffff',
  border: 'none',
  padding: '10px 20px',
  borderRadius: '8px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontWeight: '700',
  transition: '0.2s opacity',
  fontSize: '13px',
  boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
};

const exportBtn = {
  backgroundColor: '#ffffff',
  color: '#334155',
  border: '1px solid #cbd5e1',
  padding: '10px 18px',
  borderRadius: '8px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontWeight: '600',
  transition: '0.2s background-color',
  fontSize: '13px',
  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)'
};

const resetBtn = {
  padding: '10px',
  backgroundColor: '#ffffff',
  color: '#64748b',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: '0.2s background-color'
};

const tableContainer = {
  backgroundColor: '#ffffff',
  borderRadius: '14px',
  border: '1px solid #e2e8f0',
  padding: '22px',
  overflowX: 'auto',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  textAlign: 'left'
};

const headerRow = {
  borderBottom: '1px solid #e2e8f0',
  backgroundColor: '#f8fafc'
};

const thStyle = {
  padding: '12px 16px',
  color: '#64748b',
  fontSize: '11px',
  textTransform: 'uppercase',
  fontWeight: '700',
  letterSpacing: '0.5px'
};

const trStyle = {
  borderBottom: '1px solid #f1f5f9',
  transition: 'background-color 0.15s'
};

const tdStyle = {
  padding: '14px 16px',
  fontSize: '13px',
  color: '#334155'
};

const checkboxStyle = {
  width: '16px',
  height: '16px',
  cursor: 'pointer',
  accentColor: '#16a34a'
};

const remarkGoodTag = {
  backgroundColor: '#f0fdf4',
  color: '#166534',
  border: '1px solid #bbf7d0',
  padding: '3px 8px',
  borderRadius: '6px',
  fontSize: '11px',
  fontWeight: '700'
};

const remarkOtherTag = {
  backgroundColor: '#fffbeb',
  color: '#b45309',
  border: '1px solid #fde68a',
  padding: '3px 8px',
  borderRadius: '6px',
  fontSize: '11px',
  fontWeight: '700'
};

export default ReportPreview;