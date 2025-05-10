import React, { useState, useEffect, useRef } from 'react';
import BasicTableView from './BasicTableView';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

const TableViewApp = () => {
  const [inputType, setInputType] = useState('paste');
  const [htmlContent, setHtmlContent] = useState('');
  const [url, setUrl] = useState('');
  const [proxyUrl, setProxyUrl] = useState('https://cors-anywhere.herokuapp.com/');
  const [useProxy, setUseProxy] = useState(false);
  const [file, setFile] = useState(null);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTableIndex, setActiveTableIndex] = useState(0);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [fileName, setFileName] = useState('テーブル抽出');
  const [processingStats, setProcessingStats] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  const fileInputRef = useRef(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [extractionOptions, setExtractionOptions] = useState({
    detectHeaders: true,
    trimWhitespace: true,
    ignoreEmptyRows: true,
    convertSpecialChars: true
  });

  // Clear success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Function to detect if a row contains header-like content
  const isLikelyHeader = (row, allRows) => {
    // If it's the first row, it's more likely to be a header
    if (allRows.indexOf(row) === 0) {
      // Check if any cell contains text that appears to be a header
      // Headers often have shorter text than data cells
      const headerIndicators = ['id', 'name', 'title', 'date', 'total', 'sum', 'average', 'price', 'amount', 'quantity'];
      const lowerCaseCells = row.map(cell => String(cell).toLowerCase());
      
      // If any cell contains common header words, more likely to be a header
      if (lowerCaseCells.some(cell => headerIndicators.some(indicator => cell.includes(indicator)))) {
        return true;
      }
      
      // If all cells have similar length and are short, likely to be a header
      const cellLengths = lowerCaseCells.map(cell => cell.length);
      const avgLength = cellLengths.reduce((sum, len) => sum + len, 0) / cellLengths.length;
      const allSimilarLength = cellLengths.every(len => Math.abs(len - avgLength) < 5);
      
      if (allSimilarLength && avgLength < 15) {
        return true;
      }
    }
    
    // Check if formatting suggests a header (all cells not numbers and different from next row)
    if (allRows.length > 1) {
      const nextRow = allRows[allRows.indexOf(row) + 1];
      if (nextRow) {
        // Headers are often not numbers
        const nonNumericCells = row.filter(cell => isNaN(Number(cell)));
        const allNonNumeric = nonNumericCells.length === row.length;
        
        // Check if this row's format differs from the next row
        let differentFormat = false;
        for (let i = 0; i < Math.min(row.length, nextRow.length); i++) {
          if (isNaN(Number(row[i])) !== isNaN(Number(nextRow[i]))) {
            differentFormat = true;
            break;
          }
        }
        
        if (allNonNumeric && differentFormat) {
          return true;
        }
      }
    }
    
    // Default to first row being header if detectHeaders is true
    return allRows.indexOf(row) === 0 && extractionOptions.detectHeaders;
  };

  // Function to extract tables from HTML with enhanced features
  const extractTables = (html) => {
    setLoading(true);
    setError('');
    setTables([]);
    setSuccessMessage('');
    setProcessingStats(null);
    setExtractionProgress(0);

    try {
      // Start timer to measure performance
      const startTime = performance.now();
      
      // Create a temporary DOM element to parse the HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const tableElements = doc.querySelectorAll('table');

      if (tableElements.length === 0) {
        setError('HTMLコンテンツにテーブルが見つかりませんでした。<table>要素が含まれているか確認してください。');
        setLoading(false);
        return;
      }

      const extractedTables = [];
      const totalTables = tableElements.length;

      // Process tables in batches for better performance and UX feedback
      const processBatch = (startIdx, batchSize) => {
        return new Promise(resolve => {
          setTimeout(() => {
            const endIdx = Math.min(startIdx + batchSize, totalTables);
            
            for (let tableIndex = startIdx; tableIndex < endIdx; tableIndex++) {
              const table = tableElements[tableIndex];
              // Get all rows
              const rows = table.querySelectorAll('tr');
              const extractedRows = [];
              let maxCols = 0;

              // Process each row
              Array.from(rows).forEach((row) => {
                const cells = row.querySelectorAll('td, th');
                const rowData = [];

                cells.forEach((cell) => {
                  // Get cell text content
                  let text = cell.textContent;
                  
                  // Apply cell text transformations based on options
                  if (extractionOptions.trimWhitespace) {
                    // Replace multiple whitespace with a single space
                    text = text.trim().replace(/\s+/g, ' ');
                  }
                  
                  if (extractionOptions.convertSpecialChars) {
                    // Convert special characters like Japanese financial notation
                    text = text.replace('△', '-');
                    // Handle HTML entities
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = text;
                    text = tempDiv.textContent;
                  }
                  
                  // Add the processed text
                  rowData.push(text);
                  
                  // Handle colspan and rowspan
                  const colspan = parseInt(cell.getAttribute('colspan')) || 1;
                  for (let i = 1; i < colspan; i++) {
                    rowData.push('');
                  }
                });

                if (!extractionOptions.ignoreEmptyRows || rowData.some(cell => cell.trim() !== '')) {
                  maxCols = Math.max(maxCols, rowData.length);
                  extractedRows.push(rowData);
                }
              });

              // Adjust rows to have equal number of columns
              const normalizedRows = extractedRows.map(row => {
                if (row.length < maxCols) {
                  return [...row, ...Array(maxCols - row.length).fill('')];
                }
                return row;
              });

              // Identify headers with improved detection
              let headerRowIndex = -1;
              let headers = [];
              
              if (normalizedRows.length > 0) {
                // Analyze rows to determine which is most likely to be a header
                for (let i = 0; i < Math.min(3, normalizedRows.length); i++) {
                  if (isLikelyHeader(normalizedRows[i], normalizedRows)) {
                    headerRowIndex = i;
                    break;
                  }
                }
                
                if (headerRowIndex >= 0) {
                  headers = normalizedRows[headerRowIndex];
                  // Remove the header row from data rows
                  normalizedRows.splice(headerRowIndex, 1);
                } else {
                  // Generate default headers if no header row found
                  headers = Array(maxCols).fill(0).map((_, i) => `列 ${i+1}`);
                }
              } else {
                headers = Array(maxCols).fill(0).map((_, i) => `列 ${i+1}`);
              }

              extractedTables.push({
                id: `table-${tableIndex}`,
                headers,
                rows: normalizedRows,
                originalTable: table.outerHTML,
                statistics: {
                  rowCount: normalizedRows.length,
                  columnCount: headers.length,
                  emptyCells: normalizedRows.reduce((count, row) => 
                    count + row.filter(cell => cell === '').length, 0
                  ),
                  totalCells: normalizedRows.length * headers.length
                }
              });
              
              // Update progress
              const progress = Math.round(((tableIndex + 1) / totalTables) * 100);
              setExtractionProgress(progress);
            }
            
            resolve();
          }, 0);
        });
      };

      // Process tables in batches of 5 to keep UI responsive
      const batchSize = 5;
      let processedCount = 0;
      
      const processNextBatch = async () => {
        if (processedCount < totalTables) {
          await processBatch(processedCount, batchSize);
          processedCount += batchSize;
          if (processedCount < totalTables) {
            processNextBatch();
          } else {
            finishExtraction();
          }
        } else {
          finishExtraction();
        }
      };
      
      const finishExtraction = () => {
        const endTime = performance.now();
        setTables(extractedTables);
        setProcessingStats({
          totalTables: extractedTables.length,
          totalRows: extractedTables.reduce((sum, table) => sum + table.rows.length, 0),
          totalColumns: extractedTables.reduce((sum, table) => sum + table.headers.length, 0),
          processingTime: ((endTime - startTime) / 1000).toFixed(2)
        });
        setSuccessMessage(`${extractedTables.length}個のテーブルを抽出しました！`);
        setLoading(false);
        setActiveTableIndex(0);
      };
      
      processNextBatch();

    } catch (err) {
      setError(`HTML解析エラー: ${err.message}`);
      setLoading(false);
    }
  };

  // Handle file upload with preview
  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      // Check file type and size
      const validTypes = ['text/html', 'application/xhtml+xml', 'text/xml'];
      const maxSize = 15 * 1024 * 1024; // 15MB
      
      if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(html|htm|xhtml|xml)$/i)) {
        setError('有効なHTML、XMLファイルを選択してください');
        setFile(null);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      
      if (selectedFile.size > maxSize) {
        setError(`ファイルサイズが上限の15MBを超えています。選択されたファイルは${(selectedFile.size / (1024 * 1024)).toFixed(2)}MBです`);
        setFile(null);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      
      setFile(selectedFile);
      setFileName(selectedFile.name.replace(/\.(html|htm|xhtml|xml)$/i, ''));
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target.result;
          setHtmlContent(content);
          // Preview: Count tables in the file
          const parser = new DOMParser();
          const doc = parser.parseFromString(content, 'text/html');
          const tableCount = doc.querySelectorAll('table').length;
          setSuccessMessage(`ファイルを読み込みました。${tableCount}個のテーブルが見つかりました。「テーブルを抽出」ボタンをクリックして処理を開始してください。`);
        } catch (err) {
          setError(`ファイル読み込みエラー: ${err.message}`);
        }
      };
      reader.onerror = () => {
        setError('ファイルの読み込みに失敗しました。もう一度お試しください。');
      };
      reader.readAsText(selectedFile);
    }
  };

  // Handle URL fetch with proxy option
  const fetchFromUrl = async () => {
    if (!url) {
      setError('URLを入力してください');
      return;
    }

    // Validate URL
    try {
      new URL(url); // Will throw if invalid
    } catch (e) {
      setError('有効なURLを入力してください（例：https://example.com）');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const fetchUrl = useProxy ? `${proxyUrl}${url}` : url;
      const response = await fetch(fetchUrl, {
        headers: useProxy ? { 'X-Requested-With': 'XMLHttpRequest' } : {}
      });
      
      if (!response.ok) {
        throw new Error(`HTTPエラー！ステータス: ${response.status}`);
      }
      
      const html = await response.text();
      setHtmlContent(html);
      
      // Set filename based on URL
      try {
        const urlObj = new URL(url);
        setFileName(urlObj.hostname.replace('www.', ''));
      } catch (e) {
        setFileName('テーブル抽出');
      }
      
      extractTables(html);
    } catch (err) {
      let errorMessage = `URL取得エラー: ${err.message}`;
      
      if (!useProxy && err.message.includes('CORS')) {
        errorMessage += ' CORSエラーが検出されました。CORSプロキシオプションを有効にしてみてください。';
      } else if (useProxy) {
        errorMessage += ' プロキシ使用中にエラーが発生しました。プロキシサーバーが容量制限に達しているか、URLがブロックされている可能性があります。';
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  // Process the input based on the selected method
  const processInput = () => {
    setActiveTableIndex(0);
    
    if (inputType === 'paste') {
      if (!htmlContent) {
        setError('HTMLコンテンツを貼り付けてください');
        return;
      }
      extractTables(htmlContent);
    } else if (inputType === 'file') {
      if (!file) {
        setError('ファイルを選択してください');
        return;
      }
      // File content is already loaded into htmlContent
      extractTables(htmlContent);
    } else if (inputType === 'url') {
      fetchFromUrl();
    }
  };

  return (
    <div className={`bg-gray-50 min-h-screen p-4 md:p-6 ${isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-800'}`}>
      <div className={`max-w-7xl mx-auto ${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md overflow-hidden transition-colors duration-200`}>
        
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white relative">
          <h1 className="text-3xl font-bold">HTMLテーブル表示ツール</h1>
          <p className="mt-2 text-blue-100">HTMLコンテンツからテーブルを抽出して表示</p>
          
          <div className="absolute top-6 right-6 flex items-center gap-3">
            <button
              className="text-white p-2 rounded-full hover:bg-blue-500 transition-colors" 
              onClick={() => setIsDarkMode(!isDarkMode)}
              aria-label={isDarkMode ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
            >
              {isDarkMode ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
                </svg>
              )}
            </button>
            
            <button
              className="text-white p-2 rounded-full hover:bg-blue-500 transition-colors"
              onClick={() => {
                alert('HTML表示ツールの使い方:\n\n1. HTMLを入力: 貼り付け、ファイルアップロード、またはURLから\n2. 「テーブルを抽出」ボタンをクリック\n3. 抽出されたテーブルの表示、編集、エクスポートができます');
              }}
              aria-label="ヘルプ"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </button>
          </div>
        </div>
        
        {/* Main Content Area */}
        <div className={`p-6 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'} transition-colors duration-200`}>
          
          {/* Input Selection */}
          <div className="mb-8">
            <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-800'} mb-4 transition-colors duration-200`}>入力ソース</h2>
            
            <div className="flex flex-wrap gap-2 mb-6">
              <button
                className={`px-4 py-2 rounded-md transition-colors ${inputType === 'paste' ? 'bg-blue-600 text-white' : isDarkMode ? 'bg-gray-600 text-gray-200' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
                onClick={() => setInputType('paste')}
                aria-pressed={inputType === 'paste'}
              >
                HTMLを貼り付け
              </button>
              <button
                className={`px-4 py-2 rounded-md transition-colors ${inputType === 'file' ? 'bg-blue-600 text-white' : isDarkMode ? 'bg-gray-600 text-gray-200' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
                onClick={() => setInputType('file')}
                aria-pressed={inputType === 'file'}
              >
                ファイルをアップロード
              </button>
              <button
                className={`px-4 py-2 rounded-md transition-colors ${inputType === 'url' ? 'bg-blue-600 text-white' : isDarkMode ? 'bg-gray-600 text-gray-200' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
                onClick={() => setInputType('url')}
                aria-pressed={inputType === 'url'}
              >
                URLから取得
              </button>
            </div>

            {/* Paste HTML Input */}
            {inputType === 'paste' && (
              <div className="animate-fadeIn">
                <label htmlFor="html-content" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  テーブルを含むHTMLコンテンツを貼り付けてください:
                </label>
                <textarea
                  id="html-content"
                  className={`w-full h-64 p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-white border-gray-300 text-gray-800'
                  }`}
                  placeholder="ここにHTMLコンテンツを貼り付け... (例: <table><tr><td>データ</td></tr></table>)"
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  aria-describedby="paste-hint"
                />
                <p id="paste-hint" className={`mt-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  &lt;table&gt;要素を含むHTMLを貼り付けてください。ウェブサイトからコピーするか、ソースを表示して取得できます。
                </p>
              </div>
            )}

            {/* File Upload Input */}
            {inputType === 'file' && (
              <div className="animate-fadeIn">
                <div className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 transition-colors ${
                  isDarkMode ? 'border-gray-600 hover:border-blue-500 bg-gray-700' : 'border-gray-300 hover:border-blue-400 bg-gray-50'
                }`}>
                  <svg className={`w-12 h-12 mb-3 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h10a2 2 0 012 2v14a2 2 0 01-2 2z"></path>
                  </svg>
                  <p className={`mb-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <span className="font-semibold">クリックしてアップロード</span>またはドラッグ＆ドロップ
                  </p>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>HTML、HTM、またはXHTMLファイル（最大15MB）</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".html,.htm,.xhtml,.xml"
                    onChange={handleFileChange}
                    className="absolute w-full h-full opacity-0 cursor-pointer"
                    aria-describedby="file-hint"
                  />
                </div>
                {file && (
                  <div className={`mt-3 flex items-center justify-between p-3 rounded-md ${
                    isDarkMode ? 'bg-blue-900' : 'bg-blue-50'
                  }`}>
                    <div className="flex items-center">
                      <svg className={`w-6 h-6 mr-2 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                      <span className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <button
                      className={`text-sm ${isDarkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-800'}`}
                      onClick={() => {
                        setFile(null);
                        setHtmlContent('');
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                    >
                      削除
                    </button>
                  </div>
                )}
                <p id="file-hint" className={`mt-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  テーブルを抽出するHTMLファイルを選択してください。
                </p>
              </div>
            )}

            {/* URL Input */}
            {inputType === 'url' && (
              <div className="animate-fadeIn">
                <label htmlFor="url-input" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  HTMLテーブルを含むURLを入力してください:
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-grow">
                    <input
                      id="url-input"
                      type="text"
                      className={`w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-white border-gray-300 text-gray-800'
                      }`}
                      placeholder="https://example.com/テーブルを含むページ"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      aria-describedby="url-hint"
                    />
                  </div>
                </div>
                <div className="mt-2 flex items-center">
                  <input
                    id="use-proxy"
                    type="checkbox"
                    className={`h-4 w-4 rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-blue-500' : 'text-blue-600 border-gray-300'}`}
                    checked={useProxy}
                    onChange={(e) => setUseProxy(e.target.checked)}
                  />
                  <label htmlFor="use-proxy" className={`ml-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    CORSプロキシを使用する（クロスオリジン問題の解決に）
                  </label>
                </div>
                {useProxy && (
                  <div className="mt-2">
                    <label htmlFor="proxy-url" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      プロキシURL:
                    </label>
                    <input
                      id="proxy-url"
                      type="text"
                      className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-white border-gray-300 text-gray-800'
                      }`}
                      placeholder="https://cors-proxy.example.com/"
                      value={proxyUrl}
                      onChange={(e) => setProxyUrl(e.target.value)}
                    />
                    <p className={`mt-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      デフォルトはcors-anywhere.herokuapp.comですが、別のプロキシが必要な場合があります。プロキシURLはスラッシュで終わる必要があります。
                    </p>
                  </div>
                )}
                <p id="url-hint" className={`mt-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  注意：CORS制限により直接URLからの取得ができない場合があります。エラーが発生した場合はプロキシオプションを有効にしてください。
                </p>
              </div>
            )}
            
            {/* Advanced Options Toggle */}
            <div className="mt-4">
              <button
                type="button"
                className={`text-sm focus:outline-none flex items-center ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                aria-expanded={showAdvancedOptions}
              >
                <svg className={`w-4 h-4 mr-1 transform ${showAdvancedOptions ? 'rotate-90' : ''} transition-transform`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                </svg>
                詳細オプション
              </button>
            </div>
            
            {/* Advanced Options Panel */}
            {showAdvancedOptions && (
              <div className={`mt-3 p-4 rounded-md animate-fadeIn ${
                isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
              }`}>
                <h3 className={`text-md font-medium mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>抽出オプション</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center">
                    <input
                      id="detect-headers"
                      type="checkbox"
                      className={`h-4 w-4 rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-blue-500' : 'text-blue-600 border-gray-300'}`}
                      checked={extractionOptions.detectHeaders}
                      onChange={(e) => setExtractionOptions({...extractionOptions, detectHeaders: e.target.checked})}
                    />
                    <label htmlFor="detect-headers" className={`ml-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      テーブルヘッダーを自動検出
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="trim-whitespace"
                      type="checkbox"
                      className={`h-4 w-4 rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-blue-500' : 'text-blue-600 border-gray-300'}`}
                      checked={extractionOptions.trimWhitespace}
                      onChange={(e) => setExtractionOptions({...extractionOptions, trimWhitespace: e.target.checked})}
                    />
                    <label htmlFor="trim-whitespace" className={`ml-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      空白を削除
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="ignore-empty-rows"
                      type="checkbox"
                      className={`h-4 w-4 rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-blue-500' : 'text-blue-600 border-gray-300'}`}
                      checked={extractionOptions.ignoreEmptyRows}
                      onChange={(e) => setExtractionOptions({...extractionOptions, ignoreEmptyRows: e.target.checked})}
                    />
                    <label htmlFor="ignore-empty-rows" className={`ml-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      空の行を無視
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="convert-special-chars"
                      type="checkbox"
                      className={`h-4 w-4 rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-blue-500' : 'text-blue-600 border-gray-300'}`}
                      checked={extractionOptions.convertSpecialChars}
                      onChange={(e) => setExtractionOptions({...extractionOptions, convertSpecialChars: e.target.checked})}
                    />
                    <label htmlFor="convert-special-chars" className={`ml-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      特殊文字を変換
                    </label>
                  </div>
                </div>
                
                <div className="mt-3">
                  <label htmlFor="filename-prefix" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    エクスポートファイル名のプレフィックス:
                  </label>
                  <input
                    id="filename-prefix"
                    type="text"
                    className={`w-full sm:w-64 p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-white border-gray-300 text-gray-800'
                    }`}
                    placeholder="テーブル抽出"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-start">
              <button
                className={`px-6 py-3 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center shadow-lg transform hover:scale-105 transition-transform ${
                  isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
                onClick={processInput}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="inline-block animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                    抽出中 ({extractionProgress}%)
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                    </svg>
                    テーブルを抽出
                  </>
                )}
              </button>
            </div>
          </div>
          
          {/* Feedback Messages */}
          {error && (
            <div className={`mb-6 p-4 border-l-4 rounded-md animate-fadeIn ${
              isDarkMode ? 'bg-red-900 border-red-700 text-red-200' : 'bg-red-50 border-red-500 text-red-700'
            }`} role="alert">
              <div className="flex">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span>{error.includes('No tables found') ? 'テーブルが見つかりませんでした。HTMLコンテンツに<table>要素が含まれているか確認してください。' : error}</span>
              </div>
            </div>
          )}
          
          {successMessage && (
            <div className={`mb-6 p-4 border-l-4 rounded-md animate-fadeIn ${
              isDarkMode ? 'bg-green-900 border-green-700 text-green-200' : 'bg-green-50 border-green-500 text-green-700'
            }`} role="alert">
              <div className="flex">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span>{successMessage}</span>
              </div>
            </div>
          )}
          
          {/* Processing Stats */}
          {processingStats && (
            <div className={`mb-6 p-4 rounded-md animate-fadeIn ${
              isDarkMode ? 'bg-blue-900' : 'bg-blue-50'
            }`}>
              <h3 className={`text-md font-medium mb-2 ${isDarkMode ? 'text-blue-100' : 'text-gray-700'}`}>処理サマリー</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div className={`p-3 rounded-md shadow-sm ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <div className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>テーブル数</div>
                  <div className={`text-2xl font-semibold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{processingStats.totalTables}</div>
                </div>
                <div className={`p-3 rounded-md shadow-sm ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <div className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>行数合計</div>
                  <div className={`text-2xl font-semibold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{processingStats.totalRows}</div>
                </div>
                <div className={`p-3 rounded-md shadow-sm ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <div className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>列数合計</div>
                  <div className={`text-2xl font-semibold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{processingStats.totalColumns}</div>
                </div>
                <div className={`p-3 rounded-md shadow-sm ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <div className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>処理時間</div>
                  <div className={`text-2xl font-semibold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{processingStats.processingTime}秒</div>
                </div>
              </div>
            </div>
          )}

          {/* Results Section */}
          {tables.length > 0 && (
            <div className="mt-8 animate-fadeIn">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-800'} transition-colors duration-200`}>
                  抽出されたテーブル ({tables.length})
                </h2>
              </div>

              {/* Table Navigation */}
              {tables.length > 1 && (
                <div className="mb-6 overflow-x-auto">
                  <div className="flex flex-nowrap gap-2 pb-2">
                    {tables.map((table, index) => (
                      <button
                        key={table.id}
                        className={`px-3 py-2 rounded-md whitespace-nowrap transition-colors ${
                          activeTableIndex === index 
                            ? 'bg-blue-600 text-white' 
                            : isDarkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                        }`}
                        onClick={() => setActiveTableIndex(index)}
                        aria-pressed={activeTableIndex === index}
                        aria-label={`テーブル ${index + 1} （${table.headers.length}列、${table.rows.length}行）`}
                      >
                        テーブル {index + 1}
                        <span className="ml-1 text-xs opacity-80">
                          ({table.rows.length} 行)
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Table */}
              {tables[activeTableIndex] && (
                <BasicTableView 
                  data={tables[activeTableIndex]} 
                  isDarkMode={isDarkMode} 
                />
              )}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className={`p-4 text-center text-sm border-t ${isDarkMode ? 'bg-gray-800 text-gray-400 border-gray-700' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
          HTMLテーブル表示ツール • HTMLからテーブルを簡単に抽出
          <div className="mt-1 text-xs">◆ ダークモードは右上のアイコンから切り替え可能です</div>
        </div>
      </div>
      
      {/* CSS for animation */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default TableViewApp;