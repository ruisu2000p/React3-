import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import Header from '../Header/Header';

/**
 * レイアウトコンポーネント
 * アプリケーションの基本レイアウト構造を提供します
 */
const Layout = ({ children }) => {
  const { isDarkMode } = useTheme();
  
  return (
    <div className={`app-container ${isDarkMode ? 'dark' : 'light'}`}>
      <Header />
      <main className="main-content">
        {children}
      </main>
      <footer className="app-footer">
        <div className="container mx-auto p-4 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} HTML Table Extractor (統合版)
        </div>
      </footer>
    </div>
  );
};

export default Layout;
