import React, { useState, useCallback } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import InputSection from '../InputSection/InputSection';
import BasicTableView from '../ui/BasicTableView';

interface XBRLTag {
  name: string;
  contextRef: string | null;
  value: string;
  decimals: string | null;
  unitRef: string | null;
}

interface CellData {
  text: string;
  xbrl: XBRLTag[];
}

interface TableData {
  id: string;
  data: (string | CellData)[][];
  hasHeader: boolean;
  hasXbrl: boolean;
}

/**
 * XBRL対応テーブル抽出コンポーネント
 * XBRLタグを含むHTMLからテーブルを抽出し、表示・編集するツール
 */
const XBRLTableExtractor: React.FC = () => {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [extractedTables, setExtractedTables] = useState<TableData[]>([]);
  const [xbrlData, setXbrlData] = useState<XBRLTag[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [activeTableIndex, setActiveTableIndex] = useState<number>(0);
  const [showXbrlData, setShowXbrlData] = useState<boolean>(false);
  const { showSuccess, showError, showInfo } = useNotification();
  
  const extractTablesAndXbrl = useCallback(() => {
    setIsProcessing(true);
    
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      const tables = doc.querySelectorAll('table');
      
      const xbrlElements = doc.querySelectorAll('[contextref]');
      const xbrlTags: XBRLTag[] = Array.from(xbrlElements).map(el => {
        return {
          name: el.tagName.toLowerCase(),
          contextRef: el.getAttribute('contextref'),
          value: el.textContent?.trim() || '',
          decimals: el.getAttribute('decimals'),
          unitRef: el.getAttribute('unitref')
        };
      });
      
      setXbrlData(xbrlTags);
      
      if (xbrlTags.length > 0) {
        showInfo(`${xbrlTags.length}個のXBRLタグが検出されました`);
      }
      
      if (tables.length === 0) {
        showError('テーブルが見つかりませんでした');
        setExtractedTables([]);
        setIsProcessing(false);
        return;
      }
      
      const extractedData: TableData[] = Array.from(tables).map((table, index) => {
        const rows = Array.from(table.querySelectorAll('tr'));
        
        const rowsData = rows.map(row => {
          const cells = Array.from(row.querySelectorAll('th, td'));
          return cells.map(cell => {
            const xbrlElements = cell.querySelectorAll('[contextref]');
            if (xbrlElements.length > 0) {
              const xbrlInfo: XBRLTag[] = Array.from(xbrlElements).map(el => {
                return {
                  name: el.tagName.toLowerCase(),
                  contextRef: el.getAttribute('contextref'),
                  value: el.textContent?.trim() || '',
                  decimals: el.getAttribute('decimals'),
                  unitRef: el.getAttribute('unitref')
                };
              });
              
              return {
                text: cell.textContent?.trim() || '',
                xbrl: xbrlInfo
              };
            }
            
            return cell.textContent?.trim() || '';
          });
        });
        
        return {
          id: `table-${index}`,
          data: rowsData,
          hasHeader: true, // デフォルトで最初の行をヘッダーとして扱う
          hasXbrl: rowsData.some(row => row.some(cell => typeof cell === 'object' && 'xbrl' in cell))
        };
      });
      
      const sortedTables = [...extractedData].sort((a, b) => {
        if (a.hasXbrl && !b.hasXbrl) return -1;
        if (!a.hasXbrl && b.hasXbrl) return 1;
        return 0;
      });
      
      setExtractedTables(sortedTables);
      setActiveTableIndex(0);
      showSuccess(`${extractedData.length}個のテーブルが抽出されました`);
    } catch (error) {
      console.error('テーブル抽出エラー:', error);
      if (error instanceof Error) {
        showError(`テーブルの抽出中にエラーが発生しました: ${error.message}`);
      } else {
        showError('テーブルの抽出中に不明なエラーが発生しました');
      }
      setExtractedTables([]);
    } finally {
      setIsProcessing(false);
    }
  }, [htmlContent, showSuccess, showError, showInfo]);
  
  const handleHtmlContentChange = (content: string) => {
    setHtmlContent(content);
  };
  
  const handleProcessing = () => {
    extractTablesAndXbrl();
  };
  
  const getDisplayData = useCallback(() => {
    if (extractedTables.length === 0 || activeTableIndex >= extractedTables.length) {
      return [];
    }
    
    const tableData = extractedTables[activeTableIndex].data;
    
    return tableData.map(row => 
      row.map(cell => {
        if (typeof cell === 'object' && 'xbrl' in cell) {
          return showXbrlData 
            ? `${cell.text} [XBRL: ${cell.xbrl.map(x => `${x.name}=${x.value}`).join(', ')}]`
            : cell.text;
        }
        return cell;
      })
    );
  }, [extractedTables, activeTableIndex, showXbrlData]);
  
  return (
    <div className="xbrl-table-extractor">
      <InputSection 
        onHtmlContentChange={handleHtmlContentChange} 
        onProcessing={handleProcessing} 
      />
      
      {isProcessing && (
        <div className="processing-indicator text-center py-4">
          <p>テーブルとXBRLデータを抽出中...</p>
        </div>
      )}
      
      {!isProcessing && extractedTables.length > 0 && (
        <div className="extracted-tables mt-6">
          <div className="flex justify-between items-center mb-4">
            <div className="table-selector flex flex-wrap gap-2">
              {extractedTables.map((table, index) => (
                <button
                  key={table.id}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    index === activeTableIndex
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
                  } ${table.hasXbrl ? 'border-2 border-green-500' : ''}`}
                  onClick={() => setActiveTableIndex(index)}
                >
                  テーブル {index + 1} {table.hasXbrl ? '(XBRL)' : ''}
                </button>
              ))}
            </div>
            
            {extractedTables[activeTableIndex]?.hasXbrl && (
              <button
                className={`px-3 py-1 rounded-md transition-colors ${
                  showXbrlData
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
                onClick={() => setShowXbrlData(!showXbrlData)}
              >
                {showXbrlData ? 'XBRLデータを隠す' : 'XBRLデータを表示'}
              </button>
            )}
          </div>
          
          <BasicTableView 
            tableData={getDisplayData()} 
            hasHeader={extractedTables[activeTableIndex].hasHeader}
            onHeaderToggle={() => {
              const updatedTables = [...extractedTables];
              updatedTables[activeTableIndex].hasHeader = !updatedTables[activeTableIndex].hasHeader;
              setExtractedTables(updatedTables);
            }}
          />
          
          {xbrlData.length > 0 && (
            <div className="xbrl-data-summary mt-6">
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">XBRLデータサマリー</h3>
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
                <p className="text-gray-800 dark:text-gray-200">検出されたXBRLタグ: {xbrlData.length}個</p>
                <p className="text-gray-800 dark:text-gray-200">主なコンテキスト: {Array.from(new Set(xbrlData.map(x => x.contextRef))).slice(0, 5).join(', ')}</p>
                <p className="text-gray-800 dark:text-gray-200">主な単位: {Array.from(new Set(xbrlData.map(x => x.unitRef).filter(Boolean))).slice(0, 5).join(', ')}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default XBRLTableExtractor;
