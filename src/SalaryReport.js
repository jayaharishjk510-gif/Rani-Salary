import React, { useState, useEffect } from 'react';
import { getSavedSlipConfig } from './utils/slipConfig';

/**
 * SalaryReport Component
 * 
 * Renders print-ready salary slips according to the layout and content configuration
 * set in Settings (or passed via props).
 */
const SalaryReport = ({ data, config, isPreview = false }) => {
  // Local config state synced with localStorage if not provided via props
  const [activeConfig, setActiveConfig] = useState(() => config || getSavedSlipConfig());

  useEffect(() => {
    if (config) {
      setActiveConfig(config);
      return;
    }
    const handleConfigChange = () => {
      setActiveConfig(getSavedSlipConfig());
    };
    window.addEventListener('salary-slip-config-changed', handleConfigChange);
    return () => window.removeEventListener('salary-slip-config-changed', handleConfigChange);
  }, [config]);

  // Null guard: render nothing if data is missing or empty
  if (!data || data.length === 0) return null;

  const slipsPerPage = Number(activeConfig.slipsPerPage) || 6;
  const colors = getThemeColors(activeConfig.colorTheme);
  const fontFamily = getFontFamily(activeConfig.fontFamily);
  const borderStyleStr = `${activeConfig.borderWidth || 1.5}px ${activeConfig.borderStyle || 'solid'} ${colors.border}`;

  // If in Preview Mode, render a single card standalone without page wrappers
  if (isPreview) {
    const sampleReport = data[0];
    return (
      <div style={{ width: '100%', maxWidth: '380px', margin: '0 auto' }}>
        {renderSlipCard(sampleReport, 0, activeConfig, colors, fontFamily, borderStyleStr, true)}
      </div>
    );
  }

  // Chunk the records according to slipsPerPage
  const chunkedData = [];
  for (let i = 0; i < data.length; i += slipsPerPage) {
    chunkedData.push(data.slice(i, i + slipsPerPage));
  }

  const { gridCols, gridRows, printCardMaxHeight } = getGridLayout(slipsPerPage);

  const dynamicPageStyle = {
    ...pageStyle,
    gridTemplateColumns: gridCols,
    gridTemplateRows: gridRows
  };

  return (
    <div className="report-container">
      {chunkedData.map((pageData, pageIdx) => (
        <div key={pageIdx} className="salary-report-page" style={dynamicPageStyle}>
          {pageData.map((report, index) =>
            renderSlipCard(report, index, activeConfig, colors, fontFamily, borderStyleStr, false)
          )}
        </div>
      ))}

      <style>{`
        .salary-report-page {
          box-shadow: 0 4px 10px rgba(0,0,0,0.15);
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 4mm 5mm;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            width: 100% !important;
            height: 100% !important;
          }
          .report-container {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }
          .salary-report-page {
            box-shadow: none !important;
            border: none !important;
            margin: 0 auto !important;
            padding: 0 !important;
            width: 200mm !important;
            height: 288mm !important;
            max-height: 288mm !important;
            min-height: 288mm !important;
            box-sizing: border-box !important;
            display: grid !important;
            grid-template-columns: ${gridCols} !important;
            grid-template-rows: ${gridRows} !important;
            gap: 2.5mm !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: always !important;
            break-after: page !important;
            overflow: hidden !important;
          }
          .salary-report-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          .salary-card {
            box-sizing: border-box !important;
            height: 100% !important;
            max-height: ${printCardMaxHeight} !important;
            overflow: hidden !important;
            border: ${borderStyleStr} !important;
          }
        }
      `}</style>
    </div>
  );
};

/**
 * Render an individual salary slip card
 */
function renderSlipCard(report, index, config, colors, fontFamily, borderStyleStr, isPreview) {
  // Calculations
  const days = Number(report.days) || 0;
  const baseSalary = Number(report.baseSalary) || 0;
  const isMonthly = report.salaryType === 'monthly' || baseSalary > 1500;
  const perDayRate = report.dailyRateEquiv || (isMonthly ? (baseSalary > 0 ? Math.round(baseSalary / 30) : 0) : baseSalary);
  const totalSalary = Number(report.fixedEarnings) || (isMonthly ? (days === 30 ? baseSalary : Math.round((baseSalary / 30) * days)) : Math.round(baseSalary * days));

  // Additions
  const incentive = Number(report.incentive ?? report.insentive ?? 0);
  const lBonus = Number(report.lBonus || 0);
  const rdAdd = Number(report.rdAdd || 0);
  const totalAdd = incentive + lBonus + rdAdd;

  // Deductions
  const advance = Number(report.advance || 0);
  const jBalance = Number(report.jBalance || 0);
  const penalty = Number(report.penalty || 0);
  const rdDed = Number(report.rdDed || 0);
  const pf = Number(report.pf || 0);
  const totalDed = advance + jBalance + penalty + rdDed + pf;

  // Grand Total & Net
  const grandTotal = Number(report.gTotal ?? Math.round(totalSalary + totalAdd - totalDed));
  const netSalary = Number(report.net ?? report.gTotal ?? grandTotal);

  const cellBorder = `1px solid ${colors.border}`;
  const cellBase = {
    border: cellBorder,
    padding: '2px 4px',
    boxSizing: 'border-box',
    color: colors.text
  };

  const dynamicTableStyle = {
    ...tableStyle,
    fontFamily
  };

  return (
    <div
      key={index}
      className="salary-card"
      style={{
        ...cardStyle,
        border: borderStyleStr,
        boxShadow: isPreview ? '0 4px 12px rgba(0,0,0,0.08)' : 'none'
      }}
    >
      <table style={dynamicTableStyle}>
        <colgroup>
          <col style={{ width: '25%' }} />
          <col style={{ width: '25%' }} />
          <col style={{ width: '25%' }} />
          <col style={{ width: '25%' }} />
        </colgroup>
        <tbody>
          {/* Header Row: Title */}
          <tr>
            <td
              colSpan={4}
              style={{
                ...cellBase,
                backgroundColor: colors.titleBg,
                fontWeight: 'bold',
                fontSize: '11px',
                textAlign: 'center',
                padding: '3px 2px'
              }}
            >
              {config.titleText || 'Salary Report'}
            </td>
          </tr>

          {/* Optional Subtitle Row */}
          {config.showSubTitle && config.subTitleText && (
            <tr>
              <td
                colSpan={4}
                style={{
                  ...cellBase,
                  backgroundColor: colors.titleBg,
                  fontSize: '8.5px',
                  fontWeight: '600',
                  textAlign: 'center',
                  padding: '1px 2px',
                  borderTop: 'none',
                  letterSpacing: '0.2px'
                }}
              >
                {config.subTitleText}
              </td>
            </tr>
          )}

          {/* Employee Name Row */}
          <tr>
            <td
              colSpan={4}
              style={{
                ...cellBase,
                backgroundColor: colors.nameBg,
                fontWeight: 'bold',
                fontSize: '10px',
                textAlign: 'center',
                padding: '2.5px 2px',
                letterSpacing: '0.3px'
              }}
            >
              {report.name ? report.name.toUpperCase() : 'N/A'}
              {config.showEmployeeCode && report.employeeCode ? ` [${report.employeeCode}]` : ''}
            </td>
          </tr>

          {/* Stats Row: Month/Year, Days, Per Day Rate, Total Salary */}
          {config.showStatsRow && (
            <tr>
              <td
                style={{
                  ...cellBase,
                  backgroundColor: colors.statsBg,
                  fontWeight: 'bold',
                  fontSize: '9px',
                  textAlign: 'center',
                  padding: '2.5px 2px'
                }}
              >
                {report.month} {report.year || ''}
              </td>
              <td
                style={{
                  ...cellBase,
                  backgroundColor: colors.statsBg,
                  fontWeight: 'bold',
                  fontSize: '9px',
                  textAlign: 'center',
                  padding: '2.5px 2px'
                }}
              >
                {days} {days === 1 ? 'day' : 'days'}
              </td>
              <td
                style={{
                  ...cellBase,
                  backgroundColor: colors.statsBg,
                  fontWeight: 'bold',
                  fontSize: '9px',
                  textAlign: 'center',
                  padding: '2.5px 2px'
                }}
              >
                {perDayRate}
              </td>
              <td
                style={{
                  ...cellBase,
                  backgroundColor: colors.statsBg,
                  fontWeight: 'bold',
                  fontSize: '9px',
                  textAlign: 'center',
                  padding: '2.5px 2px'
                }}
              >
                {totalSalary}
              </td>
            </tr>
          )}

          {/* Section Headers: Addition & Deduction */}
          <tr>
            <td
              colSpan={2}
              style={{
                ...cellBase,
                backgroundColor: colors.additionHeaderBg,
                fontWeight: 'bold',
                fontSize: '10px',
                textAlign: 'center',
                padding: '2.5px'
              }}
            >
              {config.additionHeader || 'Addition'}
            </td>
            <td
              colSpan={2}
              style={{
                ...cellBase,
                backgroundColor: colors.deductionHeaderBg,
                fontWeight: 'bold',
                fontSize: '10px',
                textAlign: 'center',
                padding: '2.5px'
              }}
            >
              {config.deductionHeader || 'Deduction'}
            </td>
          </tr>

          {/* Row 1: Incentive | Advance */}
          <tr>
            <td style={{ ...cellBase, backgroundColor: colors.additionCellBg, textAlign: 'left', paddingLeft: '8px', fontSize: '9px' }}>
              {config.incentiveLabel || 'Incentive'}
            </td>
            <td style={{ ...cellBase, backgroundColor: colors.additionCellBg, textAlign: 'center', fontSize: '9px' }}>
              {incentive}
            </td>
            <td style={{ ...cellBase, backgroundColor: colors.deductionCellBg, textAlign: 'left', paddingLeft: '8px', fontSize: '9px' }}>
              {config.advanceLabel || 'Advance'}
            </td>
            <td style={{ ...cellBase, backgroundColor: colors.deductionCellBg, textAlign: 'center', fontSize: '9px' }}>
              {advance}
            </td>
          </tr>

          {/* Row 2: L.Bonus | J.Balance */}
          <tr>
            <td style={{ ...cellBase, backgroundColor: colors.additionCellBg, textAlign: 'left', paddingLeft: '8px', fontSize: '9px' }}>
              {config.lBonusLabel || 'L.Bonus'}
            </td>
            <td style={{ ...cellBase, backgroundColor: colors.additionCellBg, textAlign: 'center', fontSize: '9px' }}>
              {lBonus}
            </td>
            <td style={{ ...cellBase, backgroundColor: colors.deductionCellBg, textAlign: 'left', paddingLeft: '8px', fontSize: '9px' }}>
              {config.jBalanceLabel || 'J.Balance'}
            </td>
            <td style={{ ...cellBase, backgroundColor: colors.deductionCellBg, textAlign: 'center', fontSize: '9px' }}>
              {jBalance}
            </td>
          </tr>

          {/* Row 3: RD | Penalty */}
          <tr>
            <td style={{ ...cellBase, backgroundColor: colors.additionCellBg, textAlign: 'left', paddingLeft: '8px', fontSize: '9px' }}>
              {config.rdAddLabel || 'RD'}
            </td>
            <td style={{ ...cellBase, backgroundColor: colors.additionCellBg, textAlign: 'center', fontSize: '9px' }}>
              {rdAdd}
            </td>
            <td style={{ ...cellBase, backgroundColor: colors.deductionCellBg, textAlign: 'left', paddingLeft: '8px', fontSize: '9px' }}>
              {config.penaltyLabel || 'Penalty'}
            </td>
            <td style={{ ...cellBase, backgroundColor: colors.deductionCellBg, textAlign: 'center', fontSize: '9px' }}>
              {penalty}
            </td>
          </tr>

          {/* Row 4: Empty | RD */}
          <tr>
            <td style={{ ...cellBase, backgroundColor: colors.additionCellBg }}>&nbsp;</td>
            <td style={{ ...cellBase, backgroundColor: colors.additionCellBg }}>&nbsp;</td>
            <td style={{ ...cellBase, backgroundColor: colors.deductionCellBg, textAlign: 'left', paddingLeft: '8px', fontSize: '9px' }}>
              {config.rdDedLabel || 'RD'}
            </td>
            <td style={{ ...cellBase, backgroundColor: colors.deductionCellBg, textAlign: 'center', fontSize: '9px' }}>
              {rdDed}
            </td>
          </tr>

          {/* Row 5: Empty | PF */}
          <tr>
            <td style={{ ...cellBase, backgroundColor: colors.additionCellBg }}>&nbsp;</td>
            <td style={{ ...cellBase, backgroundColor: colors.additionCellBg }}>&nbsp;</td>
            <td style={{ ...cellBase, backgroundColor: colors.deductionCellBg, textAlign: 'left', paddingLeft: '8px', fontSize: '9px' }}>
              {config.pfLabel || 'PF'}
            </td>
            <td style={{ ...cellBase, backgroundColor: colors.deductionCellBg, textAlign: 'center', fontSize: '9px' }}>
              {pf}
            </td>
          </tr>

          {/* Row 6: Addition Total | Deduction Total */}
          <tr>
            <td style={{ ...cellBase, backgroundColor: colors.additionCellBg, fontWeight: 'bold', textAlign: 'left', paddingLeft: '8px', fontSize: '9px' }}>
              Total
            </td>
            <td style={{ ...cellBase, backgroundColor: colors.additionCellBg, fontWeight: 'bold', textAlign: 'center', fontSize: '9px' }}>
              {totalAdd}
            </td>
            <td style={{ ...cellBase, backgroundColor: colors.deductionCellBg, fontWeight: 'bold', textAlign: 'left', paddingLeft: '8px', fontSize: '9px' }}>
              Total
            </td>
            <td style={{ ...cellBase, backgroundColor: colors.deductionCellBg, fontWeight: 'bold', textAlign: 'center', fontSize: '9px' }}>
              {totalDed}
            </td>
          </tr>

          {/* Overall Total Header: [Empty] | Addition | Deduction | Grand Total */}
          <tr>
            <td
              rowSpan={2}
              style={{
                ...cellBase,
                backgroundColor: colors.overallTotalBg,
                fontWeight: 'bold',
                fontSize: '9.5px',
                textAlign: 'center',
                verticalAlign: 'middle'
              }}
            >
              {config.overallTotalHeader || 'Overall Total'}
            </td>
            <td style={{ ...cellBase, backgroundColor: colors.overallTotalBg, fontWeight: 'bold', fontSize: '9px', textAlign: 'center', padding: '2px' }}>
              {config.additionHeader || 'Addition'}
            </td>
            <td style={{ ...cellBase, backgroundColor: colors.overallTotalBg, fontWeight: 'bold', fontSize: '9px', textAlign: 'center', padding: '2px' }}>
              {config.deductionHeader || 'Deduction'}
            </td>
            <td style={{ ...cellBase, backgroundColor: colors.overallTotalBg, fontWeight: 'bold', fontSize: '9px', textAlign: 'center', padding: '2px' }}>
              Grand Total
            </td>
          </tr>

          {/* Overall Total Values */}
          <tr>
            <td style={{ ...cellBase, backgroundColor: colors.overallTotalBg, fontWeight: 'bold', fontSize: '9.5px', textAlign: 'center', padding: '2.5px' }}>
              {totalAdd}
            </td>
            <td style={{ ...cellBase, backgroundColor: colors.overallTotalBg, fontWeight: 'bold', fontSize: '9.5px', textAlign: 'center', padding: '2.5px' }}>
              {totalDed}
            </td>
            <td style={{ ...cellBase, backgroundColor: colors.overallTotalBg, fontWeight: 'bold', fontSize: '9.5px', textAlign: 'center', padding: '2.5px' }}>
              {grandTotal}
            </td>
          </tr>

          {/* Spacer Row */}
          <tr>
            <td colSpan={4} style={spacerRowStyle}></td>
          </tr>

          {/* Net Salary Row */}
          <tr>
            <td
              colSpan={2}
              style={{
                ...cellBase,
                backgroundColor: colors.netSalaryBg,
                fontWeight: 'bold',
                fontSize: '10px',
                textAlign: 'center',
                padding: '3px 2px'
              }}
            >
              {config.netSalaryHeader || 'Net Salary'}
            </td>
            <td
              colSpan={2}
              style={{
                ...cellBase,
                backgroundColor: colors.netSalaryBg,
                fontWeight: 'bold',
                fontSize: '10.5px',
                textAlign: 'center',
                padding: '3px 2px'
              }}
            >
              {netSalary}
            </td>
          </tr>

          {/* Remarks Row */}
          {config.showRemarksRow && (
            <tr>
              <td
                colSpan={4}
                style={{
                  ...cellBase,
                  backgroundColor: colors.remarksBg,
                  fontWeight: 'bold',
                  fontSize: '9px',
                  textAlign: 'center',
                  padding: '2.5px 2px'
                }}
              >
                {config.remarksPrefix || 'Remarks:'} {report.remarks || config.defaultRemarksText || 'GOOD'}
              </td>
            </tr>
          )}

          {/* Optional Signatures Row */}
          {config.showSignatures && (
            <tr>
              <td colSpan={2} style={{ ...cellBase, backgroundColor: '#ffffff', padding: '14px 6px 4px 6px', textAlign: 'center' }}>
                <div style={{ borderTop: `1px dashed ${colors.border}`, paddingTop: '3px', fontSize: '8px', fontWeight: 'bold' }}>
                  {config.signatureLeftText || 'Employee Signature'}
                </div>
              </td>
              <td colSpan={2} style={{ ...cellBase, backgroundColor: '#ffffff', padding: '14px 6px 4px 6px', textAlign: 'center' }}>
                <div style={{ borderTop: `1px dashed ${colors.border}`, paddingTop: '3px', fontSize: '8px', fontWeight: 'bold' }}>
                  {config.signatureRightText || 'Authorized Signatory'}
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// Layout helper for slips per page
function getGridLayout(slips) {
  switch (slips) {
    case 4:
      return {
        gridCols: '1fr 1fr',
        gridRows: 'repeat(2, 1fr)',
        printCardMaxHeight: '142mm'
      };
    case 2:
      return {
        gridCols: '1fr',
        gridRows: 'repeat(2, 1fr)',
        printCardMaxHeight: '142mm'
      };
    case 1:
      return {
        gridCols: '1fr',
        gridRows: '1fr',
        printCardMaxHeight: '286mm'
      };
    case 6:
    default:
      return {
        gridCols: '1fr 1fr',
        gridRows: 'repeat(3, 1fr)',
        printCardMaxHeight: '94mm'
      };
  }
}

// Font family helper
function getFontFamily(fontKey) {
  switch (fontKey) {
    case 'sans':
      return '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
    case 'mono':
      return '"Courier New", Courier, monospace';
    case 'serif':
    default:
      return "'Times New Roman', Times, Georgia, serif";
  }
}

// Color theme helper
function getThemeColors(themeKey) {
  if (themeKey === 'monochrome') {
    return {
      titleBg: '#e2e8f0',
      nameBg: '#f1f5f9',
      statsBg: '#f1f5f9',
      additionHeaderBg: '#cbd5e1',
      deductionHeaderBg: '#cbd5e1',
      additionCellBg: '#f8fafc',
      deductionCellBg: '#f8fafc',
      overallTotalBg: '#f1f5f9',
      netSalaryBg: '#e2e8f0',
      remarksBg: '#f1f5f9',
      text: '#0f172a',
      border: '#334155'
    };
  }
  if (themeKey === 'minimal') {
    return {
      titleBg: '#ffffff',
      nameBg: '#ffffff',
      statsBg: '#ffffff',
      additionHeaderBg: '#f8fafc',
      deductionHeaderBg: '#f8fafc',
      additionCellBg: '#ffffff',
      deductionCellBg: '#ffffff',
      overallTotalBg: '#ffffff',
      netSalaryBg: '#f1f5f9',
      remarksBg: '#ffffff',
      text: '#000000',
      border: '#000000'
    };
  }
  // Default: colored (Original exact pastel colors matching reference template)
  return {
    titleBg: '#fce5cd',
    nameBg: '#cfe2f3',
    statsBg: '#cfe2f3',
    additionHeaderBg: '#b6d7a8',
    deductionHeaderBg: '#f9cb9c',
    additionCellBg: '#d9ead3',
    deductionCellBg: '#fce5cd',
    overallTotalBg: '#cfe2f3',
    netSalaryBg: '#d5a6bd',
    remarksBg: '#cfe2f3',
    text: '#000000',
    border: '#000000'
  };
}

// Base styles
const pageStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gridTemplateRows: 'repeat(3, 1fr)',
  gap: '8px',
  padding: '10px',
  backgroundColor: '#fff',
  color: '#000',
  boxSizing: 'border-box',
  maxWidth: '210mm',
  minHeight: '297mm',
  margin: '0 auto 20px auto',
  border: '1px solid #ddd'
};

const cardStyle = {
  backgroundColor: '#fff',
  boxSizing: 'border-box',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  overflow: 'hidden'
};

const tableStyle = {
  width: '100%',
  height: '100%',
  borderCollapse: 'collapse',
  tableLayout: 'fixed',
  fontSize: '9px',
  lineHeight: '1.2'
};

const spacerRowStyle = {
  height: '4px',
  backgroundColor: '#ffffff',
  border: 'none',
  padding: 0
};

export default SalaryReport;
