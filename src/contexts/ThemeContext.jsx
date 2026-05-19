import React from 'react';
import { getMainText, getMutedText } from '../utils/contrast';

const ThemeContext = React.createContext();

export const ThemeProvider = ({ children }) => {
    const theme = 'theme-light-minimal';

    React.useLayoutEffect(() => {
        localStorage.setItem('app-theme-v3', 'theme-light-minimal');
        const html = document.documentElement;
        
        // Remove all theme- prefix classes for true zero-config support
        Array.from(html.classList).forEach(className => {
            if (className.startsWith('theme-')) html.classList.remove(className);
        });
        
        // Add light minimal theme
        html.classList.add('theme-light-minimal');
        
        // Clear variables so index.css wins
        html.style.removeProperty('--bg-main');
        html.style.removeProperty('--text-main');
        html.style.removeProperty('--text-muted');
        html.style.removeProperty('--bg-primary');
        html.style.removeProperty('--text-primary');
        html.style.setProperty('--text-secondary', '');

        document.body.className = 'theme-light-minimal-active light-theme';
    }, []);

    const changeTheme = () => {};
    const toggleTheme = () => {};

    const contextValue = React.useMemo(() => ({ theme, changeTheme, toggleTheme }), []);

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




