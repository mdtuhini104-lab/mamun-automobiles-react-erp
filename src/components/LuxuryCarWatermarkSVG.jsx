import React from 'react';

const LuxuryCarWatermarkSVG = ({ opacity = 0.04 }) => {
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
            <svg 
                viewBox="0 0 1200 600" 
                width="100%" 
                height="100%" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                style={{ display: 'block' }}
            >
                {/* Clean, Premium Luxury Car Silhouette Blueprint Grid Line Elements */}
                <path d="M150 420 L280 420 M390 420 L780 420 M890 420 L1050 420" stroke="#003399" strokeWidth="4" strokeLinecap="round"/>
                {/* Front Bumper & Low Lip */}
                <path d="M150 420 C110 420 95 400 100 375 C105 350 125 345 150 345 C175 345 190 350 200 360" stroke="#003399" strokeWidth="3" strokeLinecap="round"/>
                {/* Front Hood & Fender Arch */}
                <path d="M150 345 C190 345 220 310 280 290 C340 270 400 260 450 255" stroke="#003399" strokeWidth="4" strokeLinecap="round"/>
                {/* Windshield & Sleek Roofline */}
                <path d="M450 255 C520 255 560 170 660 165 C760 160 840 165 890 205" stroke="#003399" strokeWidth="4.5" strokeLinecap="round"/>
                {/* Rear Cabin, Spoiler lip & Trunk */}
                <path d="M890 205 C925 235 960 255 1020 260 C1070 265 1100 280 1105 310 C1110 340 1090 355 1050 355" stroke="#003399" strokeWidth="4" strokeLinecap="round"/>
                {/* Rear Bumper Outline */}
                <path d="M1050 355 C1040 385 1060 420 1050 420" stroke="#003399" strokeWidth="3" strokeLinecap="round"/>
                {/* Premium Side Character Grooves / Aerodynamic Lines */}
                <path d="M260 330 C380 310 750 310 980 340" stroke="#003399" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="1 4"/>
                <path d="M290 350 C420 335 720 335 940 365" stroke="#003399" strokeWidth="2" strokeLinecap="round"/>
                <path d="M460 265 L840 265" stroke="#003399" strokeWidth="1.5" strokeLinecap="round"/>
                {/* Front Wheel Arch and Detailed Realistic Rims Grid */}
                <circle cx="335" cy="410" r="58" stroke="#003399" strokeWidth="4"/>
                <circle cx="335" cy="410" r="48" stroke="#003399" strokeWidth="1.5" strokeDasharray="3 3"/>
                <circle cx="335" cy="410" r="20" stroke="#003399" strokeWidth="2"/>
                {/* Rear Wheel Arch and Detailed Realistic Rims Grid */}
                <circle cx="835" cy="410" r="58" stroke="#003399" strokeWidth="4"/>
                <circle cx="835" cy="410" r="48" stroke="#003399" strokeWidth="1.5" strokeDasharray="3 3"/>
                <circle cx="835" cy="410" r="20" stroke="#003399" strokeWidth="2"/>
                {/* Window Divider Columns */}
                <path d="M620 170 L605 260 M750 170 L760 260" stroke="#003399" strokeWidth="2"/>
            </svg>
        </div>
    );
};

export default LuxuryCarWatermarkSVG;
