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
  ChevronUp
} from 'lucide-react';
import { useToast } from '../components/Toast';
import {
  sendTelegramMessage,
  TELEGRAM_CONFIG,
  getISTDateTime
} from '../services/telegramService';

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

  // Save general preferences
  const handleSavePreferences = () => {
    localStorage.setItem('preferred_shop', preferredShop);
    localStorage.setItem('default_remarks', defaultRemarks.trim() || 'GOOD');
    localStorage.setItem('default_salary_type', defaultSalaryType);
    showToast('Settings & preferences saved successfully!', 'success');
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
      showToast(`Removed ${recipient.name} from notifications.`, 'info');
    } catch (err) {
      showToast('Error deleting recipient: ' + err.message, 'error');
    }
  };

  // Test individual recipient
  const handleTestSpecificRecipient = async (recipient) => {
    setTestingId(recipient.id || recipient.chatId);
    try {
      const nowIST = getISTDateTime();
      const text = [
        `🔔 <b>RANI SALARY - TEST NOTIFICATION</b>`,
        ``,
        `Hello <b>${recipient.name}</b>! 👋`,
        `This is a test notification from the <b>Rani Salary App</b>.`,
        ``,
        `🏪 <b>Assigned Scope:</b> ${recipient.dept || 'All Shops'}`,
        `🕒 <b>Time:</b> ${nowIST} (IST)`,
        `✅ <b>Status:</b> You are connected and will receive login alerts and salary updates!`
      ].join('\n');

      const res = await sendTelegramMessage(text, [recipient.chatId]);
      if (res.ok) {
        showToast(`✓ Test message delivered to ${recipient.name} on Telegram!`, 'success');
      } else {
        const errorDesc = res.results?.[0]?.description || 'Failed to send';
        if (
          errorDesc.toLowerCase().includes('chat not found') ||
          errorDesc.toLowerCase().includes('forbidden') ||
          errorDesc.toLowerCase().includes('blocked')
        ) {
          showToast(`⚠️ Delivery failed: ${recipient.name} must open @Rani_alerts_bot and click START first!`, 'error');
        } else {
          showToast(`Test failed: ${errorDesc}`, 'error');
        }
      }
    } catch (err) {
      showToast('Error sending test: ' + err.message, 'error');
    } finally {
      setTestingId(null);
    }
  };

  // Test broadcast notification to ALL active recipients
  const handleTestBroadcast = async () => {
    setSendingTestAlert(true);
    try {
      const nowIST = getISTDateTime();
      const msg = [
        `🔔 <b>RANI SALARY - BROADCAST TEST</b>`,
        ``,
        `👤 <b>Triggered By:</b> <code>${currentUser?.email || 'Admin'}</code>`,
        `🏪 <b>Shop:</b> ${preferredShop}`,
        `🕒 <b>Time:</b> ${nowIST} (IST)`,
        `✅ <b>Status:</b> System alert broadcast to all active managers and recipients!`
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
      const savedTheme = localStorage.getItem('sidebar_collapsed');
      const savedShop = localStorage.getItem('preferred_shop');
      localStorage.clear();
      if (savedTheme) localStorage.setItem('sidebar_collapsed', savedTheme);
      if (savedShop) localStorage.setItem('preferred_shop', savedShop);

      setCacheCleared(true);
      showToast('Local cache & session data cleared!', 'info');
      setTimeout(() => setCacheCleared(false), 3000);
    } catch (err) {
      showToast('Error clearing cache: ' + err.message, 'error');
    }
  };

  return (
    <div style={{ maxWidth: '1020px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* PAGE HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', color: '#0f172a', fontWeight: '800', fontSize: '24px' }}>
            <SettingsIcon size={24} color="#2563eb" />
            Settings & Preferences
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>
            Manage user profile, shop defaults, payroll configurations, backup, and Telegram notifications
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>

        {/* ========================================================================= */}
        {/* TELEGRAM NOTIFICATION PEOPLE MANAGER (FEATURE + STEP-BY-STEP INSTRUCTIONS) */}
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

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={stepNumberBadge}>4</div>
                    <div>
                      <strong>Click "Test" to Verify:</strong>
                      <p style={{ margin: '2px 0 0 0', color: '#64748b' }}>
                        Click the <strong>Test</strong> button next to their name. They will instantly receive a test notification on their Telegram!
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ADD PERSON FORM */}
            <form onSubmit={handleAddRecipient} style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-end',
              flexWrap: 'wrap',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
            }}>
              <div style={{ flex: '1 1 180px', minWidth: '160px' }}>
                <label style={labelStyle}>Person / Role Name</label>
                <input
                  type="text"
                  placeholder="e.g. Store Owner, Suresh"
                  value={newPersonName}
                  onChange={e => setNewPersonName(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={{ flex: '1 1 180px', minWidth: '160px' }}>
                <label style={labelStyle}>Telegram Chat ID</label>
                <input
                  type="text"
                  placeholder="e.g. 1377689327"
                  value={newChatId}
                  onChange={e => setNewChatId(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={{ flex: '1 1 150px', minWidth: '130px' }}>
                <label style={labelStyle}>Assigned Scope</label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                  style={selectStyle}
                >
                  <option value="All Shops">All Shops</option>
                  <option value="Rani Javuli">Rani Javuli</option>
                  <option value="Rani Readymade">Rani Readymade</option>
                  <option value="New Rani">New Rani</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={addingRecipient}
                style={{ ...saveBtn, padding: '10px 18px', height: '40px', flexShrink: 0 }}
              >
                <Plus size={16} />
                {addingRecipient ? 'Adding...' : 'Add Person'}
              </button>
            </form>

            {/* RECIPIENTS LIST */}
            <div style={{ marginTop: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', marginBottom: '8px', letterSpacing: '0.5px' }}>
                CURRENT NOTIFICATION RECIPIENTS ({recipients.length + 1})
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* 1. Default Built-in Developer Recipient */}
                <div style={recipientRow}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <div style={recipientAvatar('#eff6ff', '#2563eb')}>
                      DEV
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '13px' }}>
                          Primary Developer Account
                        </span>
                        <span style={systemBadge}>Built-in Admin</span>
                        <span style={deptPill}>All Shops</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', fontFamily: 'monospace' }}>
                        Chat ID: {TELEGRAM_CONFIG.devChatId}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={() => handleTestSpecificRecipient({ name: 'Developer', chatId: TELEGRAM_CONFIG.devChatId, dept: 'All Shops' })}
                      disabled={testingId === TELEGRAM_CONFIG.devChatId}
                      style={testPillBtn}
                      title="Send test notification to developer"
                    >
                      <Send size={12} />
                      {testingId === TELEGRAM_CONFIG.devChatId ? 'Testing...' : 'Test'}
                    </button>
                    <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: '700', padding: '0 6px' }}>
                      ✓ Always Active
                    </span>
                  </div>
                </div>

                {/* 2. Custom Added Recipients */}
                {recipients.map((person) => {
                  const isTesting = testingId === person.id;
                  const isEnabled = person.enabled !== false;
                  const initials = (person.name || 'P')
                    .split(' ')
                    .map(w => w[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <div key={person.id} style={{ ...recipientRow, opacity: isEnabled ? 1 : 0.65 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <div style={recipientAvatar(isEnabled ? '#f0fdf4' : '#f1f5f9', isEnabled ? '#16a34a' : '#64748b')}>
                          {initials}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '13px' }}>
                              {person.name}
                            </span>
                            <span style={deptPill}>{person.dept || 'All Shops'}</span>
                            {!isEnabled && (
                              <span style={{ ...systemBadge, backgroundColor: '#fef2f2', color: '#ef4444', borderColor: '#fecaca' }}>
                                Paused
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', fontFamily: 'monospace' }}>
                            Chat ID: {person.chatId}
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
                  ✓ Edit, Process, & Print Enabled
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

const systemBadge = {
  fontSize: '10px',
  fontWeight: '700',
  color: '#1d4ed8',
  backgroundColor: '#eff6ff',
  border: '1px solid #bfdbfe',
  padding: '2px 6px',
  borderRadius: '4px'
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

const linkStyle = {
  color: '#2563eb',
  fontWeight: '600',
  textDecoration: 'none'
};

const stepNumberBadge = {
  width: '20px',
  height: '20px',
  borderRadius: '50%',
  backgroundColor: '#2563eb',
  color: '#ffffff',
  fontSize: '11px',
  fontWeight: '700',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  marginTop: '2px'
};

const recipientRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '10px 14px',
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '10px',
  gap: '12px',
  flexWrap: 'wrap'
};

const recipientAvatar = (bg, color) => ({
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  backgroundColor: bg,
  color: color,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '11px',
  fontWeight: '700',
  flexShrink: 0
});

const testPillBtn = {
  backgroundColor: '#eff6ff',
  color: '#1d4ed8',
  border: '1px solid #bfdbfe',
  padding: '4px 10px',
  borderRadius: '6px',
  fontSize: '11px',
  fontWeight: '600',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '4px'
};

export default SettingsPage;
