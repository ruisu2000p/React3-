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
        const sampleData: XBRLData = {
          title: '財務諸表サンプル',
          periods: ['2022年3月期', '2023年3月期'],
          mainSections: [
            {
              title: '貸借対照表',
              items: [
                {
                  name: '流動資産',
                  value: '',
                  children: [
                    { name: '現金及び預金', value: '1,200,000', unit: '千円', period: '2023年3月期' },
                    { name: '受取手形及び売掛金', value: '800,000', unit: '千円', period: '2023年3月期' },
                    { name: 'その他', value: '300,000', unit: '千円', period: '2023年3月期' }
                  ]
                },
                {
                  name: '固定資産',
                  value: '',
                  children: [
                    { name: '有形固定資産', value: '2,500,000', unit: '千円', period: '2023年3月期' },
                    { name: '無形固定資産', value: '500,000', unit: '千円', period: '2023年3月期' },
                    { name: '投資その他の資産', value: '700,000', unit: '千円', period: '2023年3月期' }
                  ]
                }
              ],
              subsections: [
                {
                  title: '資産の部',
                  items: [
                    { name: '資産合計', value: '6,000,000', unit: '千円', period: '2023年3月期' }
                  ]
                },
                {
                  title: '負債の部',
                  items: [
                    {
                      name: '流動負債',
                      value: '',
                      children: [
                        { name: '支払手形及び買掛金', value: '600,000', unit: '千円', period: '2023年3月期' },
                        { name: '短期借入金', value: '400,000', unit: '千円', period: '2023年3月期' },
                        { name: 'その他', value: '200,000', unit: '千円', period: '2023年3月期' }
                      ]
                    },
                    {
                      name: '固定負債',
                      value: '',
                      children: [
                        { name: '長期借入金', value: '1,500,000', unit: '千円', period: '2023年3月期' },
                        { name: '退職給付引当金', value: '300,000', unit: '千円', period: '2023年3月期' },
                        { name: 'その他', value: '200,000', unit: '千円', period: '2023年3月期' }
                      ]
                    }
                  ]
                }
              ]
            },
            {
              title: '損益計算書',
              items: [
                { name: '売上高', value: '5,000,000', unit: '千円', period: '2023年3月期' },
                { name: '売上原価', value: '3,500,000', unit: '千円', period: '2023年3月期' },
                { name: '売上総利益', value: '1,500,000', unit: '千円', period: '2023年3月期' },
                { name: '販売費及び一般管理費', value: '1,000,000', unit: '千円', period: '2023年3月期' },
                { name: '営業利益', value: '500,000', unit: '千円', period: '2023年3月期' },
                { name: '経常利益', value: '480,000', unit: '千円', period: '2023年3月期' },
                { name: '当期純利益', value: '320,000', unit: '千円', period: '2023年3月期' }
              ]
            }
          ],
          taxonomyItems: [
            { name: '現金及び預金', value: '1,200,000', unit: '千円', period: '2023年3月期' },
            { name: '受取手形及び売掛金', value: '800,000', unit: '千円', period: '2023年3月期' },
            { name: '有形固定資産', value: '2,500,000', unit: '千円', period: '2023年3月期' },
            { name: '無形固定資産', value: '500,000', unit: '千円', period: '2023年3月期' },
            { name: '投資その他の資産', value: '700,000', unit: '千円', period: '2023年3月期' },
            { name: '支払手形及び買掛金', value: '600,000', unit: '千円', period: '2023年3月期' },
            { name: '短期借入金', value: '400,000', unit: '千円', period: '2023年3月期' },
            { name: '長期借入金', value: '1,500,000', unit: '千円', period: '2023年3月期' },
            { name: '退職給付引当金', value: '300,000', unit: '千円', period: '2023年3月期' },
            { name: '売上高', value: '5,000,000', unit: '千円', period: '2023年3月期' },
            { name: '売上原価', value: '3,500,000', unit: '千円', period: '2023年3月期' },
            { name: '売上総利益', value: '1,500,000', unit: '千円', period: '2023年3月期' },
            { name: '販売費及び一般管理費', value: '1,000,000', unit: '千円', period: '2023年3月期' },
            { name: '営業利益', value: '500,000', unit: '千円', period: '2023年3月期' },
            { name: '経常利益', value: '480,000', unit: '千円', period: '2023年3月期' },
            { name: '当期純利益', value: '320,000', unit: '千円', period: '2023年3月期' }
          ]
        };
        
        setXbrlData(sampleData);
        notification?.showSuccess('XBRLデータを抽出しました');
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
    }, 1500); // 処理時間をシミュレート
  }, [notification]);
  
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
