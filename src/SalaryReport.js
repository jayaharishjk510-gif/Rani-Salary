import React from 'react';

const SalaryReport = ({ data }) => {
  // Null guard: render nothing if data is missing or empty
  if (!data || data.length === 0) return null;

  // Chunk the records into groups of 6 (3 rows x 2 columns per A4 page)
  const chunkedData = [];
  const chunkSize = 6;
  for (let i = 0; i < data.length; i += chunkSize) {
    chunkedData.push(data.slice(i, i + chunkSize));
  }

  return (
    <div className="report-container">
      {chunkedData.map((pageData, pageIdx) => (
        <div key={pageIdx} className="salary-report-page" style={pageStyle}>
          {pageData.map((report, index) => {
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

            return (
              <div key={index} className="salary-card" style={cardStyle}>
                <table style={tableStyle}>
                  <colgroup>
                    <col style={{ width: '25%' }} />
                    <col style={{ width: '25%' }} />
                    <col style={{ width: '25%' }} />
                    <col style={{ width: '25%' }} />
                  </colgroup>
                  <tbody>
                    {/* Header Row: Salary Report */}
                    <tr>
                      <td colSpan={4} style={titleCellStyle}>
                        Salary Report
                      </td>
                    </tr>

                    {/* Employee Name Row */}
                    <tr>
                      <td colSpan={4} style={nameCellStyle}>
                        {report.name ? report.name.toUpperCase() : 'N/A'}
                        {report.employeeCode ? ` [${report.employeeCode}]` : ''}
                      </td>
                    </tr>

                    {/* Stats Row: Month/Year, Days, Per Day Rate, Total Salary */}
                    <tr>
                      <td style={statsCellStyle}>
                        {report.month} {report.year || ''}
                      </td>
                      <td style={statsCellStyle}>
                        {days} {days === 1 ? 'day' : 'days'}
                      </td>
                      <td style={statsCellStyle}>
                        {perDayRate}
                      </td>
                      <td style={statsCellStyle}>
                        {totalSalary}
                      </td>
                    </tr>

                    {/* Section Headers: Addition & Deduction */}
                    <tr>
                      <td colSpan={2} style={additionHeaderStyle}>
                        Addition
                      </td>
                      <td colSpan={2} style={deductionHeaderStyle}>
                        Deduction
                      </td>
                    </tr>

                    {/* Row 1: Incentive | Advance */}
                    <tr>
                      <td style={greenLabelStyle}>Incentive</td>
                      <td style={greenValueStyle}>{incentive}</td>
                      <td style={orangeLabelStyle}>Advance</td>
                      <td style={orangeValueStyle}>{advance}</td>
                    </tr>

                    {/* Row 2: L.Bonus | J.Balance */}
                    <tr>
                      <td style={greenLabelStyle}>L.Bonus</td>
                      <td style={greenValueStyle}>{lBonus}</td>
                      <td style={orangeLabelStyle}>J.Balance</td>
                      <td style={orangeValueStyle}>{jBalance}</td>
                    </tr>

                    {/* Row 3: RD | Penalty */}
                    <tr>
                      <td style={greenLabelStyle}>RD</td>
                      <td style={greenValueStyle}>{rdAdd}</td>
                      <td style={orangeLabelStyle}>Penalty</td>
                      <td style={orangeValueStyle}>{penalty}</td>
                    </tr>

                    {/* Row 4: Empty | RD */}
                    <tr>
                      <td style={greenLabelStyle}>&nbsp;</td>
                      <td style={greenValueStyle}>&nbsp;</td>
                      <td style={orangeLabelStyle}>RD</td>
                      <td style={orangeValueStyle}>{rdDed}</td>
                    </tr>

                    {/* Row 5: Empty | PF */}
                    <tr>
                      <td style={greenLabelStyle}>&nbsp;</td>
                      <td style={greenValueStyle}>&nbsp;</td>
                      <td style={orangeLabelStyle}>PF</td>
                      <td style={orangeValueStyle}>{pf}</td>
                    </tr>

                    {/* Row 6: Addition Total | Deduction Total */}
                    <tr>
                      <td style={{ ...greenLabelStyle, fontWeight: 'bold' }}>Total</td>
                      <td style={{ ...greenValueStyle, fontWeight: 'bold' }}>{totalAdd}</td>
                      <td style={{ ...orangeLabelStyle, fontWeight: 'bold' }}>Total</td>
                      <td style={{ ...orangeValueStyle, fontWeight: 'bold' }}>{totalDed}</td>
                    </tr>

                    {/* Overall Total Header: [Empty] | Addition | Deduction | Grand Total */}
                    <tr>
                      <td rowSpan={2} style={overallTotalLabelStyle}>
                        Overall Total
                      </td>
                      <td style={overallSubHeaderStyle}>Addition</td>
                      <td style={overallSubHeaderStyle}>Deduction</td>
                      <td style={overallSubHeaderStyle}>Grand Total</td>
                    </tr>

                    {/* Overall Total Values */}
                    <tr>
                      <td style={overallValueStyle}>{totalAdd}</td>
                      <td style={overallValueStyle}>{totalDed}</td>
                      <td style={overallValueStyle}>{grandTotal}</td>
                    </tr>

                    {/* Spacer Row */}
                    <tr>
                      <td colSpan={4} style={spacerRowStyle}></td>
                    </tr>

                    {/* Net Salary Row */}
                    <tr>
                      <td colSpan={2} style={netSalaryLabelStyle}>
                        Net Salary
                      </td>
                      <td colSpan={2} style={netSalaryValueStyle}>
                        {netSalary}
                      </td>
                    </tr>

                    {/* Remarks Row */}
                    <tr>
                      <td colSpan={4} style={remarksCellStyle}>
                        Remarks: {report.remarks || 'GOOD'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })}
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
            grid-template-columns: 1fr 1fr !important;
            grid-template-rows: repeat(3, 1fr) !important;
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
            max-height: 94mm !important;
            overflow: hidden !important;
            border: 1.5px solid #000 !important;
          }
        }
      `}</style>
    </div>
  );
};

// --- Styles matching the reference template ---

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
  border: '1.5px solid #000',
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
  lineHeight: '1.2',
  fontFamily: "'Times New Roman', Times, Georgia, serif",
  color: '#000'
};

const cellBase = {
  border: '1px solid #000',
  padding: '2px 4px',
  boxSizing: 'border-box'
};

// Title: Light Peach
const titleCellStyle = {
  ...cellBase,
  backgroundColor: '#fce5cd',
  fontWeight: 'bold',
  fontSize: '11px',
  textAlign: 'center',
  padding: '3px 2px'
};

// Employee Name: Light Sky Blue
const nameCellStyle = {
  ...cellBase,
  backgroundColor: '#cfe2f3',
  fontWeight: 'bold',
  fontSize: '10px',
  textAlign: 'center',
  padding: '2.5px 2px',
  letterSpacing: '0.3px'
};

// Month, Days, Per day rate, Total salary: Light Sky Blue
const statsCellStyle = {
  ...cellBase,
  backgroundColor: '#cfe2f3',
  fontWeight: 'bold',
  fontSize: '9px',
  textAlign: 'center',
  padding: '2.5px 2px'
};

// Headers: Addition (Green) & Deduction (Peach)
const additionHeaderStyle = {
  ...cellBase,
  backgroundColor: '#b6d7a8',
  fontWeight: 'bold',
  fontSize: '10px',
  textAlign: 'center',
  padding: '2.5px'
};

const deductionHeaderStyle = {
  ...cellBase,
  backgroundColor: '#f9cb9c',
  fontWeight: 'bold',
  fontSize: '10px',
  textAlign: 'center',
  padding: '2.5px'
};

// Green Cells (Addition)
const greenLabelStyle = {
  ...cellBase,
  backgroundColor: '#d9ead3',
  textAlign: 'left',
  paddingLeft: '8px',
  fontSize: '9px'
};

const greenValueStyle = {
  ...cellBase,
  backgroundColor: '#d9ead3',
  textAlign: 'center',
  fontSize: '9px'
};

// Orange Cells (Deduction)
const orangeLabelStyle = {
  ...cellBase,
  backgroundColor: '#fce5cd',
  textAlign: 'left',
  paddingLeft: '8px',
  fontSize: '9px'
};

const orangeValueStyle = {
  ...cellBase,
  backgroundColor: '#fce5cd',
  textAlign: 'center',
  fontSize: '9px'
};

// Overall Total Section: Light Sky Blue
const overallTotalLabelStyle = {
  ...cellBase,
  backgroundColor: '#cfe2f3',
  fontWeight: 'bold',
  fontSize: '9.5px',
  textAlign: 'center',
  verticalAlign: 'middle'
};

const overallSubHeaderStyle = {
  ...cellBase,
  backgroundColor: '#cfe2f3',
  fontWeight: 'bold',
  fontSize: '9px',
  textAlign: 'center',
  padding: '2px'
};

const overallValueStyle = {
  ...cellBase,
  backgroundColor: '#cfe2f3',
  fontWeight: 'bold',
  fontSize: '9.5px',
  textAlign: 'center',
  padding: '2.5px'
};

// White separator row between overall total and net salary
const spacerRowStyle = {
  height: '4px',
  backgroundColor: '#ffffff',
  border: 'none',
  padding: 0
};

// Net Salary: Mauve / Lavender Pink
const netSalaryLabelStyle = {
  ...cellBase,
  backgroundColor: '#d5a6bd',
  fontWeight: 'bold',
  fontSize: '10px',
  textAlign: 'center',
  padding: '3px 2px'
};

const netSalaryValueStyle = {
  ...cellBase,
  backgroundColor: '#d5a6bd',
  fontWeight: 'bold',
  fontSize: '10.5px',
  textAlign: 'center',
  padding: '3px 2px'
};

// Remarks: Light Sky Blue
const remarksCellStyle = {
  ...cellBase,
  backgroundColor: '#cfe2f3',
  fontWeight: 'bold',
  fontSize: '9px',
  textAlign: 'center',
  padding: '2.5px 2px'
};

export default SalaryReport;
