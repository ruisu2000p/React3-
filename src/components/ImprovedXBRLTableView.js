import React, { useState, useCallback } from 'react';
import { useNotification } from '../../contexts/NotificationContext';

/**
 * 改善版XBRLテーブル表示コンポーネント
 * 階層構造、比較表示、グラフ表示などの高度な表示機能を提供します
 */
const ImprovedXBRLTableView = ({ xbrlData }) => {
  const [viewMode, setViewMode] = useState('hierarchical'); // hierarchical, comparative, graph
  const [expandedSections, setExpandedSections] = useState({});
  const [selectedMainItems, setSelectedMainItems] = useState([]);
  const { showSuccess, showError } = useNotification();
  
  const toggleSection = useCallback((sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  }, []);
  
  const toggleSelectedItem = useCallback((item) => {
    setSelectedMainItems(prev => {
      const isSelected = prev.some(i => i.name === item.name);
      if (isSelected) {
        return prev.filter(i => i.name !== item.name);
      } else {
        return [...prev, item];
      }
    });
  }, []);
  
  const saveHierarchicalData = useCallback((format) => {
    try {
      let content;
      const fileName = `xbrl_data_export.${format}`;
      
      if (format === 'json') {
        content = JSON.stringify(xbrlData, null, 2);
        const blob = new Blob([content], { type: 'application/json;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showSuccess('JSONファイルがダウンロードされました');
      } else if (format === 'excel') {
        showError('Excelエクスポートは現在実装中です');
      }
    } catch (error) {
      showError(`エクスポート中にエラーが発生しました: ${error.message}`);
    }
  }, [xbrlData, showSuccess, showError]);
  
  const RecursiveHierarchicalSection = ({ section, level = 0 }) => {
    const isExpanded = expandedSections[section.id] !== false; // デフォルトで展開
    
    if (section.items) {
      return (
        <div className="section-container mb-2">
          <div 
            className={`section-header p-2 rounded-md cursor-pointer flex items-center ${
              level === 0 
                ? 'bg-blue-600 text-white' 
                : level === 1 
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' 
                  : 'bg-gray-100 dark:bg-gray-800'
            }`}
            onClick={() => toggleSection(section.id)}
          >
            <span className="mr-2">{isExpanded ? '▼' : '►'}</span>
            <span className="font-semibold">{section.name}</span>
            <span className="ml-2 text-sm">({section.items.length}項目)</span>
          </div>
          
          {isExpanded && (
            <div className="section-content ml-4 mt-2">
              <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-700">
                <thead className="bg-gray-200 dark:bg-gray-700">
                  <tr>
                    <th className="border border-gray-300 dark:border-gray-600 p-2">項目名</th>
                    <th className="border border-gray-300 dark:border-gray-600 p-2">値</th>
                    <th className="border border-gray-300 dark:border-gray-600 p-2">コンテキスト</th>
                    <th className="border border-gray-300 dark:border-gray-600 p-2">単位</th>
                    {viewMode === 'graph' && (
                      <th className="border border-gray-300 dark:border-gray-600 p-2">グラフ</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {section.items.map((item, index) => {
                    let periodInfo = '不明';
                    if (item.context && item.context.period) {
                      const period = item.context.period;
                      if (period.type === 'instant') {
                        periodInfo = `時点: ${period.date}`;
                      } else if (period.type === 'duration') {
                        periodInfo = `期間: ${period.startDate} - ${period.endDate}`;
                      }
                    }
                    
                    let unitInfo = '不明';
                    if (item.unit && item.unit.measure) {
                      unitInfo = item.unit.measure;
                    }
                    
                    return (
                      <tr 
                        key={`${item.name}-${index}`}
                        className={index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'}
                      >
                        <td className="border border-gray-300 dark:border-gray-600 p-2">
                          {item.name}
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 p-2 text-right">
                          {item.value}
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 p-2">
                          {periodInfo}
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 p-2">
                          {unitInfo}
                        </td>
                        {viewMode === 'graph' && (
                          <td className="border border-gray-300 dark:border-gray-600 p-2 text-center">
                            <input
                              type="checkbox"
                              checked={selectedMainItems.some(i => i.name === item.name)}
                              onChange={() => toggleSelectedItem(item)}
                            />
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      );
    }
    
    if (section.children) {
      return (
        <div className="section-container mb-4">
          <div 
            className={`section-header p-2 rounded-md cursor-pointer flex items-center ${
              level === 0 
                ? 'bg-blue-600 text-white' 
                : level === 1 
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' 
                  : 'bg-gray-100 dark:bg-gray-800'
            }`}
            onClick={() => toggleSection(section.id)}
          >
            <span className="mr-2">{isExpanded ? '▼' : '►'}</span>
            <span className="font-semibold">{section.name}</span>
          </div>
          
          {isExpanded && (
            <div className="section-content ml-4 mt-2">
              {Object.values(section.children).map(childSection => (
                <RecursiveHierarchicalSection 
                  key={childSection.id} 
                  section={childSection} 
                  level={level + 1} 
                />
              ))}
            </div>
          )}
        </div>
      );
    }
    
    return null;
  };
  
  const renderComparativeTable = () => {
    if (!xbrlData || !xbrlData.periodGroups) {
      return <p>比較可能なデータがありません</p>;
    }
    
    const periods = Object.keys(xbrlData.periodGroups);
    if (periods.length < 2) {
      return <p>比較には少なくとも2つの期間が必要です</p>;
    }
    
    const commonTags = {};
    
    periods.forEach(period => {
      const periodItems = xbrlData.periodGroups[period];
      periodItems.forEach(item => {
        if (!commonTags[item.name]) {
          commonTags[item.name] = {
            name: item.name,
            periods: {}
          };
        }
        
        commonTags[item.name].periods[period] = item;
      });
    });
    
    const comparableTags = Object.values(commonTags).filter(tag => 
      Object.keys(tag.periods).length >= 2
    );
    
    if (comparableTags.length === 0) {
      return <p>比較可能なデータがありません</p>;
    }
    
    return (
      <div className="comparative-table">
        <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-700">
          <thead className="bg-gray-200 dark:bg-gray-700">
            <tr>
              <th className="border border-gray-300 dark:border-gray-600 p-2">項目名</th>
              {periods.map(period => (
                <th key={period} className="border border-gray-300 dark:border-gray-600 p-2">
                  {period}
                </th>
              ))}
              <th className="border border-gray-300 dark:border-gray-600 p-2">変化</th>
            </tr>
          </thead>
          <tbody>
            {comparableTags.map((tag, index) => {
              let changeRate = null;
              if (periods.length >= 2) {
                const latestPeriods = [...periods].sort().slice(-2);
                const oldValue = tag.periods[latestPeriods[0]]?.numericValue;
                const newValue = tag.periods[latestPeriods[1]]?.numericValue;
                
                if (oldValue !== null && newValue !== null && oldValue !== 0) {
                  changeRate = ((newValue - oldValue) / Math.abs(oldValue)) * 100;
                }
              }
              
              return (
                <tr 
                  key={tag.name}
                  className={index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'}
                >
                  <td className="border border-gray-300 dark:border-gray-600 p-2">
                    {tag.name}
                  </td>
                  {periods.map(period => (
                    <td 
                      key={`${tag.name}-${period}`} 
                      className="border border-gray-300 dark:border-gray-600 p-2 text-right"
                    >
                      {tag.periods[period]?.value || '-'}
                    </td>
                  ))}
                  <td className={`border border-gray-300 dark:border-gray-600 p-2 text-right ${
                    changeRate > 0 
                      ? 'text-green-600 dark:text-green-400' 
                      : changeRate < 0 
                        ? 'text-red-600 dark:text-red-400' 
                        : ''
                  }`}>
                    {changeRate !== null ? `${changeRate.toFixed(2)}%` : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };
  
  const renderGraph = () => {
    if (selectedMainItems.length === 0) {
      return (
        <div className="graph-placeholder p-4 text-center bg-gray-100 dark:bg-gray-800 rounded-md">
          <p>グラフ表示するアイテムを選択してください</p>
        </div>
      );
    }
    
    return (
      <div className="graph-container p-4 bg-white dark:bg-gray-800 rounded-md">
        <h3 className="text-lg font-semibold mb-2">選択されたアイテム</h3>
        <ul className="mb-4">
          {selectedMainItems.map((item, index) => (
            <li key={index} className="mb-1">
              {item.name}: {item.value} {item.unit?.measure}
            </li>
          ))}
        </ul>
        <div className="graph-placeholder p-4 text-center bg-gray-100 dark:bg-gray-700 rounded-md">
          <p>グラフ表示機能は現在実装中です</p>
        </div>
      </div>
    );
  };
  
  if (!xbrlData) {
    return (
      <div className="empty-data-message p-4 text-center bg-gray-100 dark:bg-gray-800 rounded-md">
        <p>XBRLデータがありません</p>
      </div>
    );
  }
  
  return (
    <div className="improved-xbrl-table-view">
      <div className="view-controls mb-4">
        <div className="flex flex-wrap gap-2">
          <button
            className={`px-4 py-2 rounded-md transition-colors ${
              viewMode === 'hierarchical'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
            onClick={() => setViewMode('hierarchical')}
          >
            階層表示
          </button>
          <button
            className={`px-4 py-2 rounded-md transition-colors ${
              viewMode === 'comparative'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
            onClick={() => setViewMode('comparative')}
          >
            比較表示
          </button>
          <button
            className={`px-4 py-2 rounded-md transition-colors ${
              viewMode === 'graph'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
            onClick={() => setViewMode('graph')}
          >
            グラフ表示
          </button>
          
          <div className="ml-auto">
            <button
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              onClick={() => saveHierarchicalData('json')}
            >
              JSONエクスポート
            </button>
          </div>
        </div>
      </div>
      
      <div className="view-content mt-4">
        {viewMode === 'hierarchical' && (
          <div className="hierarchical-view">
            <RecursiveHierarchicalSection section={xbrlData.hierarchicalData} />
          </div>
        )}
        
        {viewMode === 'comparative' && (
          <div className="comparative-view">
            {renderComparativeTable()}
          </div>
        )}
        
        {viewMode === 'graph' && (
          <div className="graph-view">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="md:w-1/2">
                <h3 className="text-lg font-semibold mb-2">データ選択</h3>
                <div className="hierarchical-view">
                  <RecursiveHierarchicalSection section={xbrlData.hierarchicalData} />
                </div>
              </div>
              <div className="md:w-1/2">
                {renderGraph()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImprovedXBRLTableView;
