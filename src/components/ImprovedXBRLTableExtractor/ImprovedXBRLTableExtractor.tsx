import React, { useState, useCallback, useContext } from 'react';
import { NotificationContext } from '../../contexts/NotificationContext';
import InputSection from '../InputSection/InputSection';
import ImprovedXBRLTableView from './ImprovedXBRLTableView';
import HorizontalTaxonomyView from './HorizontalTaxonomyView';

interface XBRLViewPeriod {
  type: 'instant' | 'duration';
  date?: string;
  startDate?: string;
  endDate?: string;
}

interface XBRLViewEntity {
  scheme?: string;
  value?: string;
}

interface XBRLViewContext {
  id: string;
  period: XBRLViewPeriod;
  entity: XBRLViewEntity;
}

interface XBRLViewUnit {
  id: string;
  measure: string | null;
}

interface XBRLViewItem {
  name: string;
  contextRef: string;
  context: XBRLViewContext | null;
  value: string;
  numericValue: number | null;
  decimals?: string;
  unitRef?: string;
  unit: XBRLViewUnit | null;
}

interface XBRLViewPeriodGroup {
  [period: string]: XBRLViewItem[];
}

interface XBRLViewSection {
  id: string;
  name: string;
  items?: XBRLViewItem[];
  children?: {
    [key: string]: XBRLViewSection;
  };
}

interface XBRLViewData {
  items: XBRLViewItem[];
  contexts: { [id: string]: XBRLViewContext };
  units: { [id: string]: XBRLViewUnit };
  periodGroups: XBRLViewPeriodGroup;
  hierarchicalData: XBRLViewSection;
}

interface XBRLItem {
  name: string;
  value: string;
  unit?: string;
  context?: string;
  period?: string;
  children?: XBRLItem[];
}

interface XBRLSection {
  title: string;
  items: XBRLItem[];
  subsections?: XBRLSection[];
}

interface XBRLData {
  title: string;
  periods: string[];
  mainSections: XBRLSection[];
  taxonomyItems: XBRLItem[];
}

const convertToXBRLViewData = (data: XBRLData | null): XBRLViewData | null => {
  if (!data) return null;
  
  const contexts: { [id: string]: XBRLViewContext } = {};
  data.periods.forEach((period, index) => {
    const contextId = `ctx-${index}`;
    contexts[contextId] = {
      id: contextId,
      period: {
        type: 'instant',
        date: period
      },
      entity: {
        scheme: 'http://www.example.com',
        value: 'EXAMPLE'
      }
    };
  });
  
  const units: { [id: string]: XBRLViewUnit } = {
    'JPY': {
      id: 'JPY',
      measure: '円'
    },
    'USD': {
      id: 'USD',
      measure: 'ドル'
    },
    'PURE': {
      id: 'PURE',
      measure: null
    }
  };
  
  const items: XBRLViewItem[] = [];
  const periodGroups: XBRLViewPeriodGroup = {};
  
  data.periods.forEach(period => {
    periodGroups[period] = [];
  });
  
  data.taxonomyItems.forEach((item, index) => {
    const contextId = item.period ? 
      Object.keys(contexts).find(key => contexts[key].period.date === item.period) || 'ctx-0' : 
      'ctx-0';
    
    const unitId = item.unit?.includes('円') || item.unit?.includes('千円') ? 'JPY' : 
                  item.unit?.includes('ドル') ? 'USD' : 'PURE';
    
    const numericValue = parseFloat(item.value.replace(/,/g, ''));
    
    const viewItem: XBRLViewItem = {
      name: item.name,
      contextRef: contextId,
      context: contexts[contextId],
      value: item.value,
      numericValue: isNaN(numericValue) ? null : numericValue,
      unitRef: unitId,
      unit: units[unitId]
    };
    
    items.push(viewItem);
    
    if (item.period && periodGroups[item.period]) {
      periodGroups[item.period].push(viewItem);
    }
  });
  
  const hierarchicalData: XBRLViewSection = {
    id: 'root',
    name: data.title,
    children: {}
  };
  
  data.mainSections.forEach((section, sectionIndex) => {
    const sectionId = `section-${sectionIndex}`;
    const viewSection: XBRLViewSection = {
      id: sectionId,
      name: section.title,
      items: []
    };
    
    if (section.items && section.items.length > 0) {
      section.items.forEach((item, itemIndex) => {
        if (!item.children) {
          const contextId = item.period ? 
            Object.keys(contexts).find(key => contexts[key].period.date === item.period) || 'ctx-0' : 
            'ctx-0';
          
          const unitId = item.unit?.includes('円') || item.unit?.includes('千円') ? 'JPY' : 
                        item.unit?.includes('ドル') ? 'USD' : 'PURE';
          
          const numericValue = parseFloat(item.value.replace(/,/g, ''));
          
          const viewItem: XBRLViewItem = {
            name: item.name,
            contextRef: contextId,
            context: contexts[contextId],
            value: item.value,
            numericValue: isNaN(numericValue) ? null : numericValue,
            unitRef: unitId,
            unit: units[unitId]
          };
          
          viewSection.items?.push(viewItem);
        }
      });
    }
    
    if (section.subsections && section.subsections.length > 0) {
      viewSection.children = {};
      
      section.subsections.forEach((subsection, subsectionIndex) => {
        const subsectionId = `${sectionId}-sub-${subsectionIndex}`;
        const viewSubsection: XBRLViewSection = {
          id: subsectionId,
          name: subsection.title,
          items: []
        };
        
        if (subsection.items && subsection.items.length > 0) {
          subsection.items.forEach((item, itemIndex) => {
            const contextId = item.period ? 
              Object.keys(contexts).find(key => contexts[key].period.date === item.period) || 'ctx-0' : 
              'ctx-0';
            
            const unitId = item.unit?.includes('円') || item.unit?.includes('千円') ? 'JPY' : 
                          item.unit?.includes('ドル') ? 'USD' : 'PURE';
            
            const numericValue = parseFloat(item.value.replace(/,/g, ''));
            
            const viewItem: XBRLViewItem = {
              name: item.name,
              contextRef: contextId,
              context: contexts[contextId],
              value: item.value,
              numericValue: isNaN(numericValue) ? null : numericValue,
              unitRef: unitId,
              unit: units[unitId]
            };
            
            viewSubsection.items?.push(viewItem);
          });
        }
        
        if (viewSection.children) {
          viewSection.children[subsectionId] = viewSubsection;
        }
      });
    }
    
    hierarchicalData.children![sectionId] = viewSection;
  });
  
  return {
    items,
    contexts,
    units,
    periodGroups,
    hierarchicalData
  };
};

/**
 * 改善版XBRL抽出コンポーネント
 * 階層構造や年度間比較ができる改善版XBRLツール
 */
const ImprovedXBRLTableExtractor: React.FC = () => {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [xbrlData, setXbrlData] = useState<XBRLData | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [selectedTaxonomyItems, setSelectedTaxonomyItems] = useState<XBRLItem[]>([]);
  const notification = useContext(NotificationContext);
  
  const handleHtmlContentChange = (content: string) => {
    setHtmlContent(content);
  };
  
  const extractXBRLData = useCallback(() => {
    setIsProcessing(true);
    
    setTimeout(() => {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        
        const xbrlElements = Array.from(doc.querySelectorAll('[contextref]'));
        const tdWithContextRef = Array.from(doc.querySelectorAll('td[contextref]'));
        const allXbrlElements = [...xbrlElements, ...tdWithContextRef];
        
        if (allXbrlElements.length === 0) {
          const sampleData: XBRLData = {
            title: '財務諸表サンプル',
            periods: ['2022年3月期', '2023年3月期'],
            mainSections: [
              {
                title: '貸借対照表',
                items: [
                  { name: '流動資産', value: '', children: [] },
                  { name: '固定資産', value: '', children: [] }
                ]
              },
              {
                title: '損益計算書',
                items: []
              }
            ],
            taxonomyItems: []
          };
          
          const tables = doc.querySelectorAll('table');
          if (tables.length > 0) {
            const tableData: XBRLItem[] = [];
            const periods: string[] = [];
            
            tables.forEach(table => {
              const rows = table.querySelectorAll('tr');
              
              const headerRow = rows[0];
              if (headerRow) {
                const headerCells = headerRow.querySelectorAll('th');
                headerCells.forEach((cell, index) => {
                  if (index > 0) { // 最初の列はラベル列
                    const periodText = cell.textContent?.trim() || `期間${index}`;
                    if (!periods.includes(periodText)) {
                      periods.push(periodText);
                    }
                  }
                });
              }
              
              for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                const cells = row.querySelectorAll('td');
                
                if (cells.length > 0) {
                  const itemName = cells[0].textContent?.trim() || '';
                  
                  for (let j = 1; j < cells.length && j <= periods.length; j++) {
                    const cell = cells[j];
                    const xbrlTags = cell.querySelectorAll('[contextref]');
                    
                    if (cell.hasAttribute('contextref')) {
                      const contextRef = cell.getAttribute('contextref') || '';
                      const unitRef = cell.getAttribute('unitref') || '';
                      const value = cell.textContent?.trim() || '';
                      
                      tableData.push({
                        name: itemName,
                        value: value,
                        context: contextRef,
                        unit: unitRef,
                        period: periods[j-1]
                      });
                    } else if (xbrlTags.length > 0) {
                      xbrlTags.forEach(tag => {
                        const tagName = tag.tagName.toLowerCase();
                        const contextRef = tag.getAttribute('contextref') || '';
                        const unitRef = tag.getAttribute('unitref') || '';
                        const value = tag.textContent?.trim() || '';
                        
                        tableData.push({
                          name: itemName,
                          value: value,
                          context: contextRef,
                          unit: unitRef,
                          period: periods[j-1]
                        });
                      });
                    } else {
                      const value = cell.textContent?.trim() || '';
                      if (value) {
                        tableData.push({
                          name: itemName,
                          value: value,
                          period: periods[j-1]
                        });
                      }
                    }
                  }
                }
              }
            });
            
            if (tableData.length > 0) {
              sampleData.taxonomyItems = tableData;
              sampleData.periods = periods.length > 0 ? periods : ['2023年3月期'];
              
              sampleData.mainSections[1].items = tableData.map(item => ({
                name: item.name,
                value: item.value,
                unit: item.unit,
                period: item.period
              }));
            }
          }
          
          setXbrlData(sampleData);
          notification?.showSuccess('テーブルデータを抽出しました');
        } else {
          const taxonomyItems: XBRLItem[] = [];
          const periods = new Set<string>();
          
          allXbrlElements.forEach(el => {
            let name = '';
            let value = '';
            
            if (el.tagName.toLowerCase() === 'td') {
              const row = el.closest('tr');
              if (row) {
                const firstCell = row.querySelector('td');
                if (firstCell) {
                  name = firstCell.textContent?.trim() || '';
                }
              }
              value = el.textContent?.trim() || '';
            } else {
              name = el.tagName.toLowerCase();
              value = el.textContent?.trim() || '';
            }
            
            const contextRef = el.getAttribute('contextref') || '';
            const unitRef = el.getAttribute('unitref') || '';
            const decimals = el.getAttribute('decimals') || '';
            
            let period = '';
            if (contextRef.includes('CurrentYear')) {
              period = '当期';
              periods.add(period);
            } else if (contextRef.includes('PreviousYear')) {
              period = '前期';
              periods.add(period);
            }
            
            taxonomyItems.push({
              name,
              value,
              context: contextRef,
              unit: unitRef,
              period
            });
          });
          
          const xbrlData: XBRLData = {
            title: 'XBRL財務データ',
            periods: Array.from(periods),
            mainSections: [
              {
                title: '財務情報',
                items: taxonomyItems.map(item => ({
                  name: item.name,
                  value: item.value,
                  unit: item.unit,
                  period: item.period
                }))
              }
            ],
            taxonomyItems
          };
          
          setXbrlData(xbrlData);
          notification?.showSuccess(`${taxonomyItems.length}個のXBRLタグを抽出しました`);
        }
      } catch (error) {
        if (error instanceof Error) {
          notification?.showError(`XBRLデータの抽出中にエラーが発生しました: ${error.message}`);
        } else {
          notification?.showError('XBRLデータの抽出中に不明なエラーが発生しました');
        }
        setXbrlData(null);
      } finally {
        setIsProcessing(false);
      }
    }, 500); // 処理時間を短縮
  }, [htmlContent, notification]);
  
  const handleProcessing = () => {
    extractXBRLData();
  };
  
  const handleTaxonomyItemSelect = (item: XBRLItem) => {
    setSelectedTaxonomyItems(prev => {
      const isAlreadySelected = prev.some(selectedItem => selectedItem.name === item.name);
      
      if (isAlreadySelected) {
        return prev.filter(selectedItem => selectedItem.name !== item.name);
      } else {
        return [...prev, item];
      }
    });
  };
  
  return (
    <div className="improved-xbrl-extractor">
      <InputSection 
        onHtmlContentChange={handleHtmlContentChange} 
        onProcessing={handleProcessing} 
      />
      
      {isProcessing && (
        <div className="processing-indicator text-center py-4">
          <p className="text-gray-900 dark:text-white">XBRLデータを抽出中...</p>
        </div>
      )}
      
      {!isProcessing && xbrlData && (
        <div className="xbrl-data-container mt-6">
          {/* 水平タクソノミビュー */}
          <HorizontalTaxonomyView 
            taxonomyItems={xbrlData.taxonomyItems}
            selectedItems={selectedTaxonomyItems}
            onItemSelect={handleTaxonomyItemSelect}
          />
          
          {/* 改善版XBRLテーブルビュー */}
          <div className="mt-6">
            <ImprovedXBRLTableView xbrlData={convertToXBRLViewData(xbrlData)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ImprovedXBRLTableExtractor;
