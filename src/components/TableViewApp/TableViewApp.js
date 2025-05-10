import React, { useState } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import BasicTableView from '../ui/BasicTableView';

/**
 * テーブル表示アプリコンポーネント
 * シンプルなテーブル表示・編集ツール
 */
const TableViewApp = () => {
  const [tableData, setTableData] = useState([['', ''], ['', '']]);
  const [hasHeader, setHasHeader] = useState(true);
  const { showSuccess } = useNotification();
  
  const createNewTable = (rows, cols) => {
    const newData = Array(rows).fill().map(() => Array(cols).fill(''));
    setTableData(newData);
    showSuccess(`${rows}行 × ${cols}列の新しいテーブルを作成しました`);
  };
  
  const loadSampleData = () => {
    const sampleData = [
      ['商品名', '価格', '在庫数'],
      ['商品A', '1,000円', '120'],
      ['商品B', '2,500円', '45'],
      ['商品C', '800円', '230'],
      ['商品D', '3,200円', '15']
    ];
    
    setTableData(sampleData);
    setHasHeader(true);
    showSuccess('サンプルデータを読み込みました');
  };
  
  return (
    <div className="table-view-app">
      <div className="table-controls mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <h3 className="text-lg font-semibold mb-2">新規テーブル作成</h3>
            <div className="flex gap-2">
              <button
                className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                onClick={() => createNewTable(5, 3)}
              >
                5×3
              </button>
              <button
                className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                onClick={() => createNewTable(10, 5)}
              >
                10×5
              </button>
              <button
                className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                onClick={() => createNewTable(20, 8)}
              >
                20×8
              </button>
            </div>
          </div>
          
          <div className="ml-auto">
            <button
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              onClick={loadSampleData}
            >
              サンプルデータ読込
            </button>
          </div>
        </div>
      </div>
      
      <div className="header-toggle mb-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={hasHeader}
            onChange={() => setHasHeader(!hasHeader)}
            className="mr-2"
          />
          <span>最初の行をヘッダーとして扱う</span>
        </label>
      </div>
      
      <BasicTableView 
        tableData={tableData} 
        hasHeader={hasHeader}
      />
    </div>
  );
};

export default TableViewApp;
