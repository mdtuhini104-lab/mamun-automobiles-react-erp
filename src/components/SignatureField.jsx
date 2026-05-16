import React, { useRef, useEffect, useState } from 'react';
import { Button, Space, Typography, Tooltip, message } from 'antd';
import { Trash2, Edit3, Save, RotateCcw } from 'lucide-react';

const { Text } = Typography;

/**
 * SignatureField Component v3.0 - Premium Digital Edition
 */
const SignatureField = ({ value, onChange, label, height = 150, isPermanent = false, storageKey = 'permanent_seller_signature' }) => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasContent, setHasContent] = useState(!!value);

    // Sync canvas with value prop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        
        if (value) {
            const img = new Image();
            img.src = value;
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                setHasContent(true);
            };
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            setHasContent(false);
        }
    }, [value]);

    // Setup Canvas context
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }, []);

    const startDrawing = (e) => {
        const { offsetX, offsetY } = getCoordinates(e);
        const ctx = canvasRef.current.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY);
        setIsDrawing(true);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        const { offsetX, offsetY } = getCoordinates(e);
        const ctx = canvasRef.current.getContext('2d');
        ctx.lineTo(offsetX, offsetY);
        ctx.stroke();
        setHasContent(true);
    };

    const stopDrawing = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        saveCanvas();
    };

    const saveCanvas = () => {
        const canvas = canvasRef.current;
        const dataUrl = canvas.toDataURL('image/png');
        onChange?.(dataUrl);
    };

    const getCoordinates = (e) => {
        if (e.touches && e.touches[0]) {
            const rect = canvasRef.current.getBoundingClientRect();
            return {
                offsetX: e.touches[0].clientX - rect.left,
                offsetY: e.touches[0].clientY - rect.top
            };
        }
        return {
            offsetX: e.nativeEvent.offsetX,
            offsetY: e.nativeEvent.offsetY
        };
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        onChange?.(null);
        setHasContent(false);
    };

    const handleSaveToStorage = () => {
        const canvas = canvasRef.current;
        const dataUrl = canvas.toDataURL('image/png');
        localStorage.setItem(storageKey, dataUrl);
        message.success('Signature saved as permanent.');
    };

    const handleResetStorage = () => {
        localStorage.removeItem(storageKey);
        clearCanvas();
        message.info('Permanent signature cleared.');
    };

    return (
        <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                {label && <Text strong style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#94A3B8' }}>{label}</Text>}
                <Space size={8}>
                    {isPermanent && (
                        <>
                            <Tooltip title="Save as default">
                                <Button size="small" icon={<Save size={12} />} onClick={handleSaveToStorage} style={{ fontSize: 10, height: 26, background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', color: '#3B82F6' }}>SAVE</Button>
                            </Tooltip>
                            <Tooltip title="Reset permanent">
                                <Button size="small" icon={<RotateCcw size={12} />} onClick={handleResetStorage} style={{ fontSize: 10, height: 26 }} danger ghost>RESET</Button>
                            </Tooltip>
                        </>
                    )}
                    <Tooltip title="Clear Pad">
                        <Button size="small" icon={<Trash2 size={12} />} onClick={clearCanvas} danger ghost style={{ height: 26 }}>CLEAR</Button>
                    </Tooltip>
                </Space>
            </div>
            
            <div className="digital-signature-box" style={{ 
                position: 'relative', 
                border: '1px solid rgba(59, 130, 246, 0.3)', 
                borderRadius: '16px', 
                overflow: 'hidden', 
                background: '#0F172A',
                boxShadow: '0 0 20px rgba(59, 130, 246, 0.1)'
            }}>
                <canvas
                    ref={canvasRef}
                    width={400}
                    height={height}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseOut={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    style={{ width: '100%', height: height, cursor: 'crosshair', display: 'block' }}
                />
                
                {!hasContent && (
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', color: '#3B82F6', opacity: 0.3, textAlign: 'center' }}>
                        <Edit3 size={32} style={{ marginBottom: 8, strokeWidth: 1 }} />
                        <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '2px' }}>DRAW SIGNATURE HERE</div>
                    </div>
                )}
                
                {/* Visual Guidelines */}
                <div style={{ position: 'absolute', bottom: '20%', left: '10%', right: '10%', height: '1px', background: 'rgba(59, 130, 246, 0.1)', pointerEvents: 'none' }}></div>
            </div>

            <style>{`
                .digital-signature-box:focus-within {
                    border-color: #3B82F6 !important;
                    box-shadow: 0 0 30px rgba(59, 130, 246, 0.2) !important;
                }
            `}</style>
        </div>
    );
};

export default SignatureField;

