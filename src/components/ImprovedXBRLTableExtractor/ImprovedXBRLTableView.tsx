import React, { useState, useCallback, useContext } from 'react';
import { NotificationContext } from '../../contexts/NotificationContext';
import { useTheme } from '../../contexts/ThemeContext';


interface XBRLPeriod {
  type: 'instant' | 'duration';
  date?: string;
  startDate?: string;
  endDate?: string;
}

interface XBRLEntity {
  scheme?: string;
  value?: string;
}

interface XBRLContext {
  id: string;
  period: XBRLPeriod;
  entity: XBRLEntity;
}

interface XBRLUnit {
  id: string;
  measure: string | null;
}

interface XBRLItem {
  name: string;
  contextRef: string;
  context: XBRLContext | null;
  value: string;
  numericValue: number | null;
  decimals?: string;
  unitRef?: string;
  unit: XBRLUnit | null;
}

interface XBRLPeriodGroup {
  [period: string]: XBRLItem[];
}

interface XBRLSection {
  id: string;
  name: string;
  items?: XBRLItem[];
  children?: {
    [key: string]: XBRLSection;
  };
}

interface XBRLData {
  items: XBRLItem[];
  contexts: { [id: string]: XBRLContext };
  units: { [id: string]: XBRLUnit };
  periodGroups: XBRLPeriodGroup;
  hierarchicalData: XBRLSection;
}

interface ImprovedXBRLTableViewProps {
  xbrlData: XBRLData | null;
}

/**
 * 改善版XBRLテーブル表示コンポーネント
 * 階層構造、比較表示、グラフ表示などの高度な表示機能を提供します
 */
const ImprovedXBRLTableView: React.FC<ImprovedXBRLTableViewProps> = ({ xbrlData }) => {
  const [viewMode, setViewMode] = useState<'hierarchical' | 'comparative' | 'graph'>('hierarchical');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [selectedMainItems, setSelectedMainItems] = useState<XBRLItem[]>([]);
  const notification = useContext(NotificationContext);
  const { isDarkMode } = useTheme();
  
  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  }, []);
  
  const toggleSelectedItem = useCallback((item: XBRLItem) => {
    setSelectedMainItems(prev => {
      const isSelected = prev.some(i => i.name === item.name);
      if (isSelected) {
        return prev.filter(i => i.name !== item.name);
      } else {
        return [...prev, item];
      }
    });
  }, []);
  
  const saveHierarchicalData = useCallback((format: 'json' | 'excel') => {
    if (!xbrlData) return;
    
    try {
      let content: string;
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
        
        notification?.showSuccess('JSONファイルがダウンロードされました');
      } else if (format === 'excel') {
        notification?.showError('Excelエクスポートは現在実装中です');
      }
    } catch (error) {
      if (error instanceof Error) {
        notification?.showError(`エクスポート中にエラーが発生しました: ${error.message}`);
      } else {
        notification?.showError('エクスポート中に不明なエラーが発生しました');
      }
    }
  }, [xbrlData, notification]);
  
  const RecursiveHierarchicalSection: React.FC<{
    section: XBRLSection;
    level?: number;
  }> = ({ section, level = 0 }) => {
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
              {/* 水平方向のタクソノミ表示 */}
              <div className="taxonomy-items-horizontal overflow-x-auto">
                <div className="flex flex-row flex-wrap gap-2 mb-4">
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
                    
                    return (
                      <div 
                        key={`${item.name}-${index}`}
                        className={`taxonomy-item p-2 rounded-md border ${
                          isDarkMode 
                            ? 'border-gray-600 bg-gray-800 text-white' 
                            : 'border-gray-300 bg-white'
                        }`}
                      >
                        <div className="font-medium">{item.name}</div>
                        <div className="text-right font-bold">{item.value}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{periodInfo}</div>
                        {viewMode === 'graph' && (
                          <div className="mt-1">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={selectedMainItems.some(i => i.name === item.name)}
                                onChange={() => toggleSelectedItem(item)}
                                className="mr-1"
                              />
                              <span className="text-xs">グラフに表示</span>
                            </label>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* 従来の表形式表示（オプション） */}
              <details className="mt-4">
                <summary className="cursor-pointer text-blue-600 dark:text-blue-400 mb-2">
                  表形式で表示
                </summary>
                <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-700">
                  <thead className="bg-gray-200 dark:bg-gray-700">
                    <tr>
                      <th className="border border-gray-300 dark:border-gray-600 p-2 text-gray-800 dark:text-white">項目名</th>
                      <th className="border border-gray-300 dark:border-gray-600 p-2 text-gray-800 dark:text-white">値</th>
                      <th className="border border-gray-300 dark:border-gray-600 p-2 text-gray-800 dark:text-white">コンテキスト</th>
                      <th className="border border-gray-300 dark:border-gray-600 p-2 text-gray-800 dark:text-white">単位</th>
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
                          key={`${item.name}-${index}-table`}
                          className={index % 2 === 0 
                            ? 'bg-white dark:bg-gray-900 text-gray-800 dark:text-white' 
                            : 'bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white'}
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
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </details>
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
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white'
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
    
    const commonTags: Record<string, { name: string; periods: Record<string, XBRLItem> }> = {};
    
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
              <th className="border border-gray-300 dark:border-gray-600 p-2 text-gray-800 dark:text-white">項目名</th>
              {periods.map(period => (
                <th key={period} className="border border-gray-300 dark:border-gray-600 p-2 text-gray-800 dark:text-white">
                  {period}
                </th>
              ))}
              <th className="border border-gray-300 dark:border-gray-600 p-2 text-gray-800 dark:text-white">変化</th>
            </tr>
          </thead>
          <tbody>
            {comparableTags.map((tag, index) => {
              let changeRate: number | null = null;
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
                  className={index % 2 === 0 
                    ? 'bg-white dark:bg-gray-900 text-gray-800 dark:text-white' 
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white'}
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
                    changeRate !== null ? (
                      changeRate > 0 
                        ? 'text-green-600 dark:text-green-400' 
                        : changeRate < 0 
                          ? 'text-red-600 dark:text-red-400' 
                          : ''
                    ) : ''
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
        <div className="graph-placeholder p-4 text-center bg-gray-100 dark:bg-gray-800 rounded-md text-gray-800 dark:text-white">
          <p>グラフ表示するアイテムを選択してください</p>
        </div>
      );
    }
    
    return (
      <div className="graph-container p-4 bg-white dark:bg-gray-800 rounded-md text-gray-800 dark:text-white">
        <h3 className="text-lg font-semibold mb-2">選択されたアイテム</h3>
        <ul className="mb-4">
          {selectedMainItems.map((item, index) => (
            <li key={index} className="mb-1">
              {item.name}: {item.value} {item.unit?.measure}
            </li>
          ))}
        </ul>
        <div className="graph-placeholder p-4 text-center bg-gray-100 dark:bg-gray-700 rounded-md text-gray-800 dark:text-white">
          <p>グラフ表示機能は現在実装中です</p>
        </div>
      </div>
    );
  };
  
  if (!xbrlData || !xbrlData.hierarchicalData || 
      (Object.keys(xbrlData.hierarchicalData).length === 0 && 
       (!xbrlData.items || xbrlData.items.length === 0))) {
    return (
      <div className="empty-data-message p-4 text-center bg-gray-100 dark:bg-gray-800 rounded-md text-gray-800 dark:text-white">
        <p>XBRLデータがありません</p>
        <p className="text-sm mt-2">テーブルは抽出されましたが、XBRLタグが見つかりませんでした。</p>
        <p className="text-sm">サンプルデータにcontextref属性を持つ要素があることを確認してください。</p>
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
                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white'
            }`}
            onClick={() => setViewMode('hierarchical')}
          >
            階層表示
          </button>
          <button
            className={`px-4 py-2 rounded-md transition-colors ${
              viewMode === 'comparative'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white'
            }`}
            onClick={() => setViewMode('comparative')}
          >
            比較表示
          </button>
          <button
            className={`px-4 py-2 rounded-md transition-colors ${
              viewMode === 'graph'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white'
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
                <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">データ選択</h3>
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
