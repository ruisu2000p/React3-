import React, { useState, useCallback } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import InputSection from '../InputSection/InputSection';
import BasicTableView from '../ui/BasicTableView';

/**
 * 標準テーブル抽出コンポーネント
 * HTMLからテーブルを抽出し、表示・編集する基本ツール
 */
const HTMLTableExtractor = () => {
  const [htmlContent, setHtmlContent] = useState('');
  const [extractedTables, setExtractedTables] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTableIndex, setActiveTableIndex] = useState(0);
  const { showSuccess, showError } = useNotification();
  
  const extractTables = useCallback(() => {
    setIsProcessing(true);
    
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      const tables = doc.querySelectorAll('table');
      
      if (tables.length === 0) {
        showError('テーブルが見つかりませんでした');
        setExtractedTables([]);
        setIsProcessing(false);
        return;
      }
      
      const extractedData = Array.from(tables).map((table, index) => {
        const rows = Array.from(table.querySelectorAll('tr'));
        
        const rowsData = rows.map(row => {
          const cells = Array.from(row.querySelectorAll('th, td'));
          return cells.map(cell => {
            return cell.textContent.trim();
          });
        });
        
        return {
          id: `table-${index}`,
          data: rowsData,
          hasHeader: true, // デフォルトで最初の行をヘッダーとして扱う
        };
      });
      
      setExtractedTables(extractedData);
      setActiveTableIndex(0);
      showSuccess(`${extractedData.length}個のテーブルが抽出されました`);
    } catch (error) {
      console.error('テーブル抽出エラー:', error);
      showError(`テーブルの抽出中にエラーが発生しました: ${error.message}`);
      setExtractedTables([]);
    } finally {
      setIsProcessing(false);
    }
  }, [htmlContent, showSuccess, showError]);
  
  const handleHtmlContentChange = (content) => {
    setHtmlContent(content);
  };
  
  const handleProcessing = () => {
    extractTables();
  };
  
  return (
    <div className="html-table-extractor">
      <InputSection 
        onHtmlContentChange={handleHtmlContentChange} 
        onProcessing={handleProcessing} 
      />
      
      {isProcessing && (
        <div className="processing-indicator text-center py-4">
          <p>テーブルを抽出中...</p>
        </div>
      )}
      
      {!isProcessing && extractedTables.length > 0 && (
        <div className="extracted-tables mt-6">
          {extractedTables.length > 1 && (
            <div className="table-selector mb-4">
              <div className="flex flex-wrap gap-2">
                {extractedTables.map((table, index) => (
                  <button
                    key={table.id}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      index === activeTableIndex
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                    onClick={() => setActiveTableIndex(index)}
                  >
                    テーブル {index + 1}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <BasicTableView 
            tableData={extractedTables[activeTableIndex].data} 
            hasHeader={extractedTables[activeTableIndex].hasHeader}
            onHeaderToggle={() => {
              const updatedTables = [...extractedTables];
              updatedTables[activeTableIndex].hasHeader = !updatedTables[activeTableIndex].hasHeader;
              setExtractedTables(updatedTables);
            }}
          />
        </div>
      )}
    </div>
  );
};

export default HTMLTableExtractor;
