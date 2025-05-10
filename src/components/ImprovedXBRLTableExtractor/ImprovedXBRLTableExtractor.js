import React, { useState, useCallback } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import InputSection from '../InputSection/InputSection';
import ImprovedXBRLTableView from './ImprovedXBRLTableView';

/**
 * 改善版XBRL抽出コンポーネント
 * 階層構造や年度間比較ができる高度なXBRLデータ抽出・表示ツール
 */
const ImprovedXBRLTableExtractor = () => {
  const [htmlContent, setHtmlContent] = useState('');
  const [xbrlData, setXbrlData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [intelligentProcessing, setIntelligentProcessing] = useState(true);
  const { showSuccess, showError, showInfo } = useNotification();
  
  const extractXbrlData = useCallback(() => {
    setIsProcessing(true);
    
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      
      const xbrlElements = doc.querySelectorAll('[contextref]');
      
      if (xbrlElements.length === 0) {
        showError('XBRLタグが見つかりませんでした');
        setXbrlData(null);
        setIsProcessing(false);
        return;
      }
      
      const contextElements = doc.querySelectorAll('context');
      const contexts = Array.from(contextElements).reduce((acc, context) => {
        const id = context.getAttribute('id');
        const period = context.querySelector('period');
        let periodInfo = {};
        
        if (period) {
          const instant = period.querySelector('instant');
          const startDate = period.querySelector('startdate');
          const endDate = period.querySelector('enddate');
          
          if (instant) {
            periodInfo.type = 'instant';
            periodInfo.date = instant.textContent.trim();
          } else if (startDate && endDate) {
            periodInfo.type = 'duration';
            periodInfo.startDate = startDate.textContent.trim();
            periodInfo.endDate = endDate.textContent.trim();
          }
        }
        
        const entity = context.querySelector('entity');
        let entityInfo = {};
        
        if (entity) {
          const identifier = entity.querySelector('identifier');
          if (identifier) {
            entityInfo.scheme = identifier.getAttribute('scheme');
            entityInfo.value = identifier.textContent.trim();
          }
        }
        
        acc[id] = {
          id,
          period: periodInfo,
          entity: entityInfo
        };
        
        return acc;
      }, {});
      
      const unitElements = doc.querySelectorAll('unit');
      const units = Array.from(unitElements).reduce((acc, unit) => {
        const id = unit.getAttribute('id');
        const measure = unit.querySelector('measure');
        
        acc[id] = {
          id,
          measure: measure ? measure.textContent.trim() : null
        };
        
        return acc;
      }, {});
      
      const xbrlItems = Array.from(xbrlElements).map(el => {
        const name = el.tagName.toLowerCase();
        const contextRef = el.getAttribute('contextref');
        const value = el.textContent.trim();
        const decimals = el.getAttribute('decimals');
        const unitRef = el.getAttribute('unitref');
        
        let numericValue = null;
        if (!isNaN(value) && value !== '') {
          numericValue = parseFloat(value);
        }
        
        return {
          name,
          contextRef,
          context: contexts[contextRef] || null,
          value,
          numericValue,
          decimals,
          unitRef,
          unit: units[unitRef] || null
        };
      });
      
      const periodGroups = xbrlItems.reduce((acc, item) => {
        if (!item.context || !item.context.period) return acc;
        
        const period = item.context.period;
        let periodKey;
        
        if (period.type === 'instant') {
          periodKey = period.date;
        } else if (period.type === 'duration') {
          periodKey = `${period.startDate} - ${period.endDate}`;
        } else {
          return acc;
        }
        
        if (!acc[periodKey]) {
          acc[periodKey] = [];
        }
        
        acc[periodKey].push(item);
        return acc;
      }, {});
      
      const hierarchicalData = buildHierarchicalData(xbrlItems, intelligentProcessing);
      
      setXbrlData({
        items: xbrlItems,
        contexts: contexts,
        units: units,
        periodGroups: periodGroups,
        hierarchicalData: hierarchicalData
      });
      
      showSuccess(`${xbrlItems.length}個のXBRLタグが抽出されました`);
      showInfo(`${Object.keys(periodGroups).length}つの期間が検出されました`);
    } catch (error) {
      console.error('XBRL抽出エラー:', error);
      showError(`XBRLデータの抽出中にエラーが発生しました: ${error.message}`);
      setXbrlData(null);
    } finally {
      setIsProcessing(false);
    }
  }, [htmlContent, intelligentProcessing, showSuccess, showError, showInfo]);
  
  const buildHierarchicalData = (items, intelligent) => {
    const getCategory = (name) => {
      const parts = name.split(':');
      if (parts.length > 1) {
        const itemName = parts[1];
        const match = itemName.match(/^([A-Z][a-z]+)/);
        return match ? match[0] : 'Other';
      }
      return 'Other';
    };
    
    const hierarchy = {
      id: 'root',
      name: 'XBRL Data',
      children: {}
    };
    
    items.forEach(item => {
      const category = getCategory(item.name);
      
      if (!hierarchy.children[category]) {
        hierarchy.children[category] = {
          id: category,
          name: category,
          children: {}
        };
      }
      
      let subcategory = 'General';
      if (item.name.includes('Assets')) subcategory = 'Assets';
      else if (item.name.includes('Liabilities')) subcategory = 'Liabilities';
      else if (item.name.includes('Equity')) subcategory = 'Equity';
      else if (item.name.includes('Revenue')) subcategory = 'Revenue';
      else if (item.name.includes('Expense')) subcategory = 'Expenses';
      else if (item.name.includes('Income')) subcategory = 'Income';
      
      if (!hierarchy.children[category].children[subcategory]) {
        hierarchy.children[category].children[subcategory] = {
          id: `${category}-${subcategory}`,
          name: subcategory,
          items: []
        };
      }
      
      hierarchy.children[category].children[subcategory].items.push(item);
    });
    
    if (intelligent) {
      const priorityCategories = ['Assets', 'Liabilities', 'Equity', 'Income', 'Revenue', 'Expenses'];
      
      const sortedHierarchy = { ...hierarchy };
      sortedHierarchy.children = Object.entries(hierarchy.children)
        .sort(([catA], [catB]) => {
          const indexA = priorityCategories.indexOf(catA);
          const indexB = priorityCategories.indexOf(catB);
          
          if (indexA !== -1 && indexB !== -1) return indexA - indexB;
          if (indexA !== -1) return -1;
          if (indexB !== -1) return 1;
          return catA.localeCompare(catB);
        })
        .reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
        }, {});
      
      return sortedHierarchy;
    }
    
    return hierarchy;
  };
  
  const handleHtmlContentChange = (content) => {
    setHtmlContent(content);
  };
  
  const handleProcessing = () => {
    extractXbrlData();
  };
  
  const toggleIntelligentProcessing = () => {
    setIntelligentProcessing(!intelligentProcessing);
    if (xbrlData) {
      const updatedHierarchy = buildHierarchicalData(xbrlData.items, !intelligentProcessing);
      setXbrlData({
        ...xbrlData,
        hierarchicalData: updatedHierarchy
      });
    }
  };
  
  return (
    <div className="improved-xbrl-extractor">
      <InputSection 
        onHtmlContentChange={handleHtmlContentChange} 
        onProcessing={handleProcessing} 
      />
      
      <div className="processing-options mb-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={intelligentProcessing}
            onChange={toggleIntelligentProcessing}
            className="mr-2"
          />
          <span>インテリジェント処理（重要な財務情報を優先表示）</span>
        </label>
      </div>
      
      {isProcessing && (
        <div className="processing-indicator text-center py-4">
          <p>XBRLデータを抽出・分析中...</p>
        </div>
      )}
      
      {!isProcessing && xbrlData && (
        <div className="xbrl-data-view mt-6">
          <ImprovedXBRLTableView xbrlData={xbrlData} />
        </div>
      )}
    </div>
  );
};

export default ImprovedXBRLTableExtractor;
