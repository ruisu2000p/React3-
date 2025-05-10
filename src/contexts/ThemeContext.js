import React, { createContext, useState, useEffect, useContext } from 'react';

// テーマコンテキストの作成
const ThemeContext = createContext(null);

// テーマプロバイダーコンポーネント
export const ThemeProvider = ({ children }) => {
  // システム設定とユーザー設定からダークモードの初期値を決定
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // ローカルストレージの設定を確認
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    
    // システム設定を確認
    return window.matchMedia && 
      window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  
  // ダークモード切り替え関数
  const toggleDarkMode = () => {
    setIsDarkMode(prevMode => !prevMode);
  };
  
  // テーマ設定の変更をローカルストレージに保存
  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    
    // HTML要素にダークモードクラスを追加/削除
    if (isDarkMode) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
  }, [isDarkMode]);
  
  // システムのダークモード設定変更監視
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // ユーザーの明示的な設定がなければシステム設定変更時に追従
    const handleChange = (e) => {
      if (!localStorage.getItem('theme')) {
        setIsDarkMode(e.matches);
      }
    };
    
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      // 古いブラウザ用のサポート
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);
  
  // テーマ切り替えコンポーネント
  const ThemeToggle = ({ className = '' }) => {
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

// テーマコンテキストを使用するためのフック
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === null) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
