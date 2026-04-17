import React, { useState, useEffect } from 'react';
import { db } from '../firebase'; 
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Trash2, UserPlus, Phone, MapPin, Camera, Edit2 } from 'lucide-react';

function EmployeeRegistry() {
  const [employees, setEmployees] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState(null); // NULL = Add mode, ID = Edit mode

  const initialState = {
    name: '', phone: '', address: '', photoUrl: '', baseSalary: '', dept: 'Rani Javuli'
  };

  const [formData, setFormData] = useState(initialState);

  useEffect(() => {
    return onSnapshot(collection(db, "employees"), (snapshot) => {
      setEmployees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
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
    const data = { ...formData, baseSalary: Number(formData.baseSalary) };

    // Close and reset immediately for speed
    setShowAdd(false);
    setFormData(initialState);

    try {
      if (editingId) {
        // UPDATE EXISTING
        await updateDoc(doc(db, "employees", editingId), data);
        setEditingId(null);
      } else {
        // ADD NEW
        await addDoc(collection(db, "employees"), { ...data, createdAt: new Date() });
      }
    } catch (error) {
      alert("Error saving: " + error.message);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Employee Management</h2>
        <button onClick={() => { setEditingId(null); setShowAdd(true); }} style={addBtnStyle}>
          <UserPlus size={18}/> Add New Employee
        </button>
      </div>

      <div style={gridStyle}>
        {employees.map(emp => (
          <div key={emp.id} style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
               <Edit2 size={16} color="#3d85c6" style={{cursor:'pointer'}} onClick={() => startEdit(emp)} />
               <Trash2 size={16} color="#ff4d4d" style={{cursor:'pointer'}} onClick={() => { if(window.confirm("Delete?")) deleteDoc(doc(db, "employees", emp.id)) }} />
            </div>
            
            <div style={photoCircle}>
              {emp.photoUrl ? <img src={emp.photoUrl} style={imgStyle} alt="Profile" /> : <Camera color="#444" />}
            </div>
            <h3 style={{ margin: '10px 0 5px 0' }}>{emp.name}</h3>
            <p style={deptTag}>{emp.dept}</p>
            
            <div style={infoRow}><Phone size={14}/> {emp.phone || 'No Phone'}</div>
            <div style={infoRow}><MapPin size={14}/> {emp.address || 'No Address'}</div>
            <div style={salaryTag}>Base: ₹{emp.baseSalary}</div>
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
            <input placeholder="Photo URL (Optional)" value={formData.photoUrl} style={inputStyle} onChange={e => setFormData({...formData, photoUrl: e.target.value})} />
            <input type="number" placeholder="Base Salary" required value={formData.baseSalary} style={inputStyle} onChange={e => setFormData({...formData, baseSalary: e.target.value})} />
            
            <select style={inputStyle} value={formData.dept} onChange={e => setFormData({...formData, dept: e.target.value})}>
              <option value="Rani Javuli">Rani Javuli</option>
              <option value="Rani Readymade">Rani Readymade</option>
              <option value="New Rani">New Rani</option>
            </select>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button type="submit" style={saveBtn}>{editingId ? "Update Details" : "Save Employee"}</button>
              <button type="button" onClick={() => { setShowAdd(false); setEditingId(null); setFormData(initialState); }} style={cancelBtn}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// ... styles stay the same ...
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

export default EmployeeRegistry;