import React from 'react';

const SalaryReport = ({ data }) => {
  // Null guard: render nothing if data is missing or empty
  if (!data || data.length === 0) return null;

  // Chunk the records into groups of 6 (3 rows x 2 columns)
  const chunkedData = [];
  const chunkSize = 6;
  for (let i = 0; i < data.length; i += chunkSize) {
    chunkedData.push(data.slice(i, i + chunkSize));
  }

  return (
    <div className="report-container">
      {chunkedData.map((pageData, pageIdx) => (
        <div key={pageIdx} className="salary-report-page" style={pageStyle}>
          {pageData.map((report, index) => (
            <div key={index} className="salary-card" style={cardStyle}>
              <div style={headerStyle}>SALARY REPORT</div>
              <div style={nameStyle}>
                {report.name ? report.name.toUpperCase() : 'N/A'}
                {report.employeeCode ? ` [${report.employeeCode}]` : ''}
              </div>

              {/* Month Row */}
              <div style={rowStyle}>
                <span>{report.month} {report.year || ''}</span>
                <span>{report.days || 0} days</span>
                <span>₹{report.baseSalary || 0}{report.salaryType === 'monthly' || Number(report.baseSalary) > 1500 ? '/mo' : ''}</span>
                <span>₹{report.fixedEarnings || 0}</span>
              </div>

              <div style={sectionHeader(green)}>ADDITION</div>
              <div style={flexRow}><span>INCENTIVE</span><span>{report.incentive ?? report.insentive ?? 0}</span></div>
              <div style={flexRow}><span>L.BONUS</span><span>{report.lBonus || 0}</span></div>
              <div style={flexRow}><span>TS ALLOWANCE</span><span>{report.ts || 0}</span></div>
              <div style={flexRow}><span>RD</span><span>{report.rdAdd || 0}</span></div>

              <div style={sectionHeader(red)}>DEDUCTION</div>
              <div style={flexRow}><span>ADVANCE</span><span>{report.advance || 0}</span></div>
              <div style={flexRow}><span>J.BALANCE</span><span>{report.jBalance || 0}</span></div>
              <div style={flexRow}><span>PENALTY</span><span>{report.penalty || 0}</span></div>
              <div style={flexRow}><span>RD</span><span>{report.rdDed || 0}</span></div>
              <div style={flexRow}><span>PF</span><span>{report.pf || 0}</span></div>

              <div style={sectionHeader(purple)}>
                <div style={flexRow}><span>G.TOTAL</span><span>{report.gTotal || 0}</span></div>
              </div>
              <div style={{ ...flexRow, fontWeight: 'bold' }}><span>NET SALARY</span><span>{report.net ?? report.gTotal ?? 0}</span></div>

              <div style={remarkStyle}>REMARKS: {report.remarks || 'GOOD'}</div>
            </div>
          ))}
        </div>
      ))}

      <style>{`
        .salary-report-page {
          box-shadow: 0 4px 10px rgba(0,0,0,0.15);
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 5mm 6mm;
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
            width: 198mm !important;
            height: 284mm !important;
            max-height: 284mm !important;
            min-height: 284mm !important;
            box-sizing: border-box !important;
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            grid-template-rows: repeat(3, 1fr) !important;
            gap: 3mm !important;
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
            max-height: 92mm !important;
            overflow: hidden !important;
          }
        }
      `}</style>
    </div>
  );
};

// --- Styles ---

const pageStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gridTemplateRows: 'repeat(3, 1fr)',
  gap: '8px',
  padding: '12px',
  backgroundColor: '#fff',
  color: '#000',
  boxSizing: 'border-box',
  maxWidth: '210mm',
  minHeight: '297mm',
  margin: '0 auto 20px auto',
  border: '1px solid #ddd',
};

const cardStyle = {
  border: '1.5px solid #000',
  fontSize: '8.5px',
  lineHeight: 1.15,
  fontFamily: 'serif',
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  height: '100%',
  boxSizing: 'border-box',
  overflow: 'hidden'
};

const headerStyle = { backgroundColor: '#f9cb9c', fontWeight: 'bold', padding: '1.5px', borderBottom: '1px solid #000', fontSize: '9px' };
const nameStyle = { backgroundColor: '#c27ba0', color: '#fff', padding: '2px', fontWeight: 'bold', fontSize: '9px', letterSpacing: '0.3px' };

const rowStyle = {
  display: 'flex',
  justifyContent: 'space-around',
  padding: '3px 0',
  fontWeight: 'bold',
  borderBottom: '1px solid #000',
  backgroundColor: '#cfe2f3',
  fontSize: '8.5px'
};

const sectionHeader = (col) => ({
  backgroundColor: col,
  fontWeight: 'bold',
  borderTop: '1px solid #000',
  borderBottom: '1px solid #000',
  padding: '1.5px',
  fontSize: '8.5px'
});

const flexRow = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '1.5px 5px',
  borderBottom: '1px solid #eee'
};

const remarkStyle = { backgroundColor: '#3d85c6', color: '#fff', padding: '3px', fontWeight: 'bold', fontSize: '8.5px' };

const green = '#b6d7a8';
const red = '#ea9999';
const purple = '#b4a7d6';

export default SalaryReport;