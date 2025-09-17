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
import './Sales.css';

const SALES_RANGE = 'RANGESO';
const SALES_DETAILS_RANGE = 'RANGESD';

const Sales = () => {
    const { customers, inventory, refreshData } = useData();
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [soHeader, setSoHeader] = useState({});
    const [soItems, setSoItems] = useState([]);

    // --- NEW STATE for filtering and searching ---
    const [filterColumn, setFilterColumn] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchSales = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getRangeData(SALES_RANGE);
            setSales(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSales();
    }, []);
    
    // --- NEW Filtering Logic ---
    const filteredSales = useMemo(() => {
        if (!searchTerm) return sales;
        return sales.filter(so => {
            const valueToSearch = filterColumn === 'All'
                ? Object.values(so).join(' ').toLowerCase()
                : String(so[filterColumn] || '').toLowerCase();
            return valueToSearch.includes(searchTerm.toLowerCase());
        });
    }, [sales, searchTerm, filterColumn]);


    const handleOpenNewSOModal = () => {
        setSoHeader({ 'SO Date': new Date() });
        setSoItems([{ key: Date.now(), itemId: null, qty: 1, unitPrice: 0, taxRate: 0, shipping: 0 }]);
        setIsModalOpen(true);
    };
    
    const handleCloseModal = () => setIsModalOpen(false);

    const generateSOID = () => {
        const newId = "SO" + Math.floor(56789 + Math.random() * 10000); // To match screenshot format
        setSoHeader(prev => ({ ...prev, 'SO ID': newId }));
    };
    
    const handleHeaderChange = (e) => {
        setSoHeader(prev => ({...prev, [e.target.name]: e.target.value}));
    };

    const handleCustomerChange = (selectedOption) => {
        const customer = customers.find(c => c['Customer ID'] === selectedOption.value);
        setSoHeader(prev => ({
            ...prev,
            'Customer ID': customer['Customer ID'],
            'Customer Name': customer['Customer Name'],
            'State': customer['State'],
            'City': customer['City']
        }));
    };

    const handleItemChange = (key, field, value) => {
        const newItems = soItems.map(item => item.key === key ? { ...item, [field]: value } : item);
        setSoItems(newItems);
    };
    
    const handleAddItemRow = () => {
        setSoItems([...soItems, { key: Date.now(), itemId: null, qty: 1, unitPrice: 0, taxRate: 0, shipping: 0 }]);
    };

    const handleRemoveItemRow = (key) => {
        setSoItems(soItems.filter(item => item.key !== key));
    };

    const handleSaveSO = async () => {
         if (!soHeader['SO ID'] || !soHeader['Customer ID'] || !soHeader['Invoice Num']) {
            alert('Please fill SO ID, Customer, and Invoice Number.');
            return;
        }
        if (soItems.some(item => !item.itemId || item.qty <= 0)) {
            alert('Please ensure all items are selected and have a quantity greater than 0.');
            return;
        }
        setLoading(true);
        try {
            const detailRows = soItems.map((item, index) => {
                 const invItem = inventory.find(i => i['Item ID'] === item.itemId);
                 const detailId = `${soHeader['SO ID']}-${index + 1}`;
                 const priceExclTax = (item.qty || 0) * (item.unitPrice || 0);
                 const totalTax = priceExclTax * ((item.taxRate || 0) / 100);
                 const priceInclTax = priceExclTax + totalTax;
                 const totalPrice = priceInclTax + (item.shipping || 0);
                
                 return [
                    formatDateForSheet(soHeader['SO Date']), soHeader['SO ID'], detailId,
                    soHeader['Customer ID'], soHeader['Customer Name'], soHeader['State'], soHeader['City'], soHeader['Invoice Num'],
                    invItem['Item ID'], invItem['Item Type'], invItem['Item Category'], invItem['Item Subcategory'], invItem['Item Name'],
                    item.qty, item.unitPrice, priceExclTax, item.taxRate, totalTax, priceInclTax, item.shipping, totalPrice
                ];
            });

             for (const row of detailRows) {
                await appendRow(SALES_DETAILS_RANGE, row);
            }
            
            const totalAmount = detailRows.reduce((sum, row) => sum + row[row.length - 1], 0);
            const masterRow = [
                 formatDateForSheet(soHeader['SO Date']), soHeader['SO ID'], soHeader['Customer ID'], soHeader['Customer Name'],
                 soHeader['Invoice Num'], soHeader['State'], soHeader['City'], totalAmount,
                 0, totalAmount, 'Pending', 'Pending'
            ];
             await appendRow(SALES_RANGE, masterRow);
            
            alert('Sales Order created successfully!');
            await fetchSales();
            await refreshData();
            handleCloseModal();

        } catch (err) {
            setError(err.message);
            alert(`Error saving SO: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };
    
    // --- NEW: Placeholder for view button ---
    const handleViewOrder = (soId) => {
        alert(`This would open a modal to view the details of Sales Order ${soId}.`);
    };

    // --- NEW: Helper for status cell styling ---
    const getStatusClass = (status) => {
        switch (status) {
            case 'Received': return 'status-received';
            case 'Partial Receipt': return 'status-partial-receipt';
            case 'Pending': return 'status-pending';
            default: return '';
        }
    };

    const customerOptions = customers.map(c => ({ value: c['Customer ID'], label: c['Customer Name'] }));
    const inventoryOptions = inventory.map(i => ({ value: i['Item ID'], label: `${i['Item Name']} (ID: ${i['Item ID']})` }));

    if (loading && !isModalOpen) return <Spinner />;
    if (error && !error.includes("Quota")) return <div className="error-message">Error: {error}</div>;

    return (
        <div className="crud-container">
            {loading && <Spinner />}
            {error && error.includes("Quota") && <div className="warning-message">Quota limit reached. Please wait a minute and refresh.</div>}
            <div className="crud-header">
                <h1>Sales Orders</h1>
                <p>Add and manage your SOs</p>
            </div>

            {/* --- REBUILT Action Bar --- */}
            <div className="action-bar">
                <div className="action-bar-left">
                    <button className="btn btn-primary" onClick={handleOpenNewSOModal}>
                        <i className="fas fa-plus"></i> New SO
                    </button>
                </div>
                <div className="action-bar-right">
                    <select
                        className="filter-select"
                        value={filterColumn}
                        onChange={(e) => setFilterColumn(e.target.value)}
                    >
                        <option value="All">All</option>
                        <option value="SO ID">SO ID</option>
                        <option value="Customer Name">Customer Name</option>
                        <option value="Invoice Num">Invoice Num</option>
                        <option value="Receipt Status">Receipt Status</option>
                    </select>
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button className="btn btn-primary"> {/* Using primary for green */}
                        Search
                    </button>
                    <button className="btn btn-outline" onClick={() => setSearchTerm('')}>
                        Clear
                    </button>
                </div>
            </div>

            <div className="table-container">
                <table className="crud-table">
                     {/* --- UPDATED Table Headers --- */}
                     <thead>
                        <tr>
                            <th>SO Date</th><th>SO ID</th><th>Customer ID</th><th>Customer Name</th><th>Invoice Num</th>
                            <th>State</th><th>City</th><th>Total SO Amount</th><th>Total Received</th><th>SO Balance</th>
                            <th>Receipt Status</th><th>Shipping Status</th><th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* --- Use filteredSales and new columns --- */}
                        {filteredSales.length > 0 ? filteredSales.map((so, index) => (
                            <tr key={so['SO ID'] || index}>
                                <td>{so['SO Date']}</td>
                                <td>{so['SO ID']}</td>
                                <td>{so['Customer ID']}</td>
                                <td>{so['Customer Name']}</td>
                                <td>{so['Invoice Num']}</td>
                                <td>{so['State']}</td>
                                <td>{so['City']}</td>
                                <td>${parseFloat(so['Total SO Amount'] || 0).toFixed(2)}</td>
                                <td>${parseFloat(so['Total Received'] || 0).toFixed(2)}</td>
                                <td>${parseFloat(so['SO Balance'] || 0).toFixed(2)}</td>
                                <td><span className={`status ${getStatusClass(so['Receipt Status'])}`}>{so['Receipt Status']}</span></td>
                                <td><span className={`status ${getStatusClass(so['Shipping Status'])}`}>{so['Shipping Status']}</span></td>
                                <td>
                                    <button className="action-btn btn-primary" onClick={() => handleViewOrder(so['SO ID'])}>
                                        View
                                    </button>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan="13" className="no-data">No sales orders found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Modal show={isModalOpen} onClose={handleCloseModal} title="Create New Sales Order" size="xl">
                <div className="so-form">
                     <h3>SO Information</h3>
                    <div className="form-grid">
                        <div className="form-group">
                             <label className="required">SO ID</label>
                            <div className="id-generate">
                                <input type="text" value={soHeader['SO ID'] || ''} className="form-control" readOnly />
                                <button type="button" className="btn btn-secondary" onClick={generateSOID}>Generate</button>
                            </div>
                        </div>
                        <div className="form-group">
                             <label className="required">SO Date</label>
                             <Flatpickr value={soHeader['SO Date']} className="form-control" onChange={([date]) => setSoHeader(p => ({ ...p, 'SO Date': date }))} />
                        </div>
                         <div className="form-group">
                             <label className="required">Customer</label>
                             <Select options={customerOptions} onChange={handleCustomerChange} />
                        </div>
                        <div className="form-group">
                             <label className="required">Invoice Number</label>
                             <input type="text" name="Invoice Num" value={soHeader['Invoice Num'] || ''} className="form-control" onChange={handleHeaderChange} />
                        </div>
                    </div>

                    <h3>SO Items</h3>
                     <button type="button" className="btn btn-primary" onClick={handleAddItemRow}><i className="fas fa-plus"></i> Add Item</button>
                    <div className="items-table-container">
                        <table>
                            <thead>
                                <tr><th>Item</th><th>Qty</th><th>Unit Price</th><th>Tax (%)</th><th>Shipping</th><th>Actions</th></tr>
                            </thead>
                            <tbody>
                                {soItems.map((item) => (
                                    <tr key={item.key}>
                                        <td style={{minWidth: '300px'}}><Select options={inventoryOptions} onChange={(opt) => handleItemChange(item.key, 'itemId', opt.value)} /></td>
                                        <td style={{width: '100px'}}><input type="number" value={item.qty} onChange={(e) => handleItemChange(item.key, 'qty', parseFloat(e.target.value))} className="form-control" /></td>
                                        <td style={{width: '120px'}}><input type="number" step="0.01" value={item.unitPrice} onChange={(e) => handleItemChange(item.key, 'unitPrice', parseFloat(e.target.value))} className="form-control" /></td>
                                        <td style={{width: '120px'}}><input type="number" step="0.01" value={item.taxRate} onChange={(e) => handleItemChange(item.key, 'taxRate', parseFloat(e.target.value))} className="form-control" /></td>
                                        <td style={{width: '120px'}}><input type="number" step="0.01" value={item.shipping} onChange={(e) => handleItemChange(item.key, 'shipping', parseFloat(e.target.value))} className="form-control" /></td>
                                        <td><button type="button" className="action-btn delete-btn" onClick={() => handleRemoveItemRow(item.key)}><i className="fas fa-trash"></i></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="modal-footer">
                    <button type="button" className="btn btn-outline" onClick={handleCloseModal}>Cancel</button>
                    <button type="button" className="btn btn-primary" onClick={handleSaveSO}>Save SO</button>
                </div>
            </Modal>
        </div>
    );
};

export default Sales;