import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface XBRLItem {
  name: string;
  value: string;
  unit?: string;
  context?: string;
  period?: string;
  children?: XBRLItem[];
}

interface HorizontalTaxonomyViewProps {
  taxonomyItems: XBRLItem[];
  selectedItems: XBRLItem[];
  onItemSelect: (item: XBRLItem) => void;
}

/**
 * 水平タクソノミービューコンポーネント
 * XBRLタクソノミ要素を水平方向に表示します
 */
const HorizontalTaxonomyView: React.FC<HorizontalTaxonomyViewProps> = ({
  taxonomyItems,
  selectedItems,
  onItemSelect
}) => {
  const { isDarkMode } = useTheme();

  const isItemSelected = (item: XBRLItem): boolean => {
    return selectedItems.some(selectedItem => selectedItem.name === item.name);
  };

  return (
    <div className="horizontal-taxonomy-view mt-4">
      <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">タクソノミ要素</h3>
      
      <div className="taxonomy-container overflow-x-auto">
        <div className="flex flex-row flex-nowrap gap-4 pb-2">
          {taxonomyItems.map((item, index) => (
            <div 
              key={`${item.name}-${index}`}
              className={`taxonomy-item p-3 rounded-md min-w-[200px] cursor-pointer transition-colors ${
                isItemSelected(item)
                  ? 'bg-blue-100 dark:bg-blue-900 border-2 border-blue-500'
                  : isDarkMode
                    ? 'bg-gray-700 text-white hover:bg-gray-600'
                    : 'bg-white border border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => onItemSelect(item)}
            >
              <div className="font-medium mb-1 text-gray-900 dark:text-white">{item.name}</div>
              {item.value && (
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">値:</span> {item.value}
                  {item.unit && ` ${item.unit}`}
                </div>
              )}
              {item.period && (
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">期間:</span> {item.period}
                </div>
              )}
              {item.context && (
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">コンテキスト:</span> {item.context}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HorizontalTaxonomyView;
