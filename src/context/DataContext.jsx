import React, { createContext, useState, useEffect, useContext } from 'react';
import { getRangeData } from '../api/googleSheetsService';

const DataContext = createContext(null);

export const DataProvider = ({ children }) => {
    const [customers, setCustomers] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [dimensions, setDimensions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [customersData, suppliersData, inventoryData, dimensionsData] = await Promise.all([
                getRangeData('RANGECUSTOMERS'),
                getRangeData('RANGESUPPLIERS'),
                getRangeData('RANGEINVENTORYITEMS'),
                getRangeData('RANGEDIMENSIONS'),
            ]);
            setCustomers(customersData);
            setSuppliers(suppliersData);
            setInventory(inventoryData);
            setDimensions(dimensionsData);
        } catch (err) {
            setError(err.message);
            console.error("Failed to fetch shared data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const value = {
        customers,
        suppliers,
        inventory,
        dimensions,
        loading,
        error,
        refreshData: fetchData, // Function to allow components to trigger a refresh
    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => useContext(DataContext);
