import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';

interface ThemeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  ThemeToggle: React.FC<{ className?: string }>;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    
    return window.matchMedia && 
      window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  
  const toggleDarkMode = () => {
    setIsDarkMode(prevMode => !prevMode);
  };
  
  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    
    if (isDarkMode) {
      document.documentElement.classList.add('dark-mode');
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark-mode');
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('theme')) {
        setIsDarkMode(e.matches);
      }
    };
    
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
      return () => {
        mediaQuery.removeListener(handleChange);
      };
    }
  }, []);
  
  const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
    return (
      <div className={`toggle-container ${className}`}>
        <div 
          className={`toggle-switch ${isDarkMode ? 'active' : ''}`} 
          onClick={toggleDarkMode}
          role="switch"
          aria-checked={isDarkMode}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              toggleDarkMode();
              e.preventDefault();
            }
          }}
        >
          <div className="toggle-handle"></div>
        </div>
        <span className="toggle-label">
          {isDarkMode ? 'ダークモード' : 'ライトモード'}
        </span>
      </div>
    );
  };
  
  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode, ThemeToggle }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === null) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
