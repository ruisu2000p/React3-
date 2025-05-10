import React, { useState } from 'react';
import TextInput from './TextInput';
import FileInput from './FileInput';
import URLInput from './URLInput';

interface InputSectionProps {
  onHtmlContentChange: (content: string) => void;
  onProcessing: () => void;
}

/**
 * 入力セクションコンポーネント
 * HTML入力方法の選択と各入力方法のコンポーネントを管理します
 */
const InputSection: React.FC<InputSectionProps> = ({ onHtmlContentChange, onProcessing }) => {
  const [inputType, setInputType] = useState<'paste' | 'file' | 'url'>('paste');
  
  return (
    <div className="input-section mb-6">
      <div className="input-type-selector mb-4">
        <div className="flex flex-wrap gap-2">
          <button
            className={`px-4 py-2 rounded-md transition-colors ${
              inputType === 'paste'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
            onClick={() => setInputType('paste')}
          >
            HTMLを貼り付け
          </button>
          <button
            className={`px-4 py-2 rounded-md transition-colors ${
              inputType === 'file'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
            onClick={() => setInputType('file')}
          >
            ファイルをアップロード
          </button>
          <button
            className={`px-4 py-2 rounded-md transition-colors ${
              inputType === 'url'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
            onClick={() => setInputType('url')}
          >
            URLから取得
          </button>
        </div>
      </div>
      
      <div className="input-container">
        {inputType === 'paste' && (
          <TextInput onHtmlContentChange={onHtmlContentChange} onProcessing={onProcessing} />
        )}
        {inputType === 'file' && (
          <FileInput onHtmlContentChange={onHtmlContentChange} onProcessing={onProcessing} />
        )}
        {inputType === 'url' && (
          <URLInput onHtmlContentChange={onHtmlContentChange} onProcessing={onProcessing} />
        )}
      </div>
    </div>
  );
};

export default InputSection;
