import React from 'react';

/**
 * ツールセレクターコンポーネント
 * 利用可能なツールを表示し、選択を管理します
 */
const ToolSelector = ({ tools, activeToolIndex, onToolChange }) => {
  return (
    <div className="tool-selector mb-6">
      <div className="container mx-auto">
        <div className="flex flex-wrap justify-center gap-2 p-2">
          {tools.map((tool, index) => (
            <button
              key={tool.id}
              className={`px-4 py-2 rounded-md transition-colors ${
                index === activeToolIndex
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
              onClick={() => onToolChange(index)}
            >
              {tool.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ToolSelector;
