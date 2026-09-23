import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, doc, updateDoc, query, where } from 'firebase/firestore';
import { UserPlus, Phone, MapPin, Camera, Edit2, Archive, RotateCcw, Users, UserX, Search } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import { useToast } from '../components/Toast';

// Helper to show a browser notification
const showNotification = (title, body) => {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico' });
  }
};

function EmployeeRegistry({ userPermissions }) {
  const { showToast } = useToast();
  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState(null); // NULL = Add mode, ID = Edit mode
  const [viewArchived, setViewArchived] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, emp: null });
  const [saving, setSaving] = useState(false);

  // Access check definitions
  const defaultDept = userPermissions?.depts?.[0] || 'Rani Javuli';
  const isAdmin = userPermissions?.depts?.length > 1;

  const getInitialFormData = () => ({
    employeeId: '',
    name: '',
    phone: '',
    address: '',
    photoUrl: '',
    baseSalary: '',
    salaryType: 'daily',
    dept: defaultDept
  });

  const [formData, setFormData] = useState(getInitialFormData);

  // Resize and compress chosen image to base64
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file.', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const MAX_WIDTH = 150;
        const MAX_HEIGHT = 150;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setFormData(prev => ({ ...prev, photoUrl: dataUrl }));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Request browser notification permission once on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Real-time listener — updates list instantly without refresh
  useEffect(() => {
    if (!userPermissions || !userPermissions.depts) return;
    const q = query(
      collection(db, "employees"),
      where("dept", "in", userPermissions.depts)
    );
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        list.sort((a, b) => {
          if (a.employeeId && b.employeeId) {
            return a.employeeId.localeCompare(b.employeeId, undefined, { numeric: true });
          }
          if (a.employeeId) return -1;
          if (b.employeeId) return 1;
          return (a.name || '').localeCompare(b.name || '');
        });
        setEmployees(list);
      },
      (error) => {
        console.error("Firestore read error:", error.message);
        showToast("Firestore read error: " + error.message, 'error');
      }
    );
    return unsub;
  }, [userPermissions, showToast]);

  // Open modal in EDIT mode
  const startEdit = (emp) => {
    setFormData({
      employeeId: emp.employeeId || '',
      name: emp.name,
      phone: emp.phone || '',
      address: emp.address || '',
      photoUrl: emp.photoUrl || '',
      baseSalary: emp.baseSalary,
      salaryType: emp.salaryType || (Number(emp.baseSalary) > 1500 ? 'monthly' : 'daily'),
      dept: emp.dept
    });
    setEditingId(emp.id);
    setShowAdd(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    const data = {
      ...formData,
      employeeId: (formData.employeeId || '').trim(),
      baseSalary: Number(formData.baseSalary) || 0,
      salaryType: formData.salaryType || 'daily',
      isDeleted: false
    };
    const currentEditingId = editingId;
    const empName = formData.name;

    try {
      if (currentEditingId) {
        // UPDATE EXISTING
        await updateDoc(doc(db, "employees", currentEditingId), data);
        showNotification('Employee Updated ✅', `${empName}'s details have been updated.`);
        showToast(`${empName}'s details updated successfully.`, 'success');
      } else {
        // ADD NEW
        await addDoc(collection(db, "employees"), { ...data, createdAt: new Date() });
        showNotification('Employee Added ✅', `${empName} has been added successfully.`);
        showToast(`${empName} added successfully.`, 'success');
      }
      setShowAdd(false);
      setFormData(getInitialFormData());
      setEditingId(null);
    } catch (error) {
      showToast("Error saving: " + error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Safe Archive (Zero Deletion)
  const handleArchiveEmployee = async () => {
    const emp = confirmModal.emp;
    if (!emp) return;
    setConfirmModal({ isOpen: false, emp: null });

    try {
      await updateDoc(doc(db, "employees", emp.id), {
        isDeleted: true,
        deletedAt: new Date().toISOString()
      });
      showToast(`${emp.name} safely archived. (All historical records preserved)`, 'info');
    } catch (err) {
      showToast("Archive failed: " + err.message, 'error');
    }
  };

  // Restore archived employee
  const handleRestoreEmployee = async (emp) => {
    try {
      await updateDoc(doc(db, "employees", emp.id), {
        isDeleted: false,
        restoredAt: new Date().toISOString()
      });
      showToast(`${emp.name} restored to active list.`, 'success');
    } catch (err) {
      showToast("Restore failed: " + err.message, 'error');
    }
  };

  // Separate active vs. archived employees & filter by search term (name, employeeId, phone)
  const activeEmployees = employees.filter(emp => !emp.isDeleted);
  const archivedEmployees = employees.filter(emp => emp.isDeleted === true);
  const currentList = viewArchived ? archivedEmployees : activeEmployees;
  const visibleEmployees = currentList.filter(emp => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    return (
      (emp.name && emp.name.toLowerCase().includes(term)) ||
      (emp.employeeId && emp.employeeId.toLowerCase().includes(term)) ||
      (emp.phone && emp.phone.toLowerCase().includes(term))
    );
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#0f172a', fontWeight: '800', fontSize: '24px' }}>Employee Management</h2>
          <p style={{ margin: '5px 0 0 0', color: '#64748b', fontSize: '13px' }}>
            {viewArchived ? `Viewing ${archivedEmployees.length} archived staff` : `Managing ${activeEmployees.length} active staff`}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search Bar */}
          <div style={searchBoxStyle}>
            <Search size={15} color="#64748b" />
            <input
              type="text"
              placeholder="Search by ID or name..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={searchInputStyle}
            />
          </div>

          {/* View toggle for active vs archived */}
          <div style={tabGroupStyle}>
            <button
              onClick={() => setViewArchived(false)}
              style={{
                ...tabBtnStyle,
                backgroundColor: !viewArchived ? '#ffffff' : 'transparent',
                color: !viewArchived ? '#0f172a' : '#64748b',
                boxShadow: !viewArchived ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              <Users size={14} /> Active ({activeEmployees.length})
            </button>
            <button
              onClick={() => setViewArchived(true)}
              style={{
                ...tabBtnStyle,
                backgroundColor: viewArchived ? '#ffffff' : 'transparent',
                color: viewArchived ? '#0f172a' : '#64748b',
                boxShadow: viewArchived ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              <UserX size={14} /> Archive ({archivedEmployees.length})
            </button>
          </div>

          <button onClick={() => { setEditingId(null); setFormData(getInitialFormData()); setShowAdd(true); }} style={addBtnStyle}>
            <UserPlus size={18}/> Add New Employee
          </button>
        </div>
      </div>

      <div style={gridStyle}>
        {visibleEmployees.map(emp => (
          <div key={emp.id} style={{
            ...cardStyle,
            borderColor: emp.isDeleted ? '#fecaca' : '#e2e8f0',
            opacity: emp.isDeleted ? 0.85 : 1
          }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              {!emp.isDeleted ? (
                <>
                  <button
                    onClick={() => startEdit(emp)}
                    style={iconBtnStyle}
                    title="Edit Details"
                  >
                    <Edit2 size={16} color="#2563eb" />
                  </button>
                  <button
                    onClick={() => setConfirmModal({
                      isOpen: true,
                      emp,
                      title: `Archive ${emp.name}?`,
                      message: 'This will hide the employee from active lists and salary entry while safely preserving all historical advances and payroll records in the database.'
                    })}
                    style={iconBtnStyle}
                    title="Archive Employee (Safe)"
                  >
                    <Archive size={16} color="#ea580c" />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleRestoreEmployee(emp)}
                  style={{ ...iconBtnStyle, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 'bold' }}
                  title="Restore Employee"
                >
                  <RotateCcw size={14} color="#16a34a" /> Restore
                </button>
              )}
            </div>

            <div style={photoCircle}>
              {emp.photoUrl ? <img src={emp.photoUrl} style={imgStyle} alt="Profile" onError={e => { e.target.style.display = 'none'; }} /> : <Camera color="#94a3b8" />}
            </div>
            <h3 style={{ margin: '12px 0 4px 0', color: '#0f172a', fontWeight: '700', fontSize: '16px' }}>{emp.name}</h3>
            {emp.employeeId ? (
              <div style={empIdBadgeStyle}>ID: {emp.employeeId}</div>
            ) : (
              <div style={{ height: '22px' }}></div>
            )}
            <p style={deptTag}>{emp.dept}</p>

            <div style={infoRow}><Phone size={14}/> {emp.phone || 'No Phone'}</div>
            <div style={infoRow}><MapPin size={14}/> {emp.address || 'No Address'}</div>
            <div style={salaryTag}>
              {emp.salaryType === 'monthly'
                ? `Monthly Salary: ₹${emp.baseSalary}/mo`
                : `Daily Rate: ₹${emp.baseSalary}/day`}
            </div>
            {emp.isDeleted && (
              <div style={archivedBadgeStyle}>
                ARCHIVED
              </div>
            )}
          </div>
        ))}
      </div>

      {visibleEmployees.length === 0 && (
        <div style={emptyStateStyle}>
          {searchTerm.trim()
            ? `No employees found matching "${searchTerm}".`
            : (viewArchived ? 'No archived employees found.' : 'No active employees in your assigned departments.')}
        </div>
      )}

      {/* Confirmation Modal for Safe Archive */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Archive Employee"
        cancelText="Cancel"
        isDanger={false}
        onConfirm={handleArchiveEmployee}
        onCancel={() => setConfirmModal({ isOpen: false, emp: null })}
      />

      {/* Add/Edit Modal */}
      {showAdd && (
        <div style={modalOverlay}>
          <form onSubmit={handleSave} style={modalContent}>
            <h3 style={{ margin: '0 0 10px 0', color: '#0f172a', fontWeight: '700', fontSize: '18px' }}>{editingId ? "Edit Employee" : "Add New Employee"}</h3>

            <input
              placeholder="Employee ID (e.g. EMP001)"
              value={formData.employeeId}
              style={inputStyle}
              onChange={e => setFormData({...formData, employeeId: e.target.value})}
            />
            <input
              placeholder="Full Name *"
              required
              value={formData.name}
              style={inputStyle}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
            <input
              placeholder="Phone Number"
              value={formData.phone}
              style={inputStyle}
              onChange={e => setFormData({...formData, phone: e.target.value})}
            />
            <input
              placeholder="Address"
              value={formData.address}
              style={inputStyle}
              onChange={e => setFormData({...formData, address: e.target.value})}
            />
            
            {/* Styled Image Upload */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <label style={{ fontSize: '13px', color: '#64748b', textAlign: 'left', fontWeight: '500' }}>Profile Photo</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ ...photoCircle, margin: 0, width: '50px', height: '50px', backgroundColor: '#ffffff' }}>
                  {formData.photoUrl ? (
                    <img src={formData.photoUrl} style={imgStyle} alt="Preview" onError={e => { e.target.style.display = 'none'; }} />
                  ) : (
                    <Camera color="#94a3b8" size={18} />
                  )}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <label style={uploadBtnStyle}>
                    Choose Photo
                    <input 
                      type="file" 
                      accept="image/*" 
                      style={{ display: 'none' }} 
                      onChange={handleImageChange} 
                    />
                  </label>
                  {formData.photoUrl && (
                    <button 
                      type="button" 
                      onClick={() => setFormData({ ...formData, photoUrl: '' })} 
                      style={clearBtnStyle}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Salary Pay Type Selector: Daily vs Monthly */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' }}>
              <label style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Pay Type</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, salaryType: 'daily' })}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    border: formData.salaryType === 'daily' ? '1px solid #16a34a' : '1px solid #cbd5e1',
                    backgroundColor: formData.salaryType === 'daily' ? '#f0fdf4' : '#ffffff',
                    color: formData.salaryType === 'daily' ? '#166534' : '#64748b',
                    transition: '0.2s'
                  }}
                >
                  Daily (₹/day)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, salaryType: 'monthly' })}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    border: formData.salaryType === 'monthly' ? '1px solid #2563eb' : '1px solid #cbd5e1',
                    backgroundColor: formData.salaryType === 'monthly' ? '#eff6ff' : '#ffffff',
                    color: formData.salaryType === 'monthly' ? '#1e40af' : '#64748b',
                    transition: '0.2s'
                  }}
                >
                  Monthly (₹/month)
                </button>
              </div>
            </div>

            <input
              type="number"
              placeholder={formData.salaryType === 'monthly' ? "Monthly Salary (₹/month) *" : "Daily Rate (per day) *"}
              required
              value={formData.baseSalary}
              style={inputStyle}
              onChange={e => setFormData({...formData, baseSalary: e.target.value})}
            />

            {/* Shop dropdown: visible to Admins only. Non-admins default to their shop automatically. */}
            {isAdmin ? (
              <select style={inputStyle} value={formData.dept} onChange={e => setFormData({...formData, dept: e.target.value})}>
                <option value="Rani Javuli">Rani Javuli</option>
                <option value="Rani Readymade">Rani Readymade</option>
                <option value="New Rani">New Rani</option>
              </select>
            ) : (
              <div style={nonAdminDeptInfo}>
                Shop: <strong style={{ color: '#0f172a' }}>{formData.dept}</strong>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button type="submit" disabled={saving} style={{ ...saveBtn, opacity: saving ? 0.6 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Saving…' : (editingId ? "Update Details" : "Save Employee")}
              </button>
              <button type="button" onClick={() => { setShowAdd(false); setEditingId(null); setFormData(getInitialFormData()); }} style={cancelBtn}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// Styles
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px', marginTop: '28px' };
const cardStyle = { backgroundColor: '#ffffff', border: '1px solid #e2e8f0', padding: '24px 20px', borderRadius: '14px', textAlign: 'center', position: 'relative', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' };
const photoCircle = { width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#f1f5f9', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '2px solid #e2e8f0' };
const imgStyle = { width: '100%', height: '100%', objectFit: 'cover' };
const deptTag = { fontSize: '12px', color: '#64748b', marginBottom: '14px', fontWeight: '500' };
const infoRow = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px', color: '#475569', marginBottom: '6px' };
const salaryTag = { marginTop: '12px', fontWeight: '700', color: '#16a34a', fontSize: '13px' };
const addBtnStyle = { backgroundColor: '#0f172a', color: '#ffffff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', boxShadow: '0 2px 4px rgba(15, 23, 42, 0.15)' };
const modalOverlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalContent = { backgroundColor: '#ffffff', padding: '30px', borderRadius: '16px', border: '1px solid #e2e8f0', width: '420px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.04)' };
const inputStyle = { padding: '11px 14px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', borderRadius: '8px', fontSize: '13px', outline: 'none' };
const saveBtn = { padding: '12px', backgroundColor: '#0f172a', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', flex: 1, fontSize: '13px', boxShadow: '0 2px 4px rgba(15, 23, 42, 0.15)' };
const cancelBtn = { padding: '12px', backgroundColor: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', flex: 1, fontSize: '13px', fontWeight: '600' };
const nonAdminDeptInfo = { padding: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', borderRadius: '8px', fontSize: '13px' };
const uploadBtnStyle = { padding: '8px 14px', backgroundColor: '#ffffff', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'inline-block', textAlign: 'center' };
const clearBtnStyle = { padding: '8px 14px', backgroundColor: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' };
const iconBtnStyle = { background: 'none', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color 0.15s' };
const tabGroupStyle = { display: 'flex', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '8px', border: '1px solid #e2e8f0', gap: '4px' };
const tabBtnStyle = { border: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: '0.2s' };
const archivedBadgeStyle = { marginTop: '12px', backgroundColor: '#fff7ed', color: '#ea580c', border: '1px solid #ffedd5', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', letterSpacing: '0.8px', display: 'inline-block' };
const emptyStateStyle = { textAlign: 'center', padding: '50px 20px', color: '#64748b', border: '1px dashed #cbd5e1', borderRadius: '12px', marginTop: '30px', backgroundColor: '#ffffff' };
const empIdBadgeStyle = { display: 'inline-block', fontSize: '11px', color: '#2563eb', backgroundColor: '#eff6ff', border: '1px solid #dbeafe', padding: '2px 8px', borderRadius: '6px', fontFamily: 'monospace', fontWeight: '700', marginBottom: '6px' };
const searchBoxStyle = { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 12px', height: '40px', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)' };
const searchInputStyle = { background: 'transparent', border: 'none', outline: 'none', color: '#0f172a', fontSize: '13px', width: '180px' };

export default EmployeeRegistry;