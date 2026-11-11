import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import SalaryReport from '../SalaryReport';
import { Printer, Search, RefreshCw, Download, X, ArrowRight, AlertCircle } from 'lucide-react';
import { useToast } from '../components/Toast';
import { MONTHS } from '../utils/dateUtils';

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
      <span style={{ backgroundColor: '#fef08a', color: '#854d0e', fontWeight: '700', borderRadius: '2px', padding: '0 2px' }}>
        {matched}
      </span>
      {after}
    </span>
  );
}

function ReportPreview({ userPermissions }) {
  const { showToast } = useToast();
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  
  // Access check definitions
  const defaultDept = userPermissions?.depts?.[0] || 'Rani Javuli';
  const isAdmin = userPermissions?.depts?.length > 1;

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState(isAdmin ? 'All' : defaultDept);
  const [filterMonth, setFilterMonth] = useState(MONTHS[new Date().getMonth()]);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());

  // Suggestions state
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

  // 1. Fetch Employees for code lookup & search suggestions
  useEffect(() => {
    if (!userPermissions || !userPermissions.depts || userPermissions.depts.length === 0) return;
    const q = query(
      collection(db, "employees"),
      where("dept", "in", userPermissions.depts)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setEmployees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.error("Firestore employees query error:", err);
    });
    return unsub;
  }, [userPermissions]);

  // 2. Fetch allowed salary records with optimized query
  useEffect(() => {
    if (!userPermissions || !userPermissions.depts || userPermissions.depts.length === 0) return;

    const q = query(
      collection(db, "salary_records"),
      where("dept", "in", userPermissions.depts)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.error("Firestore query error:", err);
      showToast("Error loading records: " + err.message, 'error');
    });

    return unsub;
  }, [userPermissions, showToast]);

  // Fast employee lookup
  const empById = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);

  // Filter records client-side for search and shop filtering, excluding soft-deleted records
  const filteredRecords = useMemo(() => {
    return records.filter(rec => {
      // Exclude soft-deleted / archived records
      if (rec.isDeleted) return false;

      // Security: Limit data matching to allowed departments
      const isDeptAllowed = userPermissions?.depts?.includes(rec.dept);
      if (!isDeptAllowed) return false;
      if (filterDept !== 'All' && rec.dept !== filterDept) return false;

      // Month & Year filtering
      const matchesMonth = filterMonth === 'All' || rec.month === filterMonth;
      const matchesYear = filterYear === 'All' || rec.year === filterYear;
      if (!matchesMonth || !matchesYear) return false;

      // Search term matching (multi-word, name, code, dept, remarks)
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const terms = term.split(/\s+/).filter(Boolean);
        const emp = empById.get(rec.employeeId);
        const name = (rec.name || '').toLowerCase();
        const code = (rec.employeeCode || emp?.employeeId || '').toLowerCase();
        const remarks = (rec.remarks || '').toLowerCase();
        const dept = (rec.dept || '').toLowerCase();
        const period = `${rec.month || ''} ${rec.year || ''}`.toLowerCase();

        const matchesAll = terms.every(t =>
          name.includes(t) ||
          code.includes(t) ||
          remarks.includes(t) ||
          dept.includes(t) ||
          period.includes(t)
        );

        if (!matchesAll) return false;
      }

      return true;
    });
  }, [records, searchTerm, filterDept, filterMonth, filterYear, userPermissions, empById]);

  // Dynamic suggestions generated as the user types
  const suggestions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return [];

    const list = [];
    const seenKeys = new Set();

    // 1. Suggestions from employees registry
    employees.forEach(emp => {
      if (emp.isDeleted) return;
      const empCode = emp.employeeId || '';
      const name = emp.name || '';
      const dept = emp.dept || '';
      const key = (empCode + '__' + name).toLowerCase();
      if (seenKeys.has(key)) return;

      const nameMatch = name.toLowerCase().includes(term);
      const codeMatch = empCode.toLowerCase().includes(term);
      const deptMatch = dept.toLowerCase().includes(term);

      if (nameMatch || codeMatch || deptMatch) {
        seenKeys.add(key);
        const empRecords = records.filter(r => !r.isDeleted && (
          r.employeeId === emp.id ||
          (r.employeeCode && empCode && r.employeeCode.toUpperCase() === empCode.toUpperCase()) ||
          (r.name && name && r.name.toUpperCase() === name.toUpperCase())
        ));

        list.push({
          id: emp.id,
          employeeId: empCode,
          name: name,
          dept: dept,
          recordCount: empRecords.length,
          records: empRecords,
          latestRecord: empRecords.length > 0 ? empRecords[empRecords.length - 1] : null,
          hasRecordInCurrentFilter: empRecords.some(r =>
            (filterMonth === 'All' || r.month === filterMonth) &&
            (filterYear === 'All' || r.year === filterYear)
          )
        });
      }
    });

    // 2. Suggestions from existing salary records directly
    records.forEach(rec => {
      if (rec.isDeleted) return;
      const empCode = rec.employeeCode || '';
      const name = rec.name || '';
      const dept = rec.dept || '';
      const key = (empCode + '__' + name).toLowerCase();
      if (seenKeys.has(key)) return;

      const nameMatch = name.toLowerCase().includes(term);
      const codeMatch = empCode.toLowerCase().includes(term);

      if (nameMatch || codeMatch) {
        seenKeys.add(key);
        const empRecords = records.filter(r => !r.isDeleted && (
          (r.employeeCode && empCode && r.employeeCode.toUpperCase() === empCode.toUpperCase()) ||
          (r.name && name && r.name.toUpperCase() === name.toUpperCase())
        ));

        list.push({
          id: rec.employeeId || rec.id,
          employeeId: empCode,
          name: name,
          dept: dept,
          recordCount: empRecords.length,
          records: empRecords,
          latestRecord: empRecords.length > 0 ? empRecords[empRecords.length - 1] : null,
          hasRecordInCurrentFilter: empRecords.some(r =>
            (filterMonth === 'All' || r.month === filterMonth) &&
            (filterYear === 'All' || r.year === filterYear)
          )
        });
      }
    });

    // Sort: exact matches first, then prefix, then has records in current filter, then record count
    list.sort((a, b) => {
      const aExact = a.employeeId.toLowerCase() === term || a.name.toLowerCase() === term;
      const bExact = b.employeeId.toLowerCase() === term || b.name.toLowerCase() === term;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      const aStarts = a.name.toLowerCase().startsWith(term) || a.employeeId.toLowerCase().startsWith(term);
      const bStarts = b.name.toLowerCase().startsWith(term) || b.employeeId.toLowerCase().startsWith(term);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;

      if (a.hasRecordInCurrentFilter && !b.hasRecordInCurrentFilter) return -1;
      if (!a.hasRecordInCurrentFilter && b.hasRecordInCurrentFilter) return 1;

      return (b.recordCount || 0) - (a.recordCount || 0);
    });

    return list.slice(0, 8);
  }, [searchTerm, employees, records, filterMonth, filterYear]);

  // Count matches in other months if 0 records found in current month
  const otherMonthMatchesCount = useMemo(() => {
    if (!searchTerm.trim()) return 0;
    if (filterMonth === 'All' && filterYear === 'All') return 0;

    const term = searchTerm.toLowerCase().trim();
    const terms = term.split(/\s+/).filter(Boolean);

    return records.filter(rec => {
      if (rec.isDeleted) return false;
      const isDeptAllowed = userPermissions?.depts?.includes(rec.dept);
      if (!isDeptAllowed) return false;
      if (filterDept !== 'All' && rec.dept !== filterDept) return false;

      // Skip records in the current period
      const inCurrentMonth = filterMonth === 'All' || rec.month === filterMonth;
      const inCurrentYear = filterYear === 'All' || rec.year === filterYear;
      if (inCurrentMonth && inCurrentYear) return false;

      const emp = empById.get(rec.employeeId);
      const name = (rec.name || '').toLowerCase();
      const code = (rec.employeeCode || emp?.employeeId || '').toLowerCase();
      const remarks = (rec.remarks || '').toLowerCase();
      const dept = (rec.dept || '').toLowerCase();
      const period = `${rec.month || ''} ${rec.year || ''}`.toLowerCase();

      return terms.every(t =>
        name.includes(t) ||
        code.includes(t) ||
        remarks.includes(t) ||
        dept.includes(t) ||
        period.includes(t)
      );
    }).length;
  }, [records, searchTerm, filterMonth, filterYear, filterDept, userPermissions, empById]);

  // Handle clicking a suggestion
  const handleSelectSuggestion = (suggestion) => {
    setSearchTerm(suggestion.name);
    setShowSuggestions(false);
    setActiveSuggestionIndex(-1);

    // If no records in current month/year filter, switch to show the employee's records
    if (!suggestion.hasRecordInCurrentFilter && suggestion.recordCount > 0) {
      if (suggestion.latestRecord) {
        setFilterMonth(suggestion.latestRecord.month || 'All');
        setFilterYear(suggestion.latestRecord.year || 'All');
        showToast(`Showing ${suggestion.name}'s record for ${suggestion.latestRecord.month} ${suggestion.latestRecord.year}`, 'info');
      } else {
        setFilterMonth('All');
        setFilterYear('All');
        showToast(`Showing all records for ${suggestion.name}`, 'info');
      }
    } else if (suggestion.recordCount === 0) {
      showToast(`${suggestion.name} has no salary slips generated yet.`, 'info');
    }
  };

  // Keyboard navigation for suggestions
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
  const recordsToPrint = filteredRecords
    .filter(rec => selectedIds.length > 0 ? selectedIds.includes(rec.id) : true);

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
    setShowSuggestions(false);
    setFilterDept(isAdmin ? 'All' : defaultDept);
    setFilterMonth(MONTHS[new Date().getMonth()]);
    setFilterYear(new Date().getFullYear().toString());
    setSelectedIds([]);
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(() => {
    const yearsSet = new Set(records.map(r => String(r.year)).filter(Boolean));
    yearsSet.add(String(currentYear - 1));
    yearsSet.add(String(currentYear));
    yearsSet.add(String(currentYear + 1));
    return Array.from(yearsSet).sort().reverse();
  }, [records, currentYear]);

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
          {/* Search container with suggestions */}
          <div ref={searchWrapperRef} style={{ position: 'relative', flex: '1 1 240px', minWidth: '0' }}>
            <div style={{
              ...searchContainer,
              border: showSuggestions ? '1px solid #2563eb' : '1px solid #cbd5e1',
              boxShadow: showSuggestions ? '0 0 0 3px rgba(37, 99, 235, 0.1)' : 'none',
              transition: 'border-color 0.15s, box-shadow 0.15s'
            }}>
              <Search size={16} color={showSuggestions ? '#2563eb' : '#64748b'} style={{ marginLeft: '12px', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Search by ID or name..."
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
                    setActiveSuggestionIndex(-1);
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
                maxHeight: '340px',
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
                  <span>EMPLOYEE SUGGESTIONS ({suggestions.length})</span>
                  <span style={{ fontSize: '10px', fontWeight: '500', color: '#94a3b8' }}>↑↓ to navigate, Enter to select</span>
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

                            <div style={{ fontSize: '11px', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {item.recordCount > 0 ? (
                                <>
                                  <span style={{ color: '#16a34a', fontWeight: '600' }}>
                                    ✓ {item.recordCount} slip{item.recordCount > 1 ? 's' : ''}
                                  </span>
                                  {item.latestRecord && (
                                    <span style={{ color: '#64748b' }}>
                                      • Latest: {item.latestRecord.month} {item.latestRecord.year} (₹{item.latestRecord.net ?? item.latestRecord.gTotal})
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span style={{ color: '#94a3b8' }}>No salary records yet</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {!item.hasRecordInCurrentFilter && item.recordCount > 0 ? (
                            <span style={{
                              fontSize: '10px',
                              fontWeight: '600',
                              color: '#92400e',
                              backgroundColor: '#fef3c7',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              In other months <ArrowRight size={10} />
                            </span>
                          ) : (
                            <ArrowRight size={14} color="#94a3b8" />
                          )}
                        </div>
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

        {/* OTHER MONTH MATCHES BANNER */}
        {searchTerm.trim() && otherMonthMatchesCount > 0 && filteredRecords.length === 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '12px',
            padding: '12px 18px',
            marginBottom: '18px',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#1e40af', fontSize: '13px' }}>
              <AlertCircle size={18} color="#2563eb" style={{ flexShrink: 0 }} />
              <span>
                No records found for "<strong>{searchTerm}</strong>" in <strong>{filterMonth} {filterYear}</strong>, but found <strong>{otherMonthMatchesCount}</strong> matching record{otherMonthMatchesCount > 1 ? 's' : ''} in other months.
              </span>
            </div>
            <button
              onClick={() => {
                setFilterMonth('All');
                setFilterYear('All');
                showToast(`Showing all months for "${searchTerm}"`, 'info');
              }}
              style={{
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(37,99,235,0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              View All Months ({otherMonthMatchesCount}) <ArrowRight size={14} />
            </button>
          </div>
        )}

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
            <div style={{ textAlign: 'center', padding: '45px 20px', color: '#64748b' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px auto'
              }}>
                <Search size={22} color="#94a3b8" />
              </div>
              <div style={{ fontWeight: '700', fontSize: '15px', color: '#1e293b', marginBottom: '6px' }}>
                {searchTerm.trim() ? `No salary records found for "${searchTerm}"` : `No records found for ${filterMonth !== 'All' ? filterMonth : ''} ${filterYear !== 'All' ? filterYear : ''}`}
              </div>
              <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748b', maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto' }}>
                {searchTerm.trim()
                  ? (otherMonthMatchesCount > 0
                      ? `There are ${otherMonthMatchesCount} record(s) matching in other periods. Click below to view them.`
                      : 'Try searching by employee code (e.g. RJ-01) or clearing the search filter.')
                  : 'Adjust the month and year dropdowns or view all historical records across shops.'}
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {searchTerm.trim() && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setShowSuggestions(false);
                    }}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#475569',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Clear Search
                  </button>
                )}
                {(filterMonth !== 'All' || filterYear !== 'All') && (
                  <button
                    onClick={() => {
                      setFilterMonth('All');
                      setFilterYear('All');
                    }}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      boxShadow: '0 1px 2px rgba(37,99,235,0.2)'
                    }}
                  >
                    View All Months & Years
                  </button>
                )}
              </div>
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
  width: '100%'
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
