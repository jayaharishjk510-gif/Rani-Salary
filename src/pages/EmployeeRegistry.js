import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, doc, updateDoc, query, where } from 'firebase/firestore';
import { UserPlus, Phone, MapPin, Camera, Edit2, Archive, RotateCcw, Users, UserX } from 'lucide-react';
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
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState(null); // NULL = Add mode, ID = Edit mode
  const [viewArchived, setViewArchived] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, emp: null });
  const [saving, setSaving] = useState(false);

  // Access check definitions
  const defaultDept = userPermissions?.depts?.[0] || 'Rani Javuli';
  const isAdmin = userPermissions?.depts?.length > 1;

  const getInitialFormData = () => ({
    name: '',
    phone: '',
    address: '',
    photoUrl: '',
    baseSalary: '',
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
        setEmployees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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
      name: emp.name,
      phone: emp.phone || '',
      address: emp.address || '',
      photoUrl: emp.photoUrl || '',
      baseSalary: emp.baseSalary,
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
      baseSalary: Number(formData.baseSalary) || 0,
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

  // Separate active vs. archived employees
  const activeEmployees = employees.filter(emp => !emp.isDeleted);
  const archivedEmployees = employees.filter(emp => emp.isDeleted === true);
  const visibleEmployees = viewArchived ? archivedEmployees : activeEmployees;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ margin: 0 }}>Employee Management</h2>
          <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '13px' }}>
            {viewArchived ? `Viewing ${archivedEmployees.length} archived staff` : `Managing ${activeEmployees.length} active staff`}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* View toggle for active vs archived */}
          <div style={tabGroupStyle}>
            <button
              onClick={() => setViewArchived(false)}
              style={{
                ...tabBtnStyle,
                backgroundColor: !viewArchived ? '#222' : 'transparent',
                color: !viewArchived ? '#fff' : '#777'
              }}
            >
              <Users size={14} /> Active ({activeEmployees.length})
            </button>
            <button
              onClick={() => setViewArchived(true)}
              style={{
                ...tabBtnStyle,
                backgroundColor: viewArchived ? '#222' : 'transparent',
                color: viewArchived ? '#fff' : '#777'
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
            borderColor: emp.isDeleted ? '#332222' : '#222',
            opacity: emp.isDeleted ? 0.85 : 1
          }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              {!emp.isDeleted ? (
                <>
                  <button
                    onClick={() => startEdit(emp)}
                    style={iconBtnStyle}
                    title="Edit Details"
                  >
                    <Edit2 size={16} color="#3d85c6" />
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
                    <Archive size={16} color="#ff8533" />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleRestoreEmployee(emp)}
                  style={{ ...iconBtnStyle, color: '#4caf50', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 'bold' }}
                  title="Restore Employee"
                >
                  <RotateCcw size={14} color="#4caf50" /> Restore
                </button>
              )}
            </div>

            <div style={photoCircle}>
              {emp.photoUrl ? <img src={emp.photoUrl} style={imgStyle} alt="Profile" onError={e => { e.target.style.display = 'none'; }} /> : <Camera color="#444" />}
            </div>
            <h3 style={{ margin: '10px 0 5px 0' }}>{emp.name}</h3>
            <p style={deptTag}>{emp.dept}</p>

            <div style={infoRow}><Phone size={14}/> {emp.phone || 'No Phone'}</div>
            <div style={infoRow}><MapPin size={14}/> {emp.address || 'No Address'}</div>
            <div style={salaryTag}>Daily Rate: ₹{emp.baseSalary}/day</div>

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
          {viewArchived ? 'No archived employees found.' : 'No active employees in your assigned departments.'}
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
            <h3>{editingId ? "Edit Employee" : "Add New Employee"}</h3>

            <input placeholder="Full Name" required value={formData.name} style={inputStyle} onChange={e => setFormData({...formData, name: e.target.value})} />
            <input placeholder="Phone Number" value={formData.phone} style={inputStyle} onChange={e => setFormData({...formData, phone: e.target.value})} />
            <input placeholder="Address" value={formData.address} style={inputStyle} onChange={e => setFormData({...formData, address: e.target.value})} />
            
            {/* Styled Image Upload */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', backgroundColor: '#000', borderRadius: '6px', border: '1px solid #333' }}>
              <label style={{ fontSize: '13px', color: '#888', textAlign: 'left' }}>Profile Photo</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ ...photoCircle, margin: 0, width: '50px', height: '50px' }}>
                  {formData.photoUrl ? (
                    <img src={formData.photoUrl} style={imgStyle} alt="Preview" onError={e => { e.target.style.display = 'none'; }} />
                  ) : (
                    <Camera color="#444" size={18} />
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

            <input type="number" placeholder="Daily Rate (per day)" required value={formData.baseSalary} style={inputStyle} onChange={e => setFormData({...formData, baseSalary: e.target.value})} />

            {/* Shop dropdown: visible to Admins only. Non-admins default to their shop automatically. */}
            {isAdmin ? (
              <select style={inputStyle} value={formData.dept} onChange={e => setFormData({...formData, dept: e.target.value})}>
                <option value="Rani Javuli">Rani Javuli</option>
                <option value="Rani Readymade">Rani Readymade</option>
                <option value="New Rani">New Rani</option>
              </select>
            ) : (
              <div style={nonAdminDeptInfo}>
                Shop: <strong style={{ color: '#fff' }}>{formData.dept}</strong>
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
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px', marginTop: '30px' };
const cardStyle = { backgroundColor: '#111', border: '1px solid #222', padding: '20px', borderRadius: '12px', textAlign: 'center', position: 'relative' };
const photoCircle = { width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#000', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '2px solid #333' };
const imgStyle = { width: '100%', height: '100%', objectFit: 'cover' };
const deptTag = { fontSize: '12px', color: '#888', marginBottom: '15px' };
const infoRow = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px', color: '#ccc', marginBottom: '5px' };
const salaryTag = { marginTop: '10px', fontWeight: 'bold', color: '#4caf50' };
const addBtnStyle = { backgroundColor: '#fff', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' };
const modalOverlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalContent = { backgroundColor: '#111', padding: '30px', borderRadius: '12px', border: '1px solid #333', width: '400px', display: 'flex', flexDirection: 'column', gap: '10px' };
const inputStyle = { padding: '12px', backgroundColor: '#000', border: '1px solid #333', color: '#fff', borderRadius: '6px' };
const saveBtn = { padding: '12px', backgroundColor: '#fff', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', flex: 1 };
const cancelBtn = { padding: '12px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', flex: 1 };
const nonAdminDeptInfo = { padding: '12px', backgroundColor: '#1a1a1a', border: '1px solid #222', color: '#888', borderRadius: '6px', fontSize: '13px' };
const uploadBtnStyle = { padding: '8px 14px', backgroundColor: '#222', color: '#fff', border: '1px solid #444', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'inline-block', textAlign: 'center' };
const clearBtnStyle = { padding: '8px 14px', backgroundColor: '#ff4d4d', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' };
const iconBtnStyle = { background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const tabGroupStyle = { display: 'flex', backgroundColor: '#0a0a0a', padding: '4px', borderRadius: '8px', border: '1px solid #222', gap: '4px' };
const tabBtnStyle = { border: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: '0.2s' };
const archivedBadgeStyle = { marginTop: '12px', backgroundColor: 'rgba(255, 133, 51, 0.15)', color: '#ff8533', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', letterSpacing: '1px', display: 'inline-block' };
const emptyStateStyle = { textAlign: 'center', padding: '50px 20px', color: '#666', border: '1px dashed #222', borderRadius: '12px', marginTop: '30px' };

export default EmployeeRegistry;