import React, { useState, useEffect, useMemo } from 'react';
import { getRangeData, appendRow, updateRow, deleteRow } from '../../api/googleSheetsService';
import { useData } from '../../context/DataContext';
import Spinner from '../../components/common/Spinner';
import Modal from '../../components/common/Modal';
import '../../assets/styles/CrudPage.css';

const SUPPLIERS_SHEET_NAME = 'Suppliers';
const SUPPLIERS_RANGE = 'RANGESUPPLIERS';

const findRowIndex = (data, supplierId) => {
    return data.findIndex(row => row['Supplier ID'] === supplierId) + 2;
};

const Suppliers = () => {
    const { dimensions, refreshData: refreshSharedData } = useData();
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [formData, setFormData] = useState({});

    // --- NEW STATE for filtering and searching ---
    const [filterColumn, setFilterColumn] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');

    const { states, cities } = useMemo(() => {
        const stateSet = new Set();
        const citySet = new Set();
        dimensions.forEach(d => {
            if (d.State) stateSet.add(d.State);
            if (d.City) citySet.add(d.City);
        });
        return { states: [...stateSet].sort(), cities: [...citySet].sort() };
    }, [dimensions]);

    const fetchSuppliers = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getRangeData(SUPPLIERS_RANGE);
            setSuppliers(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSuppliers();
    }, []);

    // --- NEW Filtering Logic ---
    const filteredSuppliers = useMemo(() => {
        if (!searchTerm) return suppliers;
        return suppliers.filter(supplier => {
            const valueToSearch = filterColumn === 'All' 
                ? Object.values(supplier).join(' ').toLowerCase()
                : String(supplier[filterColumn] || '').toLowerCase();
            return valueToSearch.includes(searchTerm.toLowerCase());
        });
    }, [suppliers, searchTerm, filterColumn]);

    const handleOpenModal = (supplier = null) => {
        setEditingSupplier(supplier);
        setFormData(supplier ? { ...supplier } : {
            'Supplier ID': '', 'Supplier Name': '', 'Supplier Contact': '', 'Supplier Email': '',
            'State': '', 'City': '', 'Supplier Address': ''
        });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingSupplier(null);
    };
    
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const generateSupplierId = () => {
        // Corrected to "S" prefix to match screenshot
        const existingIds = new Set(suppliers.map(s => s['Supplier ID']));
        let newId;
        do {
            newId = "S" + Math.floor(10000 + Math.random() * 90000);
        } while (existingIds.has(newId));
        setFormData(prev => ({ ...prev, 'Supplier ID': newId }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { 'Supplier ID': id, 'Supplier Name': name, State, City } = formData;
        
        if (!id || !name || !State || !City) {
            alert('Please fill all required fields: ID, Name, State, and City.');
            return;
        }

        setLoading(true);
        try {
            const headers = ['Supplier ID', 'Supplier Name', 'Supplier Contact', 'Supplier Email', 'State', 'City', 'Supplier Address', 'Total Purchases', 'Total Payments', 'Balance Payable'];
            
            if (editingSupplier) {
                const rowIndex = findRowIndex(suppliers, editingSupplier['Supplier ID']);
                if (rowIndex < 2) throw new Error("Could not find supplier to update.");
                
                const updatedValues = [
                    formData['Supplier ID'], formData['Supplier Name'], formData['Supplier Contact'],
                    formData['Supplier Email'], formData['State'], formData['City'], formData['Supplier Address'],
                ];
                const rangeToUpdate = `${SUPPLIERS_SHEET_NAME}!A${rowIndex}:G${rowIndex}`;
                await updateRow(rangeToUpdate, updatedValues);
            } else {
                const values = headers.map(header => {
                    if (['Total Purchases', 'Total Payments', 'Balance Payable'].includes(header)) return 0;
                    return formData[header] || '';
                });
                await appendRow(SUPPLIERS_RANGE, values);
            }
            
            await fetchSuppliers();
            await refreshSharedData();
            handleCloseModal();
        } catch (err) {
            setError(err.message);
            alert(`Error: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };
    
    const handleDelete = async (supplierId) => {
        const supplierToDelete = suppliers.find(s => s['Supplier ID'] === supplierId);
        if (parseFloat(supplierToDelete['Balance Payable'] || 0) > 0) {
            alert('Cannot delete supplier with an outstanding balance.');
            return;
        }

        if (window.confirm('Are you sure you want to delete this supplier? This action cannot be undone.')) {
            setLoading(true);
            try {
                const rowIndex = findRowIndex(suppliers, supplierId);
                if (rowIndex < 2) throw new Error("Could not find supplier to delete.");
                
                await deleteRow(SUPPLIERS_SHEET_NAME, rowIndex);
                await fetchSuppliers();
                await refreshSharedData();
            } catch (err) {
                setError(err.message);
                alert(`Error: ${err.message}`);
            } finally {
                setLoading(false);
            }
        }
    };
    
    // --- NEW: Placeholder for dimension buttons ---
    const handleAddDimension = (dimension) => {
        alert(`This button is for adding a new ${dimension}. Functionality to be added.`);
    };

    if (loading && !isModalOpen) return <Spinner />;
    if (error) return <div className="error-message">Error: {error}</div>;

    return (
        <div className="crud-container">
            {loading && <Spinner />}
            <div className="crud-header">
                <h1>Suppliers</h1>
                <p>Add and manage your suppliers</p>
            </div>

            {/* --- REBUILT Action Bar --- */}
            <div className="action-bar">
                <div className="action-bar-left">
                    <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                        <i className="fas fa-plus"></i> New Supplier
                    </button>
                    <button className="btn btn-info" onClick={() => handleAddDimension('State')}>
                        <i className="fas fa-map-marker-alt"></i> New State
                    </button>
                    <button className="btn btn-info" onClick={() => handleAddDimension('City')}>
                        <i className="fas fa-city"></i> New City
                    </button>
                </div>
                <div className="action-bar-right">
                    <select 
                        className="filter-select" 
                        value={filterColumn} 
                        onChange={(e) => setFilterColumn(e.target.value)}
                    >
                        <option value="All">All</option>
                        <option value="Supplier ID">Supplier ID</option>
                        <option value="Supplier Name">Supplier Name</option>
                        <option value="State">State</option>
                        <option value="City">City</option>
                    </select>
                    <input 
                        type="text" 
                        className="search-input" 
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button className="btn btn-info" onClick={() => { /* Search is live */ }}>
                        <i className="fas fa-search"></i> Search
                    </button>
                    <button className="btn btn-outline" onClick={() => setSearchTerm('')}>
                        <i className="fas fa-times"></i> Clear
                    </button>
                </div>
            </div>

            <div className="table-container">
                <table className="crud-table">
                     {/* --- UPDATED Table Headers --- */}
                     <thead>
                        <tr>
                            <th>Supplier ID</th>
                            <th>Supplier Name</th>
                            <th>Contact</th>
                            <th>Email</th>
                            <th>State</th>
                            <th>City</th>
                            <th>Address</th>
                            <th>Purchases</th>
                            <th>Payments</th>
                            <th>Balance</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                         {/* --- Use filteredSuppliers and updated columns --- */}
                         {filteredSuppliers.length > 0 ? filteredSuppliers.map((sup, index) => (
                            <tr key={sup['Supplier ID'] || index}>
                                <td>{sup['Supplier ID']}</td>
                                <td>{sup['Supplier Name']}</td>
                                <td>{sup['Supplier Contact']}</td>
                                <td>{sup['Supplier Email']}</td>
                                <td>{sup['State']}</td>
                                <td>{sup['City']}</td>
                                <td style={{whiteSpace: 'normal'}}>{sup['Supplier Address']}</td>
                                <td>${parseFloat(sup['Total Purchases'] || 0).toFixed(2)}</td>
                                <td>${parseFloat(sup['Total Payments'] || 0).toFixed(2)}</td>
                                <td>${parseFloat(sup['Balance Payable'] || 0).toFixed(2)}</td>
                                <td className="action-cell">
                                    <button className="action-btn edit-btn" onClick={() => handleOpenModal(sup)}><i className="fas fa-edit"></i></button>
                                    <button className="action-btn delete-btn" onClick={() => handleDelete(sup['Supplier ID'])}><i className="fas fa-trash"></i></button>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan="11" className="no-data">No suppliers found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* --- The Modal remains mostly unchanged, but we'll correct the ID generation --- */}
            <Modal show={isModalOpen} onClose={handleCloseModal} title={editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="required">Supplier ID</label>
                        <div className="id-generate">
                            <input type="text" name="Supplier ID" className="form-control id-field" value={formData['Supplier ID'] || ''} onChange={handleInputChange} readOnly={!!editingSupplier} required />
                            {!editingSupplier && <button type="button" className="btn btn-secondary" onClick={generateSupplierId}>Generate</button>}
                        </div>
                    </div>
                     <div className="form-group">
                        <label className="required">Supplier Name</label>
                        <input type="text" name="Supplier Name" className="form-control" value={formData['Supplier Name'] || ''} onChange={handleInputChange} required />
                    </div>
                     <div className="form-group">
                        <label>Contact</label>
                        <input type="text" name="Supplier Contact" className="form-control" value={formData['Supplier Contact'] || ''} onChange={handleInputChange} />
                    </div>
                    <div className="form-group">
                        <label>Email</label>
                        <input type="email" name="Supplier Email" className="form-control" value={formData['Supplier Email'] || ''} onChange={handleInputChange} />
                    </div>
                    <div className="form-group">
                        <label className="required">State</label>
                        <select name="State" className="form-control" value={formData['State'] || ''} onChange={handleInputChange} required>
                            <option value="">Select a State</option>
                            {states.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="required">City</label>
                         <select name="City" className="form-control" value={formData['City'] || ''} onChange={handleInputChange} required>
                            <option value="">Select a City</option>
                            {cities.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                     <div className="form-group">
                        <label>Address</label>
                        <textarea name="Supplier Address" className="form-control" rows="3" value={formData['Supplier Address'] || ''} onChange={handleInputChange}></textarea>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-outline" onClick={handleCloseModal}>Cancel</button>
                        <button type="submit" className="btn btn-primary">{editingSupplier ? 'Update' : 'Save'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Suppliers;