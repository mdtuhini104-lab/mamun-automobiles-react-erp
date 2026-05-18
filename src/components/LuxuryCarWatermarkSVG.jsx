import React from 'react';
import watermarkImg from '../assets/luxury_car_vibrant_3d.jpg';

const LuxuryCarWatermarkSVG = ({ opacity = 0.15 }) => {
    return (
        <div 
            className="print-watermark-wrapper"
            style={{
                position: 'absolute',
                top: '48%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '85%',
                height: 'auto',
                zIndex: 0,
                pointerEvents: 'none',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                opacity: opacity,
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact'
            }}
        >
            <img 
                src={watermarkImg} 
                alt="Watermark" 
                style={{ 
                    width: '100%', 
                    height: 'auto',
                    filter: 'contrast(120%) brightness(110%)',
                    display: 'block' 
                }} 
            />
        </div>
    );
};

export default LuxuryCarWatermarkSVG;

