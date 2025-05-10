import React, { useState } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Layout from './components/Layout/Layout';
import ToolSelector from './components/ToolSelector/ToolSelector';
import HTMLTableExtractor from './components/HTMLTableExtractor';
import XBRLTableExtractor from './components/XBRLTableExtractor';
import ImprovedXBRLTableExtractor from './components/ImprovedXBRLTableExtractor';
import TableViewApp from './components/TableViewApp';
import './App.css';

/**
 * アプリケーションのルートコンポーネント
 * コンテキストプロバイダーとレイアウト構造を提供します
 */
const App = () => {
  const [activeToolIndex, setActiveToolIndex] = useState(0);

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

  const ActiveTool = tools[activeToolIndex].component;
  const activeToolDescription = tools[activeToolIndex].description;

  return (
    <ThemeProvider>
      <NotificationProvider>
        <Layout>
          {/* ツール選択コンポーネント */}
          <div className="tool-description mb-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-md">
            <h2 className="text-lg font-semibold">{tools[activeToolIndex].name}</h2>
            <p className="mt-1">{activeToolDescription}</p>
          </div>
          
          <ToolSelector
            tools={tools}
            activeToolIndex={activeToolIndex}
            onToolChange={setActiveToolIndex}
          />
          
          {/* アクティブなツールコンポーネントをレンダリング */}
          <div className="mt-6">
            <ActiveTool />
          </div>
        </Layout>
      </NotificationProvider>
    </ThemeProvider>
  );
};

export default App;
