import React from 'react';
import { Input, Button, Tooltip, message, Spin } from 'antd';
import { Mic, MicOff, Sparkles } from 'lucide-react';
import { processUserInput } from '../services/aiServiceV2';
import { useGlobalState } from '../contexts/GlobalStateContext';

const { TextArea } = Input;

const SmartVoiceInput = React.forwardRef(({ 
    value, 
    onChange, 
    placeholder, 
    isTextArea = false, 
    autoRefine = false,
    ...props 
}, ref) => {
    const { language } = useGlobalState();
    const [isListening, setIsListening] = React.useState(false);
    const [isProcessing, setIsProcessing] = React.useState(false);
    const [isSuppressing, setIsSuppressing] = React.useState(false);
    const recognitionRef = React.useRef(null);
    const audioStreamRef = React.useRef(null);

    React.useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            // Map our language to SpeechRecognition codes
            recognition.lang = language === 'bn' ? 'bn-BD' : 'en-US';

            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                if (autoRefine) {
                    handleProcessAI(transcript);
                } else {
                    // Just append if not auto-refining, or replace
                    const newVal = (value ? value + " " : "") + transcript;
                    if (onChange) onChange({ target: { value: newVal } });
                }
            };

            recognition.onerror = (event) => {
                if (event.error !== 'no-speech' && event.error !== 'aborted') {
                    console.error('[SmartVoiceInput] Speech recognition error:', event.error);
                    message.error(`Voice Error: ${event.error}`);
                } else {
                    console.warn('[SmartVoiceInput] Speech recognition warning:', event.error);
                }
                setIsListening(false);
            };

            recognition.onend = () => {
                setIsListening(false);
                if (audioStreamRef.current) {
                    audioStreamRef.current.getTracks().forEach(track => track.stop());
                    audioStreamRef.current = null;
                }
                setIsSuppressing(false);
            };
            recognitionRef.current = recognition;
        }
    }, [language, value, autoRefine, onChange]);

    const handleProcessAI = async (textToProcess = value) => {
        const textStr = (typeof textToProcess === 'string') ? textToProcess : String(textToProcess || '');
        if (!textStr || textStr.trim().length < 2) return;
        setIsProcessing(true);
        try {
            const refined = await processUserInput(textStr, language);
            if (refined) {
                if (onChange) onChange({ target: { value: refined } });
                message.success(language === 'bn' ? 'AI দ্বারা পরিমার্জিত করা হয়েছে' : 'AI Optimized & Translated');
            }
        } catch (err) {
            console.error('[SmartVoiceInput] AI Process Error:', err);
        } finally {
            setIsProcessing(false);
        }
    };

    const toggleListening = async () => {
        if (isListening) {
            recognitionRef.current?.stop();
        } else {
            if (!recognitionRef.current) {
                return message.warning("Voice recognition is not supported in this browser. Try Chrome.");
            }
            try {
                // Noise Suppression Warm-up
                setIsSuppressing(true);
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    audio: { 
                        noiseSuppression: true, 
                        echoCancellation: true,
                        autoGainControl: true
                    } 
                });
                audioStreamRef.current = stream;
                
                recognitionRef.current.start();
                setIsListening(true);
                message.info(language === 'bn' ? 'নয়েজ ফিল্টার সক্রিয়... শুনছি' : 'Noise filter active... listening');
            } catch (err) {
                console.warn('[SmartVoiceInput] Start failed:', err);
                setIsSuppressing(false);
                // Fallback start without explicit stream if permission failed but recognition might still work
                try {
                    recognitionRef.current.start();
                    setIsListening(true);
                } catch (e) {}
            }
        }
    };

    const InputComponent = isTextArea ? TextArea : Input;

    return (
        <div className={`smart-voice-input-wrapper ${props.className || ''}`} style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ position: 'relative' }}>
                <InputComponent
                    ref={ref}
                    value={value}
                    onChange={(e) => {
                        if (onChange) onChange(e);
                    }}
                    placeholder={placeholder}
                    suffix={!isTextArea ? (
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            {isProcessing && <Spin size="small" style={{ marginRight: 5 }} />}
                            
                        <Tooltip title={language === 'bn' ? 'গ্যারেজ অপ্টিমাইজড ভয়েস এন্ট্রি' : 'Garage Optimized Voice Entry'}>
                            <Button 
                                type="text" 
                                size="small"
                                icon={isListening ? <MicOff size={16} color="#ff4d4f" /> : <Mic size={16} color="#3B82F6" />}
                                onClick={toggleListening}
                                style={{ 
                                    border: isListening ? '1px solid #ff4d4f' : 'none',
                                    borderRadius: '50%',
                                    animation: isListening ? 'pulse 1.5s infinite' : 'none'
                                }}
                            />
                        </Tooltip>

                            <Tooltip title={language === 'bn' ? 'AI দিয়ে ঠিক করুন' : 'AI Refine & Translate'}>
                                <Button 
                                    type="text" 
                                    size="small"
                                    icon={isProcessing ? <Spin size="small" /> : <Sparkles size={16} color="#722ed1" />}
                                    onClick={() => handleProcessAI()}
                                    disabled={!value || isProcessing}
                                />
                            </Tooltip>
                        </div>
                    ) : null}
                    {...props}
                    style={{ 
                        paddingRight: isTextArea ? '60px' : undefined,
                        ...props.style
                    }}
                />
                
                {isTextArea && (
                    <div style={{ 
                        position: 'absolute', 
                        right: '8px', 
                        bottom: '8px', 
                        display: 'flex', 
                        gap: '4px', 
                        zIndex: 10,
                        background: 'rgba(0,0,0,0.3)',
                        padding: '4px',
                        borderRadius: '4px',
                        backdropFilter: 'blur(4px)'
                    }}>
                        {isProcessing && <Spin size="small" />}
                        <Tooltip title={language === 'bn' ? 'গ্যারেজ অপ্টিমাইজড ভয়েস এন্ট্রি' : 'Garage Optimized Voice Entry'}>
                            <Button 
                                type="text" 
                                size="small"
                                icon={isListening ? <MicOff size={16} color="#ff4d4f" /> : <Mic size={16} color="#3B82F6" />}
                                onClick={toggleListening}
                            />
                        </Tooltip>
                        <Tooltip title={language === 'bn' ? 'AI দিয়ে ঠিক করুন' : 'AI Refine & Translate'}>
                            <Button 
                                type="text" 
                                size="small"
                                icon={<Sparkles size={16} color="#722ed1" />}
                                onClick={() => handleProcessAI()}
                                disabled={!value || isProcessing}
                            />
                        </Tooltip>
                    </div>
                )}
            </div>
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(255, 77, 79, 0.4); }
                    70% { box-shadow: 0 0 0 10px rgba(255, 77, 79, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(255, 77, 79, 0); }
                }
                
                /* Standard fallback styling */
                .smart-voice-input-wrapper:not(.premium-glow-input):not(.glass-input) .ant-input-affix-wrapper,
                .smart-voice-input-wrapper:not(.premium-glow-input):not(.glass-input) .ant-input {
                    border-radius: 4px;
                    border: 1px solid rgba(0,0,0,0.5);
                    background: #FFFFFF;
                    color: #000000;
                    transition: all 0.3s ease;
                }
                
                /* --- PREMIUM DARK MODE CUSTOMIZATIONS --- */
                .smart-voice-input-wrapper.premium-glow-input .ant-input-affix-wrapper,
                .smart-voice-input-wrapper.premium-glow-input .ant-input,
                .smart-voice-input-wrapper.glass-input .ant-input-affix-wrapper,
                .smart-voice-input-wrapper.glass-input .ant-input {
                    border-radius: 8px !important;
                    border: 1px solid #4b5563 !important;
                    background-color: rgba(15, 23, 42, 0.75) !important;
                    color: #FFFFFF !important;
                    font-weight: 700 !important;
                    transition: all 0.3s ease;
                }
                
                /* Force nested input field text color to bright white */
                .smart-voice-input-wrapper.premium-glow-input .ant-input-affix-wrapper .ant-input,
                .smart-voice-input-wrapper.glass-input .ant-input-affix-wrapper .ant-input {
                    background: transparent !important;
                    color: #FFFFFF !important;
                    font-weight: 700 !important;
                }
                
                /* Focus state overrides with Bright Royal Blue glow and extra bold layout */
                .smart-voice-input-wrapper.premium-glow-input .ant-input-affix-wrapper:focus-within,
                .smart-voice-input-wrapper.premium-glow-input .ant-input:focus,
                .smart-voice-input-wrapper.glass-input .ant-input-affix-wrapper:focus-within,
                .smart-voice-input-wrapper.glass-input .ant-input:focus {
                    border-color: #003399 !important;
                    background-color: rgba(15, 23, 42, 0.9) !important;
                    box-shadow: 0 0 0 3px rgba(0, 51, 153, 0.6) !important;
                }

                .smart-voice-input-wrapper.premium-glow-input .ant-input-affix-wrapper:focus-within .ant-input,
                .smart-voice-input-wrapper.premium-glow-input .ant-input:focus {
                    font-weight: 800 !important;
                }

                /* Enhanced Light Gray placeholder readability */
                .smart-voice-input-wrapper.premium-glow-input .ant-input::placeholder,
                .smart-voice-input-wrapper.glass-input .ant-input::placeholder {
                    color: #9ca3af !important;
                    opacity: 1 !important;
                    font-weight: 500 !important;
                }
            `}} />
        </div>
    );
});

export default SmartVoiceInput;




