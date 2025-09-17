import React, { useState, useEffect, useMemo } from 'react';
import { getRangeData, appendRow, deleteRow } from '../../api/googleSheetsService';
import { useData } from '../../context/DataContext';
import { formatDateForSheet } from '../../utils/helpers';
import Spinner from '../../components/common/Spinner';
import Modal from '../../components/common/Modal';
import Select from 'react-select';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/material_green.css';
import '../../assets/styles/CrudPage.css';

const RECEIPTS_SHEET_NAME = 'Receipts';
const RECEIPTS_RANGE = 'RANGERECEIPTS';

const findRowIndex = (data, trxId) => {
    return data.findIndex(row => row['Trx ID'] === trxId) + 2;
};

const Receipts = () => {
    const { customers, dimensions, refreshData } = useData();
    const [receipts, setReceipts] = useState([]);
    const [salesOrders, setSalesOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newReceipt, setNewReceipt] = useState({});

    const [filterColumn, setFilterColumn] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');

    const paymentModes = useMemo(() => {
        const pmtSet = new Set(dimensions.map(d => d['PMT Mode']).filter(Boolean));
        return [...pmtSet].map(p => ({ value: p, label: p }));
    }, [dimensions]);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [receiptsData, soData] = await Promise.all([
                getRangeData(RECEIPTS_RANGE),
                getRangeData('RANGESO')
            ]);
            setReceipts(receiptsData);
            setSalesOrders(soData);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);
    
    const filteredReceipts = useMemo(() => {
        if (!searchTerm) return receipts;
        return receipts.filter(receipt => {
            const valueToSearch = filterColumn === 'All'
                ? Object.values(receipt).join(' ').toLowerCase()
                : String(receipt[filterColumn] || '').toLowerCase();
            return valueToSearch.includes(searchTerm.toLowerCase());
        });
    }, [receipts, searchTerm, filterColumn]);

    const handleOpenModal = () => {
        setNewReceipt({ 'Trx Date': new Date(), 'Amount Received': 0 });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => setIsModalOpen(false);

    const generateTrxId = () => {
        const newId = 'RT' + Math.floor(12345 + Math.random() * 90000);
        setNewReceipt(prev => ({ ...prev, 'Trx ID': newId }));
    };

    const handleCustomerChange = (opt) => {
        const customer = customers.find(c => c['Customer ID'] === opt.value);
        setNewReceipt(prev => ({
            ...prev,
            'Customer ID': customer['Customer ID'],
            'Customer Name': customer['Customer Name'],
            'State': customer['State'],
            'City': customer['City'],
            'SO ID': '',
        }));
    };
    
    const handleSOChange = (opt) => {
        const so = salesOrders.find(s => s['SO ID'] === opt.value);
        setNewReceipt(prev => ({
            ...prev,
            'SO ID': so['SO ID'],
            'Invoice Num': so['Invoice Num'],
            'SO Balance': so['SO Balance']
        }));
    };
    
    const handleInputChange = (e) => {
        setNewReceipt(p => ({ ...p, [e.target.name]: e.target.value }));
    }

    const handleSave = async () => {
        const amount = parseFloat(newReceipt['Amount Received']);
        const balance = parseFloat(newReceipt['SO Balance']);

        if (!newReceipt['Trx ID'] || !newReceipt['SO ID'] || !(amount > 0)) {
            alert('Trx ID, SO, and a valid Amount are required.');
            return;
        }
        if (amount > balance) {
            alert('Amount received cannot be greater than the SO Balance.');
            return;
        }

        setLoading(true);
        try {
            const rowData = [
                formatDateForSheet(newReceipt['Trx Date']),
                newReceipt['Trx ID'], newReceipt['Customer ID'], newReceipt['Customer Name'],
                newReceipt['State'], newReceipt['City'], newReceipt['SO ID'], newReceipt['Invoice Num'],
                newReceipt['PMT Mode'], amount
            ];
            await appendRow(RECEIPTS_RANGE, rowData);

            alert('Receipt saved successfully! All related balances will now be recalculated.');
            await fetchData();
            await refreshData();
            handleCloseModal();
        } catch (err) {
            setError(err.message);
            alert(`Error: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };
    
    const handleEditReceipt = (trxId) => {
        alert(`Editing functionality for transaction ${trxId} is not yet implemented.`);
    };

    const handleDeleteReceipt = async (trxId) => {
        if (window.confirm('Are you sure you want to delete this receipt? This action is permanent.')) {
            setLoading(true);
            try {
                const rowIndex = findRowIndex(receipts, trxId);
                if (rowIndex < 2) throw new Error("Could not find receipt to delete.");
                
                await deleteRow(RECEIPTS_SHEET_NAME, rowIndex);
                await fetchData();
                await refreshData();
                alert("Receipt deleted successfully. The related balances will be recalculated.");
            } catch (err) {
                setError(err.message);
                alert(`Error: ${err.message}`);
            } finally {
                setLoading(false);
            }
        }
    };
    
    const customerOptions = customers.map(c => ({ value: c['Customer ID'], label: c['Customer Name'] }));
    const soOptions = salesOrders
        .filter(so => so['Customer ID'] === newReceipt['Customer ID'])
        .map(so => ({ value: so['SO ID'], label: `${so['SO ID']} (Bal: $${parseFloat(so['SO Balance']||0).toFixed(2)})` }));

    if (loading && !isModalOpen) return <Spinner />;
    if (error) return <div className="error-message">Error: {error}</div>;
    
    return (
        <div className="crud-container">
            {loading && <Spinner />}
            <div className="crud-header">
                <h1>Cash and Bank Module</h1>
                <p>Create Receipts and Payments</p>
            </div>
            
            <div className="action-bar">
                <div className="action-bar-left">
                    <button className="btn btn-primary" onClick={handleOpenModal}>
                        <i className="fas fa-plus"></i> New Receipt
                    </button>
                </div>
                <div className="action-bar-right">
                    <select
                        className="filter-select"
                        value={filterColumn}
                        onChange={(e) => setFilterColumn(e.target.value)}
                    >
                        <option value="All">All</option>
                        <option value="Trx ID">Trx ID</option>
                        <option value="Customer Name">Customer Name</option>
                        <option value="SO ID">SO ID</option>
                        <option value="Invoice Num">Invoice Num</option>
                    </select>
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button className="btn btn-primary">Search</button>
                    <button className="btn btn-outline" onClick={() => setSearchTerm('')}>Clear</button>
                </div>
            </div>

            <div className="table-container">
                <table className="crud-table">
                    <thead>
                        <tr>
                            <th>Trx Date</th><th>Trx ID</th><th>Customer ID</th><th>Customer Name</th>
                            <th>State</th><th>City</th><th>SO ID</th><th>Invoice Num</th>
                            <th>PMT Mode</th><th>Amount Received</th><th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredReceipts.length > 0 ? filteredReceipts.map((r, index) => (
                            <tr key={r['Trx ID'] || index}>
                                <td>{r['Trx Date']}</td>
                                <td>{r['Trx ID']}</td>
                                <td>{r['Customer ID']}</td>
                                <td>{r['Customer Name']}</td>
                                <td>{r['State']}</td>
                                <td>{r['City']}</td>
                                <td>{r['SO ID']}</td>
                                <td>{r['Invoice Num']}</td>
                                <td>{r['PMT Mode']}</td>
                                <td>${parseFloat(r['Amount Received'] || 0).toFixed(2)}</td>
                                <td className="action-cell">
                                    <button className="action-btn edit-btn" onClick={() => handleEditReceipt(r['Trx ID'])}><i className="fas fa-edit"></i></button>
                                    <button className="action-btn delete-btn" onClick={() => handleDeleteReceipt(r['Trx ID'])}><i className="fas fa-trash"></i></button>
                                </td>
                            </tr>
                        )) : <tr><td colSpan="11" className="no-data">No receipts found.</td></tr>}
                    </tbody>
                </table>
            </div>

             <Modal show={isModalOpen} onClose={handleCloseModal} title="New Receipt" size="lg">
                <div className="form-grid-2-col">
                    <div className="form-group">
                        <label className="required">Trx Date</label>
                        <Flatpickr value={newReceipt['Trx Date']} className="form-control" onChange={([date]) => setNewReceipt(p => ({ ...p, 'Trx Date': date }))} />
                    </div>
                     <div className="form-group">
                         <label className="required">Trx ID</label>
                        <div className="id-generate">
                            <input type="text" value={newReceipt['Trx ID'] || ''} className="form-control" readOnly />
                            <button type="button" className="btn btn-secondary" onClick={generateTrxId}>Generate</button>
                        </div>
                    </div>
                     <div className="form-group">
                        <label className="required">Customer</label>
                        <Select options={customerOptions} onChange={handleCustomerChange} />
                    </div>
                     <div className="form-group">
                        <label className="required">Sales Order (SO)</label>
                        <Select options={soOptions} value={soOptions.find(o => o.value === newReceipt['SO ID'])} onChange={handleSOChange} />
                    </div>
                    <div className="form-group">
                        <label>SO Balance</label>
                        <input type="text" value={`$${parseFloat(newReceipt['SO Balance'] || 0).toFixed(2)}`} className="form-control" readOnly />
                    </div>
                    <div className="form-group">
                        <label className="required">Payment Mode</label>
                        <Select options={paymentModes} onChange={(opt) => setNewReceipt(p => ({ ...p, 'PMT Mode': opt.value }))} />
                    </div>
                    <div className="form-group">
                        <label className="required">Amount Received</label>
                        <input type="number" name="Amount Received" step="0.01" value={newReceipt['Amount Received'] || ''} className="form-control" onChange={handleInputChange} />
                    </div>
                </div>
                 <div className="modal-footer">
                    <button type="button" className="btn btn-outline" onClick={handleCloseModal}>Cancel</button>
                    <button type="button" className="btn btn-primary" onClick={handleSave}>Save Receipt</button>
                </div>
            </Modal>
        </div>
    );
};

export default Receipts;