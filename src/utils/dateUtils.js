// Centralized Date & Calendar Utilities for Rani Salary

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Returns the exact number of days in the specified month and year (e.g. 28, 29, 30, 31).
 * Defaults to 30 if month is invalid.
 */
export function getDaysInMonth(monthName, yearVal) {
  const monthIndex = MONTHS.indexOf(monthName);
  const yearNum = Number(yearVal) || new Date().getFullYear();
  if (monthIndex === -1) return 30;
  return new Date(yearNum, monthIndex + 1, 0).getDate();
}

/**
 * Get current month name (e.g. "November")
 */
export function getCurrentMonth() {
  return new Date().toLocaleString('default', { month: 'long' });
}

/**
 * Get current year as string (e.g. "2026")
 */
export function getCurrentYear() {
  return new Date().getFullYear().toString();
}

/**
 * Get current YYYY-MM string (e.g. "2026-11")
 */
export function getCurrentMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Returns start and end date strings for a given month & year in YYYY-MM-DD format.
 */
export function getMonthDateRange(monthName, yearVal) {
  const monthIndex = MONTHS.indexOf(monthName);
  const yearNum = Number(yearVal) || new Date().getFullYear();
  const pad = (num) => String(num).padStart(2, '0');
  const safeMonthIdx = monthIndex >= 0 ? monthIndex : new Date().getMonth();
  const startDate = `${yearNum}-${pad(safeMonthIdx + 1)}-01`;
  const lastDay = new Date(yearNum, safeMonthIdx + 1, 0).getDate();
  const endDate = `${yearNum}-${pad(safeMonthIdx + 1)}-${pad(lastDay)}`;
  return { startDate, endDate, lastDay, daysInMonth: lastDay };
}

/**
 * Extract month name and year from a date string (YYYY-MM-DD)
 */
export function parseDateToMonthYear(dateStr) {
  if (!dateStr) return { monthName: '', year: '' };
  const parts = dateStr.split('-');
  if (parts.length < 2) return { monthName: '', year: '' };
  const y = parts[0];
  const mNum = parseInt(parts[1], 10);
  const mName = (mNum >= 1 && mNum <= 12) ? MONTHS[mNum - 1] : '';
  return { monthName: mName, year: y };
}

