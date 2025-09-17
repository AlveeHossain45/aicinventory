import React, { useState, useEffect, useMemo } from 'react';
import { getRangeData, appendRow } from '../../api/googleSheetsService';
import { useData } from '../../context/DataContext';
import { formatDateForSheet } from '../../utils/helpers';
import Spinner from '../../components/common/Spinner';
import Modal from '../../components/common/Modal';
import Select from 'react-select';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/material_green.css';
import '../../assets/styles/CrudPage.css';
import './Purchases.css';

const PURCHASES_RANGE = 'RANGEPO';
const PURCHASE_DETAILS_RANGE = 'RANGEPD';

const Purchases = () => {
    const { suppliers, inventory, refreshData } = useData();
    const [purchases, setPurchases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [poHeader, setPoHeader] = useState({});
    const [poItems, setPoItems] = useState([]);

    // --- NEW STATE for filtering and searching ---
    const [filterColumn, setFilterColumn] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchPurchases = async () => {
        setLoading(true); setError(null);
        try {
            const data = await getRangeData(PURCHASES_RANGE);
            setPurchases(data);
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchPurchases(); }, []);
    
    // --- NEW Filtering Logic ---
    const filteredPurchases = useMemo(() => {
        if (!searchTerm) return purchases;
        return purchases.filter(po => {
            const valueToSearch = filterColumn === 'All'
                ? Object.values(po).join(' ').toLowerCase()
                : String(po[filterColumn] || '').toLowerCase();
            return valueToSearch.includes(searchTerm.toLowerCase());
        });
    }, [purchases, searchTerm, filterColumn]);


    const handleOpenNewPOModal = () => {
        setPoHeader({ 'PO Date': new Date() });
        setPoItems([{ key: Date.now(), itemId: null, qty: 1, unitCost: 0, taxRate: 0 }]);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => setIsModalOpen(false);

    const generatePOID = () => {
        const existingIds = new Set(purchases.map(p => p['PO ID']));
        let newId;
        // Corrected prefix to P as shown in screenshot
        do { newId = "P" + Math.floor(100000 + Math.random() * 900000); }
        while (existingIds.has(newId));
        setPoHeader(prev => ({ ...prev, 'PO ID': newId }));
    };
    
    const handleHeaderChange = (e) => setPoHeader(prev => ({...prev, [e.target.name]: e.target.value}));

    const handleSupplierChange = (selectedOption) => {
        const supplier = suppliers.find(s => s['Supplier ID'] === selectedOption.value);
        setPoHeader(prev => ({ ...prev, ...supplier }));
    };

    const handleItemChange = (key, field, value) => {
        const newItems = poItems.map(item => item.key === key ? { ...item, [field]: value } : item);
        setPoItems(newItems);
    };
    
    const handleAddItemRow = () => setPoItems([...poItems, { key: Date.now(), itemId: null, qty: 1, unitCost: 0, taxRate: 0 }]);
    const handleRemoveItemRow = (key) => setPoItems(poItems.filter(item => item.key !== key));

    const handleSavePO = async () => {
        if (!poHeader['PO ID'] || !poHeader['Supplier ID'] || !poHeader['Bill Num']) {
            alert('Please fill PO ID, Supplier, and Bill Number.');
            return;
        }
        if (poItems.some(item => !item.itemId || item.qty <= 0 || item.unitCost < 0)) {
            alert('Please ensure all items are selected and have valid quantities/costs.');
            return;
        }

        setLoading(true);
        try {
            const detailRows = poItems.map((item, index) => {
                const invItem = inventory.find(i => i['Item ID'] === item.itemId);
                const detailId = `${poHeader['PO ID']}-${index + 1}`;
                const costExclTax = item.qty * item.unitCost;
                const totalTax = costExclTax * (item.taxRate / 100);
                const costInclTax = costExclTax + totalTax;
                const shippingFees = 0; // Assuming shipping is 0 unless specified
                const totalPrice = costInclTax + shippingFees;

                return [
                    formatDateForSheet(poHeader['PO Date']), poHeader['PO ID'], detailId, poHeader['Supplier ID'], poHeader['Supplier Name'],
                    poHeader['State'], poHeader['City'], poHeader['Bill Num'],
                    invItem['Item ID'], invItem['Item Type'], invItem['Item Category'], invItem['Item Subcategory'], invItem['Item Name'],
                    item.qty, item.unitCost, costExclTax, item.taxRate, totalTax, costInclTax, shippingFees, totalPrice
                ];
            });

            for (const row of detailRows) { await appendRow(PURCHASE_DETAILS_RANGE, row); }

            const totalAmount = detailRows.reduce((sum, row) => sum + row[row.length - 1], 0);
            const masterRow = [
                formatDateForSheet(poHeader['PO Date']), poHeader['PO ID'], poHeader['Supplier ID'], poHeader['Supplier Name'],
                poHeader['Bill Num'], poHeader['State'], poHeader['City'], totalAmount,
                0, totalAmount, 'Pending', 'Pending'
            ];
            await appendRow(PURCHASES_RANGE, masterRow);
            
            alert('Purchase Order created successfully!');
            await fetchPurchases();
            await refreshData();
            handleCloseModal();
        } catch (err) {
            alert(`Error saving PO: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };
    
    // --- NEW: Placeholder for status buttons ---
    const handleUpdateStatus = (statusType) => {
        alert(`This would open a modal to update the ${statusType} for selected orders.`);
    };

    const handleViewOrder = (poId) => {
        alert(`This would open a modal to view the details of Purchase Order ${poId}.`);
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'Paid': return 'status-paid';
            case 'Partial Payment': return 'status-partial-payment';
            case 'Pending': return 'status-pending';
            case 'Received': return 'status-received';
            default: return '';
        }
    };

    const supplierOptions = suppliers.map(s => ({ value: s['Supplier ID'], label: s['Supplier Name'] }));
    const inventoryOptions = inventory.map(i => ({ value: i['Item ID'], label: `${i['Item Name']} (ID: ${i['Item ID']})` }));

    return (
        <div className="crud-container">
            {loading && <Spinner />}
            <div className="crud-header">
                <h1>Purchase Orders</h1>
                <p>Create and manage your purchase orders</p>
            </div>
            
            {/* --- REBUILT Action Bar --- */}
            <div className="action-bar">
                <div className="action-bar-left">
                    <button className="btn btn-primary" onClick={handleOpenNewPOModal}>
                        <i className="fas fa-plus"></i> New PO
                    </button>
                    <button className="btn btn-info" onClick={() => handleUpdateStatus('Payment Status')}>
                        <i className="fas fa-credit-card"></i> PMT Status
                    </button>
                    <button className="btn btn-info" onClick={() => handleUpdateStatus('Shipping Status')}>
                        <i className="fas fa-shipping-fast"></i> Shipping Status
                    </button>
                </div>
                <div className="action-bar-right">
                    <select
                        className="filter-select"
                        value={filterColumn}
                        onChange={(e) => setFilterColumn(e.target.value)}
                    >
                        <option value="All">All</option>
                        <option value="PO ID">PO ID</option>
                        <option value="Supplier Name">Supplier Name</option>
                        <option value="Bill Num">Bill Num</option>
                        <option value="PMT Status">PMT Status</option>
                    </select>
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button className="btn btn-info">
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
                            <th>Date</th><th>PO ID</th><th>Supplier ID</th><th>Supplier Name</th>
                            <th>Bill Num</th><th>State</th><th>City</th><th>Total Amount</th>
                            <th>Total Paid</th><th>PO Balance</th><th>PMT Status</th>
                            <th>Shipping Status</th><th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* --- Use filteredPurchases and new columns --- */}
                        {filteredPurchases.length > 0 ? filteredPurchases.map((po, index) => (
                            <tr key={po['PO ID'] || index}>
                                <td>{po['Date']}</td>
                                <td>{po['PO ID']}</td>
                                <td>{po['Supplier ID']}</td>
                                <td>{po['Supplier Name']}</td>
                                <td>{po['Bill Num']}</td>
                                <td>{po['State']}</td>
                                <td>{po['City']}</td>
                                <td>${parseFloat(po['Total Amount'] || 0).toFixed(2)}</td>
                                <td>${parseFloat(po['Total Paid'] || 0).toFixed(2)}</td>
                                <td>${parseFloat(po['PO Balance'] || 0).toFixed(2)}</td>
                                <td><span className={`status ${getStatusClass(po['PMT Status'])}`}>{po['PMT Status']}</span></td>
                                <td><span className={`status ${getStatusClass(po['Shipping Status'])}`}>{po['Shipping Status']}</span></td>
                                <td>
                                    <button className="action-btn btn-info" onClick={() => handleViewOrder(po['PO ID'])}>
                                        <i className="fas fa-eye"></i> View
                                    </button>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan="13" className="no-data">No purchase orders found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Modal show={isModalOpen} onClose={handleCloseModal} title="Create New Purchase Order" size="xl">
                 <div className="po-form">
                    <h3>PO Information</h3>
                    <div className="form-grid">
                        <div className="form-group"><label className="required">PO ID</label><div className="id-generate"><input type="text" value={poHeader['PO ID'] || ''} className="form-control" readOnly /><button type="button" className="btn btn-secondary" onClick={generatePOID}>Generate</button></div></div>
                        <div className="form-group"><label className="required">PO Date</label><Flatpickr value={poHeader['PO Date']} className="form-control" onChange={([date]) => setPoHeader(p => ({ ...p, 'PO Date': date }))} /></div>
                        <div className="form-group"><label className="required">Supplier</label><Select options={supplierOptions} onChange={handleSupplierChange} /></div>
                        <div className="form-group"><label className="required">Bill Number</label><input type="text" name="Bill Num" value={poHeader['Bill Num'] || ''} className="form-control" onChange={handleHeaderChange} /></div>
                    </div>
                    <h3>PO Items</h3>
                    <button type="button" className="btn btn-primary" onClick={handleAddItemRow}><i className="fas fa-plus"></i> Add Item</button>
                    <div className="items-table-container">
                        <table>
                            <thead><tr><th>Item</th><th>Qty</th><th>Unit Cost</th><th>Tax (%)</th><th>Actions</th></tr></thead>
                            <tbody>
                                {poItems.map((item) => (
                                    <tr key={item.key}>
                                        <td style={{minWidth: '300px'}}><Select options={inventoryOptions} onChange={(opt) => handleItemChange(item.key, 'itemId', opt.value)} /></td>
                                        <td style={{width: '100px'}}><input type="number" value={item.qty} onChange={(e) => handleItemChange(item.key, 'qty', parseFloat(e.target.value))} className="form-control" /></td>
                                        <td style={{width: '120px'}}><input type="number" step="0.01" value={item.unitCost} onChange={(e) => handleItemChange(item.key, 'unitCost', parseFloat(e.target.value))} className="form-control" /></td>
                                        <td style={{width: '120px'}}><input type="number" step="0.01" value={item.taxRate} onChange={(e) => handleItemChange(item.key, 'taxRate', parseFloat(e.target.value))} className="form-control" /></td>
                                        <td><button type="button" className="action-btn delete-btn" onClick={() => handleRemoveItemRow(item.key)}><i className="fas fa-trash"></i></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                 </div>
                 <div className="modal-footer"><button type="button" className="btn btn-outline" onClick={handleCloseModal}>Cancel</button><button type="button" className="btn btn-primary" onClick={handleSavePO}>Save PO</button></div>
            </Modal>
        </div>
    );
};

export default Purchases;