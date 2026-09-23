import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Search, Download, IndianRupee, Calendar, User, Building2, RefreshCw, FileSpreadsheet, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useToast } from '../components/Toast';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function Search360({ userPermissions }) {
  const { showToast } = useToast();

  const isAdmin = userPermissions?.depts?.length > 1;
  const defaultDept = userPermissions?.depts?.[0] || 'Rani Javuli';

  // Raw fetched data
  const [employees, setEmployees] = useState([]);
  const [salaryRecords, setSalaryRecords] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedPerson, setSelectedPerson] = useState('All'); // 'All' or emp.id or emp.employeeId
  const [selectedMonth, setSelectedMonth] = useState('All'); // 'All' or month name e.g. 'August'
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString()); // 'All' or '2026'
  const [selectedDept, setSelectedDept] = useState(isAdmin ? 'All' : defaultDept);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'salary' | 'advance'

  // 1. Fetch Employees
  useEffect(() => {
    if (!userPermissions || !userPermissions.depts || userPermissions.depts.length === 0) return;
    const q = query(
      collection(db, "employees"),
      where("dept", "in", userPermissions.depts)
    );
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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

  // 2. Fetch Salary Records
  useEffect(() => {
    if (!userPermissions || !userPermissions.depts || userPermissions.depts.length === 0) return;
    const q = query(
      collection(db, "salary_records"),
      where("dept", "in", userPermissions.depts)
    );
    return onSnapshot(q, (snap) => {
      setSalaryRecords(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      showToast("Error loading salary records: " + err.message, 'error');
    });
  }, [userPermissions, showToast]);

  // 3. Fetch Advances
  useEffect(() => {
    if (!userPermissions || !userPermissions.depts || userPermissions.depts.length === 0) return;
    const q = query(
      collection(db, "advances"),
      where("dept", "in", userPermissions.depts)
    );
    return onSnapshot(q, (snap) => {
      setAdvances(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      showToast("Error loading advances: " + err.message, 'error');
      setLoading(false);
    });
  }, [userPermissions, showToast]);

  // Employee fast lookup maps
  const empById = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);
  // eslint-disable-next-line no-unused-vars
  const empByCode = useMemo(() => {
    const map = new Map();
    employees.forEach(e => {
      if (e.employeeId) map.set(e.employeeId.toUpperCase(), e);
    });
    return map;
  }, [employees]);

  // Helper to extract month name and year from advance YYYY-MM-DD
  const parseAdvanceDate = (dateStr) => {
    if (!dateStr) return { monthName: '', year: '' };
    const parts = dateStr.split('-');
    if (parts.length < 2) return { monthName: '', year: '' };
    const y = parts[0];
    const mNum = parseInt(parts[1], 10);
    const mName = (mNum >= 1 && mNum <= 12) ? MONTHS[mNum - 1] : '';
    return { monthName: mName, year: y };
  };

  // Filtered Salary Records
  const filteredSalaries = useMemo(() => {
    return salaryRecords.filter(rec => {
      if (rec.isDeleted) return false;

      // Dept filter
      if (selectedDept !== 'All' && rec.dept !== selectedDept) return false;

      // Month filter
      if (selectedMonth !== 'All' && rec.month !== selectedMonth) return false;

      // Year filter
      if (selectedYear !== 'All' && rec.year !== selectedYear) return false;

      // Person filter
      if (selectedPerson !== 'All') {
        const matchesDocId = rec.employeeId && rec.employeeId === selectedPerson;
        const matchesCode = rec.employeeCode && (rec.employeeCode === selectedPerson || empById.get(selectedPerson)?.employeeId === rec.employeeCode);
        const matchesName = empById.get(selectedPerson)?.name && rec.name && empById.get(selectedPerson).name.toUpperCase() === rec.name.toUpperCase();
        if (!matchesDocId && !matchesCode && !matchesName) return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const code = (rec.employeeCode || empById.get(rec.employeeId)?.employeeId || '').toLowerCase();
        const name = (rec.name || '').toLowerCase();
        const remarks = (rec.remarks || '').toLowerCase();
        if (!code.includes(term) && !name.includes(term) && !remarks.includes(term)) return false;
      }

      return true;
    });
  }, [salaryRecords, selectedDept, selectedMonth, selectedYear, selectedPerson, searchTerm, empById]);

  // Filtered Advances
  const filteredAdvances = useMemo(() => {
    return advances.filter(adv => {
      if (adv.isDeleted) return false;

      // Dept filter
      if (selectedDept !== 'All' && adv.dept !== selectedDept) return false;

      const { monthName, year } = parseAdvanceDate(adv.date);

      // Month filter
      if (selectedMonth !== 'All' && monthName !== selectedMonth) return false;

      // Year filter
      if (selectedYear !== 'All' && year !== selectedYear) return false;

      // Person filter
      if (selectedPerson !== 'All') {
        const matchesDocId = adv.employeeId && adv.employeeId === selectedPerson;
        const matchesCode = adv.employeeCode && (adv.employeeCode === selectedPerson || empById.get(selectedPerson)?.employeeId === adv.employeeCode);
        const matchesName = empById.get(selectedPerson)?.name && adv.employeeName && empById.get(selectedPerson).name.toUpperCase() === adv.employeeName.toUpperCase();
        if (!matchesDocId && !matchesCode && !matchesName) return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const code = (adv.employeeCode || empById.get(adv.employeeId)?.employeeId || '').toLowerCase();
        const name = (adv.employeeName || '').toLowerCase();
        const notes = (adv.notes || '').toLowerCase();
        if (!code.includes(term) && !name.includes(term) && !notes.includes(term)) return false;
      }

      return true;
    });
  }, [advances, selectedDept, selectedMonth, selectedYear, selectedPerson, searchTerm, empById]);

  // Combined records for 360 View
  const combinedRecords = useMemo(() => {
    const list = [];

    // Map Salaries
    filteredSalaries.forEach(s => {
      const code = s.employeeCode || empById.get(s.employeeId)?.employeeId || '—';
      list.push({
        id: 'sal_' + s.id,
        rawId: s.id,
        type: 'SALARY',
        dateOrPeriod: `${s.month} ${s.year}`,
        sortDate: `${s.year}-${String(MONTHS.indexOf(s.month) + 1).padStart(2, '0')}-01`,
        employeeCode: code,
        employeeName: s.name,
        dept: s.dept,
        days: s.days || 0,
        rateOrBase: s.baseSalary || 0,
        payType: s.salaryType === 'monthly' || Number(s.baseSalary) > 1500 ? 'Monthly' : 'Daily',
        salaryGross: Number(s.gTotal) || 0,
        salaryNet: Number(s.net ?? s.gTotal ?? 0),
        advanceAmount: Number(s.advance) || 0,
        details: `Days: ${s.days || 0} | Base: ₹${s.baseSalary || 0} | Fixed: ₹${s.fixedEarnings || 0}`,
        notesOrRemarks: s.remarks || 'GOOD',
        raw: s
      });
    });

    // Map Advances
    filteredAdvances.forEach(a => {
      const code = a.employeeCode || empById.get(a.employeeId)?.employeeId || '—';
      list.push({
        id: 'adv_' + a.id,
        rawId: a.id,
        type: 'ADVANCE',
        dateOrPeriod: a.date || '—',
        sortDate: a.date || '0000-00-00',
        employeeCode: code,
        employeeName: a.employeeName,
        dept: a.dept,
        days: null,
        rateOrBase: null,
        payType: null,
        salaryGross: null,
        salaryNet: null,
        advanceAmount: Number(a.amount) || 0,
        details: 'Cash Advance Drawn',
        notesOrRemarks: a.notes || '—',
        raw: a
      });
    });

    // Sort descending by date
    list.sort((a, b) => b.sortDate.localeCompare(a.sortDate));
    return list;
  }, [filteredSalaries, filteredAdvances, empById]);

  // Display records based on active tab
  const displayRecords = useMemo(() => {
    if (activeTab === 'salary') return combinedRecords.filter(r => r.type === 'SALARY');
    if (activeTab === 'advance') return combinedRecords.filter(r => r.type === 'ADVANCE');
    return combinedRecords;
  }, [activeTab, combinedRecords]);

  // Summary KPIs
  const totalNetSalary = useMemo(() => {
    return filteredSalaries.reduce((sum, s) => sum + (Number(s.net ?? s.gTotal ?? 0)), 0);
  }, [filteredSalaries]);

  const totalAdvancesGiven = useMemo(() => {
    return filteredAdvances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
  }, [filteredAdvances]);

  const totalAdvanceDeductedInSalaries = useMemo(() => {
    return filteredSalaries.reduce((sum, s) => sum + (Number(s.advance) || 0), 0);
  }, [filteredSalaries]);

  // Export to CSV
  const handleExportCSV = () => {
    if (displayRecords.length === 0) {
      showToast("No matching records to export. Adjust filters first.", "warning");
      return;
    }

    const headers = [
      "Record Type",
      "Date / Period",
      "Employee ID",
      "Employee Name",
      "Shop / Dept",
      "Days Worked",
      "Pay Type",
      "Base Rate",
      "Gross Salary (INR)",
      "Net Salary Paid (INR)",
      "Advance Amount (INR)",
      "Details",
      "Notes / Remarks"
    ];

    const rows = displayRecords.map(r => [
      `"${r.type}"`,
      `"${r.dateOrPeriod}"`,
      `"${r.employeeCode.replace(/"/g, '""')}"`,
      `"${(r.employeeName || '').replace(/"/g, '""')}"`,
      `"${(r.dept || '').replace(/"/g, '""')}"`,
      r.days !== null ? r.days : '',
      `"${r.payType || ''}"`,
      r.rateOrBase !== null ? r.rateOrBase : '',
      r.salaryGross !== null ? r.salaryGross : '',
      r.salaryNet !== null ? r.salaryNet : '',
      r.advanceAmount !== null ? r.advanceAmount : '',
      `"${(r.details || '').replace(/"/g, '""')}"`,
      `"${(r.notesOrRemarks || '').replace(/"/g, '""')}"`
    ]);

    const csvString = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);

    const empLabel = selectedPerson === 'All' ? 'All' : (empById.get(selectedPerson)?.employeeId || 'Emp');
    const monthLabel = selectedMonth === 'All' ? 'All' : selectedMonth;
    const yearLabel = selectedYear === 'All' ? 'All' : selectedYear;
    link.setAttribute("download", `360_Report_${empLabel}_${monthLabel}_${yearLabel}.csv`);

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Exported ${displayRecords.length} records to CSV!`, "success");
  };

  const handleResetFilters = () => {
    setSelectedPerson('All');
    setSelectedMonth('All');
    setSelectedYear(new Date().getFullYear().toString());
    setSelectedDept(isAdmin ? 'All' : defaultDept);
    setSearchTerm('');
    setActiveTab('all');
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = [
    String(currentYear - 1),
    String(currentYear),
    String(currentYear + 1)
  ];

  return (
    <div>
      {/* PAGE HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', color: '#0f172a', fontWeight: '800', fontSize: '24px' }}>
            <FileSpreadsheet size={24} color="#2563eb" />
            360° Search: Salary & Advances
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>
            Unified lookup across historical payroll and cash advances for any employee, month, or department
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button onClick={handleResetFilters} style={resetBtn} title="Reset all filters">
            <RefreshCw size={15} /> Reset
          </button>
          <button
            onClick={handleExportCSV}
            disabled={displayRecords.length === 0}
            style={{
              ...exportBtn,
              opacity: displayRecords.length === 0 ? 0.5 : 1,
              cursor: displayRecords.length === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            <Download size={16} /> Export CSV ({displayRecords.length})
          </button>
        </div>
      </div>

      {/* FILTER TOOLBAR */}
      <div style={filterBar}>
        {/* Search Bar */}
        <div style={searchContainer}>
          <Search size={16} color="#64748b" style={{ marginLeft: '12px' }} />
          <input
            type="text"
            placeholder="Search by Employee ID, Name, or Notes..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={searchInput}
          />
        </div>

        <div style={dropdownGroup}>
          {/* Shop Selector */}
          {isAdmin && (
            <div style={filterItem}>
              <Building2 size={15} color="#64748b" />
              <select value={selectedDept} onChange={e => setSelectedDept(e.target.value)} style={selectStyle}>
                <option value="All" style={optionStyle}>All Shops</option>
                <option value="Rani Javuli" style={optionStyle}>Rani Javuli</option>
                <option value="Rani Readymade" style={optionStyle}>Rani Readymade</option>
                <option value="New Rani" style={optionStyle}>New Rani</option>
              </select>
            </div>
          )}

          {/* Specific Person / Employee Selector */}
          <div style={filterItem}>
            <User size={15} color="#64748b" />
            <select value={selectedPerson} onChange={e => setSelectedPerson(e.target.value)} style={selectStyle}>
              <option value="All" style={optionStyle}>All Employees</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id} style={optionStyle}>
                  {emp.employeeId ? `[${emp.employeeId}] ` : ''}{emp.name} ({emp.dept})
                </option>
              ))}
            </select>
          </div>

          {/* Month Selector */}
          <div style={filterItem}>
            <Calendar size={15} color="#64748b" />
            <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={selectStyle}>
              <option value="All" style={optionStyle}>All Months</option>
              {MONTHS.map(m => (
                <option key={m} value={m} style={optionStyle}>{m}</option>
              ))}
            </select>
          </div>

          {/* Year Selector */}
          <div style={filterItem}>
            <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} style={selectStyle}>
              <option value="All" style={optionStyle}>All Years</option>
              {yearOptions.map(y => (
                <option key={y} value={y} style={optionStyle}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div style={metricsGrid}>
        <div style={metricCard}>
          <div style={metricHeader}>
            <span style={metricTitle}>NET SALARY PAID</span>
            <div style={{ padding: '6px', borderRadius: '6px', backgroundColor: '#f0fdf4' }}>
              <ArrowUpRight size={18} color="#16a34a" />
            </div>
          </div>
          <div style={{ ...metricValue, color: '#16a34a' }}>
            ₹{totalNetSalary.toLocaleString('en-IN')}
          </div>
          <div style={metricSub}>Across {filteredSalaries.length} salary slip(s)</div>
        </div>

        <div style={metricCard}>
          <div style={metricHeader}>
            <span style={metricTitle}>TOTAL ADVANCES GIVEN</span>
            <div style={{ padding: '6px', borderRadius: '6px', backgroundColor: '#fef2f2' }}>
              <ArrowDownRight size={18} color="#ef4444" />
            </div>
          </div>
          <div style={{ ...metricValue, color: '#ef4444' }}>
            ₹{totalAdvancesGiven.toLocaleString('en-IN')}
          </div>
          <div style={metricSub}>Across {filteredAdvances.length} advance record(s)</div>
        </div>

        <div style={metricCard}>
          <div style={metricHeader}>
            <span style={metricTitle}>ADVANCE DEDUCTED IN SALARY</span>
            <div style={{ padding: '6px', borderRadius: '6px', backgroundColor: '#fffbeb' }}>
              <IndianRupee size={18} color="#d97706" />
            </div>
          </div>
          <div style={{ ...metricValue, color: '#d97706' }}>
            ₹{totalAdvanceDeductedInSalaries.toLocaleString('en-IN')}
          </div>
          <div style={metricSub}>Recovered from payroll</div>
        </div>

        <div style={metricCard}>
          <div style={metricHeader}>
            <span style={metricTitle}>TOTAL 360 RECORDS</span>
            <div style={{ padding: '6px', borderRadius: '6px', backgroundColor: '#eff6ff' }}>
              <FileSpreadsheet size={18} color="#2563eb" />
            </div>
          </div>
          <div style={{ ...metricValue, color: '#2563eb' }}>
            {combinedRecords.length}
          </div>
          <div style={metricSub}>{filteredSalaries.length} Salaries + {filteredAdvances.length} Advances</div>
        </div>
      </div>

      {/* VIEW TABS */}
      <div style={tabBar}>
        <button
          onClick={() => setActiveTab('all')}
          style={{
            ...tabButton,
            borderBottom: activeTab === 'all' ? '2px solid #0f172a' : '2px solid transparent',
            color: activeTab === 'all' ? '#0f172a' : '#64748b'
          }}
        >
          All Records ({combinedRecords.length})
        </button>
        <button
          onClick={() => setActiveTab('salary')}
          style={{
            ...tabButton,
            borderBottom: activeTab === 'salary' ? '2px solid #16a34a' : '2px solid transparent',
            color: activeTab === 'salary' ? '#166534' : '#64748b'
          }}
        >
          Salary Slips ({filteredSalaries.length})
        </button>
        <button
          onClick={() => setActiveTab('advance')}
          style={{
            ...tabButton,
            borderBottom: activeTab === 'advance' ? '2px solid #ef4444' : '2px solid transparent',
            color: activeTab === 'advance' ? '#b91c1c' : '#64748b'
          }}
        >
          Advance Records ({filteredAdvances.length})
        </button>
      </div>

      {/* UNIFIED 360 TABLE */}
      <div style={tableContainer}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px', color: '#64748b' }}>Loading records…</div>
        ) : displayRecords.length > 0 ? (
          <table style={tableStyle}>
            <thead>
              <tr style={headerRow}>
                <th style={thStyle}>TYPE</th>
                <th style={thStyle}>DATE / PERIOD</th>
                <th style={thStyle}>EMP ID</th>
                <th style={thStyle}>NAME</th>
                <th style={thStyle}>SHOP</th>
                <th style={thStyle}>PAY RATE / DAYS</th>
                <th style={thStyle}>NET SALARY</th>
                <th style={thStyle}>ADVANCE</th>
                <th style={thStyle}>DETAILS & REMARKS</th>
              </tr>
            </thead>
            <tbody>
              {displayRecords.map(rec => {
                const isSalary = rec.type === 'SALARY';
                return (
                  <tr key={rec.id} style={trStyle}>
                    {/* TYPE BADGE */}
                    <td style={tdStyle}>
                      <span style={{
                        ...typeBadge,
                        backgroundColor: isSalary ? '#f0fdf4' : '#fef2f2',
                        color: isSalary ? '#166534' : '#b91c1c',
                        borderColor: isSalary ? '#bbf7d0' : '#fecaca'
                      }}>
                        {rec.type}
                      </span>
                    </td>

                    {/* DATE / PERIOD */}
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap', fontWeight: '600' }}>
                      {rec.dateOrPeriod}
                    </td>

                    {/* EMPLOYEE ID */}
                    <td style={{ ...tdStyle, color: '#2563eb', fontFamily: 'monospace', fontWeight: '700' }}>
                      {rec.employeeCode}
                    </td>

                    {/* NAME */}
                    <td style={{ ...tdStyle, color: '#0f172a', fontWeight: '600', whiteSpace: 'nowrap' }}>
                      {rec.employeeName}
                    </td>

                    {/* SHOP */}
                    <td style={{ ...tdStyle, color: '#64748b', fontSize: '12px' }}>
                      {rec.dept}
                    </td>

                    {/* RATE / DAYS */}
                    <td style={tdStyle}>
                      {isSalary ? (
                        <div>
                          <div style={{ color: '#334155', fontWeight: '500' }}>₹{rec.rateOrBase} <span style={{ fontSize: '10px', color: '#64748b' }}>({rec.payType})</span></div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{rec.days} days worked</div>
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>—</span>
                      )}
                    </td>

                    {/* NET SALARY */}
                    <td style={{ ...tdStyle, fontWeight: '700' }}>
                      {isSalary ? (
                        <span style={{ color: '#16a34a' }}>₹{rec.salaryNet.toLocaleString('en-IN')}</span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>—</span>
                      )}
                    </td>

                    {/* ADVANCE */}
                    <td style={{ ...tdStyle, fontWeight: '700' }}>
                      {rec.advanceAmount > 0 ? (
                        <span style={{ color: isSalary ? '#d97706' : '#ef4444' }}>
                          ₹{rec.advanceAmount.toLocaleString('en-IN')}
                          {isSalary && <span style={{ fontSize: '10px', color: '#64748b', display: 'block', fontWeight: 'normal' }}>deducted</span>}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>₹0</span>
                      )}
                    </td>

                    {/* DETAILS & REMARKS */}
                    <td style={{ ...tdStyle, maxWidth: '240px' }}>
                      <div style={{ color: '#334155', fontSize: '12px' }}>{rec.details}</div>
                      <div style={{ color: '#64748b', fontSize: '11px', fontStyle: 'italic', marginTop: '2px' }}>
                        {rec.notesOrRemarks}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
            <p style={{ fontSize: '16px', margin: '0 0 8px 0', fontWeight: '600', color: '#334155' }}>No records found matching the selected filters.</p>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
              Try clearing search filters or changing the month, employee, or department above.
            </p>
          </div>
        )}
      </div>
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
  flex: '1 1 280px',
  minWidth: '220px'
};

const searchInput = {
  background: 'none',
  border: 'none',
  padding: '10px 12px',
  color: '#0f172a',
  width: '100%',
  outline: 'none',
  fontSize: '13px'
};

const dropdownGroup = {
  display: 'flex',
  gap: '10px',
  alignItems: 'center',
  flexWrap: 'wrap'
};

const filterItem = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  backgroundColor: '#ffffff',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  padding: '0 10px'
};

const selectStyle = {
  backgroundColor: 'transparent',
  color: '#0f172a',
  border: 'none',
  padding: '9px 4px',
  fontSize: '13px',
  outline: 'none',
  cursor: 'pointer'
};

const optionStyle = {
  backgroundColor: '#ffffff',
  color: '#0f172a'
};

const resetBtn = {
  backgroundColor: '#ffffff',
  color: '#64748b',
  border: '1px solid #cbd5e1',
  padding: '9px 16px',
  borderRadius: '8px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  fontSize: '13px'
};

const exportBtn = {
  backgroundColor: '#0f172a',
  color: '#ffffff',
  border: 'none',
  padding: '9px 18px',
  borderRadius: '8px',
  fontWeight: '600',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '13px',
  boxShadow: '0 2px 4px rgba(15, 23, 42, 0.15)'
};

const metricsGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '16px',
  marginBottom: '22px'
};

const metricCard = {
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '14px',
  padding: '18px 20px',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
};

const metricHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '8px'
};

const metricTitle = {
  fontSize: '11px',
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.6px',
  fontWeight: '700'
};

const metricValue = {
  fontSize: '24px',
  fontWeight: '800',
  marginBottom: '4px'
};

const metricSub = {
  fontSize: '12px',
  color: '#64748b'
};

const tabBar = {
  display: 'flex',
  gap: '15px',
  borderBottom: '1px solid #e2e8f0',
  marginBottom: '16px'
};

const tabButton = {
  background: 'none',
  border: 'none',
  padding: '10px 15px',
  fontSize: '14px',
  fontWeight: '700',
  cursor: 'pointer',
  transition: '0.2s'
};

const tableContainer = {
  backgroundColor: '#ffffff',
  borderRadius: '14px',
  border: '1px solid #e2e8f0',
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
  letterSpacing: '0.5px',
  fontWeight: '700'
};

const trStyle = {
  borderBottom: '1px solid #f1f5f9',
  transition: 'background-color 0.15s'
};

const tdStyle = {
  padding: '13px 16px',
  fontSize: '13px',
  color: '#334155',
  verticalAlign: 'middle'
};

const typeBadge = {
  display: 'inline-block',
  padding: '3px 8px',
  borderRadius: '6px',
  fontSize: '10px',
  fontWeight: '700',
  letterSpacing: '0.5px',
  border: '1px solid'
};

export default Search360;
