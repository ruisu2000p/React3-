import React, { useState } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Layout from './components/Layout/Layout';
import ToolSelector from './components/ToolSelector/ToolSelector';
import HTMLTableExtractor from './components/HTMLTableExtractor/HTMLTableExtractor';
import XBRLTableExtractor from './components/XBRLTableExtractor/XBRLTableExtractor';
import ImprovedXBRLTableExtractor from './components/ImprovedXBRLTableExtractor/ImprovedXBRLTableExtractor';
import TableViewApp from './components/TableViewApp/TableViewApp';
import './App.css';

interface Tool {
  id: string;
  name: string;
  description: string;
  component: React.ComponentType;
}

/**
 * アプリケーションのルートコンポーネント
 * コンテキストプロバイダーとレイアウト構造を提供します
 */
const App: React.FC = () => {
  const [activeToolIndex, setActiveToolIndex] = useState<number>(0);

  const tools: Tool[] = [
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
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{tools[activeToolIndex].name}</h2>
            <p className="mt-1 text-gray-700 dark:text-gray-300">{activeToolDescription}</p>
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
