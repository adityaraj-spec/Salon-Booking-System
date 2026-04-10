import { createContext, useContext, useState } from 'react';

const UIContext = createContext();

export const UIProvider = ({ children }) => {
    const [navbarTheme, setNavbarTheme] = useState('dark'); // 'dark' (white text) or 'light' (dark text)

    return (
        <UIContext.Provider value={{ navbarTheme, setNavbarTheme }}>
            {children}
        </UIContext.Provider>
    );
};

export const useUI = () => {
    const context = useContext(UIContext);
    if (!context) {
        throw new Error('useUI must be used within a UIProvider');
    }
    return context;
};
