import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Trash2, UserPlus, Phone, MapPin, Camera, Edit2 } from 'lucide-react';

// Basic URL validation helper
const isValidUrl = (url) => {
  if (!url) return true; // empty is fine
  try { new URL(url); return true; } catch { return false; }
};

// Helper to show a browser notification
const showNotification = (title, body) => {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico' });
  }
};

function EmployeeRegistry({ userPermissions }) {
  const [employees, setEmployees] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState(null); // NULL = Add mode, ID = Edit mode

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

  // Request browser notification permission once on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Real-time listener — updates list instantly without refresh
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "employees"),
      (snapshot) => {
        setEmployees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      },
      (error) => {
        console.error("Firestore read error:", error.message);
      }
    );
    return unsub;
  }, []);

  // Open modal in EDIT mode
  const startEdit = (emp) => {
    setFormData({
      name: emp.name,
      phone: emp.phone,
      address: emp.address,
      photoUrl: emp.photoUrl,
      baseSalary: emp.baseSalary,
      dept: emp.dept
    });
    setEditingId(emp.id);
    setShowAdd(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    // Validate photo URL if provided
    if (formData.photoUrl && !isValidUrl(formData.photoUrl)) {
      alert("Please enter a valid URL for the photo (or leave it blank).");
      return;
    }

    const data = { ...formData, baseSalary: Number(formData.baseSalary) };
    const currentEditingId = editingId; // capture before state reset
    const empName = formData.name;

    // Close and reset immediately for speed
    setShowAdd(false);
    setFormData(getInitialFormData());
    setEditingId(null);

    try {
      if (currentEditingId) {
        // UPDATE EXISTING
        await updateDoc(doc(db, "employees", currentEditingId), data);
        showNotification('Employee Updated ✅', `${empName}'s details have been updated.`);
      } else {
        // ADD NEW
        await addDoc(collection(db, "employees"), { ...data, createdAt: new Date() });
        showNotification('Employee Added ✅', `${empName} has been added successfully.`);
      }
    } catch (error) {
      alert("Error saving: " + error.message);
    }
  };

  // Only display employees that match the user's assigned departments
  const visibleEmployees = employees.filter(emp => 
    userPermissions?.depts?.includes(emp.dept)
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Employee Management</h2>
        <button onClick={() => { setEditingId(null); setFormData(getInitialFormData()); setShowAdd(true); }} style={addBtnStyle}>
          <UserPlus size={18}/> Add New Employee
        </button>
      </div>

      <div style={gridStyle}>
        {visibleEmployees.map(emp => (
          <div key={emp.id} style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
               <Edit2 size={16} color="#3d85c6" style={{cursor:'pointer'}} onClick={() => startEdit(emp)} />
               <Trash2 size={16} color="#ff4d4d" style={{cursor:'pointer'}} onClick={() => { if(window.confirm(`Delete ${emp.name}? This cannot be undone.`)) deleteDoc(doc(db, "employees", emp.id)) }} />
            </div>

            <div style={photoCircle}>
              {emp.photoUrl ? <img src={emp.photoUrl} style={imgStyle} alt="Profile" onError={e => { e.target.style.display = 'none'; }} /> : <Camera color="#444" />}
            </div>
            <h3 style={{ margin: '10px 0 5px 0' }}>{emp.name}</h3>
            <p style={deptTag}>{emp.dept}</p>

            <div style={infoRow}><Phone size={14}/> {emp.phone || 'No Phone'}</div>
            <div style={infoRow}><MapPin size={14}/> {emp.address || 'No Address'}</div>
            <div style={salaryTag}>Daily Rate: ₹{emp.baseSalary}/day</div>
          </div>
        ))}
      </div>

      {showAdd && (
        <div style={modalOverlay}>
          <form onSubmit={handleSave} style={modalContent}>
            <h3>{editingId ? "Edit Employee" : "Add New Employee"}</h3>

            <input placeholder="Full Name" required value={formData.name} style={inputStyle} onChange={e => setFormData({...formData, name: e.target.value})} />
            <input placeholder="Phone Number" value={formData.phone} style={inputStyle} onChange={e => setFormData({...formData, phone: e.target.value})} />
            <input placeholder="Address" value={formData.address} style={inputStyle} onChange={e => setFormData({...formData, address: e.target.value})} />
            <input placeholder="Photo URL (Optional – must be a valid URL)" value={formData.photoUrl} style={inputStyle} onChange={e => setFormData({...formData, photoUrl: e.target.value})} />
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
              <button type="submit" style={saveBtn}>{editingId ? "Update Details" : "Save Employee"}</button>
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
const cardStyle = { backgroundColor: '#111', border: '1px solid #222', padding: '20px', borderRadius: '12px', textAlign: 'center' };
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

export default EmployeeRegistry;