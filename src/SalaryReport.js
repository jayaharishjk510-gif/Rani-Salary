import React from 'react';

const SalaryReport = ({ data }) => {
  // Null guard: render nothing if data is missing or empty
  if (!data || data.length === 0) return null;

  // Chunk the records into groups of 6
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
            <div key={index} style={cardStyle}>
              <div style={headerStyle}>SALARY REPORT</div>
              <div style={nameStyle}>{report.name ? report.name.toUpperCase() : 'N/A'}</div>

              {/* Month Row */}
              <div style={rowStyle}>
                <span>{report.month} {report.year || ''}</span>
                <span>{report.days || 0} days</span>
                <span>₹{report.baseSalary || 0}</span>
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
              <div style={flexRow}><span>NET SALARY</span><span>{report.net ?? report.gTotal ?? 0}</span></div>

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
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .salary-report-page {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 5mm !important;
            width: 100% !important;
            height: 100vh !important;
            page-break-after: always !important;
            break-after: page !important;
          }
          .salary-report-page:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
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
  gap: '10px',
  padding: '15px',
  backgroundColor: '#fff',
  color: '#000',
  boxSizing: 'border-box',
  maxWidth: '210mm',
  minHeight: '297mm',
  margin: '0 auto 20px auto',
  border: '1px solid #ddd',
};

const cardStyle = {
  border: '2px solid #000',
  fontSize: '10px',
  fontFamily: 'serif',
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  height: '100%',
  boxSizing: 'border-box'
};

const headerStyle = { backgroundColor: '#f9cb9c', fontWeight: 'bold', padding: '2px', borderBottom: '1px solid #000' };
const nameStyle = { backgroundColor: '#c27ba0', color: '#fff', padding: '2px', fontWeight: 'bold' };

const rowStyle = {
  display: 'flex',
  justifyContent: 'space-around',
  padding: '5px 0',
  fontWeight: 'bold',
  borderBottom: '1px solid #000',
  backgroundColor: '#cfe2f3'
};

const sectionHeader = (col) => ({
  backgroundColor: col,
  fontWeight: 'bold',
  borderTop: '1px solid #000',
  borderBottom: '1px solid #000',
  padding: '2px'
});

const flexRow = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '2px 5px',
  borderBottom: '1px solid #eee'
};

const remarkStyle = { backgroundColor: '#3d85c6', color: '#fff', padding: '5px', fontWeight: 'bold' };

const green = '#b6d7a8';
const red = '#ea9999';
const purple = '#b4a7d6';

export default SalaryReport;