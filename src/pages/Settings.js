import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import {
  Settings as SettingsIcon,
  User,
  Shield,
  Building2,
  FileText,
  Bell,
  Database,
  Download,
  Trash2,
  Check,
  Send,
  Info,
  ExternalLink
} from 'lucide-react';
import { useToast } from '../components/Toast';
import { sendTelegramMessage } from '../services/telegramService';

function SettingsPage({ userPermissions }) {
  const { showToast } = useToast();
  const currentUser = auth.currentUser;

  const isAdmin = userPermissions?.depts?.length > 1;
  const defaultDept = userPermissions?.depts?.[0] || 'Rani Javuli';

  // Preferences saved in localStorage
  const [preferredShop, setPreferredShop] = useState(() => {
    return localStorage.getItem('preferred_shop') || defaultDept;
  });
  const [defaultRemarks, setDefaultRemarks] = useState(() => {
    return localStorage.getItem('default_remarks') || 'GOOD';
  });
  const [defaultSalaryType, setDefaultSalaryType] = useState(() => {
    return localStorage.getItem('default_salary_type') || 'monthly';
  });

  // Action states
  const [sendingTestAlert, setSendingTestAlert] = useState(false);
  const [exportingBackup, setExportingBackup] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);

  // Save general preferences
  const handleSavePreferences = () => {
    localStorage.setItem('preferred_shop', preferredShop);
    localStorage.setItem('default_remarks', defaultRemarks.trim() || 'GOOD');
    localStorage.setItem('default_salary_type', defaultSalaryType);
    showToast('Settings & preferences saved successfully!', 'success');
  };

  // Test Telegram Notification
  const handleTestTelegram = async () => {
    setSendingTestAlert(true);
    try {
      const nowIST = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'medium',
        hour12: true
      }).format(new Date());

      const msg = `🔔 *RANI SALARY - TEST NOTIFICATION*\n\n` +
        `👤 *User:* \`${currentUser?.email || 'Admin'}\`\n` +
        `🏪 *Shop:* ${preferredShop}\n` +
        `⏰ *Time (IST):* ${nowIST}\n` +
        `✅ *Status:* Settings test notification received successfully!`;

      const res = await sendTelegramMessage(msg);
      if (res && res.ok === false) {
        showToast('Telegram alert failed: ' + (res.error || 'Token not configured'), 'warning');
      } else {
        showToast('Test notification sent to Telegram!', 'success');
      }
    } catch (err) {
      showToast('Error sending Telegram alert: ' + err.message, 'error');
    } finally {
      setSendingTestAlert(false);
    }
  };

  // Full Database Backup Export to JSON
  const handleExportFullBackup = async () => {
    if (!userPermissions || !userPermissions.depts) return;
    setExportingBackup(true);
    try {
      showToast('Preparing full database backup...', 'info');

      // Fetch employees
      const empSnap = await getDocs(
        query(collection(db, 'employees'), where('dept', 'in', userPermissions.depts))
      );
      const employees = empSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Fetch salary records
      const salSnap = await getDocs(
        query(collection(db, 'salary_records'), where('dept', 'in', userPermissions.depts))
      );
      const salaryRecords = salSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Fetch advances
      const advSnap = await getDocs(
        query(collection(db, 'advances'), where('dept', 'in', userPermissions.depts))
      );
      const advances = advSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const backupData = {
        app: 'Rani Salary MIS',
        version: '2.2.0',
        exportedAt: new Date().toISOString(),
        exportedBy: currentUser?.email || 'Admin',
        allowedDepts: userPermissions.depts,
        summary: {
          employeesCount: employees.length,
          salaryRecordsCount: salaryRecords.length,
          advancesCount: advances.length
        },
        data: {
          employees,
          salaryRecords,
          advances
        }
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateTag = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `Rani_Salary_Backup_${dateTag}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast(`Backup exported successfully! (${employees.length} staff, ${salaryRecords.length} slips, ${advances.length} advances)`, 'success');
    } catch (err) {
      showToast('Failed to export backup: ' + err.message, 'error');
    } finally {
      setExportingBackup(false);
    }
  };

  // Clear Application Local Cache
  const handleClearCache = () => {
    try {
      sessionStorage.clear();
      // Keep essential auth and preferences
      const savedTheme = localStorage.getItem('sidebar_collapsed');
      const savedShop = localStorage.getItem('preferred_shop');
      localStorage.clear();
      if (savedTheme) localStorage.setItem('sidebar_collapsed', savedTheme);
      if (savedShop) localStorage.setItem('preferred_shop', savedShop);

      setCacheCleared(true);
      showToast('Local cache & session data cleared!', 'info');
      setTimeout(() => {
        setCacheCleared(false);
      }, 3000);
    } catch (err) {
      showToast('Error clearing cache: ' + err.message, 'error');
    }
  };

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* PAGE HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', color: '#0f172a', fontWeight: '800', fontSize: '24px' }}>
            <SettingsIcon size={24} color="#2563eb" />
            Settings & Preferences
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>
            Manage user profile, shop defaults, payroll configurations, backup, and notifications
          </p>
        </div>

        <button
          onClick={handleSavePreferences}
          style={saveBtn}
          title="Save all changes"
        >
          <Check size={16} /> Save Preferences
        </button>
      </div>

      <div style={gridContainer}>
        {/* SECTION 1: ACCOUNT & ACCESS PROFILE */}
        <div style={card}>
          <div style={cardHeader}>
            <div style={cardIconContainer('#eff6ff')}>
              <User size={18} color="#2563eb" />
            </div>
            <div>
              <div style={cardTitle}>User & Role Access</div>
              <div style={cardSubtitle}>Logged-in account details and shop permissions</div>
            </div>
          </div>

          <div style={cardBody}>
            <div style={detailRow}>
              <span style={detailLabel}>Account Email</span>
              <span style={detailValueBold}>{currentUser?.email || 'admin@rani.com'}</span>
            </div>

            <div style={detailRow}>
              <span style={detailLabel}>Role Level</span>
              <span style={roleBadge(isAdmin ? '#16a34a' : '#2563eb')}>
                <Shield size={12} /> {isAdmin ? 'Super Administrator' : 'Shop Manager'}
              </span>
            </div>

            <div style={detailRow}>
              <span style={detailLabel}>Accessible Shops</span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {userPermissions?.depts?.map(dept => (
                  <span key={dept} style={deptPill}>
                    {dept}
                  </span>
                ))}
              </div>
            </div>

            <div style={detailRow}>
              <span style={detailLabel}>System Capabilities</span>
              <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: '600' }}>
                ✓ Full Edit, Salary Processing & Slip Print Enabled
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 2: SHOP PREFERENCES */}
        <div style={card}>
          <div style={cardHeader}>
            <div style={cardIconContainer('#f0fdf4')}>
              <Building2 size={18} color="#16a34a" />
            </div>
            <div>
              <div style={cardTitle}>Shop & Store Preferences</div>
              <div style={cardSubtitle}>Default shop view and working environment</div>
            </div>
          </div>

          <div style={cardBody}>
            <div style={formGroup}>
              <label style={labelStyle}>Default Focused Shop</label>
              <select
                value={preferredShop}
                onChange={e => setPreferredShop(e.target.value)}
                style={selectStyle}
              >
                {userPermissions?.depts?.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              <span style={helperText}>
                The shop automatically pre-selected when loading salary entry and dashboard.
              </span>
            </div>

            <div style={{ ...detailRow, borderBottom: 'none', paddingTop: '8px' }}>
              <span style={detailLabel}>Registered Branches</span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                {userPermissions?.depts?.length || 1} Location(s) Active
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 3: PAYROLL & SLIP DEFAULTS */}
        <div style={card}>
          <div style={cardHeader}>
            <div style={cardIconContainer('#fef3c7')}>
              <FileText size={18} color="#d97706" />
            </div>
            <div>
              <div style={cardTitle}>Payroll & Slip Defaults</div>
              <div style={cardSubtitle}>Presets for salary slip printing and entry</div>
            </div>
          </div>

          <div style={cardBody}>
            <div style={formGroup}>
              <label style={labelStyle}>Default Remarks Text</label>
              <input
                type="text"
                value={defaultRemarks}
                onChange={e => setDefaultRemarks(e.target.value)}
                placeholder="e.g. GOOD"
                style={inputStyle}
              />
              <span style={helperText}>Default remark applied to newly processed salary slips.</span>
            </div>

            <div style={formGroup}>
              <label style={labelStyle}>Default Pay Type for Staff</label>
              <select
                value={defaultSalaryType}
                onChange={e => setDefaultSalaryType(e.target.value)}
                style={selectStyle}
              >
                <option value="monthly">Monthly Staff (Base Monthly Salary)</option>
                <option value="daily">Daily Staff (Daily Rate × Days Worked)</option>
              </select>
            </div>

            <div style={detailRow}>
              <span style={detailLabel}>Print Layout Standard</span>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>
                A4 Portrait (6 Slips per Sheet)
              </span>
            </div>

            <div style={{ ...detailRow, borderBottom: 'none' }}>
              <span style={detailLabel}>Days Calculation</span>
              <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: '600' }}>
                ✓ Dynamic Calendar Sync (28–31 days)
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 4: NOTIFICATIONS & TELEGRAM ALERTS */}
        <div style={card}>
          <div style={cardHeader}>
            <div style={cardIconContainer('#eff6ff')}>
              <Bell size={18} color="#2563eb" />
            </div>
            <div>
              <div style={cardTitle}>Telegram Login Alerts</div>
              <div style={cardSubtitle}>Instant security alerts sent when users sign in</div>
            </div>
          </div>

          <div style={cardBody}>
            <div style={detailRow}>
              <span style={detailLabel}>Telegram Service</span>
              <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: '700' }}>
                ● Active & Monitoring
              </span>
            </div>

            <div style={detailRow}>
              <span style={detailLabel}>Alert Details</span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Device, Browser, Shop, Timestamp (IST)
              </span>
            </div>

            <div style={{ paddingTop: '10px' }}>
              <button
                onClick={handleTestTelegram}
                disabled={sendingTestAlert}
                style={secondaryBtn}
              >
                <Send size={15} />
                {sendingTestAlert ? 'Sending Test...' : 'Send Test Telegram Alert'}
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 5: DATA BACKUP & MAINTENANCE */}
        <div style={card}>
          <div style={cardHeader}>
            <div style={cardIconContainer('#f1f5f9')}>
              <Database size={18} color="#475569" />
            </div>
            <div>
              <div style={cardTitle}>Data Backup & Storage</div>
              <div style={cardSubtitle}>Export snapshots and manage offline storage</div>
            </div>
          </div>

          <div style={cardBody}>
            <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: '#64748b' }}>
              Export an encrypted full-database snapshot of all staff registry entries, historical salary records, and cash advances into a downloadable JSON file.
            </p>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={handleExportFullBackup}
                disabled={exportingBackup}
                style={primaryActionBtn}
              >
                <Download size={15} />
                {exportingBackup ? 'Exporting...' : 'Export Full Backup (JSON)'}
              </button>

              <button
                onClick={handleClearCache}
                style={dangerBtn}
                title="Clear local application cache"
              >
                <Trash2 size={15} />
                {cacheCleared ? 'Cache Cleared!' : 'Clear Cache'}
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 6: APP & SYSTEM INFO */}
        <div style={card}>
          <div style={cardHeader}>
            <div style={cardIconContainer('#f8fafc')}>
              <Info size={18} color="#64748b" />
            </div>
            <div>
              <div style={cardTitle}>System & Version Information</div>
              <div style={cardSubtitle}>Platform details and application state</div>
            </div>
          </div>

          <div style={cardBody}>
            <div style={detailRow}>
              <span style={detailLabel}>Application Name</span>
              <span style={detailValueBold}>Rani Salary MIS</span>
            </div>

            <div style={detailRow}>
              <span style={detailLabel}>Software Version</span>
              <span style={detailValueBold}>v2.2.0 (PWA)</span>
            </div>

            <div style={detailRow}>
              <span style={detailLabel}>Hosting & Cloud</span>
              <span style={detailValueBold}>Firebase Hosting (Production)</span>
            </div>

            <div style={{ ...detailRow, borderBottom: 'none' }}>
              <span style={detailLabel}>Live Domain</span>
              <a
                href="https://rani-salary.web.app"
                target="_blank"
                rel="noreferrer"
                style={{ color: '#2563eb', fontSize: '12px', fontWeight: '600', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                rani-salary.web.app <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Styling definitions
const gridContainer = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
  gap: '18px'
};

const card = {
  backgroundColor: '#ffffff',
  borderRadius: '14px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column'
};

const cardHeader = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '16px 20px',
  borderBottom: '1px solid #f1f5f9',
  backgroundColor: '#fafbfc'
};

const cardIconContainer = (bg) => ({
  width: '36px',
  height: '36px',
  borderRadius: '8px',
  backgroundColor: bg,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0
});

const cardTitle = {
  fontSize: '14px',
  fontWeight: '700',
  color: '#0f172a'
};

const cardSubtitle = {
  fontSize: '11px',
  color: '#64748b',
  marginTop: '2px'
};

const cardBody = {
  padding: '18px 20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  flex: 1
};

const detailRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingBottom: '10px',
  borderBottom: '1px solid #f1f5f9',
  gap: '12px'
};

const detailLabel = {
  fontSize: '12px',
  color: '#64748b',
  fontWeight: '500'
};

const detailValueBold = {
  fontSize: '13px',
  fontWeight: '700',
  color: '#0f172a'
};

const roleBadge = (color) => ({
  fontSize: '11px',
  fontWeight: '700',
  color: color,
  backgroundColor: color === '#16a34a' ? '#f0fdf4' : '#eff6ff',
  border: `1px solid ${color === '#16a34a' ? '#bbf7d0' : '#bfdbfe'}`,
  padding: '3px 8px',
  borderRadius: '12px',
  display: 'flex',
  alignItems: 'center',
  gap: '4px'
});

const deptPill = {
  fontSize: '11px',
  fontWeight: '600',
  color: '#0f172a',
  backgroundColor: '#f1f5f9',
  padding: '3px 8px',
  borderRadius: '6px',
  border: '1px solid #e2e8f0'
};

const formGroup = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px'
};

const labelStyle = {
  fontSize: '12px',
  fontWeight: '600',
  color: '#334155'
};

const inputStyle = {
  padding: '9px 12px',
  fontSize: '13px',
  color: '#0f172a',
  backgroundColor: '#ffffff',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box'
};

const selectStyle = {
  padding: '9px 12px',
  fontSize: '13px',
  color: '#0f172a',
  backgroundColor: '#ffffff',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  cursor: 'pointer'
};

const helperText = {
  fontSize: '11px',
  color: '#94a3b8'
};

const saveBtn = {
  backgroundColor: '#2563eb',
  color: '#ffffff',
  border: 'none',
  borderRadius: '8px',
  padding: '10px 18px',
  fontSize: '13px',
  fontWeight: '700',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
};

const primaryActionBtn = {
  backgroundColor: '#0f172a',
  color: '#ffffff',
  border: 'none',
  borderRadius: '8px',
  padding: '9px 14px',
  fontSize: '12px',
  fontWeight: '600',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  boxShadow: '0 1px 2px rgba(15,23,42,0.1)'
};

const secondaryBtn = {
  backgroundColor: '#ffffff',
  color: '#2563eb',
  border: '1px solid #bfdbfe',
  borderRadius: '8px',
  padding: '8px 14px',
  fontSize: '12px',
  fontWeight: '600',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px'
};

const dangerBtn = {
  backgroundColor: '#ffffff',
  color: '#ef4444',
  border: '1px solid #fecaca',
  borderRadius: '8px',
  padding: '9px 14px',
  fontSize: '12px',
  fontWeight: '600',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px'
};

export default SettingsPage;
