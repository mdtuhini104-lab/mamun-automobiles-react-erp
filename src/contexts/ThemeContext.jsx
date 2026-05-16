import React from 'react';
import { getMainText, getMutedText } from '../utils/contrast';

const ThemeContext = React.createContext();

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = React.useState(() => {
        const savedTheme = localStorage.getItem('app-theme-v3');
        return savedTheme || 'theme-premium-dark';
    });

    React.useLayoutEffect(() => {
        localStorage.setItem('app-theme-v3', theme);
        const html = document.documentElement;
        
        // Remove all theme- prefix classes for true zero-config support
        Array.from(html.classList).forEach(className => {
            if (className.startsWith('theme-')) html.classList.remove(className);
        });
        
        // Add current theme
        html.classList.add(theme);
        
        // CRITICAL: Clear any existing inline styles that might override the new theme's CSS
        html.style.removeProperty('--bg-main');
        html.style.removeProperty('--text-main');
        html.style.removeProperty('--text-muted');
        html.style.removeProperty('--bg-primary');
        html.style.removeProperty('--text-primary');
        html.style.setProperty('--text-secondary', '');

        const computedStyle = window.getComputedStyle(html);
        let bgColor = computedStyle.getPropertyValue('--bg-main').trim();
        
        // Fallback for detection if no variable exists in the new theme's CSS
        if (!bgColor || bgColor === 'transparent' || bgColor === 'rgba(0,0,0,0)') {
            bgColor = computedStyle.backgroundColor;
            if (!bgColor || bgColor === 'transparent' || bgColor === 'rgba(0,0,0,0)') {
                bgColor = window.getComputedStyle(document.body).backgroundColor;
            }
        }

        // Calculate Contrast Colors
        const textMain = getMainText(bgColor);
        const textMuted = getMutedText(bgColor);

        // Re-inject text variables but WITHOUT !important so CSS can still win if it needs to
        // This ensures "auto-contrast" works for themes without explicit text variables
        html.style.setProperty('--text-main', textMain);
        html.style.setProperty('--text-muted', textMuted);
        
        // Re-inject background ONLY if it's missing from CSS (Manual Theme Support)
        if (!computedStyle.getPropertyValue('--bg-main').trim()) {
            html.style.setProperty('--bg-main', bgColor);
        }

        console.log(`[Theme Engine] Active: ${theme}. Detected BG: ${bgColor}. Text: ${textMain}`);
        
        const isLightTheme = textMain === '#000000';
        document.body.className = `${theme}-active ${isLightTheme ? 'light-theme' : 'dark-theme'}`;
    }, [theme]);

    const changeTheme = (newTheme) => {
        setTheme(newTheme);
    };

    const toggleTheme = () => {
        setTheme(prev => prev === 'theme-light-minimal' ? 'theme-premium-dark' : 'theme-light-minimal');
    };

    const contextValue = React.useMemo(() => ({ theme, changeTheme, toggleTheme }), [theme]);

    return (
        <ThemeContext.Provider value={contextValue}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = React.useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};




