import { useCallback, useState } from 'react';
import { message } from 'antd';
import databaseBridge from '../services/databaseBridge';

/**
 * Hook to provide AI Term Correction functionality.
 * @param {Object} form - Ant Design Form instance
 * @returns {Function} handleBlurCorrection - Function to attach to onBlur
 */
export const useAICorrection = (form, vehicleContext = '') => {
    const [isCorrecting, setIsCorrecting] = useState(false);

    const handleCorrection = useCallback(async (text, context) => {
        if (!text || text.length < 3) return;
        setIsCorrecting(true);
        try {
            console.log('[useAICorrection-ACTIVE] Requesting AI correction for:', text, 'Context:', context, 'VehicleContext:', vehicleContext);
            const corrected = await databaseBridge.correctTerm(text, context, 'en', vehicleContext);
            if (corrected && corrected.toLowerCase() !== text.toLowerCase()) {
                console.log('[useAICorrection] Correction SUCCESS:', corrected);
                return corrected;
            }
        } catch (error) {
            console.error('[useAICorrection] Final Hook FAIL:', error);
        } finally {
            setIsCorrecting(false);
        }
    }, []); // Dependency array for handleCorrection

    const handleBlurCorrection = useCallback(async (fieldName, currentValue, context) => {
        if (!currentValue || typeof currentValue !== 'string' || currentValue.trim().length < 2) return;

        try {
            // Use the new handleCorrection function
            const corrected = await handleCorrection(currentValue, context);
            if (corrected && corrected.toLowerCase() !== currentValue.toLowerCase()) {
                form.setFieldsValue({ [fieldName]: corrected });
                message.info(`AI corrected: "${currentValue}" → "${corrected}"`);
            }
        } catch (error) {
            console.error('[useAICorrection] Error:', error);
        }
    }, [form, handleCorrection]); // Added handleCorrection to dependencies


    return { handleBlurCorrection, isCorrecting }; // Export isCorrecting as well
};
