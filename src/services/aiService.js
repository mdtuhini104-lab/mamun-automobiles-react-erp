import databaseBridge from './databaseBridge';

/**
 * Public AI Layer - Refactored to use backend proxy only for security and stability.
 */

export const enhanceAutomotiveText = async (inputText) => {
    if (!inputText || inputText.trim().length === 0) return inputText;
    try {
        const corrected = await databaseBridge.correctTerm(inputText);
        return corrected || inputText;
    } catch (err) {
        console.warn('[aiService] enhanceAutomotiveText failed:', err);
        return inputText;
    }
};

export const predictPartsFromComplaint = async (complaintText) => {
    if (!complaintText || complaintText.trim().length < 5) return [];
    try {
        // Since backend doesn't have a specific 'predictParts' yet, 
        // we use correctTerm as a general AI wrapper for now.
        const result = await databaseBridge.correctTerm(`Suggest 3-5 spare parts for: ${complaintText}`);
        return result ? result.split(',').map(item => item.trim()).filter(Boolean) : [];
    } catch (err) {
        console.warn('[aiService] predictPartsFromComplaint failed:', err);
        return [];
    }
};

export const generateFinancialInsights = async (revenue, expense) => {
    const profit = revenue - expense;
    try {
        return await databaseBridge.correctTerm(`Revenue ${revenue}, Expense ${expense}, Profit ${profit}. Generate 1-sentence financial insight.`);
    } catch (err) {
        return "Ensure inventory levels are optimized for tomorrow.";
    }
};

export const generateBusinessTip = async (todayStats) => {
    try {
        return await databaseBridge.correctTerm(`Business stats: ${JSON.stringify(todayStats)}. Generate a short business tip.`);
    } catch (err) {
        return "Focus on high-margin collision repair services today.";
    }
};
