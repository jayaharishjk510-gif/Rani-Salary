import React from 'react';

const SalaryReport = ({ data }) => {
  return (
    <div className="print-container" style={gridStyle}>
      {data.map((report, index) => (
        <div key={index} style={cardStyle}>
          <div style={headerStyle}>SALARY REPORT</div>
          <div style={nameStyle}>{report.name ? report.name.toUpperCase() : 'N/A'}</div>
          
          {/* Month Row */}
          <div style={rowStyle}>
            <span>{report.month}</span>
            <span>0</span>
            <span>0</span>
            <span>0</span>
          </div>
          
          <div style={sectionHeader(green)}>ADDICTION</div>
          <div style={flexRow}><span>INSENTIVE</span><span>{report.insentive || 0}</span></div>
          <div style={flexRow}><span>L.BONUS</span><span>{report.lBonus || 0}</span></div>
          <div style={flexRow}><span>RD</span><span>{report.rdAdd || 0}</span></div>
          
          <div style={sectionHeader(red)}>DEDUCTION</div>
          <div style={flexRow}><span>ADVANCE</span><span>{report.advance || 0}</span></div>
          <div style={flexRow}><span>J.BALANCE</span><span>{report.jBalance || 0}</span></div>
          <div style={flexRow}><span>PENALTY</span><span>{report.penalty || 0}</span></div>
          <div style={flexRow}><span>RD</span><span>{report.rdDed || 0}</span></div>
          
          <div style={sectionHeader(purple)}>
             <div style={flexRow}><span>TOTAL</span><span>{report.gTotal || 0}</span></div>
          </div>
          <div style={flexRow}><span>NET SALARY</span><span>{report.net || 0}</span></div>
          <div style={flexRow}><span>G.TOTAL</span><span>{report.gTotal || 0}</span></div>
          
          <div style={remarkStyle}>REMARKS: {report.remarks || 'GOOD'}</div>
        </div>
      ))}
    </div>
  );
};

// --- Styles ---

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '10px',
  padding: '10px',
  backgroundColor: '#fff',
  color: '#000'
};

const cardStyle = {
  border: '2px solid #000',
  fontSize: '10px',
  fontFamily: 'serif',
  textAlign: 'center',
  marginBottom: '10px'
};

const headerStyle = { backgroundColor: '#f9cb9c', fontWeight: 'bold', padding: '2px', borderBottom: '1px solid #000' };
const nameStyle = { backgroundColor: '#c27ba0', color: '#fff', padding: '2px', fontWeight: 'bold' };

// Fixed the missing rowStyle definition
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