import React, { useState, useEffect } from 'react';
import Chart from 'react-apexcharts';
import { getRangeData } from '../../api/googleSheetsService';
import Spinner from '../../components/common/Spinner';
import '../../assets/styles/Dashboard.css';

const Dashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Fetch all data concurrently
                const [sales, purchases, customers, suppliers] = await Promise.all([
                    getRangeData('RANGESD'),
                    getRangeData('RANGEPD'),
                    getRangeData('RANGECUSTOMERS'),
                    getRangeData('RANGESUPPLIERS')
                ]);
                const processedData = processDashboardData(sales, purchases, customers, suppliers);
                setData(processedData);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    if (loading) return <Spinner />;
    if (error) return <div className="error-message">Error loading dashboard: {error}</div>;
    if (!data) return <div>No data available.</div>;

    // This is the updated JSX layout
    return (
        <div id="dash-container">
            <div className="dash-header">
                <h2>Dashboard</h2>
                <p>Key trends and business insights</p>
            </div>

            <div className="dash-kpi-row">
                <div className="dash-kpi-card"><h3><i className="fas fa-chart-line"></i>Total Sales</h3><h2>{data.kpis.totalSales}</h2></div>
                <div className="dash-kpi-card"><h3><i className="fas fa-shopping-cart"></i>Total Purchases</h3><h2>{data.kpis.totalPurchases}</h2></div>
                <div className="dash-kpi-card"><h3><i className="fas fa-dollar-sign"></i>Net Profit</h3><h2 style={{color: data.kpis.netProfitRaw < 0 ? '#dc3545' : '#28a745'}}>{data.kpis.netProfit}</h2></div>
                <div className="dash-kpi-card"><h3><i className="fas fa-hand-holding-usd"></i>Total Receivable</h3><h2>{data.kpis.totalReceivable}</h2></div>
                <div className="dash-kpi-card"><h3><i className="fas fa-file-invoice-dollar"></i>Total Payable</h3><h2>{data.kpis.totalPayable}</h2></div>
                <div className="dash-kpi-card"><h3><i className="fas fa-map-marker-alt"></i>Top Sales Location</h3><h2>{data.kpis.topLocation}</h2></div>
                <div className="dash-kpi-card"><h3><i className="fas fa-tags"></i>Top Selling Item</h3><h2>{data.kpis.topItem}</h2></div>
            </div>
            
             <div className="dash-charts-row">
                {/* --- FIRST ROW --- */}
                <div className="dash-chart-card grid-col-8">
                    <h3>Sales Trend</h3>
                    <Chart options={data.charts.salesTrend.options} series={data.charts.salesTrend.series} type="area" height={350} />
                </div>
                <div className="dash-chart-card grid-col-4">
                    <h3>Top 10 Customers</h3>
                    <Chart options={data.charts.topCustomers.options} series={data.charts.topCustomers.series} type="bar" height={350} />
                </div>

                {/* --- SECOND ROW --- */}
                <div className="dash-chart-card grid-col-4">
                    <h3>Purchase By Location</h3>
                    <Chart options={data.charts.purchaseByLocation.options} series={data.charts.purchaseByLocation.series} type="donut" height={300} />
                </div>
                 <div className="dash-chart-card grid-col-4">
                    <h3>Purchase By Category</h3>
                    <Chart options={data.charts.purchaseByCategory.options} series={data.charts.purchaseByCategory.series} type="bar" height={300} />
                </div>
                <div className="dash-chart-card grid-col-4">
                    <h3>Sales By Category</h3>
                    <Chart options={data.charts.salesByCategory.options} series={data.charts.salesByCategory.series} type="pie" height={300} />
                </div>
                
                {/* --- THIRD ROW --- */}
                <div className="dash-chart-card grid-col-12">
                     <h3>Sales By City</h3>
                     <Chart options={data.charts.salesByCity.options} series={data.charts.salesByCity.series} type="treemap" height={400} />
                </div>
            </div>
        </div>
    );
};

// --- NEW Data Processing Logic ---

const formatCurrency = (value) => {
    // This formatter handles the dollar sign and commas
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);
};

const formatK = (value) => {
    // This formatter creates the "113K" style values
    return new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(value);
};


// REBUILT data processing function
const processDashboardData = (sales, purchases, customers, suppliers) => {
    // --- KPIs ---
    const totalSales = sales.reduce((sum, r) => sum + Number(r['Total Sales Price'] || 0), 0);
    const totalPurchases = purchases.reduce((sum, r) => sum + Number(r['Total Purchase Price'] || 0), 0);
    const totalReceivable = customers.reduce((sum, r) => sum + Number(r['Balance Receivable'] || 0), 0);
    const totalPayable = suppliers.reduce((sum, r) => sum + Number(r['Balance Payable'] || 0), 0);
    const netProfit = totalSales - totalPurchases;

    const salesByCity = sales.reduce((acc, r) => {
        const city = r['City'] || 'Unknown';
        acc[city] = (acc[city] || 0) + Number(r['Total Sales Price'] || 0);
        return acc;
    }, {});
    const topLocation = Object.entries(salesByCity).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    
    const salesByItemCategory = sales.reduce((acc, r) => {
        const item = r['Item Category'] || 'Unknown';
        acc[item] = (acc[item] || 0) + Number(r['Total Sales Price'] || 0);
        return acc;
    }, {});
    const topItem = Object.entries(salesByItemCategory).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    // --- Chart Data Processing ---

    // Sales Trend
    const trendMap = sales.reduce((acc, r) => {
        const d = new Date(r['SO Date']);
        if (!isNaN(d)) {
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
            acc[key] = (acc[key] || 0) + Number(r['Total Sales Price'] || 0);
        }
        return acc;
    }, {});
    const sortedTrendDates = Object.keys(trendMap).sort();

    // Top 10 Customers
    const custMap = sales.reduce((acc, r) => {
        const c = r['Customer Name'] || 'Unknown';
        acc[c] = (acc[c] || 0) + Number(r['Total Sales Price'] || 0);
        return acc;
    }, {});
    const topCustArr = Object.entries(custMap).sort((a, b) => b[1] - a[1]).slice(0, 10);

    // Purchase by Location
    const purLocMap = purchases.reduce((acc, r) => {
        const s = r['State'] || 'Unknown';
        acc[s] = (acc[s] || 0) + Number(r['Total Purchase Price'] || 0);
        return acc;
    }, {});
    
    // Purchase by Category (NEW logic for stacked bar chart)
    const purCatByYear = purchases.reduce((acc, r) => {
        const d = new Date(r['Date']);
        if (isNaN(d)) return acc;
        const year = d.getFullYear();
        const category = r['Item Category'] || 'Unknown';
        const value = Number(r['Total Purchase Price'] || 0);

        if (!acc[year]) acc[year] = {};
        acc[year][category] = (acc[year][category] || 0) + value;
        return acc;
    }, {});

    const allYears = Object.keys(purCatByYear).sort();
    const allCategories = [...new Set(purchases.map(p => p['Item Category'] || 'Unknown'))];
    
    const purchaseByCategorySeries = allCategories.map(cat => ({
        name: cat,
        data: allYears.map(year => purCatByYear[year][cat] || 0)
    }));

    // Sales by Category
    const salesCatMap = sales.reduce((acc, r) => {
        const c = r['Item Category'] || 'Unknown';
        acc[c] = (acc[c] || 0) + Number(r['Total Sales Price'] || 0);
        return acc;
    }, {});

    // Sales by City
    const salesByCityData = Object.entries(salesByCity).map(([city, sales]) => ({ x: city, y: sales }));

    return {
        kpis: {
            totalSales: formatCurrency(totalSales),
            totalPurchases: formatCurrency(totalPurchases),
            netProfit: formatCurrency(netProfit),
            netProfitRaw: netProfit, // For conditional coloring
            totalReceivable: formatCurrency(totalReceivable),
            totalPayable: formatCurrency(totalPayable),
            topLocation,
            topItem,
        },
        charts: {
            salesTrend: {
                series: [{ name: 'Sales', data: sortedTrendDates.map(date => trendMap[date]) }],
                options: { chart: { type: 'area', toolbar: { show: false } }, dataLabels: { enabled: false }, stroke: { curve: 'smooth' }, xaxis: { type: 'datetime', categories: sortedTrendDates }, tooltip: { x: { format: 'MMM yyyy' } } }
            },
            topCustomers: {
                series: [{ name: 'Total Sales', data: topCustArr.map(a => a[1]) }],
                options: {
                    chart: { type: 'bar' },
                    plotOptions: { bar: { horizontal: true, borderRadius: 4, dataLabels: { position: 'top' } } },
                    xaxis: { categories: topCustArr.map(a => a[0]) },
                    dataLabels: { enabled: true, formatter: val => formatK(val), offsetX: 40, style: { colors: ['#fff'] } },
                    tooltip: { y: { formatter: val => formatCurrency(val) } }
                }
            },
            purchaseByLocation: {
                series: Object.values(purLocMap),
                options: { chart: { type: 'donut' }, labels: Object.keys(purLocMap), legend: { position: 'bottom' }}
            },
            purchaseByCategory: {
                series: purchaseByCategorySeries,
                options: {
                    chart: { type: 'bar', stacked: true },
                    plotOptions: { bar: { borderRadius: 4, horizontal: false } },
                    xaxis: { categories: allYears },
                    legend: { position: 'top', horizontalAlign: 'left' }
                }
            },
            salesByCategory: {
                series: Object.values(salesCatMap),
                options: { chart: { type: 'pie' }, labels: Object.keys(salesCatMap), legend: { position: 'bottom' } }
            },
            salesByCity: {
                series: [{ data: salesByCityData }],
                options: { chart: { type: 'treemap' }, legend: { show: false }, plotOptions: { treemap: { distributed: true, enableShades: false }}}
            }
        }
    };
};

export default Dashboard;