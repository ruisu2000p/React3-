import React, { useState, useRef, ChangeEvent } from 'react';
import { useNotification } from '../../contexts/NotificationContext';

interface FileInputProps {
  onHtmlContentChange: (content: string) => void;
  onProcessing: () => void;
}

/**
 * ファイル入力コンポーネント
 * HTMLファイルをアップロードするためのコンポーネント
 */
const FileInput: React.FC<FileInputProps> = ({ onHtmlContentChange, onProcessing }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { showError, showInfo } = useNotification();
  
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    const validTypes = ['text/html', 'application/xhtml+xml', 'text/xml'];
    const validExtensions = /\.(html|htm|xhtml|xml)$/i;
    
    if (!validTypes.includes(file.type) && !file.name.match(validExtensions)) {
      showError('有効なHTML/XMLファイルを選択してください');
      resetFileInput();
      return;
    }
    
    const maxSize = 15 * 1024 * 1024;
    if (file.size > maxSize) {
      showError(`ファイルサイズが上限の15MBを超えています（${(file.size / (1024 * 1024)).toFixed(2)}MB）`);
      resetFileInput();
      return;
    }
    
    setSelectedFile(file);
    setFileName(file.name);
    showInfo(`ファイル「${file.name}」が選択されました`);
  };
  
  const resetFileInput = () => {
    setSelectedFile(null);
    setFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleSubmit = () => {
    if (!selectedFile) {
      showError('ファイルを選択してください');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        onHtmlContentChange(result);
        onProcessing();
      } else {
        showError('ファイルの読み込み結果が不正な形式です');
      }
    };
    reader.onerror = () => {
      showError('ファイルの読み込み中にエラーが発生しました');
    };
    reader.readAsText(selectedFile);
  };
  
  return (
    <div className="file-input">
      <div className="flex items-center">
        <label className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors cursor-pointer">
          ファイルを選択
          <input
            type="file"
            className="hidden"
            accept=".html,.htm,.xhtml,.xml"
            onChange={handleFileChange}
            ref={fileInputRef}
          />
        </label>
        <span className="ml-3 text-gray-700 dark:text-gray-300">
          {fileName || 'ファイルが選択されていません'}
        </span>
      </div>
      
      <div className="mt-4">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleSubmit}
          disabled={!selectedFile}
        >
          テーブルを抽出
        </button>
      </div>
    </div>
  );
};

export default FileInput;
