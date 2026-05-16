/**
 * Calculates the contrast color (pure #000000 or #FFFFFF) for a given color string (Hex, RGB, or RGBA).
 * @param {string} color - The color string (e.g., "#FFFFFF", "rgb(255, 255, 255)").
 */
export const getContrastYIQ = (color) => {
    if (!color || color === 'transparent') return '#FFFFFF';
    
    let r, g, b;

    if (color.startsWith('rgb')) {
        const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (match) {
            r = parseInt(match[1]);
            g = parseInt(match[2]);
            b = parseInt(match[3]);
        } else {
            return '#FFFFFF';
        }
    } else {
        const hex = color.replace('#', '');
        if (hex.length !== 6 && hex.length !== 3) return '#FFFFFF';
        
        if (hex.length === 3) {
            r = parseInt(hex.substr(0, 1) + hex.substr(0, 1), 16);
            g = parseInt(hex.substr(1, 1) + hex.substr(1, 1), 16);
            b = parseInt(hex.substr(2, 1) + hex.substr(2, 1), 16);
        } else {
            r = parseInt(hex.substr(0, 2), 16);
            g = parseInt(hex.substr(2, 2), 16);
            b = parseInt(hex.substr(4, 2), 16);
        }
    }
    
    // YIQ formula: (r*299 + g*587 + b*114) / 1000
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    
    // User requested: If brightness > 128 (light), return black; otherwise white.
    return yiq > 128 ? '#000000' : '#FFFFFF';
};

/**
 * Returns a primary text color (Black or White) based on background brightness.
 */
export const getMainText = (hexcolor) => getContrastYIQ(hexcolor);

/**
 * Returns a muted text color (Black or White with 0.6 opacity) based on background brightness.
 */
export const getMutedText = (hexcolor) => {
    const contrast = getContrastYIQ(hexcolor);
    return contrast === '#000000' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.6)';
};

// Legacy exports for compatibility during refactor
export const getSecondaryContrast = (hexcolor) => getMutedText(hexcolor);
export const getMutedContrast = (hexcolor) => getMutedText(hexcolor);
