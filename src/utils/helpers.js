export const formatDateForSheet = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    // The format YYYY-MM-DD is universally understood by Google Sheets
    return `${year}-${month}-${day}`;
};