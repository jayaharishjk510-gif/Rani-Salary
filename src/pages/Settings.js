import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
  onSnapshot
} from 'firebase/firestore';
import {
  Settings as SettingsIcon,
  User,
  Shield,
  Building2,
  FileText,
  Database,
  Download,
  Trash2,
  Check,
  Send,
  ExternalLink,
  Plus,
  HelpCircle,
  ToggleLeft,
  ToggleRight,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Printer,
  Type,
  LayoutTemplate,
  RotateCcw,
  Eye,
  Edit2,
  X,
  Lock
} from 'lucide-react';
import { useToast } from '../components/Toast';
import {
  sendTelegramMessage,
  TELEGRAM_CONFIG,
  getISTDateTime
} from '../services/telegramService';
import SalaryReport from '../SalaryReport';
import {
  getSavedSlipConfig,
  saveSlipConfigToStorage,
  resetSlipConfigToDefault
} from '../utils/slipConfig';

// Sample preview record matching realistic store payroll data
const SAMPLE_PREVIEW_RECORD = {
  name: 'SURESH KUMAR',
  employeeCode: 'RC-104',
  month: 'November',
  year: '2026',
  days: 30,
  baseSalary: 18000,
  salaryType: 'monthly',
  dailyRateEquiv: 600,
  fixedEarnings: 18000,
  incentive: 1500,
  lBonus: 500,
  rdAdd: 200,
  advance: 2000,
  jBalance: 500,
  penalty: 100,
  rdDed: 300,
  pf: 400,
  gTotal: 16900,
  net: 16900,
  remarks: 'GOOD PERFORMANCE'
};

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

  // Print Slip Editor State
  const [slipConfig, setSlipConfig] = useState(() => getSavedSlipConfig());
  const [isEditingSlip, setIsEditingSlip] = useState(false);
  const [tempSlipConfig, setTempSlipConfig] = useState(() => getSavedSlipConfig());
  const [slipEditorTab, setSlipEditorTab] = useState('layout'); // 'layout' | 'content'
  const [savingSlipConfig, setSavingSlipConfig] = useState(false);

  // Telegram Recipients state (Firestore synced)
  const [recipients, setRecipients] = useState([]);
  const [loadingRecipients, setLoadingRecipients] = useState(true);
  const [newPersonName, setNewPersonName] = useState('');
  const [newChatId, setNewChatId] = useState('');
  const [newRole, setNewRole] = useState('All Shops');
  const [addingRecipient, setAddingRecipient] = useState(false);
  const [testingId, setTestingId] = useState(null);
  const [showInstructions, setShowInstructions] = useState(true);

  // 1. Listen to Telegram Recipients in Firestore
  useEffect(() => {
    const q = collection(db, 'telegram_recipients');
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setRecipients(list);
      setLoadingRecipients(false);
    }, (err) => {
      console.warn('Error loading telegram recipients:', err);
      setLoadingRecipients(false);
    });
    return unsub;
  }, []);

  // Enter edit mode
  const handleStartEditSlip = () => {
    setTempSlipConfig({ ...slipConfig });
    setIsEditingSlip(true);
  };

  // Cancel edit mode
  const handleCancelEditSlip = () => {
    setTempSlipConfig({ ...slipConfig });
    setIsEditingSlip(false);
    showToast('Cancelled layout edits.', 'info');
  };

  // Update a single property in tempSlipConfig while editing
  const updateSlipConfig = (key, value) => {
    setTempSlipConfig(prev => ({ ...prev, [key]: value }));
  };

  // Save print slip configuration to localStorage and Firestore
  const handleSaveSlipConfig = async () => {
    setSavingSlipConfig(true);
    try {
      saveSlipConfigToStorage(tempSlipConfig);
      setSlipConfig({ ...tempSlipConfig });

      // Also persist to Firestore so all managers share the custom layout
      try {
        await setDoc(doc(db, 'app_settings', 'print_slip'), {
          ...tempSlipConfig,
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser?.email || 'Admin'
        }, { merge: true });
      } catch (fsErr) {
        console.warn('Firestore print_slip sync skipped (offline or permissions):', fsErr);
      }

      setIsEditingSlip(false);
      showToast('Print slip layout and contents saved successfully!', 'success');
    } catch (err) {
      showToast('Failed to save slip layout: ' + err.message, 'error');
    } finally {
      setSavingSlipConfig(false);
    }
  };

  // Reset slip configuration back to factory default template
  const handleResetSlipConfig = () => {
    if (window.confirm('Reset salary slip layout and all labels back to the original reference template?')) {
      const fresh = resetSlipConfigToDefault();
      setTempSlipConfig(fresh);
      setSlipConfig(fresh);
      setIsEditingSlip(false);
      showToast('Salary slip restored to default reference template.', 'info');
    }
  };

  // Trigger browser print test of sample slip
  const handlePrintTestSlip = () => {
    window.print();
  };

  // Save general shop & user preferences
  const handleSavePreferences = () => {
    localStorage.setItem('preferred_shop', preferredShop);
    localStorage.setItem('default_remarks', defaultRemarks.trim() || 'GOOD');
    localStorage.setItem('default_salary_type', defaultSalaryType);
    showToast('Settings and preferences saved successfully!', 'success');
  };

  // Add new person for Telegram notifications
  const handleAddRecipient = async (e) => {
    e.preventDefault();
    if (!newPersonName.trim()) {
      showToast('Please enter the person\'s name or role.', 'warning');
      return;
    }
    const cleanId = newChatId.trim();
    if (!cleanId) {
      showToast('Please enter their numeric Telegram Chat ID.', 'warning');
      return;
    }

    setAddingRecipient(true);
    try {
      await addDoc(collection(db, 'telegram_recipients'), {
        name: newPersonName.trim(),
        chatId: cleanId,
        dept: newRole,
        enabled: true,
        addedBy: currentUser?.email || 'Admin',
        createdAt: new Date().toISOString()
      });

      setNewPersonName('');
      setNewChatId('');
      showToast(`Added ${newPersonName.trim()} to Telegram alerts!`, 'success');
    } catch (err) {
      showToast('Failed to add recipient: ' + err.message, 'error');
    } finally {
      setAddingRecipient(false);
    }
  };

  // Toggle recipient active / paused
  const handleToggleRecipient = async (recipient) => {
    try {
      const newStatus = recipient.enabled === false;
      await updateDoc(doc(db, 'telegram_recipients', recipient.id), {
        enabled: newStatus
      });
      showToast(`${recipient.name} is now ${newStatus ? 'active' : 'paused'}.`, 'info');
    } catch (err) {
      showToast('Error updating status: ' + err.message, 'error');
    }
  };

  // Delete recipient
  const handleDeleteRecipient = async (recipient) => {
    if (!window.confirm(`Remove ${recipient.name} from Telegram notifications?`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'telegram_recipients', recipient.id));
      showToast(`Removed ${recipient.name}.`, 'info');
    } catch (err) {
      showToast('Error deleting recipient: ' + err.message, 'error');
    }
  };

  // Send test message to a specific recipient
  const handleTestSpecificRecipient = async (recipient) => {
    setTestingId(recipient.id);
    try {
      const nowIST = getISTDateTime();
      const msg = [
        `<b>[RANI SALARY - TEST NOTIFICATION]</b>`,
        ``,
        `Hello <b>${recipient.name}</b>,`,
        `This is a test notification confirming your Telegram setup is active!`,
        ``,
        `<b>Shop:</b> ${recipient.dept || 'All Shops'}`,
        `<b>Time:</b> ${nowIST} (IST)`,
        `<b>Triggered By:</b> <code>${currentUser?.email || 'Admin'}</code>`
      ].join('\n');

      const res = await sendTelegramMessage(msg, { targetChatIds: [recipient.chatId] });
      if (res && res.ok) {
        showToast(`Test message sent successfully to ${recipient.name}!`, 'success');
      } else {
        showToast(`Failed to send test to ${recipient.name}: ${res?.error || 'Check Chat ID or bot start status'}`, 'error');
      }
    } catch (err) {
      showToast(`Error sending test: ${err.message}`, 'error');
    } finally {
      setTestingId(null);
    }
  };

  // Broadcast test to all active recipients
  const handleTestBroadcast = async () => {
    setSendingTestAlert(true);
    try {
      const nowIST = getISTDateTime();
      const msg = [
        `<b>[RANI SALARY - BROADCAST TEST]</b>`,
        ``,
        `<b>Triggered By:</b> <code>${currentUser?.email || 'Admin'}</code>`,
        `<b>Shop:</b> ${preferredShop}`,
        `<b>Time:</b> ${nowIST} (IST)`,
        `<b>Status:</b> System alert broadcast to all active managers and recipients!`
      ].join('\n');

      const res = await sendTelegramMessage(msg);
      if (res && res.ok) {
        showToast(`Test broadcast sent to all ${recipients.length + 1} active recipients!`, 'success');
      } else {
        showToast('Telegram broadcast failed: ' + (res?.error || 'Token not configured'), 'warning');
      }
    } catch (err) {
      showToast('Error broadcasting alert: ' + err.message, 'error');
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

      const empSnap = await getDocs(
        query(collection(db, 'employees'), where('dept', 'in', userPermissions.depts))
      );
      const employees = empSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const salSnap = await getDocs(
        query(collection(db, 'salary_records'), where('dept', 'in', userPermissions.depts))
      );
      const salaryRecords = salSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const advSnap = await getDocs(
        query(collection(db, 'advances'), where('dept', 'in', userPermissions.depts))
      );
      const advances = advSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const backupData = {
        app: 'Rani Salary MIS',
        version: '2.4.0',
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
      const savedTheme = localStorage.getItem('sidebar_collapsed');
      const savedShop = localStorage.getItem('preferred_shop');
      const savedSlip = localStorage.getItem('salary_slip_layout_config');
      localStorage.clear();
      if (savedTheme) localStorage.setItem('sidebar_collapsed', savedTheme);
      if (savedShop) localStorage.setItem('preferred_shop', savedShop);
      if (savedSlip) localStorage.setItem('salary_slip_layout_config', savedSlip);

      setCacheCleared(true);
      showToast('Local cache and session data cleared!', 'info');
      setTimeout(() => setCacheCleared(false), 3000);
    } catch (err) {
      showToast('Error clearing cache: ' + err.message, 'error');
    }
  };

  // Active configuration currently reflected in preview
  const activePreviewConfig = isEditingSlip ? tempSlipConfig : slipConfig;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '50px' }}>
      {/* PAGE HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', color: '#0f172a', fontWeight: '800', fontSize: '24px' }}>
            <SettingsIcon size={24} color="#2563eb" />
            Settings & Preferences
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>
            Customize print slip layout and contents, Telegram alert recipients, shop defaults, and data backups
          </p>
        </div>

        <button
          onClick={handleSavePreferences}
          style={saveBtn}
          title="Save all general preferences"
        >
          <Check size={16} /> Save Preferences
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>

        {/* ========================================================================= */}
        {/* PRINT SLIP LAYOUT & CONTENT CUSTOMIZER (WITH EDIT BUTTON / LOCK WORKFLOW) */}
        {/* ========================================================================= */}
        <div style={{ ...card, border: isEditingSlip ? '1.5px solid #2563eb' : '1.5px solid #cbd5e1', boxShadow: '0 4px 14px rgba(15, 23, 42, 0.06)' }}>
          <div style={{ ...cardHeader, backgroundColor: isEditingSlip ? '#eff6ff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={cardIconContainer('#dbeafe')}>
                <Printer size={19} color="#1d4ed8" />
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Print Salary Slip Layout & Content
                  {isEditingSlip ? (
                    <span style={{ fontSize: '11px', fontWeight: '700', backgroundColor: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '10px' }}>
                      Editing Mode
                    </span>
                  ) : (
                    <span style={{ fontSize: '11px', fontWeight: '600', backgroundColor: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Lock size={11} /> Saved
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  {isEditingSlip
                    ? 'Adjust the controls below. Changes update in the preview immediately.'
                    : 'Click Edit Design to customize sheet layout, title, column headers, item labels, and signatures.'}
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS HEADER */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              {!isEditingSlip ? (
                <>
                  <button
                    type="button"
                    onClick={handlePrintTestSlip}
                    style={secondaryBtn}
                    title="Print sample test slip to printer"
                  >
                    <Printer size={13} /> Print Test Slip
                  </button>
                  <button
                    type="button"
                    onClick={handleStartEditSlip}
                    style={saveBtn}
                    title="Unlock and customize layout or labels"
                  >
                    <Edit2 size={14} /> Edit Design
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleCancelEditSlip}
                    style={secondaryBtn}
                    title="Cancel changes and lock editor"
                  >
                    <X size={13} /> Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleResetSlipConfig}
                    style={secondaryBtn}
                    title="Reset to factory template"
                  >
                    <RotateCcw size={13} /> Reset Default
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveSlipConfig}
                    disabled={savingSlipConfig}
                    style={{ ...saveBtn, padding: '7px 16px', fontSize: '12px' }}
                    title="Save changes and lock editor"
                  >
                    <Check size={14} /> {savingSlipConfig ? 'Saving...' : 'Save Changes'}
                  </button>
                </>
              )}
            </div>
          </div>

          <div style={{ padding: '20px' }}>
            {/* TWO-COLUMN DISPLAY: CONTROLS/OVERVIEW ON LEFT, LIVE PREVIEW ON RIGHT */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: '24px',
              alignItems: 'start'
            }}>

              {/* LEFT COLUMN: VIEW OVERVIEW OR EDITING CONTROLS */}
              <div>
                {!isEditingSlip ? (
                  /* ================= READ-ONLY SUMMARY VIEW ================= */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{
                      backgroundColor: '#f8fafc',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                          Current Print Configuration
                        </div>
                        <button
                          type="button"
                          onClick={handleStartEditSlip}
                          style={{ ...secondaryBtn, padding: '4px 10px', fontSize: '11px', borderColor: '#bfdbfe', color: '#2563eb' }}
                        >
                          <Edit2 size={12} /> Edit
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
                        <div style={{ backgroundColor: '#ffffff', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Slip Title</span>
                          <strong style={{ color: '#0f172a' }}>{slipConfig.titleText || 'Salary Report'}</strong>
                        </div>
                        <div style={{ backgroundColor: '#ffffff', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Sheet Layout</span>
                          <strong style={{ color: '#0f172a' }}>{slipConfig.slipsPerPage} Slips per A4 Page</strong>
                        </div>
                        <div style={{ backgroundColor: '#ffffff', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Color Palette</span>
                          <strong style={{ color: '#0f172a', textTransform: 'capitalize' }}>{slipConfig.colorTheme}</strong>
                        </div>
                        <div style={{ backgroundColor: '#ffffff', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Font Family</span>
                          <strong style={{ color: '#0f172a', textTransform: 'capitalize' }}>{slipConfig.fontFamily}</strong>
                        </div>
                      </div>

                      <div style={{ fontSize: '12px', color: '#334155', borderTop: '1px solid #e2e8f0', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div>
                          <strong>Section Headers:</strong> Addition: <em>"{slipConfig.additionHeader}"</em> | Deduction: <em>"{slipConfig.deductionHeader}"</em>
                        </div>
                        <div>
                          <strong>Addition Items:</strong> {slipConfig.incentiveLabel}, {slipConfig.lBonusLabel}, {slipConfig.rdAddLabel}
                        </div>
                        <div>
                          <strong>Deduction Items:</strong> {slipConfig.advanceLabel}, {slipConfig.jBalanceLabel}, {slipConfig.penaltyLabel}, {slipConfig.rdDedLabel}, {slipConfig.pfLabel}
                        </div>
                        <div>
                          <strong>Signatures:</strong> {slipConfig.showSignatures ? `Enabled (${slipConfig.signatureLeftText} / ${slipConfig.signatureRightText})` : 'Disabled'}
                        </div>
                        <div>
                          <strong>Remarks Row:</strong> {slipConfig.showRemarksRow ? `Enabled (${slipConfig.remarksPrefix} ${slipConfig.defaultRemarksText})` : 'Hidden'}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleStartEditSlip}
                      style={{
                        ...saveBtn,
                        width: '100%',
                        justifyContent: 'center',
                        padding: '10px',
                        fontSize: '13px'
                      }}
                    >
                      <Edit2 size={15} /> Edit Slip Layout & Content
                    </button>
                  </div>
                ) : (
                  /* ================= EDITING CONTROLS ================= */
                  <div>
                    {/* TAB SWITCHER */}
                    <div style={{
                      display: 'flex',
                      backgroundColor: '#f1f5f9',
                      padding: '4px',
                      borderRadius: '10px',
                      marginBottom: '18px',
                      gap: '4px'
                    }}>
                      <button
                        type="button"
                        onClick={() => setSlipEditorTab('layout')}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: 'none',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '7px',
                          backgroundColor: slipEditorTab === 'layout' ? '#ffffff' : 'transparent',
                          color: slipEditorTab === 'layout' ? '#1d4ed8' : '#64748b',
                          boxShadow: slipEditorTab === 'layout' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <LayoutTemplate size={14} /> 1. Layout & Styling
                      </button>
                      <button
                        type="button"
                        onClick={() => setSlipEditorTab('content')}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: 'none',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '7px',
                          backgroundColor: slipEditorTab === 'content' ? '#ffffff' : 'transparent',
                          color: slipEditorTab === 'content' ? '#1d4ed8' : '#64748b',
                          boxShadow: slipEditorTab === 'content' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <Type size={14} /> 2. Slip Contents & Labels
                      </button>
                    </div>

                    {/* TAB 1: LAYOUT & STYLING */}
                    {slipEditorTab === 'layout' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        {/* Slips Per Page */}
                        <div style={formGroup}>
                          <label style={labelStyle}>
                            Slips Per A4 Sheet
                          </label>
                          <select
                            value={tempSlipConfig.slipsPerPage}
                            onChange={e => updateSlipConfig('slipsPerPage', Number(e.target.value))}
                            style={selectStyle}
                          >
                            <option value={6}>6 Slips per Sheet (3 rows x 2 cols - Standard Pocket Slip)</option>
                            <option value={4}>4 Slips per Sheet (2 rows x 2 cols - Medium Slip)</option>
                            <option value={2}>2 Slips per Sheet (2 rows x 1 col - Half Page Voucher)</option>
                            <option value={1}>1 Slip per Sheet (Full Page Statement)</option>
                          </select>
                          <span style={helperText}>Controls how many salary slips are fitted onto each printed A4 sheet.</span>
                        </div>

                        {/* Color Palette Theme (No emojis) */}
                        <div style={formGroup}>
                          <label style={labelStyle}>
                            Color Theme
                          </label>
                          <select
                            value={tempSlipConfig.colorTheme}
                            onChange={e => updateSlipConfig('colorTheme', e.target.value)}
                            style={selectStyle}
                          >
                            <option value="colored">Classic Pastel (Peach title, Blue stats, Green addition, Mauve net)</option>
                            <option value="monochrome">Grayscale (Optimized for black-and-white laser printers and photocopies)</option>
                            <option value="minimal">Clean White and Black (Crisp white cells with sharp black borders)</option>
                          </select>
                          <span style={helperText}>Choose colors for screen preview and print ink output.</span>
                        </div>

                        {/* Font Family */}
                        <div style={formGroup}>
                          <label style={labelStyle}>
                            Typography / Font Style
                          </label>
                          <select
                            value={tempSlipConfig.fontFamily}
                            onChange={e => updateSlipConfig('fontFamily', e.target.value)}
                            style={selectStyle}
                          >
                            <option value="serif">Times New Roman (Formal Accounting Serif)</option>
                            <option value="sans">Modern Sans-Serif (Clean, contemporary system font)</option>
                            <option value="mono">Courier New (Monospace typewriter / receipt style)</option>
                          </select>
                        </div>

                        {/* Card Border Style */}
                        <div style={formGroup}>
                          <label style={labelStyle}>
                            Card Border Style
                          </label>
                          <select
                            value={tempSlipConfig.borderStyle}
                            onChange={e => updateSlipConfig('borderStyle', e.target.value)}
                            style={selectStyle}
                          >
                            <option value="solid">Solid Line (1.5px standard border)</option>
                            <option value="dashed">Dashed Line (Coupon / tear-off style)</option>
                            <option value="double">Double Line (Formal accounting voucher)</option>
                          </select>
                        </div>

                        {/* Signatures Row Toggle & Text */}
                        <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>Include Signature Lines at Bottom</div>
                              <div style={{ fontSize: '11px', color: '#64748b' }}>Adds signature lines for employee acknowledgement and cashier sign-off</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => updateSlipConfig('showSignatures', !tempSlipConfig.showSignatures)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: tempSlipConfig.showSignatures ? '#16a34a' : '#94a3b8' }}
                            >
                              {tempSlipConfig.showSignatures ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                            </button>
                          </div>

                          {tempSlipConfig.showSignatures && (
                            <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                              <div>
                                <label style={{ fontSize: '11px', color: '#475569', fontWeight: '600' }}>Left Signature Label</label>
                                <input
                              type="text"
                              value={tempSlipConfig.signatureLeftText}
                              onChange={e => updateSlipConfig('signatureLeftText', e.target.value)}
                              style={{ ...inputStyle, fontSize: '12px', padding: '6px 10px' }}
                              placeholder="e.g. Employee Signature"
                            />
                              </div>
                              <div>
                                <label style={{ fontSize: '11px', color: '#475569', fontWeight: '600' }}>Right Signature Label</label>
                                <input
                              type="text"
                              value={tempSlipConfig.signatureRightText}
                              onChange={e => updateSlipConfig('signatureRightText', e.target.value)}
                              style={{ ...inputStyle, fontSize: '12px', padding: '6px 10px' }}
                              placeholder="e.g. Authorized Signatory"
                            />
                              </div>
                            </div>
                          )}
                        </div>

                      </div>
                    )}

                    {/* TAB 2: SLIP CONTENTS & LABELS */}
                    {slipEditorTab === 'content' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        {/* Header Title */}
                        <div style={formGroup}>
                          <label style={labelStyle}>Report Title Text</label>
                          <input
                            type="text"
                            value={tempSlipConfig.titleText}
                            onChange={e => updateSlipConfig('titleText', e.target.value)}
                            placeholder="e.g. Salary Report or Rani Silks - Salary Slip"
                            style={inputStyle}
                          />
                          <span style={helperText}>Topmost heading of each printed slip.</span>
                        </div>

                        {/* Subtitle / Company Heading */}
                        <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>Show Subtitle / Shop Name</div>
                              <div style={{ fontSize: '11px', color: '#64748b' }}>Displays store name or branch right below the main title</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => updateSlipConfig('showSubTitle', !tempSlipConfig.showSubTitle)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: tempSlipConfig.showSubTitle ? '#16a34a' : '#94a3b8' }}
                            >
                              {tempSlipConfig.showSubTitle ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
                            </button>
                          </div>

                          {tempSlipConfig.showSubTitle && (
                            <div style={{ marginTop: '10px' }}>
                              <input
                                type="text"
                                value={tempSlipConfig.subTitleText}
                                onChange={e => updateSlipConfig('subTitleText', e.target.value)}
                                style={{ ...inputStyle, fontSize: '12px', padding: '6px 10px' }}
                                placeholder="e.g. Rani Silks & Readymades, Dharmapuri"
                              />
                            </div>
                          )}
                        </div>

                        {/* Employee Code & Stats Toggle */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#334155', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={tempSlipConfig.showEmployeeCode}
                              onChange={e => updateSlipConfig('showEmployeeCode', e.target.checked)}
                              style={{ cursor: 'pointer' }}
                            />
                            <span>Show Staff Code [RC-104]</span>
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#334155', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={tempSlipConfig.showStatsRow}
                              onChange={e => updateSlipConfig('showStatsRow', e.target.checked)}
                              style={{ cursor: 'pointer' }}
                            />
                            <span>Show Days & Rate Row</span>
                          </label>
                        </div>

                        {/* Column Headers: Addition & Deduction */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <div style={formGroup}>
                            <label style={labelStyle}>Addition Column Header</label>
                            <input
                              type="text"
                              value={tempSlipConfig.additionHeader}
                              onChange={e => updateSlipConfig('additionHeader', e.target.value)}
                              placeholder="e.g. Addition / Earnings"
                              style={inputStyle}
                            />
                          </div>
                          <div style={formGroup}>
                            <label style={labelStyle}>Deduction Column Header</label>
                            <input
                              type="text"
                              value={tempSlipConfig.deductionHeader}
                              onChange={e => updateSlipConfig('deductionHeader', e.target.value)}
                              placeholder="e.g. Deduction / Deductions"
                              style={inputStyle}
                            />
                          </div>
                        </div>

                        {/* Addition Field Labels */}
                        <div style={{ backgroundColor: '#f0fdf4', padding: '12px', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                          <div style={{ fontSize: '12px', fontWeight: '700', color: '#166534', marginBottom: '8px' }}>
                            Addition Line Item Labels
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                            <div>
                              <label style={{ fontSize: '10px', color: '#166534', fontWeight: '600' }}>Item 1</label>
                              <input
                                type="text"
                                value={tempSlipConfig.incentiveLabel}
                                onChange={e => updateSlipConfig('incentiveLabel', e.target.value)}
                                style={{ ...inputStyle, fontSize: '12px', padding: '5px 8px' }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '10px', color: '#166534', fontWeight: '600' }}>Item 2</label>
                              <input
                                type="text"
                                value={tempSlipConfig.lBonusLabel}
                                onChange={e => updateSlipConfig('lBonusLabel', e.target.value)}
                                style={{ ...inputStyle, fontSize: '12px', padding: '5px 8px' }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '10px', color: '#166534', fontWeight: '600' }}>Item 3</label>
                              <input
                                type="text"
                                value={tempSlipConfig.rdAddLabel}
                                onChange={e => updateSlipConfig('rdAddLabel', e.target.value)}
                                style={{ ...inputStyle, fontSize: '12px', padding: '5px 8px' }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Deduction Field Labels */}
                        <div style={{ backgroundColor: '#fff7ed', padding: '12px', borderRadius: '10px', border: '1px solid #fed7aa' }}>
                          <div style={{ fontSize: '12px', fontWeight: '700', color: '#9a3412', marginBottom: '8px' }}>
                            Deduction Line Item Labels
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '8px' }}>
                            <div>
                              <label style={{ fontSize: '10px', color: '#9a3412', fontWeight: '600' }}>Item 1</label>
                              <input
                                type="text"
                                value={tempSlipConfig.advanceLabel}
                                onChange={e => updateSlipConfig('advanceLabel', e.target.value)}
                                style={{ ...inputStyle, fontSize: '12px', padding: '5px 8px' }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '10px', color: '#9a3412', fontWeight: '600' }}>Item 2</label>
                              <input
                                type="text"
                                value={tempSlipConfig.jBalanceLabel}
                                onChange={e => updateSlipConfig('jBalanceLabel', e.target.value)}
                                style={{ ...inputStyle, fontSize: '12px', padding: '5px 8px' }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '10px', color: '#9a3412', fontWeight: '600' }}>Item 3</label>
                              <input
                                type="text"
                                value={tempSlipConfig.penaltyLabel}
                                onChange={e => updateSlipConfig('penaltyLabel', e.target.value)}
                                style={{ ...inputStyle, fontSize: '12px', padding: '5px 8px' }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '10px', color: '#9a3412', fontWeight: '600' }}>Item 4</label>
                              <input
                                type="text"
                                value={tempSlipConfig.rdDedLabel}
                                onChange={e => updateSlipConfig('rdDedLabel', e.target.value)}
                                style={{ ...inputStyle, fontSize: '12px', padding: '5px 8px' }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '10px', color: '#9a3412', fontWeight: '600' }}>Item 5</label>
                              <input
                                type="text"
                                value={tempSlipConfig.pfLabel}
                                onChange={e => updateSlipConfig('pfLabel', e.target.value)}
                                style={{ ...inputStyle, fontSize: '12px', padding: '5px 8px' }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Overall Total & Net Salary Labels */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <div style={formGroup}>
                            <label style={labelStyle}>Overall Total Label</label>
                            <input
                              type="text"
                              value={tempSlipConfig.overallTotalHeader}
                              onChange={e => updateSlipConfig('overallTotalHeader', e.target.value)}
                              placeholder="Overall Total"
                              style={inputStyle}
                            />
                          </div>
                          <div style={formGroup}>
                            <label style={labelStyle}>Net Salary Label</label>
                            <input
                              type="text"
                              value={tempSlipConfig.netSalaryHeader}
                              onChange={e => updateSlipConfig('netSalaryHeader', e.target.value)}
                              placeholder="Net Salary"
                              style={inputStyle}
                            />
                          </div>
                        </div>

                        {/* Remarks Section */}
                        <div style={{ backgroundColor: '#eff6ff', padding: '12px', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: '700', color: '#1e3a8a' }}>Remarks Row</div>
                              <div style={{ fontSize: '11px', color: '#3b82f6' }}>Shows remarks text at the bottom of the card</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => updateSlipConfig('showRemarksRow', !tempSlipConfig.showRemarksRow)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: tempSlipConfig.showRemarksRow ? '#16a34a' : '#94a3b8' }}
                            >
                              {tempSlipConfig.showRemarksRow ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
                            </button>
                          </div>

                          {tempSlipConfig.showRemarksRow && (
                            <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px' }}>
                              <div>
                                <label style={{ fontSize: '10px', color: '#1e3a8a', fontWeight: '600' }}>Prefix Label</label>
                                <input
                                  type="text"
                                  value={tempSlipConfig.remarksPrefix}
                                  onChange={e => updateSlipConfig('remarksPrefix', e.target.value)}
                                  style={{ ...inputStyle, fontSize: '12px', padding: '5px 8px' }}
                                  placeholder="Remarks:"
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: '10px', color: '#1e3a8a', fontWeight: '600' }}>Default Remark Value</label>
                                <input
                                  type="text"
                                  value={tempSlipConfig.defaultRemarksText}
                                  onChange={e => updateSlipConfig('defaultRemarksText', e.target.value)}
                                  style={{ ...inputStyle, fontSize: '12px', padding: '5px 8px' }}
                                  placeholder="GOOD"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: LIVE INTERACTIVE PREVIEW CARD */}
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                position: 'sticky',
                top: '20px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                    <Eye size={16} color="#2563eb" />
                    <span>Real-Time Slip Preview</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>
                    {isEditingSlip ? 'Updates instantly as you edit' : 'Current active template'}
                  </div>
                </div>

                {/* THE LIVE SALARY REPORT CARD PREVIEW */}
                <div style={{ backgroundColor: '#ffffff', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <SalaryReport
                    data={[SAMPLE_PREVIEW_RECORD]}
                    config={activePreviewConfig}
                    isPreview={true}
                  />
                </div>

                {/* SUMMARY PILLS OF ACTIVE CONFIG (NO EMOJIS) */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', fontSize: '11px' }}>
                  <span style={deptPill}>
                    {activePreviewConfig.slipsPerPage} Slips/Sheet
                  </span>
                  <span style={{ ...deptPill, textTransform: 'capitalize' }}>
                    Theme: {activePreviewConfig.colorTheme}
                  </span>
                  <span style={{ ...deptPill, textTransform: 'capitalize' }}>
                    Font: {activePreviewConfig.fontFamily}
                  </span>
                  {activePreviewConfig.showSignatures && (
                    <span style={{ ...deptPill, backgroundColor: '#f0fdf4', color: '#166534', borderColor: '#bbf7d0' }}>
                      Signatures: Enabled
                    </span>
                  )}
                </div>

                {/* PRINT SAMPLE BUTTON */}
                <button
                  type="button"
                  onClick={handlePrintTestSlip}
                  style={{
                    ...secondaryBtn,
                    backgroundColor: '#ffffff',
                    color: '#2563eb',
                    borderColor: '#bfdbfe',
                    padding: '8px 14px',
                    fontSize: '12px',
                    width: '100%',
                    justifyContent: 'center'
                  }}
                >
                  <Printer size={14} /> Print This Sample Card
                </button>
              </div>

            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TELEGRAM NOTIFICATION PEOPLE MANAGER                                      */}
        {/* ========================================================================= */}
        <div style={{ ...card, border: '1px solid #bfdbfe', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.05)' }}>
          <div style={{ ...cardHeader, backgroundColor: '#eff6ff', borderBottom: '1px solid #dbeafe' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={cardIconContainer('#dbeafe')}>
                <MessageSquare size={18} color="#1d4ed8" />
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '800', color: '#1e3a8a' }}>
                  Telegram Notification Recipients
                </div>
                <div style={{ fontSize: '12px', color: '#3b82f6', marginTop: '2px' }}>
                  Add owners, managers, or Telegram groups to receive real-time login and payroll alerts
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <a
                href={TELEGRAM_CONFIG.botUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  ...secondaryBtn,
                  backgroundColor: '#ffffff',
                  color: '#1d4ed8',
                  borderColor: '#bfdbfe',
                  padding: '6px 12px',
                  fontSize: '12px'
                }}
                title="Open bot in Telegram"
              >
                <ExternalLink size={13} /> Open @{TELEGRAM_CONFIG.botUsername}
              </a>
              <button
                onClick={handleTestBroadcast}
                disabled={sendingTestAlert}
                style={{ ...saveBtn, padding: '7px 14px', fontSize: '12px' }}
                title="Send test alert to all recipients"
              >
                <Send size={13} /> {sendingTestAlert ? 'Sending...' : 'Test All'}
              </button>
            </div>
          </div>

          <div style={cardBody}>
            {/* COLLAPSIBLE INSTRUCTIONS CARD */}
            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '10px'
            }}>
              <div
                onClick={() => setShowInstructions(!showInstructions)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontWeight: '700', fontSize: '13px' }}>
                  <HelpCircle size={17} color="#2563eb" />
                  <span>How to Add a Person or Group (Step-by-Step Instructions)</span>
                </div>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                >
                  {showInstructions ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
              </div>

              {showInstructions && (
                <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px', color: '#334155', lineHeight: '1.5' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={stepNumberBadge}>1</div>
                    <div>
                      <strong>Open the Bot & Press START (Crucial Step):</strong>
                      <p style={{ margin: '2px 0 0 0', color: '#64748b' }}>
                        The person must open{' '}
                        <a href="https://t.me/Rani_alerts_bot" target="_blank" rel="noreferrer" style={linkStyle}>
                          @Rani_alerts_bot <ExternalLink size={11} style={{ display: 'inline' }} />
                        </a>{' '}
                        in Telegram and tap the <strong>START</strong> button at the bottom.
                        <br />
                        <span style={{ color: '#b45309', fontWeight: '600' }}>
                          *Telegram requires users to press Start first before any bot can send them messages.
                        </span>
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={stepNumberBadge}>2</div>
                    <div>
                      <strong>Get Their Telegram Chat ID (Takes 10 Seconds):</strong>
                      <p style={{ margin: '2px 0 0 0', color: '#64748b' }}>
                        Have them search for{' '}
                        <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" style={linkStyle}>
                          @userinfobot <ExternalLink size={11} style={{ display: 'inline' }} />
                        </a>{' '}
                        or{' '}
                        <a href="https://t.me/getmyid_bot" target="_blank" rel="noreferrer" style={linkStyle}>
                          @getmyid_bot
                        </a>{' '}
                        on Telegram and press Start. The bot will immediately reply with their numeric <strong>Id</strong> (e.g. <code>1377689327</code>).
                        <br />
                        <em>For Telegram Groups:</em> Add <code>@Rani_alerts_bot</code> and <code>@RawDataBot</code> to the group to get the group chat ID (starts with <code>-100...</code>).
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={stepNumberBadge}>3</div>
                    <div>
                      <strong>Add Them Below:</strong>
                      <p style={{ margin: '2px 0 0 0', color: '#64748b' }}>
                        Enter their Name (e.g., <em>"Store Owner"</em> or <em>"Accounts Head"</em>) and paste their numeric Chat ID into the form below, then click <strong>Add Person</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ADD RECIPIENT FORM */}
            <form onSubmit={handleAddRecipient} style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr)) 150px 130px',
              gap: '12px',
              alignItems: 'end',
              backgroundColor: '#ffffff',
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0'
            }}>
              <div>
                <label style={labelStyle}>Person / Role Name</label>
                <input
                  type="text"
                  placeholder="e.g. Store Owner, Suresh"
                  value={newPersonName}
                  onChange={e => setNewPersonName(e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>

              <div>
                <label style={labelStyle}>Numeric Telegram Chat ID</label>
                <input
                  type="text"
                  placeholder="e.g. 1377689327 or -100..."
                  value={newChatId}
                  onChange={e => setNewChatId(e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>

              <div>
                <label style={labelStyle}>Store Scope</label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                  style={selectStyle}
                >
                  <option value="All Shops">All Shops</option>
                  {userPermissions?.depts?.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={addingRecipient}
                  style={{
                    ...saveBtn,
                    width: '100%',
                    justifyContent: 'center',
                    padding: '9px 14px',
                    fontSize: '13px'
                  }}
                >
                  <Plus size={15} /> {addingRecipient ? 'Adding...' : 'Add Person'}
                </button>
              </div>
            </form>

            {/* LIST OF CURRENT RECIPIENTS */}
            <div style={{ marginTop: '14px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Active Recipients ({recipients.length + 1})</span>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'normal' }}>
                  (Developer default + custom recipients)
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* Default Developer Recipient (Built-in) */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  fontSize: '13px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#16a34a' }} />
                    <div>
                      <div style={{ fontWeight: '700', color: '#0f172a' }}>
                        System Developer / Default Admin
                        <span style={{ marginLeft: '8px', fontSize: '10px', backgroundColor: '#e2e8f0', color: '#475569', padding: '2px 6px', borderRadius: '4px' }}>
                          Primary ID
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        Chat ID: <code>{TELEGRAM_CONFIG.devChatId || 'Configured via .env'}</code> • Scope: All Shops
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={handleTestBroadcast}
                      disabled={sendingTestAlert}
                      style={testPillBtn}
                      title="Send test alert to primary developer"
                    >
                      <Send size={12} />
                      {sendingTestAlert ? 'Testing...' : 'Test'}
                    </button>
                    <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: '600' }}>Always Active</span>
                  </div>
                </div>

                {/* Custom Added Recipients */}
                {recipients.map((person) => {
                  const isTesting = testingId === person.id;
                  const isEnabled = person.enabled !== false;

                  return (
                    <div
                      key={person.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 14px',
                        backgroundColor: isEnabled ? '#ffffff' : '#f8fafc',
                        borderRadius: '10px',
                        border: `1px solid ${isEnabled ? '#cbd5e1' : '#e2e8f0'}`,
                        fontSize: '13px',
                        opacity: isEnabled ? 1 : 0.65
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: isEnabled ? '#16a34a' : '#94a3b8'
                        }} />
                        <div>
                          <div style={{ fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {person.name}
                            <span style={{ fontSize: '10px', backgroundColor: '#eff6ff', color: '#2563eb', padding: '1px 6px', borderRadius: '4px' }}>
                              {person.dept || 'All Shops'}
                            </span>
                            {!isEnabled && (
                              <span style={{ fontSize: '10px', backgroundColor: '#fee2e2', color: '#dc2626', padding: '1px 6px', borderRadius: '4px' }}>
                                Paused
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            Chat ID: <code>{person.chatId}</code> • Added by: {person.addedBy || 'Admin'}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* Test Button */}
                        <button
                          onClick={() => handleTestSpecificRecipient(person)}
                          disabled={isTesting}
                          style={testPillBtn}
                          title={`Send test alert to ${person.name}`}
                        >
                          <Send size={12} />
                          {isTesting ? 'Sending...' : 'Test'}
                        </button>

                        {/* Toggle Active / Pause */}
                        <button
                          onClick={() => handleToggleRecipient(person)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            color: isEnabled ? '#16a34a' : '#94a3b8'
                          }}
                          title={isEnabled ? 'Click to pause notifications' : 'Click to resume notifications'}
                        >
                          {isEnabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteRecipient(person)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#94a3b8',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          title={`Delete ${person.name}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {loadingRecipients && (
                  <div style={{ padding: '12px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                    Loading recipients...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* OTHER SETTINGS SECTIONS                                                   */}
        {/* ========================================================================= */}
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

              <div style={{ ...detailRow, borderBottom: 'none' }}>
                <span style={detailLabel}>System Capabilities</span>
                <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: '600' }}>
                  Edit, Process, & Print Enabled
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
                  The shop pre-selected when loading salary entry and dashboard.
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

          {/* SECTION 3: PAYROLL DEFAULTS */}
          <div style={card}>
            <div style={cardHeader}>
              <div style={cardIconContainer('#fef3c7')}>
                <FileText size={18} color="#d97706" />
              </div>
              <div>
                <div style={cardTitle}>Payroll & Entry Defaults</div>
                <div style={cardSubtitle}>Presets for salary calculation and entry form</div>
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
                <span style={detailLabel}>Days Calculation</span>
                <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: '600' }}>
                  Dynamic Calendar Sync (28-31 days)
                </span>
              </div>

              <div style={{ ...detailRow, borderBottom: 'none' }}>
                <span style={detailLabel}>Print Layout Standard</span>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>
                  Customizable via Layout Editor Above
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 4: DATA BACKUP & MAINTENANCE */}
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
        </div>

      </div>

      {/* PRINT-ONLY AREA FOR TEST PRINT IN SETTINGS */}
      <div className="print-only">
        <SalaryReport
          data={[SAMPLE_PREVIEW_RECORD]}
          config={slipConfig}
        />
      </div>

      <style>{`
        .print-only {
          display: none;
        }
        @media print {
          .no-print, nav, header, aside, .sidebar {
            display: none !important;
          }
          .print-only {
            display: block !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
          }
        }
      `}</style>
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
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '16px 20px',
  borderBottom: '1px solid #f1f5f9',
  backgroundColor: '#fafbfc',
  flexWrap: 'wrap',
  gap: '10px'
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
  gap: '5px'
};

const labelStyle = {
  fontSize: '12px',
  fontWeight: '600',
  color: '#334155'
};

const helperText = {
  fontSize: '11px',
  color: '#64748b',
  marginTop: '2px'
};

const inputStyle = {
  padding: '8px 12px',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  fontSize: '13px',
  outline: 'none',
  transition: 'border-color 0.15s ease',
  width: '100%',
  boxSizing: 'border-box'
};

const selectStyle = {
  ...inputStyle,
  backgroundColor: '#ffffff',
  cursor: 'pointer'
};

const saveBtn = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  backgroundColor: '#2563eb',
  color: '#ffffff',
  border: 'none',
  padding: '8px 16px',
  borderRadius: '8px',
  fontSize: '13px',
  fontWeight: '600',
  cursor: 'pointer',
  boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)',
  transition: 'background-color 0.15s ease'
};

const secondaryBtn = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  backgroundColor: '#f8fafc',
  color: '#475569',
  border: '1px solid #cbd5e1',
  padding: '7px 12px',
  borderRadius: '8px',
  fontSize: '12px',
  fontWeight: '600',
  cursor: 'pointer',
  textDecoration: 'none'
};

const primaryActionBtn = {
  ...secondaryBtn,
  backgroundColor: '#f1f5f9',
  color: '#1e293b',
  borderColor: '#cbd5e1'
};

const dangerBtn = {
  ...secondaryBtn,
  color: '#dc2626',
  borderColor: '#fca5a5',
  backgroundColor: '#fff'
};

const testPillBtn = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  fontSize: '11px',
  fontWeight: '600',
  padding: '3px 8px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  backgroundColor: '#ffffff',
  color: '#2563eb',
  cursor: 'pointer'
};

const stepNumberBadge = {
  width: '20px',
  height: '20px',
  borderRadius: '50%',
  backgroundColor: '#2563eb',
  color: '#ffffff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '11px',
  fontWeight: '800',
  flexShrink: 0
};

const linkStyle = {
  color: '#2563eb',
  fontWeight: '600',
  textDecoration: 'none'
};

export default SettingsPage;
