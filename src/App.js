import React, { useState, useEffect } from 'react';
import HTMLTableExtractor from './components/HTMLTableExtractor';
import XBRLTableExtractor from './components/XBRLTableExtractor';
import ImprovedXBRLTableExtractor from './components/ImprovedXBRLTableExtractor';
import TableViewApp from './components/TableViewApp';
import './App.css';

const App = () => {
  // State to track the active tool
  const [activeToolIndex, setActiveToolIndex] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  // List of available tools in the application
  const tools = [
    {
      id: 'html-extractor',
      name: '標準テーブル抽出',
      description: 'HTMLからテーブルを抽出、表示、編集する基本ツール',
      component: HTMLTableExtractor
    },
    {
      id: 'xbrl-extractor',
      name: 'XBRL対応テーブル抽出',
      description: 'XBRLタグ対応のテーブル抽出ツール',
      component: XBRLTableExtractor
    },
    {
      id: 'improved-xbrl-extractor',
      name: '改善版XBRL抽出（推奨）',
      description: '階層構造や年度間比較ができる改善版XBRLツール',
      component: ImprovedXBRLTableExtractor
    },
    {
      id: 'table-view',
      name: 'テーブル表示',
      description: 'シンプルなテーブル表示・編集ツール',
      component: TableViewApp
    }
  ];

  // Listen for system dark mode preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      setIsDarkMode(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // The currently selected tool component
  const ActiveTool = tools[activeToolIndex].component;

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} transition-colors duration-300`}>
      {/* Header with tool selector */}
      <header className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center py-4 gap-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold">HTMLテーブル抽出ツール統合版</h1>
              
              <button
                className="ml-4 p-2 rounded-full hover:bg-blue-600 transition-colors" 
                onClick={() => setIsDarkMode(!isDarkMode)}
                aria-label={isDarkMode ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
              >
                {isDarkMode ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
                  </svg>
                )}
              </button>
            </div>
            
            <nav className="flex flex-wrap gap-2 justify-center">
              {tools.map((tool, index) => (
                <button
                  key={tool.id}
                  onClick={() => setActiveToolIndex(index)}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    activeToolIndex === index 
                      ? 'bg-white text-blue-800' 
                      : 'text-white bg-blue-600 hover:bg-blue-500'
                  }`}
                  aria-pressed={activeToolIndex === index}
                >
                  {tool.name}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Tool description banner */}
      <div className={`border-b ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'} transition-colors duration-300`}>
            <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'} transition-colors duration-300`}>
              {tools[activeToolIndex].name}
            </h2>
            <p className="mt-1">{tools[activeToolIndex].description}</p>
          </div>
        </div>
      </div>

      {/* Main content area - renders the active tool */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ActiveTool isDarkMode={isDarkMode} />
      </main>

      {/* Footer */}
      <footer className={`border-t ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-white border-gray-200 text-gray-600'} transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center">
          <p>HTML/XBRL テーブル抽出ツール統合版 © 2025</p>
          <p className="text-sm mt-1">
            機能別に最適なツールを選択して利用できます。XBRL対応ドキュメントには「改善版XBRL抽出」の使用をお勧めします。
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;