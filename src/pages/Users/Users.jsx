import React, { useState, useEffect } from 'react';
import { getRangeData, appendRow, updateRow, deleteRow } from '../../api/googleSheetsService';
import { formatDateForSheet } from '../../utils/helpers';
import Spinner from '../../components/common/Spinner';
import Modal from '../../components/common/Modal';
import '../../assets/styles/CrudPage.css';

const USERS_SHEET_NAME = 'Users';
const USERS_RANGE = 'RANGEUSERS';

// Helper to find row index for editing/deleting
const findRowIndex = (data, userId) => {
    return data.findIndex(row => row['UserID'] === userId) + 2; // +2 for 1-based index and header
};

const Users = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({});

    // Fetch all users from the Google Sheet
    const fetchUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getRangeData(USERS_RANGE);
            setUsers(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // Open the modal for adding or editing a user
    const handleOpenModal = (user = null) => {
        setEditingUser(user);
        // Set initial form data
        setFormData(user ? { ...user } : {
            'Name': '',
            'Email': '',
            'Role': 'Staff', // Default role
            'Status': 'Active' // Default status
        });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData['Name'] || !formData['Email'] || !formData['Role']) {
            alert('Please fill in Name, Email, and Role.');
            return;
        }

        setLoading(true);
        try {
            if (editingUser) {
                // --- UPDATE LOGIC (FIXED) ---
                const rowIndex = findRowIndex(users, editingUser['UserID']);
                if (rowIndex < 2) throw new Error("Could not find the user to update.");

                // The order must match your Google Sheet columns
                const values = [
                    formData.UserID, 
                    formData.Name, 
                    formData.Email, 
                    formData.Role, 
                    formData.Status, 
                    editingUser['Date Added'] // Keep original date
                ];
                
                const rangeToUpdate = `${USERS_SHEET_NAME}!A${rowIndex}:F${rowIndex}`;
                await updateRow(rangeToUpdate, values);

            } else {
                // --- ADD NEW USER LOGIC ---
                const newId = "U" + Math.floor(1000 + Math.random() * 9000);
                const today = formatDateForSheet(new Date());
                const values = [
                    newId,
                    formData['Name'],
                    formData['Email'],
                    formData['Role'],
                    formData['Status'],
                    today
                ];
                await appendRow(USERS_RANGE, values);
            }
            
            await fetchUsers(); // Refresh the user list
            handleCloseModal();
        } catch (err) {
            setError(err.message);
            alert(`Error: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (userId) => {
        // --- DELETE LOGIC (IMPLEMENTED) ---
        if (window.confirm('Are you sure you want to delete this user?')) {
            setLoading(true);
            try {
                const rowIndex = findRowIndex(users, userId);
                if (rowIndex < 2) throw new Error("Could not find user to delete.");
                
                await deleteRow(USERS_SHEET_NAME, rowIndex);
                await fetchUsers();
            } catch (err) {
                 setError(err.message);
                 alert(`Error: ${err.message}`);
            } finally {
                setLoading(false);
            }
        }
    };

    if (loading && !isModalOpen) return <Spinner />;
    if (error) return <div className="error-message">Error: {error}</div>;

    return (
        <div className="crud-container">
            {loading && <Spinner />}
            <div className="crud-header">
                <h1>User Management</h1>
                <p>Add, view, and manage application users</p>
            </div>
            
            <div className="action-bar">
                <div className="action-bar-left">
                    <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                        <i className="fas fa-plus"></i> Add New User
                    </button>
                </div>
            </div>

            <div className="table-container">
                <table className="crud-table">
                    <thead>
                        <tr>
                            <th>User ID</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Date Added</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.length > 0 ? users.map((user) => (
                            <tr key={user['UserID']}>
                                <td>{user['UserID']}</td>
                                <td>{user['Name']}</td>
                                <td>{user['Email']}</td>
                                <td>{user['Role']}</td>
                                <td>
                                    <span className={`status ${user['Status'] === 'Active' ? 'status-active' : 'status-inactive'}`}>
                                        {user['Status']}
                                    </span>
                                </td>
                                <td>{user['Date Added']}</td>
                                <td className="action-cell">
                                    <button className="action-btn edit-btn" onClick={() => handleOpenModal(user)}><i className="fas fa-edit"></i></button>
                                    <button className="action-btn delete-btn" onClick={() => handleDelete(user['UserID'])}><i className="fas fa-trash"></i></button>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan="7" className="no-data">No users found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Modal show={isModalOpen} onClose={handleCloseModal} title={editingUser ? 'Edit User' : 'Add New User'}>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="required">Full Name</label>
                        <input type="text" name="Name" className="form-control" value={formData['Name'] || ''} onChange={handleInputChange} required />
                    </div>
                    <div className="form-group">
                        <label className="required">Email Address</label>
                        <input type="email" name="Email" className="form-control" value={formData['Email'] || ''} onChange={handleInputChange} required />
                    </div>
                    <div className="form-group">
                        <label className="required">Role</label>
                        <select name="Role" className="form-control" value={formData['Role'] || 'Staff'} onChange={handleInputChange} required>
                            <option value="Staff">Staff</option>
                            <option value="Manager">Manager</option>
                            <option value="Admin">Admin</option>
                        </select>
                    </div>
                     <div className="form-group">
                        <label className="required">Status</label>
                        <select name="Status" className="form-control" value={formData['Status'] || 'Active'} onChange={handleInputChange} required>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-outline" onClick={handleCloseModal}>Cancel</button>
                        <button type="submit" className="btn btn-primary">{editingUser ? 'Update User' : 'Add User'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Users;