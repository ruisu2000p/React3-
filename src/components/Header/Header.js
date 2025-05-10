import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * ヘッダーコンポーネント
 * アプリケーションのナビゲーションとグローバル機能を提供します
 */
const Header = () => {
  const { ThemeToggle } = useTheme();
  
  return (
    <header className="app-header">
      <div className="container mx-auto p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">HTML Table Extractor (統合版)</h1>
        <div className="flex items-center space-x-4">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};

export default Header;
