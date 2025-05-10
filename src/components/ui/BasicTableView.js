import React, { useState, useCallback } from 'react';
import { useNotification } from '../../contexts/NotificationContext';

/**
 * 基本テーブル表示コンポーネント
 * テーブルデータの表示、編集、エクスポート機能を提供します
 */
const BasicTableView = ({ tableData, hasHeader = true, onHeaderToggle }) => {
  const [data, setData] = useState(tableData || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const { showSuccess, showError } = useNotification();
  
  const filteredRows = useCallback(() => {
    if (!searchTerm.trim()) return data;
    
    return data.filter(row => 
      row.some(cell => 
        cell.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [data, searchTerm]);
  
  const startEditing = (rowIndex, colIndex) => {
    setEditingCell({ row: rowIndex, col: colIndex });
    setEditValue(data[rowIndex][colIndex]);
  };
  
  const saveEdit = () => {
    if (!editingCell) return;
    
    const { row, col } = editingCell;
    const newData = [...data];
    newData[row][col] = editValue;
    setData(newData);
    setEditingCell(null);
  };
  
  const cancelEdit = () => {
    setEditingCell(null);
  };
  
  const addRow = () => {
    if (data.length === 0) {
      setData([['']]); // 空のテーブルの場合
      return;
    }
    
    const newRow = Array(data[0].length).fill('');
    setData([...data, newRow]);
    showSuccess('行が追加されました');
  };
  
  const addColumn = () => {
    const newData = data.map(row => [...row, '']);
    setData(newData);
    showSuccess('列が追加されました');
  };
  
  const removeRow = (rowIndex) => {
    if (data.length <= 1) {
      showError('テーブルには少なくとも1行必要です');
      return;
    }
    
    const newData = data.filter((_, index) => index !== rowIndex);
    setData(newData);
    showSuccess('行が削除されました');
  };
  
  const removeColumn = (colIndex) => {
    if (data[0].length <= 1) {
      showError('テーブルには少なくとも1列必要です');
      return;
    }
    
    const newData = data.map(row => row.filter((_, index) => index !== colIndex));
    setData(newData);
    showSuccess('列が削除されました');
  };
  
  const transposeTable = () => {
    if (data.length === 0) return;
    
    const transposed = Array(data[0].length).fill().map((_, colIndex) => 
      data.map(row => row[colIndex])
    );
    
    setData(transposed);
    showSuccess('テーブルが転置されました');
  };
  
  const exportAsCSV = () => {
    try {
      const csvContent = data.map(row => 
        row.map(cell => {
          const cellStr = String(cell);
          return cellStr.includes(',') || cellStr.includes('"') 
            ? `"${cellStr.replace(/"/g, '""')}"` 
            : cellStr;
        }).join(',')
      ).join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'table_export.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showSuccess('CSVファイルがダウンロードされました');
    } catch (error) {
      showError(`エクスポート中にエラーが発生しました: ${error.message}`);
    }
  };
  
  const exportAsJSON = () => {
    try {
      let jsonData;
      
      if (hasHeader) {
        const headers = data[0];
        jsonData = data.slice(1).map(row => {
          const obj = {};
          row.forEach((cell, index) => {
            if (index < headers.length) {
              obj[headers[index] || `column${index}`] = cell;
            }
          });
          return obj;
        });
      } else {
        jsonData = data.map(row => {
          const obj = {};
          row.forEach((cell, index) => {
            obj[`column${index}`] = cell;
          });
          return obj;
        });
      }
      
      const jsonContent = JSON.stringify(jsonData, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'table_export.json');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showSuccess('JSONファイルがダウンロードされました');
    } catch (error) {
      showError(`エクスポート中にエラーが発生しました: ${error.message}`);
    }
  };
  
  if (!data || data.length === 0) {
    return (
      <div className="empty-table-message p-4 text-center bg-gray-100 dark:bg-gray-800 rounded-md">
        <p>テーブルデータがありません</p>
      </div>
    );
  }
  
  const displayData = filteredRows();
  
  return (
    <div className="basic-table-view">
      <div className="table-controls mb-4 flex flex-wrap gap-2 items-center">
        <div className="search-box flex-grow">
          <input
            type="text"
            className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
            placeholder="テーブル内を検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="table-actions flex gap-2">
          <button
            className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            onClick={addRow}
          >
            行追加
          </button>
          <button
            className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            onClick={addColumn}
          >
            列追加
          </button>
          <button
            className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            onClick={transposeTable}
          >
            転置
          </button>
          <button
            className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            onClick={exportAsCSV}
          >
            CSV
          </button>
          <button
            className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            onClick={exportAsJSON}
          >
            JSON
          </button>
          {onHeaderToggle && (
            <button
              className="px-3 py-1 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
              onClick={onHeaderToggle}
            >
              {hasHeader ? 'ヘッダー無効' : 'ヘッダー有効'}
            </button>
          )}
        </div>
      </div>
      
      <div className="table-container overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-700">
          <thead className={`bg-gray-200 dark:bg-gray-700 ${hasHeader ? '' : 'bg-opacity-50 dark:bg-opacity-50'}`}>
            <tr>
              <th className="w-10 border border-gray-300 dark:border-gray-600 p-2 text-center">#</th>
              {data[0].map((_, colIndex) => (
                <th key={colIndex} className="border border-gray-300 dark:border-gray-600 p-2 relative">
                  <div className="flex justify-between items-center">
                    <span>{`列 ${colIndex + 1}`}</span>
                    <button
                      className="ml-2 text-red-500 hover:text-red-700 transition-colors"
                      onClick={() => removeColumn(colIndex)}
                      aria-label={`列 ${colIndex + 1} を削除`}
                    >
                      ×
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayData.map((row, rowIndex) => {
              const isHeader = hasHeader && rowIndex === 0;
              return (
                <tr 
                  key={rowIndex}
                  className={`${
                    isHeader 
                      ? 'bg-gray-100 dark:bg-gray-800 font-semibold' 
                      : rowIndex % 2 === 0 
                        ? 'bg-white dark:bg-gray-900' 
                        : 'bg-gray-50 dark:bg-gray-800'
                  }`}
                >
                  <td className="border border-gray-300 dark:border-gray-600 p-2 text-center relative">
                    <div className="flex justify-between items-center">
                      <span>{rowIndex + 1}</span>
                      <button
                        className="ml-1 text-red-500 hover:text-red-700 transition-colors"
                        onClick={() => removeRow(rowIndex)}
                        aria-label={`行 ${rowIndex + 1} を削除`}
                      >
                        ×
                      </button>
                    </div>
                  </td>
                  {row.map((cell, colIndex) => (
                    <td 
                      key={colIndex} 
                      className="border border-gray-300 dark:border-gray-600 p-2"
                      onClick={() => startEditing(rowIndex, colIndex)}
                    >
                      {editingCell && editingCell.row === rowIndex && editingCell.col === colIndex ? (
                        <div className="flex">
                          <input
                            type="text"
                            className="flex-grow p-1 border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit();
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            autoFocus
                          />
                          <div className="flex flex-col ml-1">
                            <button
                              className="text-green-500 hover:text-green-700 transition-colors"
                              onClick={saveEdit}
                              aria-label="保存"
                            >
                              ✓
                            </button>
                            <button
                              className="text-red-500 hover:text-red-700 transition-colors"
                              onClick={cancelEdit}
                              aria-label="キャンセル"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="cell-content min-h-[1.5em]">
                          {cell}
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {searchTerm && displayData.length === 0 && (
        <div className="no-results mt-4 p-3 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-md">
          検索条件に一致する結果がありません
        </div>
      )}
    </div>
  );
};

export default BasicTableView;
