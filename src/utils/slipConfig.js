// Salary Slip Layout & Content Configuration

export const DEFAULT_SLIP_CONFIG = {
  // --- Layout & Typography ---
  slipsPerPage: 6, // 6 (3x2), 4 (2x2), 2 (2x1), 1 (full page)
  fontFamily: 'serif', // 'serif' | 'sans' | 'mono'
  colorTheme: 'colored', // 'colored' | 'monochrome' | 'minimal'
  borderWidth: 1.5, // border px
  borderStyle: 'solid', // 'solid' | 'dashed' | 'double'
  
  // --- Header & Title ---
  titleText: 'Salary Report',
  showSubTitle: false,
  subTitleText: 'Rani Silks & Readymades',
  showEmployeeCode: true,

  // --- Stats Row ---
  showStatsRow: true,

  // --- Column & Section Headers ---
  additionHeader: 'Addition',
  deductionHeader: 'Deduction',
  overallTotalHeader: 'Overall Total',
  netSalaryHeader: 'Net Salary',

  // --- Addition Field Labels ---
  incentiveLabel: 'Incentive',
  lBonusLabel: 'L.Bonus',
  rdAddLabel: 'RD',

  // --- Deduction Field Labels ---
  advanceLabel: 'Advance',
  jBalanceLabel: 'J.Balance',
  penaltyLabel: 'Penalty',
  rdDedLabel: 'RD',
  pfLabel: 'PF',

  // --- Remarks Row ---
  showRemarksRow: true,
  remarksPrefix: 'Remarks:',
  defaultRemarksText: 'GOOD',

  // --- Signatures ---
  showSignatures: false,
  signatureLeftText: 'Employee Signature',
  signatureRightText: 'Authorized Signatory'
};

const STORAGE_KEY = 'salary_slip_layout_config';

/**
 * Retrieve the saved slip configuration from localStorage, safely merged with defaults
 */
export function getSavedSlipConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SLIP_CONFIG };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SLIP_CONFIG, ...parsed };
  } catch (err) {
    console.warn('Error reading saved slip config from localStorage:', err);
    return { ...DEFAULT_SLIP_CONFIG };
  }
}

/**
 * Save slip configuration to localStorage
 */
export function saveSlipConfigToStorage(config) {
  try {
    const merged = { ...DEFAULT_SLIP_CONFIG, ...config };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    // Dispatch custom event so open components (like ReportPreview) can react in real time
    window.dispatchEvent(new Event('salary-slip-config-changed'));
    return true;
  } catch (err) {
    console.error('Error saving slip config to localStorage:', err);
    return false;
  }
}

/**
 * Reset slip configuration back to factory default
 */
export function resetSlipConfigToDefault() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event('salary-slip-config-changed'));
    return { ...DEFAULT_SLIP_CONFIG };
  } catch (err) {
    console.error('Error resetting slip config:', err);
    return { ...DEFAULT_SLIP_CONFIG };
  }
}
