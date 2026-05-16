import React from 'react';
import ReactDOM from 'react-dom';
import { Button, message, Tooltip } from 'antd';
import { Mic, MicOff, Sparkles } from 'lucide-react';
import { useGlobalState } from '../contexts/GlobalStateContext';
import { processUserInput } from '../services/aiServiceV2';

/**
 * GlobalVoiceInput
 * Automatically attaches a microphone button to the currently focused input/textarea.
 * Supports Hybrid Input (append) and AI Refinement (Noise Suppression).
 */
const GlobalVoiceInput = () => {
    const { language } = useGlobalState();
    const [activeElement, setActiveElement] = React.useState(null);
    const [isListening, setIsListening] = React.useState(false);
    const [isProcessing, setIsProcessing] = React.useState(false);
    const [coords, setCoords] = React.useState({ top: 0, left: 0, height: 0, width: 0 });
    
    const recognitionRef = React.useRef(null);

    // Track focused element
    React.useEffect(() => {
        const handleFocusIn = (e) => {
            const target = e.target;
            const isTextInput = (target.tagName === 'INPUT' && (target.type === 'text' || !target.type)) || target.tagName === 'TEXTAREA';
            
            // Check visibility and basic attributes
            if (isTextInput && !target.readOnly && !target.disabled) {
                setActiveElement(target);
                updateCoords(target);
            }
        };

        const handleFocusOut = (e) => {
            // Keep activeElement slightly longer to allow clicking the mic button
            // If the focus moves to something that is not our mic button, clear it
            setTimeout(() => {
                const focused = document.activeElement;
                if (!focused.closest('.global-voice-btn') && 
                    focused.tagName !== 'INPUT' && 
                    focused.tagName !== 'TEXTAREA') {
                    setActiveElement(null);
                }
            }, 500);
        };

        const updateCoords = (el) => {
            if (!el) return;
            const rect = el.getBoundingClientRect();
            setCoords({
                top: rect.top + window.scrollY,
                left: rect.left + window.scrollX,
                height: rect.height,
                width: rect.width
            });
        };

        window.addEventListener('focusin', handleFocusIn);
        window.addEventListener('focusout', handleFocusOut);
        
        const onScroll = () => {
             if (activeElement) {
                const rect = activeElement.getBoundingClientRect();
                setCoords({
                    top: rect.top + window.scrollY,
                    left: rect.left + window.scrollX,
                    height: rect.height,
                    width: rect.width
                });
            }
        };
        
        window.addEventListener('resize', onScroll);
        window.addEventListener('scroll', onScroll, true);

        return () => {
            window.removeEventListener('focusin', handleFocusIn);
            window.removeEventListener('focusout', handleFocusOut);
            window.removeEventListener('resize', onScroll);
            window.removeEventListener('scroll', onScroll, true);
        };
    }, [activeElement]);

    const startListening = React.useCallback(() => {
        if (!activeElement) return;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            message.error('Voice search is not supported in this browser.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = language === 'bn' ? 'bn-BD' : 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            setIsListening(true);
            message.destroy();
            message.loading({ content: language === 'bn' ? 'আমি শুনছি...' : 'System Listening...', key: 'voice-status', duration: 0 });
        };

        recognition.onresult = async (event) => {
            const transcript = event.results[0][0].transcript;
            if (!transcript) return;

            setIsProcessing(true);
            message.loading({ content: language === 'bn' ? 'এআই দিয়ে পরিষ্কার করা হচ্ছে...' : 'AI Refinement...', key: 'voice-status', duration: 0 });

            try {
                // AI Noise Suppression / Refinement
                const refinedText = await processUserInput(transcript, language);
                
                // Hybrid Input: Append to existing text
                const currentValue = activeElement.value || '';
                const lastChar = currentValue.length > 0 ? currentValue[currentValue.length - 1] : '';
                const prefix = currentValue && lastChar !== ' ' ? ' ' : '';
                const newValue = currentValue + prefix + refinedText;
                
                activeElement.value = newValue;
                
                // Trigger events so React/Antd pick up changes
                activeElement.dispatchEvent(new Event('input', { bubbles: true }));
                activeElement.dispatchEvent(new Event('change', { bubbles: true }));
                
                message.success({ content: `✨ Voice Added`, key: 'voice-status', duration: 2 });
            } catch (err) {
                console.error('Voice processing error:', err);
                message.error({ content: 'AI processing failed.', key: 'voice-status' });
                activeElement.value += ` ${transcript}`;
            } finally {
                setIsProcessing(false);
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            setIsListening(false);
            message.error({ content: `Voice error: ${event.error}`, key: 'voice-status' });
        };

        recognition.onend = () => {
            setIsListening(false);
            if (!isProcessing) {
                message.destroy('voice-status');
            }
        };

        recognitionRef.current = recognition;
        recognition.start();
    }, [activeElement, language, isProcessing]);

    const stopListening = React.useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
    }, []);

    if (!activeElement || activeElement.offsetParent === null) return null;

    // Use absolute positioning within a fixed overlay
    const buttonStyle = {
        position: 'absolute',
        top: coords.top + (coords.height / 2) - 12, // center vertically (24px button height)
        left: coords.left + coords.width - 28, // nudge inside right edge
        zIndex: 999999,
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 24,
        height: 24,
        padding: 0,
        borderRadius: '50%',
        background: isListening ? 'rgba(255, 77, 79, 0.2)' : 'rgba(59, 130, 246, 0.1)',
        border: `1px solid ${isListening ? '#ff4d4f' : 'var(--accent, #3B82F6)'}`,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: isListening ? '0 0 12px rgba(255, 77, 79, 0.6)' : '0 4px 6px rgba(0,0,0,0.1)'
    };

    return ReactDOM.createPortal(
        <div 
            className="global-voice-btn" 
            style={buttonStyle}
            onMouseDown={(e) => e.preventDefault()} // Prevent losing focus when clicking button
        >
            <Tooltip title={isListening ? (language === 'bn' ? 'বন্ধ করুন' : 'Stop Listening') : (language === 'bn' ? 'ভয়েস ইনপুট' : 'Smart Voice Input')}>
                <Button
                    type="text"
                    size="small"
                    icon={isListening ? 
                        <MicOff size={14} style={{ color: '#ff4d4f' }} /> : 
                        (isProcessing ? <Sparkles size={14} className="animate-pulse" style={{ color: '#3B82F6' }} /> : <Mic size={14} style={{ color: 'var(--accent, #3B82F6)' }} />)
                    }
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (isListening) stopListening();
                        else startListening();
                    }}
                    style={{ border: 'none', background: 'transparent', width: '100%', height: '100%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                />
            </Tooltip>
        </div>,
        document.body
    );
};

export default GlobalVoiceInput;





