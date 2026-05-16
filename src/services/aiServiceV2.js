import databaseBridge from './databaseBridge';

/**
 * Public AI Layer V2 - Refactored to use backend proxy ONLY.
 * This file exists to overcome persistent browser caching of the original aiService.js.
 */

export const enhanceAutomotiveText = async (inputText, vehicleContext) => {
    if (!inputText || inputText.trim().length === 0) return inputText;
    try {
        console.log('[aiServiceV2] Requesting correction for:', inputText);
        const corrected = await databaseBridge.correctTerm(inputText, 'notes', 'en', vehicleContext);
        return corrected || inputText;
    } catch (err) {
        console.warn('[aiServiceV2] enhanceAutomotiveText failed:', err);
        return inputText;
    }
};

export const predictPartsFromComplaint = async (complaintText) => {
    if (!complaintText || complaintText.trim().length < 5) return [];
    try {
        const result = await databaseBridge.correctTerm(`Suggest 3-5 spare parts for: ${complaintText}`);
        return result ? result.split(',').map(item => item.trim()).filter(Boolean) : [];
    } catch (err) {
        console.warn('[aiServiceV2] predictPartsFromComplaint failed:', err);
        return [];
    }
};

export const generateFinancialInsights = async (revenue, expense, language = 'en') => {
    const profit = revenue - expense;
    try {
        const langPrompt = language === 'bn' 
            ? 'Produce the response in Professional Bangla, keeping technical terms like Profit/Revenue/Expense in English.' 
            : 'Produce the response in Simple & Clear English.';
        return await databaseBridge.correctTerm(`Revenue ${revenue}, Expense ${expense}, Profit ${profit}. Generate 1-sentence financial insight. ${langPrompt}`);
    } catch (err) {
        return language === 'bn' ? "আগামীকালের জন্য ইনভেন্টরি লেভেল অপ্টিমাইজ করুন।" : "Ensure inventory levels are optimized for tomorrow.";
    }
};

export const generateBusinessTip = async (todayStats, language = 'en') => {
    try {
        const statsStr = `Revenue: ${todayStats.revenue}, Cash: ${todayStats.cash}, Jobs: ${todayStats.pending}`;
        return await databaseBridge.correctTerm(statsStr, 'insight', language);
    } catch (err) {
        return language === 'bn' ? "আজ হাই-মার্জিন কাজের দিকে নজর দিন।" : "Focus on high-margin collision repair services today.";
    }
};

/**
 * Smart Multi-Language Input Processor
 * @param {string} text - Raw input or voice transcript
 * @param {string} targetLang - 'en' or 'bn'
 * @param {string} mode - 'auto' (detect and translate/refine)
 */
export const processUserInput = async (text, targetLang, mode = 'auto', vehicleContext) => {
    if (!text || text.trim().length < 2) return text;
    try {
        console.log(`[aiServiceV2] Processing for ${targetLang}:`, text);
        // Use the backend's native targetLang and context support
        const processed = await databaseBridge.correctTerm(text, 'notes', targetLang, vehicleContext);
        return processed || text;
    } catch (err) {
        console.warn('[aiServiceV2] processUserInput failed:', err);
        return text;
    }
};
