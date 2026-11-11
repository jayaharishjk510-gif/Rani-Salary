import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Search, Download, Calendar, User, Building2, RefreshCw, FileSpreadsheet, ArrowUpRight, ArrowDownRight, X, ArrowRight } from 'lucide-react';
import { useToast } from '../components/Toast';
import { MONTHS, parseDateToMonthYear as parseAdvanceDate } from '../utils/dateUtils';

// Helper to highlight matching text in search suggestions
function HighlightMatch({ text, query }) {
  if (!text) return null;
  if (!query || !query.trim()) return <span>{text}</span>;

  const q = query.trim().toLowerCase();
  const lower = text.toLowerCase();
  const index = lower.indexOf(q);

  if (index === -1) return <span>{text}</span>;

  const before = text.substring(0, index);
  const matched = text.substring(index, index + q.length);
  const after = text.substring(index + q.length);

  return (
    <span>
      {before}
      <span style={{ backgroundColor: '#fef08a', color: '#854d0e', fontWeight: '700', borderRadius: '2px', padding: '0 1px' }}>
        {matched}
      </span>
      {after}
    </span>
  );
}

function Search360({ userPermissions }) {
  const { showToast } = useToast();

  const isAdmin = userPermissions?.depts?.length > 1;
  const defaultDept = userPermissions?.depts?.[0] || 'Rani Javuli';

  // Raw fetched data
  const [employees, setEmployees] = useState([]);
  const [salaryRecords, setSalaryRecords] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [loading, setLoading] = useState(true);

  const currentMonthName = MONTHS[new Date().getMonth()];
  const currentYear = new Date().getFullYear().toString();

  // Filters
  const [selectedPerson, setSelectedPerson] = useState('All'); // 'All' or emp.id or emp.employeeId
  const [selectedMonth, setSelectedMonth] = useState(currentMonthName); // Default to this month
  const [selectedYear, setSelectedYear] = useState(currentYear); // Default to this year
  const [selectedDept, setSelectedDept] = useState(isAdmin ? 'All' : defaultDept);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'salary' | 'advance'

  // Search suggestions states
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const searchWrapperRef = useRef(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    setSelectedMonth(MONTHS[new Date().getMonth()]);
    setSelectedYear(new Date().getFullYear().toString());
    setSelectedDept(isAdmin ? 'All' : defaultDept);
    setSearchTerm('');
    setShowSuggestions(false);
    setActiveTab('all');
  };

  // Dynamic suggestions for Search360
  const suggestions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return [];

    const list = [];
    const seen = new Set();

    employees.forEach(emp => {
      if (emp.isDeleted) return;
      const empCode = emp.employeeId || '';
      const name = emp.name || '';
      const dept = emp.dept || '';
      const key = (empCode + '__' + name).toLowerCase();
      if (seen.has(key)) return;

      const nameMatch = name.toLowerCase().includes(term);
      const codeMatch = empCode.toLowerCase().includes(term);
      const deptMatch = dept.toLowerCase().includes(term);

      if (nameMatch || codeMatch || deptMatch) {
        seen.add(key);
        const empSalaries = salaryRecords.filter(s => !s.isDeleted && (
          s.employeeId === emp.id ||
          (s.employeeCode && empCode && s.employeeCode.toUpperCase() === empCode.toUpperCase()) ||
          (s.name && name && s.name.toUpperCase() === name.toUpperCase())
        ));
        const empAdvances = advances.filter(a => !a.isDeleted && (
          a.employeeId === emp.id ||
          (a.employeeCode && empCode && a.employeeCode.toUpperCase() === empCode.toUpperCase()) ||
          (a.employeeName && name && a.employeeName.toUpperCase() === name.toUpperCase())
        ));

        list.push({
          id: emp.id,
          employeeId: empCode,
          name: name,
          dept: dept,
          salaryCount: empSalaries.length,
          advanceCount: empAdvances.length
        });
      }
    });

    list.sort((a, b) => {
      const aExact = a.employeeId.toLowerCase() === term || a.name.toLowerCase() === term;
      const bExact = b.employeeId.toLowerCase() === term || b.name.toLowerCase() === term;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      const aStarts = a.name.toLowerCase().startsWith(term) || a.employeeId.toLowerCase().startsWith(term);
      const bStarts = b.name.toLowerCase().startsWith(term) || b.employeeId.toLowerCase().startsWith(term);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;

      return (b.salaryCount + b.advanceCount) - (a.salaryCount + a.advanceCount);
    });

    return list.slice(0, 8);
  }, [searchTerm, employees, salaryRecords, advances]);

  const handleSelectSuggestion = (suggestion) => {
    setSelectedPerson(suggestion.id);
    setSearchTerm(suggestion.name);
    setShowSuggestions(false);
    setActiveSuggestionIndex(-1);
    showToast(`Filtered for ${suggestion.name}`, 'info');
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (activeSuggestionIndex >= 0 && activeSuggestionIndex < suggestions.length) {
        e.preventDefault();
        handleSelectSuggestion(suggestions[activeSuggestionIndex]);
      } else if (suggestions.length > 0) {
        e.preventDefault();
        handleSelectSuggestion(suggestions[0]);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setActiveSuggestionIndex(-1);
    }
  };

  const yearOptions = [
    String(Number(currentYear) - 1),
    String(currentYear),
    String(Number(currentYear) + 1)
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
        {/* Search Bar with Suggestions */}
        <div ref={searchWrapperRef} style={{ position: 'relative', flex: '1 1 280px', minWidth: '220px' }}>
          <div style={{
            ...searchContainer,
            border: showSuggestions ? '1px solid #2563eb' : '1px solid #cbd5e1',
            boxShadow: showSuggestions ? '0 0 0 3px rgba(37, 99, 235, 0.1)' : 'none',
            transition: 'border-color 0.15s, box-shadow 0.15s'
          }}>
            <Search size={16} color={showSuggestions ? '#2563eb' : '#64748b'} style={{ marginLeft: '12px', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search by Employee ID, Name, or Notes..."
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setShowSuggestions(true);
                setActiveSuggestionIndex(-1);
              }}
              onFocus={() => {
                if (searchTerm.trim().length > 0) setShowSuggestions(true);
              }}
              onKeyDown={handleKeyDown}
              style={searchInput}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setShowSuggestions(false);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  outline: 'none'
                }}
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Suggestions Dropdown */}
          {showSuggestions && searchTerm.trim().length > 0 && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              right: 0,
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
              zIndex: 50,
              maxHeight: '320px',
              overflowY: 'auto'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 14px',
                backgroundColor: '#f8fafc',
                borderBottom: '1px solid #f1f5f9',
                fontSize: '11px',
                fontWeight: '700',
                color: '#64748b',
                letterSpacing: '0.5px'
              }}>
                <span>MATCHING EMPLOYEES ({suggestions.length})</span>
                <span style={{ fontSize: '10px', fontWeight: '500', color: '#94a3b8' }}>↑↓ to navigate, Enter</span>
              </div>

              {suggestions.length > 0 ? (
                suggestions.map((item, idx) => {
                  const isActive = idx === activeSuggestionIndex;
                  const initials = (item.name || 'E')
                    .split(' ')
                    .map(w => w[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <div
                      key={item.id || idx}
                      onClick={() => handleSelectSuggestion(item)}
                      onMouseEnter={() => setActiveSuggestionIndex(idx)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderBottom: idx === suggestions.length - 1 ? 'none' : '1px solid #f8fafc',
                        backgroundColor: isActive ? '#f1f5f9' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: '#eff6ff',
                          color: '#2563eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '700',
                          fontSize: '11px',
                          flexShrink: 0
                        }}>
                          {initials}
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '13px' }}>
                              <HighlightMatch text={item.name} query={searchTerm} />
                            </span>
                            {item.employeeId && (
                              <span style={{
                                fontFamily: 'monospace',
                                fontSize: '11px',
                                fontWeight: '600',
                                color: '#2563eb',
                                backgroundColor: '#eff6ff',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                border: '1px solid #dbeafe'
                              }}>
                                <HighlightMatch text={item.employeeId} query={searchTerm} />
                              </span>
                            )}
                            <span style={{
                              fontSize: '10px',
                              color: '#64748b',
                              backgroundColor: '#f1f5f9',
                              padding: '1px 6px',
                              borderRadius: '4px'
                            }}>
                              {item.dept}
                            </span>
                          </div>

                          <div style={{ fontSize: '11px', marginTop: '2px', color: '#64748b' }}>
                            {item.salaryCount} salary slip{item.salaryCount !== 1 ? 's' : ''} • {item.advanceCount} advance{item.advanceCount !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>

                      <ArrowRight size={14} color="#94a3b8" />
                    </div>
                  );
                })
              ) : (
                <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                  No employees found matching "{searchTerm}"
                </div>
              )}
            </div>
          )}
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
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
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
  gap: '10px',
  borderBottom: '1px solid #e2e8f0',
  marginBottom: '16px',
  overflowX: 'auto',
  whiteSpace: 'nowrap',
  paddingBottom: '2px',
  WebkitOverflowScrolling: 'touch'
};

const tabButton = {
  background: 'none',
  border: 'none',
  padding: '10px 14px',
  fontSize: '13px',
  fontWeight: '700',
  cursor: 'pointer',
  transition: '0.2s',
  flexShrink: 0
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
