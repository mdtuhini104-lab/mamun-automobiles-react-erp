import React from 'react';
import { message } from 'antd';
import databaseBridge from '../services/databaseBridge';

/**
 * UniversalAIGuard
 * Listens globally for blur events on inputs/textareas and applies AI professionalization.
 */
const UniversalAIGuard = () => {
    React.useEffect(() => {
        const handleGlobalBlur = async (event) => {
            const target = event.target;
            
            // Check if it's a text input or textarea
            const isTextInput = (target.tagName === 'INPUT' && (target.type === 'text' || !target.type)) || target.tagName === 'TEXTAREA';
            
            if (!isTextInput) return;
            
            // SECURITY EXCLUSION: Never AI-correct sensitive authentication/identity fields
            if (target.dataset.aiIgnore === 'true') return;
            
            const context = target.name || target.id || target.placeholder || '';
            const lowerContext = context.toLowerCase();
            
            // STRICT EXCLUSION: Never AI-correct registration, phone, name, or identity fields
            const isSensitive = /email|gmail|identifier|id|password|pass|user|login|token|registration|plate|vehicle_no|phone|mobile|contact|customer_name|client_name/i.test(lowerContext);
            if (isSensitive) {
                console.log('[UniversalAIGuard] Skipping sensitive/ID field:', context);
                return;
            }

            // Also skip if target has explicitly disabled AI clean via props
            if (target.getAttribute('data-ai-clean') === 'false') return;

            const value = target.value?.trim();
            // Don't correct very short strings, numeric-only strings, or strings that look like plate numbers (alphanumeric with dashes)
            const isPlateMatch = /^[A-Z0-9][- ]?([A-Z0-9]{1,4}[- ]?){1,3}[A-Z0-9]+$/i.test(value);
            if (!value || value.length < 3 || /^\d+$/.test(value) || isPlateMatch) return;

            // Prevent double correction if already handled by specialized logic
            if (target.dataset.aiGuarded === 'true') return;

            // Context Detection
            let correctionContext = 'universal';
            if (lowerContext.includes('category')) correctionContext = 'category';
            else if (lowerContext.includes('car') || lowerContext.includes('model')) correctionContext = 'vehicle_model';
            else if (lowerContext.includes('supplier')) correctionContext = 'supplier';
            else if (lowerContext.includes('address') || lowerContext.includes('location')) correctionContext = 'address';
            else if (lowerContext.includes('note') || lowerContext.includes('remark') || lowerContext.includes('complaint')) correctionContext = 'notes';
            // Explicitly avoid 'description' if it matches inventory parts (will handle that via searchable dropdowns instead)
            else if (lowerContext.includes('description') || target.tagName === 'TEXTAREA') {
                if (lowerContext.includes('inventory') || lowerContext.includes('part') || lowerContext.includes('item')) return; // Skip inventory descriptions
                correctionContext = 'notes';
            }

            try {
                // Subtle visual feedback start
                target.style.opacity = '0.7';
                
                const corrected = await databaseBridge.correctTerm(value, correctionContext);
                
                // For notes, we apply if different even if only case changed. 
                // For short labels, we keep the insensitive check to avoid minor noise, but notes need precision.
                const shouldApply = correctionContext === 'notes' ? (corrected && corrected !== value) : (corrected && corrected.toLowerCase() !== value.toLowerCase());

                if (shouldApply) {
                    // Update value
                    target.value = corrected;
                    
                    // Dispatch events so React/Antd pick up the change
                    target.dispatchEvent(new Event('input', { bubbles: true }));
                    target.dispatchEvent(new Event('change', { bubbles: true }));
                    
                    message.info({
                        content: `✨ AI Cleaned: "${value}" → "${corrected}"`,
                        duration: 2,
                        style: { marginTop: '10vh' }
                    });
                }
            } catch (err) {
                console.error('[UniversalAIGuard] Error:', err);
            } finally {
                target.style.opacity = '1';
                target.dataset.aiGuarded = 'true';
                // Reset guarded flag after a delay to allow future edits if blurred again
                setTimeout(() => {
                   if(target) delete target.dataset.aiGuarded;
                }, 500);
            }
        };

        // Use capture phase to ensure we get the event regardless of stopPropagation on bubbling
        window.addEventListener('blur', handleGlobalBlur, true);
        
        return () => {
            window.removeEventListener('blur', handleGlobalBlur, true);
        };
    }, []);

    return null; // Global invisible listener
};

export default UniversalAIGuard;




