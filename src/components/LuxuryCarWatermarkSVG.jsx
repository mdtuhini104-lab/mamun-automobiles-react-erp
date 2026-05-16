import React from 'react';
import luxuryCarVibrant3D from '../assets/luxury_car_vibrant_3d.jpg'; // The user's exact uploaded 3D vibrant sketch asset

/**
 * Premium 3D Vibrant Colored Sketch Watermark Engine
 * Uses the custom 3/4 perspective Maybach/S-Class sketch uploaded by the user.
 * Engineered specifically with CSS multiply blending to achieve a 100% transparent background.
 */
const LuxuryCarWatermarkSVG = ({ opacity = 0.08 }) => {
    return (
        <div className="print-watermark-wrapper" aria-hidden="true" style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '85%', /* Scaled optimally to showcase the impressive 3D perspective per page */
            maxWidth: '190mm',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: -1, /* Z-Index Fix: Set strictly behind tables/text */
            opacity: opacity, /* Configurable opacity per document requirement */
            mixBlendMode: 'multiply', /* CSS Blend Mode requirement for pure background elimination */
            background: 'transparent',
            backgroundColor: 'transparent'
        }}>
            <img 
                src={luxuryCarVibrant3D}
                alt="3D Vibrant Sketch Luxury Car Watermark"
                className="print-watermark-img"
                style={{
                    width: '100%',
                    height: 'auto',
                    objectFit: 'contain',
                    display: 'block',
                    /* Multiplies white background pixels to make them completely transparent against paper */
                    mixBlendMode: 'multiply', 
                    background: 'transparent',
                    backgroundColor: 'transparent',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact'
                }}
            />
        </div>
    );
};

export default LuxuryCarWatermarkSVG;
