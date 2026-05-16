/**
 * Utility functions for Mamun Automobiles project
 * 
 * Moving helper functions here keeps your main React components clean,
 * reusable, and easier to test!
 */
import React from 'react';

/**
 * Calculates the total sum from an array of items based on quantity and price.
 * 
 * @param {Array} items - Array of item objects (e.g., parts or services)
 * @param {string} priceKey - The key corresponding to the price property
 * @param {string} qtyKey - The key corresponding to the quantity property (optional)
 * @returns {number} The calculated total
 */
export const calculateTotal = (items, priceKey = 'price', qtyKey = 'qty') => {
    if (!items || !Array.isArray(items)) return 0;

    return items.reduce((sum, item) => {
        const price = parseFloat(item[priceKey]) || 0;
        const qty = item[qtyKey] !== undefined ? parseFloat(item[qtyKey]) || 1 : 1;

        return sum + (price * qty);
    }, 0);
};

/**
 * Saves a given payload to the browser's localStorage.
 * 
 * @param {string} key - The localStorage key 
 * @param {any} data - The data to store (will be stringified)
 */
export const syncToLocalStorage = (key, data) => {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error(`Error saving ${key} to localStorage`, error);
    }
};

/**
 * Retrieves and parses JSON data from localStorage safely.
 * 
 * @param {string} key - The localStorage key
 * @param {any} fallback - The fallback value if key doesn't exist
 * @returns {any} The parsed data or the fallback value
 */
export const getFromLocalStorage = (key, fallback = []) => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
    } catch (error) {
        console.error(`Error reading ${key} from localStorage`, error);
        return fallback;
    }
};

/**
 * Formats a currency value to strings with commans (e.g., 50000 -> "50,000")
 * 
 * @param {number} amount - The amount to format
 * @returns {string} The formatted string
 */
export const formatCurrency = (amount) => {
    if (amount === undefined || amount === null || isNaN(Number(amount))) return "0";
    return Number(amount).toLocaleString('en-IN');
};

/**
 * A wrapper around React.lazy that handles ChunkLoadError (failed to fetch dynamically imported module).
 * This usually happens when a new version of the app is deployed and the browser tries to load
 * obsolete chunks from the previous build.
 * 
 * @param {Function} componentImport - The function containing the import() call
 * @returns {React.Component} - The lazy-loaded component with retry logic
 */
export const lazyWithRetry = (componentImport) => {
    return React.lazy(async () => {
        // Track retries in session storage to avoid infinite loops
        const pageKey = window.location.pathname + window.location.hash;
        const retryKey = `retry_${pageKey.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const retryCount = parseInt(sessionStorage.getItem(retryKey) || '0', 10);

        try {
            const component = await componentImport();
            // Success! Clear retry count
            sessionStorage.removeItem(retryKey);
            return component;
        } catch (error) {
            console.error("Chunk load error detected:", error);
            
            if (retryCount < 3) {
                console.warn(`Retry attempt ${retryCount + 1} for ${pageKey}...`);
                sessionStorage.setItem(retryKey, (retryCount + 1).toString());
                
                // Add a small delay before reload to let user see what happened
                setTimeout(() => window.location.reload(), 500);
                return { 
                    default: () => React.createElement('div', { 
                        style: { padding: 40, textAlign: 'center' } 
                    }, 'Reloading component...') 
                };
            }
            
            console.error("Critical: Maximum retry limit reached for chunk loading.");
            // Return a clear error component instead of looping
            return { 
                default: () => React.createElement('div', {
                    style: { padding: '40px', textAlign: 'center', background: '#fff1f0', border: '1px solid #ffa39e', borderRadius: 8 }
                }, [
                    React.createElement('h3', { style: { color: '#cf1322' }, key: 'h3' }, 'Module Loading Failed'),
                    React.createElement('p', { key: 'p' }, "We're having trouble loading this section of the app. This usually happens after a new update."),
                    React.createElement('button', {
                        key: 'btn',
                        onClick: () => {
                            sessionStorage.removeItem(retryKey);
                            window.location.reload();
                        },
                        style: { padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }
                    }, 'Force Refresh')
                ])
            };
        }
    });
};
