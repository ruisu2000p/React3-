import React, { useState } from 'react';
import { useNotification } from '../../contexts/NotificationContext';

/**
 * テキスト入力コンポーネント
 * HTML内容をテキストエリアから入力するためのコンポーネント
 */
const TextInput = ({ onHtmlContentChange, onProcessing }) => {
  const [htmlText, setHtmlText] = useState('');
  const { showError } = useNotification();
  
  const handleTextChange = (e) => {
    setHtmlText(e.target.value);
  };
  
  const handleSubmit = () => {
    if (!htmlText.trim()) {
      showError('HTMLテキストを入力してください');
      return;
    }
    
    onHtmlContentChange(htmlText);
    onProcessing();
  };
  
  return (
    <div className="text-input">
      <textarea
        className="w-full p-3 border rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 min-h-[200px]"
        placeholder="HTMLコードをここに貼り付けてください..."
        value={htmlText}
        onChange={handleTextChange}
      />
      
      <div className="mt-4">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          onClick={handleSubmit}
        >
          テーブルを抽出
        </button>
      </div>
    </div>
  );
};

export default TextInput;
