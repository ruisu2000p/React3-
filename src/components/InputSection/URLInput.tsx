import React, { useState, ChangeEvent } from 'react';
import { useNotification } from '../../contexts/NotificationContext';

interface URLInputProps {
  onHtmlContentChange: (content: string) => void;
  onProcessing: () => void;
}

/**
 * URL入力コンポーネント
 * URLからHTMLコンテンツを取得するためのコンポーネント
 */
const URLInput: React.FC<URLInputProps> = ({ onHtmlContentChange, onProcessing }) => {
  const [url, setUrl] = useState<string>('');
  const [useProxy, setUseProxy] = useState<boolean>(false);
  const [proxyUrl, setProxyUrl] = useState<string>('https://cors-anywhere.herokuapp.com/');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { showError, showInfo, showSuccess } = useNotification();
  
  const handleUrlChange = (e: ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
  };
  
  const handleProxyUrlChange = (e: ChangeEvent<HTMLInputElement>) => {
    setProxyUrl(e.target.value);
  };
  
  const toggleUseProxy = () => {
    setUseProxy(!useProxy);
  };
  
  const handleSubmit = async () => {
    if (!url.trim()) {
      showError('URLを入力してください');
      return;
    }
    
    try {
      new URL(url);
    } catch (e) {
      showError('有効なURLを入力してください');
      return;
    }
    
    setIsLoading(true);
    showInfo('URLからHTMLコンテンツを取得中...');
    
    try {
      const fetchUrl = useProxy ? `${proxyUrl}${url}` : url;
      const response = await fetch(fetchUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const html = await response.text();
      onHtmlContentChange(html);
      showSuccess('HTMLコンテンツの取得に成功しました');
      onProcessing();
    } catch (error) {
      if (error instanceof Error) {
        showError(`HTMLコンテンツの取得に失敗しました: ${error.message}`);
        if (error.message.includes('CORS') || error.message.includes('blocked')) {
          showInfo('CORSエラーが発生しました。プロキシの使用を試してください。');
        }
      } else {
        showError('HTMLコンテンツの取得に失敗しました: 不明なエラー');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="url-input">
      <div className="mb-4">
        <input
          type="text"
          className="w-full p-3 border rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
          placeholder="https://example.com"
          value={url}
          onChange={handleUrlChange}
        />
      </div>
      
      <div className="mb-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={useProxy}
            onChange={toggleUseProxy}
            className="mr-2"
          />
          <span className="text-gray-700 dark:text-gray-300">CORSプロキシを使用する</span>
        </label>
        
        {useProxy && (
          <div className="mt-2">
            <input
              type="text"
              className="w-full p-3 border rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
              placeholder="プロキシURL"
              value={proxyUrl}
              onChange={handleProxyUrlChange}
            />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              注: CORSプロキシを使用すると、一部のサイトへのアクセスが制限される場合があります。
            </p>
          </div>
        )}
      </div>
      
      <div className="mt-4">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? '取得中...' : 'テーブルを抽出'}
        </button>
      </div>
    </div>
  );
};

export default URLInput;
