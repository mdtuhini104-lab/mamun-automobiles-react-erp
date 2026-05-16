import React from 'react';

/**
 * Premium 3D Luxury Car Watermark - Raw SVG Vector Implementation
 * Features a high-detail luxury sedan outline with perspective depth.
 * Engineered for watermark duty with configurable opacity and absolute centering.
 */
const LuxuryCarWatermarkSVG = ({ opacity = 0.05 }) => {
    return (
        <div 
            className="print-watermark-wrapper" 
            aria-hidden="true" 
            style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '85%',
                maxWidth: '190mm',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
                zIndex: 0,
                opacity: opacity,
                mixBlendMode: 'multiply',
                background: 'transparent'
            }}
        >
            <svg
                viewBox="0 0 1000 400"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ width: '100%', height: 'auto', display: 'block' }}
            >
                {/* Clean 3D Perspective Luxury Sedan Vector Outline */}
                <path
                    d="M150 300 L120 280 L100 240 L120 200 L180 180 L250 160 L400 150 L600 150 L750 160 L850 180 L920 210 L940 250 L920 280 L880 300 Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    opacity="0.3"
                />
                <path
                    d="M250 160 C300 100 400 80 500 80 C600 80 700 100 750 160"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinejoin="round"
                />
                <path
                    d="M180 180 L850 180 M220 220 L820 220 M120 200 L920 210"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeDasharray="5 5"
                />
                {/* Wheels in perspective */}
                <circle cx="250" cy="280" r="40" stroke="currentColor" strokeWidth="4" />
                <circle cx="250" cy="280" r="20" stroke="currentColor" strokeWidth="2" />
                <circle cx="750" cy="280" r="40" stroke="currentColor" strokeWidth="4" />
                <circle cx="750" cy="280" r="20" stroke="currentColor" strokeWidth="2" />
                
                {/* Windshield and Windows */}
                <path
                    d="M320 155 L400 100 L500 95 L600 100 L680 155"
                    stroke="currentColor"
                    strokeWidth="2"
                />
                <path d="M500 80 L500 150" stroke="currentColor" strokeWidth="1" />
                
                {/* Character Lines */}
                <path d="M100 240 L940 250" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
                <path d="M150 300 L880 300" stroke="currentColor" strokeWidth="2" />
            </svg>
        </div>
    );
};

export default LuxuryCarWatermarkSVG;
