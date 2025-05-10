// アプリのコンポーネント構成：
// UnifiedHTMLTableExtractor.js - メインコンポーネント（HTMLTableExtractor, XBRLTableExtractor, ImprovedXBRLTableExtractorを統合）
// TableRenderer.js - テーブルレンダリングコンポーネント（BasicTableViewを置き換え）
// XBRLHierarchicalView.js - 階層的なXBRLデータビュー
// XBRLFormatter.js - XBRLデータ変換ユーティリティ

// UnifiedHTMLTableExtractor.js - 統合されたメインコンポーネント
import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import _ from 'lodash';
import TableRenderer from './TableRenderer';
import XBRLHierarchicalView from './XBRLHierarchicalView';
import { convertXBRLData } from './XBRLFormatter';

const UnifiedHTMLTableExtractor = ({ isDarkMode = false }) => {
  // 状態管理
  const [inputType, setInputType] = useState('paste');
  const [htmlContent, setHtmlContent] = useState('');
  const [url, setUrl] = useState('');
  const [proxyUrl, setProxyUrl] = useState('https://cors-anywhere.herokuapp.com/');
  const [useProxy, setUseProxy] = useState(false);
  const [file, setFile] = useState(null);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTableIndex, setActiveTableIndex] = useState(0);
  const [extractionOptions, setExtractionOptions] = useState({
    detectHeaders: true,
    trimWhitespace: true,
    ignoreEmptyRows: true,
    convertSpecialChars: true,
    extractXbrlTags: true,
    intelligentProcessing: true
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [searchXbrlTag, setSearchXbrlTag] = useState('');
  const [sortConfig, setSortConfig] = useState({ column: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [processingStats, setProcessingStats] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const fileInputRef = useRef(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [fileName, setFileName] = useState('テーブル抽出');
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [showManipulationTools, setShowManipulationTools] = useState(false);
  const [showXbrlTags, setShowXbrlTags] = useState(true);
  const [tableView, setTableView] = useState('grid'); // 'grid' or 'compact'
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [processedData, setProcessedData] = useState(null);
  const [showInputHelp, setShowInputHelp] = useState(false);
  const [showExtractionHelp, setShowExtractionHelp] = useState(false);
  const [displayMode, setDisplayMode] = useState('standard'); // 'standard', 'xbrl', 'improved_xbrl'
  const [processingTips, setProcessingTips] = useState([
    'XBRLタグを抽出しています...',
    '財務データを階層構造に変換しています...',
    '前期と当期のデータを比較しています...',
    'データの可視化準備をしています...'
  ]);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  // ページが変わったらリセット
  useEffect(() => {
    setCurrentPage(1);
    setSearchTerm('');
    setSortConfig({ column: null, direction: 'asc' });
  }, [activeTableIndex]);

  // 成功メッセージを5秒後に消去
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // 処理中のヒントを回転表示
  useEffect(() => {
    if (loading) {
      const timer = setInterval(() => {
        setCurrentTipIndex((prevIndex) => (prevIndex + 1) % processingTips.length);
      }, 3000);
      return () => clearInterval(timer);
    }
  }, [loading, processingTips.length]);

  // 抽出リセット
  const resetExtractionState = () => {
    setTables([]);
    setProcessedData(null);
    setError('');
    setSuccessMessage('');
    setActiveTableIndex(0);
    setExtractionProgress(0);
    setCurrentTipIndex(0);
    setShowManipulationTools(false);
  };

  // ヘッダー検出ロジック
  const isLikelyHeader = (row, allRows) => {
    // ヘッダー検出ロジックは既存と同じ
    // 例: 最初の行、特定の単語を含む、短いテキスト長など
    if (allRows.indexOf(row) === 0) {
      const headerIndicators = ['id', 'name', 'title', 'date', 'total', 'sum', 'average', 'price', 'amount', 'quantity'];
      // valueプロパティがある場合（XBRLモード）とない場合（標準モード）の両方に対応
      const lowerCaseCells = row.map(cell => {
        const textValue = typeof cell === 'object' && cell.value !== undefined ? cell.value : cell;
        return String(textValue).toLowerCase();
      });
      
      if (lowerCaseCells.some(cell => headerIndicators.some(indicator => cell.includes(indicator)))) {
        return true;
      }
      
      const cellLengths = lowerCaseCells.map(cell => cell.length);
      const avgLength = cellLengths.reduce((sum, len) => sum + len, 0) / cellLengths.length;
      const allSimilarLength = cellLengths.every(len => Math.abs(len - avgLength) < 5);
      
      if (allSimilarLength && avgLength < 15) {
        return true;
      }
    }
    
    // 次の行との比較（数値と非数値の分布）
    if (allRows.length > 1) {
      const nextRow = allRows[allRows.indexOf(row) + 1];
      if (nextRow) {
        // 値を取得するための関数（オブジェクトまたは単純な値に対応）
        const getValue = cell => typeof cell === 'object' && cell.value !== undefined ? cell.value : cell;
        
        const nonNumericCells = row.filter(cell => isNaN(Number(getValue(cell))));
        const allNonNumeric = nonNumericCells.length === row.length;
        
        let differentFormat = false;
        for (let i = 0; i < Math.min(row.length, nextRow.length); i++) {
          if (isNaN(Number(getValue(row[i]))) !== isNaN(Number(getValue(nextRow[i])))) {
            differentFormat = true;
            break;
          }
        }
        
        if (allNonNumeric && differentFormat) {
          return true;
        }
      }
    }
    
    // デフォルトは最初の行
    return allRows.indexOf(row) === 0 && extractionOptions.detectHeaders;
  };

  // HTMLからテーブルを抽出する統合関数
  const extractTables = (html) => {
    setLoading(true);
    resetExtractionState();

    try {
      // パフォーマンス測定開始
      const startTime = performance.now();
      
      // HTML解析
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

      // テーブル処理バッチ化
      const processBatch = (startIdx, batchSize) => {
        return new Promise(resolve => {
          setTimeout(() => {
            const endIdx = Math.min(startIdx + batchSize, totalTables);
            
            for (let tableIndex = startIdx; tableIndex < endIdx; tableIndex++) {
              const table = tableElements[tableIndex];
              const rows = table.querySelectorAll('tr');
              const extractedRows = [];
              let maxCols = 0;

              // 各行の処理
              Array.from(rows).forEach((row) => {
                const cells = row.querySelectorAll('td, th');
                const rowData = [];

                cells.forEach((cell) => {
                  // セルテキスト取得
                  let text = cell.textContent;
                  
                  // オプションに基づく変換処理
                  if (extractionOptions.trimWhitespace) {
                    text = text.trim().replace(/\s+/g, ' ');
                  }
                  
                  if (extractionOptions.convertSpecialChars) {
                    // 財務表示用特殊文字変換
                    text = text.replace(/△/g, '-');
                    text = text.replace(/▲/g, '-');
                    text = text.replace(/－/g, '-');
                    text = text.replace(/　/g, ' ');
                    
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = text;
                    text = tempDiv.textContent;
                  }
                  
                  // XBRLタグ抽出
                  let xbrlTag = null;
                  let xbrlInfo = null;
                  
                  if (extractionOptions.extractXbrlTags) {
                    // 詳細なXBRL情報を抽出
                    try {
                      // ix:nonfractionタグ（財務数値）を検索
                      const nonfractionElements = cell.querySelectorAll('ix\\:nonfraction, [*|nonfraction]');
                      if (nonfractionElements.length > 0) {
                        const element = nonfractionElements[0];
                        xbrlTag = element.getAttribute('name');
                        xbrlInfo = {
                          type: 'nonfraction',
                          name: element.getAttribute('name'),
                          value: element.textContent,
                          context: element.getAttribute('contextref'),
                          unit: element.getAttribute('unitref'),
                          decimals: element.getAttribute('decimals'),
                          scale: element.getAttribute('scale'),
                          format: element.getAttribute('format')
                        };
                      }
                      
                      // ix:nonnumericタグ（テキスト値）を検索
                      if (!xbrlTag) {
                        const nonnumericElements = cell.querySelectorAll('ix\\:nonnumeric, [*|nonnumeric]');
                        if (nonnumericElements.length > 0) {
                          const element = nonnumericElements[0];
                          xbrlTag = element.getAttribute('name');
                          xbrlInfo = {
                            type: 'nonnumeric',
                            name: element.getAttribute('name'),
                            value: element.textContent,
                            context: element.getAttribute('contextref'),
                            escape: element.getAttribute('escape')
                          };
                        }
                      }
                    } catch (e) {
                      console.log('XBRLタグ検索エラー:', e);
                    }
                    
                    // 追加のXBRLタグ検索方法（フォールバック）
                    if (!xbrlTag) {
                      // 日本のXBRLタグを検索
                      const xbrlElements = cell.querySelectorAll('[name^="jppfs_cor:"], [name^="jpcrp"], [name^="jpdei_cor:"]');
                      if (xbrlElements && xbrlElements.length > 0) {
                        xbrlTag = xbrlElements[0].getAttribute('name');
                      }
                      
                      // 全要素検索のフォールバック
                      if (!xbrlTag) {
                        const allElements = cell.querySelectorAll('*');
                        for (let i = 0; i < allElements.length; i++) {
                          const el = allElements[i];
                          const name = el.getAttribute('name');
                          if (name && (name.includes(':') || name.startsWith('jp'))) {
                            xbrlTag = name;
                            break;
                          }
                        }
                      }
                    }
                  }
                  
                  // colspan属性を処理
                  const colspan = parseInt(cell.getAttribute('colspan')) || 1;
                  for (let i = 0; i < colspan; i++) {
                    // 表示モードに応じたセルデータ形式
                    if (displayMode === 'standard') {
                      // 標準モード - シンプルな文字列値
                      rowData.push(i === 0 ? text : '');
                    } else {
                      // XBRLモード - オブジェクト形式
                      rowData.push({
                        value: i === 0 ? text : '',
                        xbrlTag: i === 0 ? xbrlTag : null,
                        xbrlInfo: i === 0 ? xbrlInfo : null
                      });
                    }
                  }
                });

                // 空行処理
                if (!extractionOptions.ignoreEmptyRows || rowData.some(cell => {
                  const value = typeof cell === 'object' && cell.value !== undefined ? cell.value : cell;
                  return value.trim() !== '';
                })) {
                  maxCols = Math.max(maxCols, rowData.length);
                  extractedRows.push(rowData);
                }
              });

              // 列数を揃える
              const normalizedRows = extractedRows.map(row => {
                if (row.length < maxCols) {
                  // 表示モードに応じた空セル
                  const emptyCells = Array(maxCols - row.length).fill(
                    displayMode === 'standard' ? '' : { value: '', xbrlTag: null, xbrlInfo: null }
                  );
                  return [...row, ...emptyCells];
                }
                return row;
              });

              // ヘッダー検出
              let headerRowIndex = -1;
              let headers = [];
              
              if (normalizedRows.length > 0) {
                // ヘッダー行の検出
                for (let i = 0; i < Math.min(3, normalizedRows.length); i++) {
                  if (isLikelyHeader(normalizedRows[i], normalizedRows)) {
                    headerRowIndex = i;
                    break;
                  }
                }
                
                if (headerRowIndex >= 0) {
                  headers = normalizedRows[headerRowIndex];
                  // データ行からヘッダー行を削除
                  normalizedRows.splice(headerRowIndex, 1);
                } else {
                  // デフォルトヘッダー生成
                  if (displayMode === 'standard') {
                    headers = Array(maxCols).fill(0).map((_, i) => `列 ${i+1}`);
                  } else {
                    headers = Array(maxCols).fill(0).map((_, i) => ({value: `列 ${i+1}`, xbrlTag: null, xbrlInfo: null}));
                  }
                }
              } else {
                // データがない場合の空ヘッダー
                if (displayMode === 'standard') {
                  headers = Array(maxCols).fill(0).map((_, i) => `列 ${i+1}`);
                } else {
                  headers = Array(maxCols).fill(0).map((_, i) => ({value: `列 ${i+1}`, xbrlTag: null, xbrlInfo: null}));
                }
              }

              // XBRLタグ統計用のコレクション
              const xbrlTags = new Set();
              if (displayMode !== 'standard') {
                headers.forEach(cell => {
                  if (cell.xbrlTag) xbrlTags.add(cell.xbrlTag);
                });
                normalizedRows.forEach(row => {
                  row.forEach(cell => {
                    if (cell.xbrlTag) xbrlTags.add(cell.xbrlTag);
                  });
                });
              }

              // テーブルの種類を推測
              let tableType = 'unknown';
              let tableTitle = '';
              
              // テーブル前の見出しを検索
              const previousElement = table.previousElementSibling;
              if (previousElement && (previousElement.tagName === 'H1' || previousElement.tagName === 'H2' || 
                  previousElement.tagName === 'H3' || previousElement.tagName === 'H4')) {
                tableTitle = previousElement.textContent.trim();
              }

              // XBRLタグからテーブル種類を推測
              if (displayMode !== 'standard' && xbrlTags.size > 0) {
                const tagArray = Array.from(xbrlTags);
                if (tagArray.some(tag => tag.includes('BalanceSheet') || tag.includes('BS'))) {
                  tableType = 'balance_sheet';
                  if (!tableTitle) tableTitle = '貸借対照表';
                } else if (tagArray.some(tag => tag.includes('ProfitAndLoss') || tag.includes('PL'))) {
                  tableType = 'income_statement';
                  if (!tableTitle) tableTitle = '損益計算書';
                } else if (tagArray.some(tag => tag.includes('CashFlow') || tag.includes('CF'))) {
                  tableType = 'cash_flow';
                  if (!tableTitle) tableTitle = 'キャッシュ・フロー計算書';
                }
              }

              // テーブル情報の追加
              extractedTables.push({
                id: `table-${tableIndex}`,
                headers,
                rows: normalizedRows,
                originalTable: table.outerHTML,
                tableType,
                tableTitle,
                statistics: {
                  rowCount: normalizedRows.length,
                  columnCount: headers.length,
                  emptyCells: normalizedRows.reduce((count, row) => {
                    return count + row.filter(cell => {
                      const value = typeof cell === 'object' && cell.value !== undefined ? cell.value : cell;
                      return value === '';
                    }).length;
                  }, 0),
                  totalCells: normalizedRows.length * headers.length,
                  xbrlTagCount: xbrlTags.size,
                  xbrlTags: Array.from(xbrlTags)
                }
              });
              
              // 進捗状況更新
              const progress = Math.round(((tableIndex + 1) / totalTables) * 100);
              setExtractionProgress(progress);
            }
            
            resolve();
          }, 0);
        });
      };

      // バッチ処理の実行
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
        // 全XBRLタグの集計
        const allXbrlTags = new Set();
        if (displayMode !== 'standard') {
          extractedTables.forEach(table => {
            if (table.statistics.xbrlTags) {
              table.statistics.xbrlTags.forEach(tag => allXbrlTags.add(tag));
            }
          });
        }
        
        setTables(extractedTables);
        setProcessingStats({
          totalTables: extractedTables.length,
          totalRows: extractedTables.reduce((sum, table) => sum + table.rows.length, 0),
          totalColumns: extractedTables.reduce((sum, table) => sum + table.headers.length, 0),
          totalXbrlTags: allXbrlTags.size,
          processingTime: ((endTime - startTime) / 1000).toFixed(2)
        });
        
        // XBRLタグのメッセージ
        const xbrlMessage = allXbrlTags.size > 0 
          ? `（${allXbrlTags.size}個のXBRLタグを検出）` 
          : displayMode !== 'standard' ? '（XBRLタグは検出されませんでした）' : '';
        
        setSuccessMessage(`${extractedTables.length}個のテーブルを抽出しました！${xbrlMessage}`);
        
        // 改善されたXBRL表示が有効で、XBRLタグが存在する場合の処理
        if (displayMode === 'improved_xbrl' && extractedTables.length > 0) {
          // 最も関連性の高いテーブルを選択
          let selectedTableIndex = 0;
          
          if (extractionOptions.intelligentProcessing) {
            // 財務関連のXBRLタグを多く含むテーブルを優先
            let maxFinancialTags = 0;
            
            extractedTables.forEach((table, index) => {
              if (!table.statistics.xbrlTags) return;
              
              const financialTagCount = table.statistics.xbrlTags.filter(tag => 
                tag.includes('jppfs') || 
                tag.includes('jpcrp') || 
                tag.includes('Asset') || 
                tag.includes('Liability') || 
                tag.includes('Equity') || 
                tag.includes('Revenue') || 
                tag.includes('Expense')
              ).length;
              
              if (financialTagCount > maxFinancialTags) {
                maxFinancialTags = financialTagCount;
                selectedTableIndex = index;
              }
            });
          }
          
          // 選択されたテーブルを処理
          if (extractedTables[selectedTableIndex] && extractedTables[selectedTableIndex].statistics.xbrlTagCount > 0) {
            try {
              // JSON形式に変換
              const jsonData = extractedTables[selectedTableIndex].rows.map(row => {
                const obj = {};
                extractedTables[selectedTableIndex].headers.forEach((header, index) => {
                  const cell = row[index] || {value: '', xbrlTag: null};
                  const headerName = header.value || `列 ${index + 1}`;
                  
                  // 値を格納
                  obj[headerName] = cell.value || '';
                  
                  // XBRLタグを格納
                  obj[`${headerName}_XBRL`] = cell.xbrlTag || '';
                });
                return obj;
              });
              
              // 改善されたフォーマットに変換
              const convertResult = convertXBRLData(jsonData);
              if (convertResult.success) {
                // テーブルタイプを設定
                if (extractedTables[selectedTableIndex].tableType !== 'unknown') {
                  convertResult.hierarchical.metadata.reportType = extractedTables[selectedTableIndex].tableTitle || 
                    (extractedTables[selectedTableIndex].tableType === 'balance_sheet' ? '貸借対照表' :
                     extractedTables[selectedTableIndex].tableType === 'income_statement' ? '損益計算書' :
                     extractedTables[selectedTableIndex].tableType === 'cash_flow' ? 'キャッシュ・フロー計算書' :
                     '財務諸表');
                }
                
                setProcessedData(convertResult);
              }
            } catch (conversionError) {
              console.error('データ変換エラー:', conversionError);
              // 変換エラーがあっても処理は続行（元のテーブル表示を使用）
            }
          }
        }
        
        setLoading(false);
        setShowManipulationTools(true);
      };
      
      // 処理開始
      processNextBatch();

    } catch (err) {
      console.error('HTML解析エラー:', err);
      setError(`HTML解析エラー: ${err.message}`);
      setLoading(false);
    }
  };

  // ファイルアップロード処理
  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      // ファイルタイプとサイズをチェック
      const validTypes = ['text/html', 'application/xhtml+xml', 'text/xml'];
      const maxSize = 15 * 1024 * 1024; // 15MB
      
      if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(html|htm|xhtml|xml)$/i)) {
        setError('有効なHTML、XMLファイルを選択してください');
        setFile(null);
        // ファイル入力をリセット
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      
      if (selectedFile.size > maxSize) {
        setError(`ファイルサイズが上限の15MBを超えています。選択されたファイルは${(selectedFile.size / (1024 * 1024)).toFixed(2)}MBです`);
        setFile(null);
        // ファイル入力をリセット
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
          // プレビュー: ファイル内のテーブル数をカウント
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

  // URLからHTMLを取得
  const fetchFromUrl = async () => {
    if (!url) {
      setError('URLを入力してください');
      return;
    }

    // URLを検証
    try {
      new URL(url); // 無効な場合は例外をスロー
    } catch (e) {
      setError('有効なURLを入力してください（例：https://example.com）');
      return;
    }

    setLoading(true);
    resetExtractionState();

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
      
      // URLからファイル名を設定
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

  // 入力モードに基づいた処理
  const processInput = () => {
    resetExtractionState();
    
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
      // ファイルコンテンツは既にhtmlContentに読み込まれている
      extractTables(htmlContent);
    } else if (inputType === 'url') {
      fetchFromUrl();
    }
  };

  // データのエクスポート - CSV
  const exportToCSV = (table, index) => {
    if (!table) return;
    
    // 表示モードに応じたCSV変換
    let headers, rows;
    
    if (displayMode === 'standard') {
      // 標準モード
      headers = table.headers;
      rows = table.rows;
    } else {
      // XBRLモード
      if (showXbrlTags) {
        // XBRLタグを別列で表示
        headers = [];
        table.headers.forEach(header => {
          headers.push(header.value || ''); // オリジナルヘッダー
          headers.push(`${header.value || ''}_XBRL`); // XBRLタグ列
        });
        
        rows = table.rows.map(row => {
          const newRow = [];
          row.forEach(cell => {
            newRow.push(cell.value || ''); // オリジナル値
            newRow.push(cell.xbrlTag || ''); // XBRLタグ
          });
          return newRow;
        });
      } else {
        // XBRLタグなし
        headers = table.headers.map(header => header.value || '');
        rows = table.rows.map(row => row.map(cell => cell.value || ''));
      }
    }
    
    const csv = Papa.unparse([headers, ...rows], {
      quotes: true,
      quoteChar: '"',
      escapeChar: '"',
      delimiter: ",",
      header: false,
      skipEmptyLines: true
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${fileName}-テーブル${index}.csv`);
    setSuccessMessage(`テーブルをCSV形式でダウンロードしました！`);
  };

  // データのエクスポート - Excel
  const exportToExcel = (table, index) => {
    if (!table) return;
    
    // 表示モードに応じたExcelブック作成
    let headers, rows;
    
    if (displayMode === 'standard') {
      // 標準モード
      headers = table.headers;
      rows = table.rows;
    } else {
      // XBRLモード
      if (showXbrlTags) {
        // XBRLタグを別列で表示
        headers = [];
        table.headers.forEach(header => {
          headers.push(header.value || ''); // オリジナルヘッダー
          headers.push(`${header.value || ''}_XBRL`); // XBRLタグ列
        });
        
        rows = table.rows.map(row => {
          const newRow = [];
          row.forEach(cell => {
            newRow.push(cell.value || ''); // オリジナル値
            newRow.push(cell.xbrlTag || ''); // XBRLタグ
          });
          return newRow;
        });
      } else {
        // XBRLタグなし
        headers = table.headers.map(header => header.value || '');
        rows = table.rows.map(row => row.map(cell => cell.value || ''));
      }
    }
    
    // Excelシート作成
    const data = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    
    // XBRLタグ情報シートの追加
    if (displayMode !== 'standard' && showXbrlTags && table.statistics.xbrlTagCount > 0) {
      const tagCounts = getXbrlTagCounts(table);
      const xbrlTagData = [
        ['XBRL Tag', 'Count']
      ];
      
      tagCounts.forEach(item => {
        xbrlTagData.push([item.tag, item.count]);
      });
      
      const xbrlWs = XLSX.utils.aoa_to_sheet(xbrlTagData);
      XLSX.utils.book_append_sheet(wb, xbrlWs, "XBRLタグ情報");
    }
    
    // ファイル保存
    XLSX.writeFile(wb, `${fileName}-テーブル${index}.xlsx`);
    setSuccessMessage('テーブルをExcel形式でダウンロードしました！');
  };

  // XBRLタグカウント関数
  const getXbrlTagCounts = (table) => {
    if (!table || displayMode === 'standard') return [];
    
    const tagCounts = {};
    
    // ヘッダーのタグをカウント
    table.headers.forEach(header => {
      if (header.xbrlTag) {
        tagCounts[header.xbrlTag] = (tagCounts[header.xbrlTag] || 0) + 1;
      }
    });
    
    // 行のタグをカウント
    table.rows.forEach(row => {
      row.forEach(cell => {
        if (cell.xbrlTag) {
          tagCounts[cell.xbrlTag] = (tagCounts[cell.xbrlTag] || 0) + 1;
        }
      });
    });
    
    // 配列に変換してカウント降順でソート
    return Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  };

  // 階層データの保存
  const saveHierarchicalData = (format) => {
    if (!processedData || !processedData.hierarchical) {
      setError('保存可能なデータがありません。');
      return;
    }
    
    if (format === 'json') {
      const jsonString = JSON.stringify(processedData.hierarchical, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
      saveAs(blob, `${fileName}-階層構造.json`);
      setSuccessMessage('階層構造データをJSON形式で保存しました！');
    } else if (format === 'excel') {
      // Excelブック作成
      const wb = XLSX.utils.book_new();
      
      // メタデータシート
      const metadataSheet = [
        ['XBRL財務データ - 階層構造'],
        [''],
        ['レポートタイプ', processedData.hierarchical.metadata.reportType],
        ['単位', processedData.hierarchical.metadata.unit],
        ['前期', processedData.hierarchical.metadata.periods.previous],
        ['当期', processedData.hierarchical.metadata.periods.current],
        ['']
      ];
      
      // 注釈情報
      if (processedData.hierarchical.annotations) {
        metadataSheet.push(['注釈情報']);
        Object.entries(processedData.hierarchical.annotations).forEach(([key, value]) => {
          metadataSheet.push([key, value]);
        });
      }
      
      const metaWs = XLSX.utils.aoa_to_sheet(metadataSheet);
      XLSX.utils.book_append_sheet(wb, metaWs, "メタデータ");
      
      // 比較データシート
      const comparativeData = [
        ['項目名', '階層レベル', 'XBRLタグ', '前期', '当期', '増減', '増減率(%)']
      ];
      
      // 階層データを平坦化
      function flattenHierarchy(node, level = 0) {
        const indent = '　'.repeat(level);
        const change = node.previousPeriod !== null && node.currentPeriod !== null ? 
          node.currentPeriod - node.previousPeriod : null;
        const changeRate = node.previousPeriod !== null && node.currentPeriod !== null && node.previousPeriod !== 0 ? 
          ((node.currentPeriod - node.previousPeriod) / node.previousPeriod * 100) : null;
          
        comparativeData.push([
          indent + node.itemName,
          node.level,
          node.xbrlTag || '',
          node.previousPeriod,
          node.currentPeriod,
          change,
          changeRate !== null ? changeRate.toFixed(2) : ''
        ]);
        
        if (node.children && node.children.length > 0) {
          node.children.forEach(child => {
            flattenHierarchy(child, level + 1);
          });
        }
      }
      
      // 階層データ処理
      processedData.hierarchical.data.forEach(section => {
        flattenHierarchy(section);
      });
      
      const dataWs = XLSX.utils.aoa_to_sheet(comparativeData);
      XLSX.utils.book_append_sheet(wb, dataWs, "財務データ");
      
      // 保存
      XLSX.writeFile(wb, `${fileName}-階層構造.xlsx`);
      setSuccessMessage('階層構造データをExcel形式で保存しました！');
    }
  };

  // 表示モード変更ハンドラ
  const handleDisplayModeChange = (mode) => {
    // 以前の表示モードを保存
    const previousMode = displayMode;
    
    // 表示モード更新
    setDisplayMode(mode);
    
    // HTMLコンテンツがあり、表示モードが変更された場合は再抽出
    if (htmlContent && previousMode !== mode) {
      extractTables(htmlContent);
    }
  };

  // テーブル操作機能
  const addNewRow = () => {
    if (!tables[activeTableIndex]) return;
    
    const table = {...tables[activeTableIndex]};
    
    // 表示モードに応じた空の行を作成
    let newRow;
    if (displayMode === 'standard') {
      newRow = Array(table.headers.length).fill('');
    } else {
      newRow = Array(table.headers.length).fill({value: '', xbrlTag: null, xbrlInfo: null});
    }
    
    const updatedTable = {
      ...table,
      rows: [...table.rows, newRow]
    };
    
    const updatedTables = [...tables];
    updatedTables[activeTableIndex] = updatedTable;
    setTables(updatedTables);
    setSuccessMessage('新しい行が追加されました');
  };
  
  const addNewColumn = () => {
    if (!tables[activeTableIndex]) return;
    
    const table = {...tables[activeTableIndex]};
    
    // 表示モードに応じたヘッダーと列を追加
    const newColumnIndex = table.headers.length;
    let updatedHeaders, updatedRows;
    
    if (displayMode === 'standard') {
      // 標準モード
      updatedHeaders = [...table.headers, `列 ${newColumnIndex + 1}`];
      updatedRows = table.rows.map(row => [...row, '']);
    } else {
      // XBRLモード
      updatedHeaders = [...table.headers, {value: `列 ${newColumnIndex + 1}`, xbrlTag: null, xbrlInfo: null}];
      updatedRows = table.rows.map(row => [...row, {value: '', xbrlTag: null, xbrlInfo: null}]);
    }
    
    const updatedTable = {
      ...table,
      headers: updatedHeaders,
      rows: updatedRows
    };
    
    const updatedTables = [...tables];
    updatedTables[activeTableIndex] = updatedTable;
    setTables(updatedTables);
    setSuccessMessage('新しい列が追加されました');
  };
  
  const deleteSelectedRows = () => {
    if (!tables[activeTableIndex] || selectedRows.length === 0) return;
    
    const table = {...tables[activeTableIndex]};
    const rowsToKeep = table.rows.filter((_, index) => !selectedRows.includes(index));
    
    const updatedTable = {
      ...table,
      rows: rowsToKeep
    };
    
    const updatedTables = [...tables];
    updatedTables[activeTableIndex] = updatedTable;
    setTables(updatedTables);
    setSelectedRows([]);
    setSuccessMessage(`${selectedRows.length}行が削除されました`);
  };
  
  const deleteSelectedColumns = () => {
    if (!tables[activeTableIndex] || selectedColumns.length === 0) return;
    
    const table = {...tables[activeTableIndex]};
    
    // 選択された列を除外
    const updatedHeaders = table.headers.filter((_, index) => !selectedColumns.includes(index));
    
    // 各行から選択された列を除外
    const updatedRows = table.rows.map(row => 
      row.filter((_, index) => !selectedColumns.includes(index))
    );
    
    const updatedTable = {
      ...table,
      headers: updatedHeaders,
      rows: updatedRows
    };
    
    const updatedTables = [...tables];
    updatedTables[activeTableIndex] = updatedTable;
    setTables(updatedTables);
    setSelectedColumns([]);
    setSuccessMessage(`${selectedColumns.length}列が削除されました`);
  };
  
  const handleCellEdit = (rowIndex, colIndex) => {
    if (!editMode) return;
    
    const table = tables[activeTableIndex];
    if (!table) return;
    
    // セル値を取得（表示モードに応じて）
    const cellValue = displayMode === 'standard' 
      ? table.rows[rowIndex][colIndex]
      : table.rows[rowIndex][colIndex].value;
    
    setEditingCell({ row: rowIndex, col: colIndex });
    setEditValue(cellValue);
  };
  
  const saveEdit = () => {
    if (!editingCell) return;
    
    const { row, col } = editingCell;
    const updatedTable = {...tables[activeTableIndex]};
    const updatedRows = [...updatedTable.rows];
    
    // 表示モードに応じた更新
    if (displayMode === 'standard') {
      updatedRows[row] = [...updatedRows[row]];
      updatedRows[row][col] = editValue;
    } else {
      updatedRows[row] = [...updatedRows[row]];
      updatedRows[row][col] = {
        ...updatedRows[row][col],
        value: editValue
      };
    }
    
    updatedTable.rows = updatedRows;
    
    const updatedTables = [...tables];
    updatedTables[activeTableIndex] = updatedTable;
    setTables(updatedTables);
    
    // 編集状態リセット
    setEditingCell(null);
    setEditValue('');
  };
  
  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };
  
  // テーブルの行列変換
  const transposeTable = () => {
    if (!tables[activeTableIndex]) return;
    
    const table = tables[activeTableIndex];
    
    // 表示モードに応じた変換
    if (displayMode === 'standard') {
      // 標準モード - シンプルな文字列値の転置
      const transposedHeaders = ['見出し', ...table.rows.map((_, idx) => `行 ${idx + 1}`)];
      
      const transposedRows = [];
      table.headers.forEach((header, headerIndex) => {
        const newRow = [header];
        table.rows.forEach(row => {
          newRow.push(row[headerIndex]);
        });
        transposedRows.push(newRow);
      });
      
      const transposedTable = {
        ...table,
        id: `${table.id}-transposed`,
        headers: transposedHeaders,
        rows: transposedRows
      };
      
      const updatedTables = [...tables];
      updatedTables[activeTableIndex] = transposedTable;
      setTables(updatedTables);
    } else {
      // XBRLモード - オブジェクト構造の転置
      const transposedHeaders = [
        {value: '見出し', xbrlTag: null, xbrlInfo: null}, 
        ...table.rows.map((_, idx) => ({value: `行 ${idx + 1}`, xbrlTag: null, xbrlInfo: null}))
      ];
      
      const transposedRows = [];
      table.headers.forEach((header, headerIndex) => {
        const newRow = [header];
        table.rows.forEach(row => {
          newRow.push(row[headerIndex]);
        });
        transposedRows.push(newRow);
      });
      
      const transposedTable = {
        ...table,
        id: `${table.id}-transposed`,
        headers: transposedHeaders,
        rows: transposedRows
      };
      
      const updatedTables = [...tables];
      updatedTables[activeTableIndex] = transposedTable;
      setTables(updatedTables);
    }
    
    setSuccessMessage('テーブルが転置されました');
  };
  
  // テーブルのクリーンアップ
  const cleanupData = () => {
    if (!tables[activeTableIndex]) return;
    
    const table = {...tables[activeTableIndex]};
    
    if (displayMode === 'standard') {
      // 標準モード - 文字列値のクリーンアップ
      const cleanedHeaders = table.headers.map(header => header.trim());
      
      const cleanedRows = table.rows.map(row =>
        row.map(cell => {
          let cleanedCell = String(cell).trim();
          
          // 数値形式の正規化
          if (/^-?[\d,.]+$/.test(cleanedCell)) {
            cleanedCell = cleanedCell.replace(/,/g, '');
            const num = parseFloat(cleanedCell);
            if (!isNaN(num)) {
              cleanedCell = num.toString();
            }
          }
          
          // 特殊文字の修正
          cleanedCell = cleanedCell
            .replace('△', '-')
            .replace('▲', '-')
            .replace('−', '-')
            .replace('　', ' ');
            
          return cleanedCell;
        })
      );
      
      const updatedTable = {
        ...table,
        headers: cleanedHeaders,
        rows: cleanedRows
      };
      
      const updatedTables = [...tables];
      updatedTables[activeTableIndex] = updatedTable;
      setTables(updatedTables);
    } else {
      // XBRLモード - オブジェクト値のクリーンアップ
      const cleanedHeaders = table.headers.map(header => ({
        ...header,
        value: header.value ? header.value.trim() : ''
      }));
      
      const cleanedRows = table.rows.map(row =>
        row.map(cell => {
          let cleanedValue = String(cell.value || '').trim();
          
          // 数値形式の正規化
          if (/^-?[\d,.]+$/.test(cleanedValue)) {
            cleanedValue = cleanedValue.replace(/,/g, '');
            const num = parseFloat(cleanedValue);
            if (!isNaN(num)) {
              cleanedValue = num.toString();
            }
          }
          
          // 特殊文字の修正
          cleanedValue = cleanedValue
            .replace('△', '-')
            .replace('▲', '-')
            .replace('−', '-')
            .replace('　', ' ');
            
          return {
            ...cell,
            value: cleanedValue
          };
        })
      );
      
      const updatedTable = {
        ...table,
        headers: cleanedHeaders,
        rows: cleanedRows
      };
      
      const updatedTables = [...tables];
      updatedTables[activeTableIndex] = updatedTable;
      setTables(updatedTables);
    }
    
    setSuccessMessage('データが整理されました');
  };
  
  // 空の行を削除
  const filterEmptyRows = () => {
    if (!tables[activeTableIndex]) return;
    
    const table = {...tables[activeTableIndex]};
    
    let filteredRows;
    if (displayMode === 'standard') {
      // 標準モード
      filteredRows = table.rows.filter(row => 
        row.some(cell => String(cell).trim() !== '')
      );
    } else {
      // XBRLモード
      filteredRows = table.rows.filter(row => 
        row.some(cell => cell.value && String(cell.value).trim() !== '')
      );
    }
    
    const updatedTable = {
      ...table,
      rows: filteredRows
    };
    
    const updatedTables = [...tables];
    updatedTables[activeTableIndex] = updatedTable;
    setTables(updatedTables);
    setSuccessMessage('空の行がフィルタリングされました');
  };
  
  // 行選択の切り替え
  const toggleRowSelection = (rowIndex) => {
    if (selectedRows.includes(rowIndex)) {
      setSelectedRows(selectedRows.filter(idx => idx !== rowIndex));
    } else {
      setSelectedRows([...selectedRows, rowIndex]);
    }
  };
  
  // 列選択の切り替え
  const toggleColumnSelection = (colIndex) => {
    if (selectedColumns.includes(colIndex)) {
      setSelectedColumns(selectedColumns.filter(idx => idx !== colIndex));
    } else {
      setSelectedColumns([...selectedColumns, colIndex]);
    }
  };
  
  // 選択をクリア
  const clearSelections = () => {
    setSelectedRows([]);
    setSelectedColumns([]);
  };
  
  // ヘッダー名を変更
  const renameHeader = (headerIndex, newName) => {
    if (!tables[activeTableIndex]) return;
    
    const table = {...tables[activeTableIndex]};
    let updatedHeaders;
    
    if (displayMode === 'standard') {
      updatedHeaders = [...table.headers];
      updatedHeaders[headerIndex] = newName;
    } else {
      updatedHeaders = [...table.headers];
      updatedHeaders[headerIndex] = {
        ...updatedHeaders[headerIndex],
        value: newName
      };
    }
    
    const updatedTable = {
      ...table,
      headers: updatedHeaders
    };
    
    const updatedTables = [...tables];
    updatedTables[activeTableIndex] = updatedTable;
    setTables(updatedTables);
    setSuccessMessage('ヘッダー名が変更されました');
  };

  // UI関連ユーティリティ
  // フィルタリングとソート
  const getFilteredRows = (table) => {
    if (!table) return [];
    
    let filteredRows = [...table.rows];
    
    // 検索語によるフィルタリング
    if (searchTerm) {
      const lowercasedSearch = searchTerm.toLowerCase();
      
      if (displayMode === 'standard') {
        // 標準モード
        filteredRows = filteredRows.filter(row => 
          row.some(cell => 
            String(cell).toLowerCase().includes(lowercasedSearch)
          )
        );
      } else {
        // XBRLモード
        filteredRows = filteredRows.filter(row => 
          row.some(cell => 
            String(cell.value || '').toLowerCase().includes(lowercasedSearch)
          )
        );
      }
    }
    
    // XBRLタグによるフィルタリング（XBRLモードのみ）
    if (displayMode !== 'standard' && showXbrlTags && searchXbrlTag) {
      const lowercasedTagSearch = searchXbrlTag.toLowerCase();
      filteredRows = filteredRows.filter(row => 
        row.some(cell => 
          cell.xbrlTag && cell.xbrlTag.toLowerCase().includes(lowercasedTagSearch)
        )
      );
    }
    
    // ソート
    if (sortConfig.column !== null) {
      filteredRows.sort((a, b) => {
        let aValue, bValue;
        
        if (displayMode === 'standard') {
          aValue = a[sortConfig.column] || '';
          bValue = b[sortConfig.column] || '';
        } else {
          aValue = a[sortConfig.column]?.value || '';
          bValue = b[sortConfig.column]?.value || '';
        }
        
        // 数値比較
        const aNum = parseFloat(aValue);
        const bNum = parseFloat(bValue);
        
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
        }
        
        // 文字列比較
        const comparison = String(aValue).localeCompare(String(bValue));
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }
    
    return filteredRows;
  };
  
  // ページネーション
  const getPaginatedRows = (rows) => {
    const startIdx = (currentPage - 1) * rowsPerPage;
    return rows.slice(startIdx, startIdx + rowsPerPage);
  };
  
  // ソート処理
  const handleSort = (columnIndex) => {
    let direction = 'asc';
    if (sortConfig.column === columnIndex) {
      direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    }
    setSortConfig({ column: columnIndex, direction });
  };
  
  // ページ変更
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };
  
  // テーブル統計情報の取得
  const getCurrentTableStats = () => {
    if (!tables[activeTableIndex]) return null;
    
    const table = tables[activeTableIndex];
    const filteredRows = getFilteredRows(table);
    
    // 表示モードに応じた統計計算
    if (displayMode === 'standard') {
      return {
        totalRows: table.rows.length,
        filteredRows: filteredRows.length,
        columns: table.headers.length,
        nonEmptyCells: table.rows.reduce((count, row) => 
          count + row.filter(cell => cell !== '').length, 0
        ),
        totalCells: table.rows.length * table.headers.length
      };
    } else {
      return {
        totalRows: table.rows.length,
        filteredRows: filteredRows.length,
        columns: table.headers.length,
        nonEmptyCells: table.rows.reduce((count, row) => 
          count + row.filter(cell => cell.value !== '').length, 0
        ),
        totalCells: table.rows.length * table.headers.length,
        xbrlTagCount: table.statistics?.xbrlTagCount || 0
      };
    }
  };

  // アクセシビリティ用ラベル生成
  const getAriaLabels = () => {
    const labels = {
      inputSection: `HTML入力セクション - 現在のモード: ${inputType === 'paste' ? 'HTMLを貼り付け' : inputType === 'file' ? 'ファイルをアップロード' : 'URLから取得'}`,
      tableNavigation: `テーブルナビゲーション - ${tables.length}個のテーブルが利用可能`,
      tableContent: tables[activeTableIndex] 
        ? `テーブル ${activeTableIndex + 1}、${tables[activeTableIndex].headers.length}列、${tables[activeTableIndex].rows.length}行`
        : 'テーブルが選択されていません'
    };
    return labels;
  };
  
  // 現在のテーブル情報
  const ariaLabels = getAriaLabels();
  const currentTableStats = getCurrentTableStats();
  const activeTable = tables[activeTableIndex];
  const filteredRows = activeTable ? getFilteredRows(activeTable) : [];
  const paginatedRows = getPaginatedRows(filteredRows);
  const totalPages = Math.ceil(filteredRows.length / rowsPerPage);

  return (
    <div className={`bg-${isDarkMode ? 'gray-900' : 'gray-50'} min-h-screen p-4 md:p-6 transition-colors duration-200`}>
      <div className={`max-w-7xl mx-auto ${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md overflow-hidden transition-colors duration-200`}>
        
        {/* ヘッダー */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white relative">
          <h1 className="text-3xl font-bold">HTMLテーブル抽出ツール統合版</h1>
          <p className="mt-2 text-blue-100">HTMLコンテンツからテーブルを抽出、表示、分析、エクスポート - XBRL対応</p>
          
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
                alert('HTML抽出ツールの使い方:\n\n1. HTMLを入力: 貼り付け、ファイルアップロード、またはURLから\n2. 表示モードを選択: 標準、XBRL対応、または改善版XBRL\n3. 「テーブルを抽出」ボタンをクリック\n4. 抽出されたテーブルの表示、編集、エクスポートができます');
              }}
              aria-label="ヘルプ"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </button>
          </div>
        </div>
        
        {/* 表示モード選択 */}
        <div className="bg-blue-50 p-3 border-b border-blue-100">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>表示モード:</span>
              <div className="flex space-x-2">
                <button
                  className={`px-3 py-1.5 rounded-md transition-colors ${
                    displayMode === 'standard' 
                      ? 'bg-blue-600 text-white' 
                      : isDarkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  }`}
                  onClick={() => handleDisplayModeChange('standard')}
                  aria-pressed={displayMode === 'standard'}
                >
                  標準テーブル
                </button>
                <button
                  className={`px-3 py-1.5 rounded-md transition-colors ${
                    displayMode === 'xbrl' 
                      ? 'bg-blue-600 text-white' 
                      : isDarkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  }`}
                  onClick={() => handleDisplayModeChange('xbrl')}
                  aria-pressed={displayMode === 'xbrl'}
                >
                  XBRL対応
                </button>
                <button
                  className={`px-3 py-1.5 rounded-md transition-colors ${
                    displayMode === 'improved_xbrl' 
                      ? 'bg-blue-600 text-white' 
                      : isDarkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  }`}
                  onClick={() => handleDisplayModeChange('improved_xbrl')}
                  aria-pressed={displayMode === 'improved_xbrl'}
                >
                  改善版XBRL（推奨）
                </button>
              </div>
            </div>
            
            <div className="text-gray-500 text-sm mt-2 sm:mt-0">
              {displayMode === 'standard' ? '基本的なテーブル表示' : 
               displayMode === 'xbrl' ? 'XBRLタグを抽出・表示' : 
               'XBRLデータを階層化・比較表示'}
            </div>
          </div>
        </div>
        
        {/* メインコンテンツ */}
        <div className={`p-6 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'} transition-colors duration-200`}>
          
          {/* 入力選択 */}
          <div className="mb-8" aria-labelledby="input-section-label" aria-label={ariaLabels.inputSection}>
            <div className="flex justify-between items-center">
              <h2 id="input-section-label" className={`text-xl font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-800'} mb-4 transition-colors duration-200`}>入力ソース</h2>
              
              <button
                className={`text-sm ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'} flex items-center`}
                onClick={() => setShowInputHelp(!showInputHelp)}
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                ヘルプ
              </button>
            </div>
            
            {/* 入力ヘルプパネル */}
            {showInputHelp && (
              <div className={`mb-4 p-4 rounded-md ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-blue-50 text-gray-700'} text-sm leading-relaxed transition-colors duration-200`}>
                <h3 className="font-medium mb-2">入力方法について</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li><span className="font-medium">HTMLを貼り付け</span>: 財務諸表を含むHTMLを直接貼り付けて処理します</li>
                  <li><span className="font-medium">ファイルをアップロード</span>: EDINET・TDnetからダウンロードしたHTMLファイルを処理します</li>
                  <li><span className="font-medium">URLから取得</span>: 財務諸表が公開されているWebページのURLから直接取得します</li>
                </ul>
                <p className="mt-2">
                  ※ XBRLタグが含まれる財務諸表であれば、自動的にテーブル構造を解析し、階層化、比較表示を行います
                </p>
                <div className="mt-3 text-right">
                  <button
                    className={`text-sm ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}
                    onClick={() => setShowInputHelp(false)}
                  >
                    閉じる
                  </button>
                </div>
              </div>
            )}
            
            <div className="flex flex-wrap gap-2 mb-6">
              <button
                className={`px-4 py-2 rounded-md transition-colors ${inputType === 'paste' ? 'bg-blue-600 text-white' : isDarkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
                onClick={() => setInputType('paste')}
                aria-pressed={inputType === 'paste'}
              >
                HTMLを貼り付け
              </button>
              <button
                className={`px-4 py-2 rounded-md transition-colors ${inputType === 'file' ? 'bg-blue-600 text-white' : isDarkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
                onClick={() => setInputType('file')}
                aria-pressed={inputType === 'file'}
              >
                ファイルをアップロード
              </button>
              <button
                className={`px-4 py-2 rounded-md transition-colors ${inputType === 'url' ? 'bg-blue-600 text-white' : isDarkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
                onClick={() => setInputType('url')}
                aria-pressed={inputType === 'url'}
              >
                URLから取得
              </button>
            </div>

            {/* 以下、入力フォーム（貼り付け/ファイル/URL）、詳細オプションなど */}
            {/* このセクションは既存コードと同様なので割愛 */}

            <div className="mt-6 flex justify-start">
              <button
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center shadow-lg transform hover:scale-105 transition-transform"
                onClick={processInput}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="loading-spinner mr-2"></div>
                    {extractionProgress < 100 ? `抽出中 (${extractionProgress}%)` : '処理中...'}
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
            
            {/* ローディングヒント */}
            {loading && (
              <div className={`mt-4 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-sm animate-pulse transition-colors duration-200`}>
                {processingTips[currentTipIndex]}
              </div>
            )}
          </div>
          
          {/* フィードバックメッセージ */}
          {error && (
            <div className={`mb-6 p-4 ${isDarkMode ? 'bg-red-900 border-red-700 text-red-200' : 'bg-red-50 border-red-500 text-red-700'} border-l-4 rounded-md animate-fadeIn transition-colors duration-200`} role="alert">
              <div className="flex">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span>{error}</span>
              </div>
            </div>
          )}
          
          {successMessage && (
            <div className={`mb-6 p-4 ${isDarkMode ? 'bg-green-900 border-green-700 text-green-200' : 'bg-green-50 border-green-500 text-green-700'} border-l-4 rounded-md animate-fadeIn transition-colors duration-200`} role="alert">
              <div className="flex">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span>{successMessage}</span>
              </div>
            </div>
          )}
          
          {/* 処理統計 */}
          {processingStats && (
            <div className={`mb-6 p-4 ${isDarkMode ? 'bg-blue-900' : 'bg-blue-50'} rounded-md animate-fadeIn transition-colors duration-200`}>
              <h3 className={`text-md font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'} mb-2 transition-colors duration-200`}>処理サマリー</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-3 rounded-md shadow-sm transition-colors duration-200`}>
                  <div className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} transition-colors duration-200`}>テーブル数</div>
                  <div className={`text-2xl font-semibold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} transition-colors duration-200`}>{processingStats.totalTables}</div>
                </div>
                <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-3 rounded-md shadow-sm transition-colors duration-200`}>
                  <div className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} transition-colors duration-200`}>行数合計</div>
                  <div className={`text-2xl font-semibold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} transition-colors duration-200`}>{processingStats.totalRows}</div>
                </div>
                <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-3 rounded-md shadow-sm transition-colors duration-200`}>
                  <div className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} transition-colors duration-200`}>列数合計</div>
                  <div className={`text-2xl font-semibold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} transition-colors duration-200`}>{processingStats.totalColumns}</div>
                </div>
                <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-3 rounded-md shadow-sm transition-colors duration-200`}>
                  <div className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} transition-colors duration-200`}>処理時間</div>
                  <div className={`text-2xl font-semibold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} transition-colors duration-200`}>{processingStats.processingTime}秒</div>
                </div>
                {displayMode !== 'standard' && processingStats.totalXbrlTags > 0 && (
                  <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-3 rounded-md shadow-sm transition-colors duration-200 col-span-2 sm:col-span-4`}>
                    <div className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} transition-colors duration-200`}>XBRLタグ数</div>
                    <div className={`text-2xl font-semibold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} transition-colors duration-200`}>{processingStats.totalXbrlTags}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 結果表示 - 改善されたXBRL表示 */}
          {displayMode === 'improved_xbrl' && processedData && processedData.success && (
            <div className="mt-8 animate-fadeIn">
              <div className="flex justify-between items-center mb-4">
                <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-800'} transition-colors duration-200`}>
                  XBRL財務データ（改善版表示）
                </h2>
                
                <div className="flex space-x-2">
                  <button
                    className={`px-4 py-2 ${isDarkMode ? 'bg-green-600 hover:bg-green-700' : 'bg-green-600 hover:bg-green-700'} text-white rounded-md transition-colors flex items-center`}
                    onClick={() => saveHierarchicalData('json')}
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                    </svg>
                    JSONで保存
                  </button>
                  <button
                    className={`px-4 py-2 ${isDarkMode ? 'bg-green-600 hover:bg-green-700' : 'bg-green-600 hover:bg-green-700'} text-white rounded-md transition-colors flex items-center`}
                    onClick={() => saveHierarchicalData('excel')}
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                    </svg>
                    Excelで保存
                  </button>
                </div>
              </div>
              
              {/* 階層化XBRLビュー */}
              <XBRLHierarchicalView data={processedData} isDarkMode={isDarkMode} />
            </div>
          )}
          
          {/* 結果表示 - 標準テーブル・XBRLテーブル */}
          {tables.length > 0 && (!processedData || !processedData.success || displayMode !== 'improved_xbrl') && (
            <div className="mt-8 animate-fadeIn">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-800'} transition-colors duration-200`}>
                  抽出されたテーブル ({tables.length})
                </h2>
                
                <div className="flex flex-wrap gap-2">
                  {/* 表示オプション */}
                  {displayMode !== 'standard' && (
                    <div className="flex flex-col">
                      <div className="flex items-center bg-gray-200 rounded-md overflow-hidden mr-2">
                        <button
                          className={`px-3 py-1.5 ${showXbrlTags ? 'bg-blue-600 text-white' : 'text-gray-700'} transition-colors`}
                          onClick={() => setShowXbrlTags(true)}
                          aria-pressed={showXbrlTags}
                          title="XBRLタグ表示"
                        >
                          XBRLタグ表示
                        </button>
                        <button
                          className={`px-3 py-1.5 ${!showXbrlTags ? 'bg-blue-600 text-white' : 'text-gray-700'} transition-colors`}
                          onClick={() => setShowXbrlTags(false)}
                          aria-pressed={!showXbrlTags}
                          title="通常表示"
                        >
                          通常表示
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* テーブル表示切替 */}
                  <div className="flex items-center bg-gray-200 rounded-md overflow-hidden mr-2">
                    <button
                      className={`px-3 py-1.5 ${tableView === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-700'} transition-colors`}
                      onClick={() => setTableView('grid')}
                      aria-pressed={tableView === 'grid'}
                      title="グリッド表示"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path>
                      </svg>
                    </button>
                    <button
                      className={`px-3 py-1.5 ${tableView === 'compact' ? 'bg-blue-600 text-white' : 'text-gray-700'} transition-colors`}
                      onClick={() => setTableView('compact')}
                      aria-pressed={tableView === 'compact'}
                      title="コンパクト表示"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path>
                      </svg>
                    </button>
                  </div>
                  
                  {/* 編集ツール */}
                  <button 
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none transition-colors flex items-center"
                    onClick={() => setShowManipulationTools(!showManipulationTools)}
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    </svg>
                    {showManipulationTools ? '編集ツールを隠す' : '編集ツールを表示'}
                  </button>
                
                  {/* エクスポートオプション */}
                  <div className="dropdown relative inline-block">
                    <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none transition-colors flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                      </svg>
                      エクスポート
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                      </svg>
                    </button>
                    <div className="dropdown-content hidden absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                      <button 
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                        onClick={() => exportToCSV(activeTable, activeTableIndex + 1)}
                      >
                        CSVでダウンロード
                      </button>
                      <button 
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                        onClick={() => exportToExcel(activeTable, activeTableIndex + 1)}
                      >
                        Excelでダウンロード
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* テーブル操作ツール */}
              {showManipulationTools && (
                <div className={`p-4 mb-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-md border ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                  <h3 className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'} mb-3`}>テーブル操作ツール</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                    <button 
                      className="p-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                      onClick={addNewRow}
                    >
                      <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                      </svg>
                      行を追加
                    </button>
                    <button 
                      className="p-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                      onClick={addNewColumn}
                    >
                      <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                      </svg>
                      列を追加
                    </button>
                    <button 
                      className="p-2 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm"
                      onClick={transposeTable}
                    >
                      <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
                      </svg>
                      行列入替
                    </button>
                    <button 
                      className="p-2 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 text-sm"
                      onClick={cleanupData}
                    >
                      <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path>
                      </svg>
                      データ整理
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                    <button 
                      className="p-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={deleteSelectedRows}
                      disabled={selectedRows.length === 0}
                    >
                      <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                      </svg>
                      選択行を削除 ({selectedRows.length})
                    </button>
                    <button 
                      className="p-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={deleteSelectedColumns}
                      disabled={selectedColumns.length === 0}
                    >
                      <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                      </svg>
                      選択列を削除 ({selectedColumns.length})
                    </button>
                    <button 
                      className="p-2 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 text-sm"
                      onClick={filterEmptyRows}
                    >
                      <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
                      </svg>
                      空行を削除
                    </button>
                    <button 
                      className="p-2 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 text-sm"
                      onClick={clearSelections}
                      disabled={selectedRows.length === 0 && selectedColumns.length === 0}
                    >
                      <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                      選択解除
                    </button>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <label className="text-sm text-gray-600 mr-2">編集モード:</label>
                      <div 
                        className={`toggle-switch ${editMode ? 'active' : ''}`}
                        onClick={() => setEditMode(!editMode)}
                        aria-pressed={editMode}
                        aria-label="Toggle edit mode"
                      >
                        <span className="toggle-handle"></span>
                      </div>
                      <span className="ml-2 text-sm">{editMode ? 'オン' : 'オフ'}</span>
                    </div>
                    
                    <div className="text-sm text-gray-500">
                      {editMode ? 'セルをクリックして編集' : '編集するには編集モードをオンにしてください'}
                    </div>
                  </div>
                </div>
              )}

              {/* 編集モーダル */}
              {editingCell && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 max-w-md w-full">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">セルを編集</h3>
                    <div className="mb-4">
                      <label htmlFor="cell-edit-input" className="block text-sm font-medium text-gray-700 mb-1">
                        セル値:
                      </label>
                      <textarea
                        id="cell-edit-input"
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        rows="4"
                        autoFocus
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                        onClick={cancelEdit}
                      >
                        キャンセル
                      </button>
                      <button
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        onClick={saveEdit}
                      >
                        保存
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* テーブルナビゲーション */}
              {tables.length > 1 && (
                <div className="mb-6 overflow-x-auto" aria-label={ariaLabels.tableNavigation}>
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

              {/* アクティブテーブル */}
              {activeTable && (
                <div className="mb-6 border rounded-lg overflow-hidden shadow-sm" aria-label={ariaLabels.tableContent}>
                  {/* テーブルヘッダーバー */}
                  <div className="p-4 bg-gray-50 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h3 className="font-medium text-gray-800">
                        {activeTable.tableTitle || `テーブル ${activeTableIndex + 1}`}
                        {activeTable.tableType && activeTable.tableType !== 'unknown' && (
                          <span className="ml-2 text-xs font-normal text-gray-500">
                            ({activeTable.tableType === 'balance_sheet' ? '貸借対照表' : 
                              activeTable.tableType === 'income_statement' ? '損益計算書' : 
                              activeTable.tableType === 'cash_flow' ? 'キャッシュ・フロー計算書' : ''})
                          </span>
                        )}
                      </h3>
                      {currentTableStats && (
                        <p className="text-sm text-gray-500 mt-1">
                          {filteredRows.length} / {currentTableStats.totalRows} 行を表示 • 
                          {currentTableStats.columns} 列 • 
                          {displayMode !== 'standard' && currentTableStats.xbrlTagCount > 0 && ` ${currentTableStats.xbrlTagCount} XBRLタグ • `}
                          セルデータ充足率 {Math.round((currentTableStats.nonEmptyCells / currentTableStats.totalCells) * 100)}%
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* 検索とフィルタリング */}
                  <div className="p-4 bg-white border-b flex flex-col sm:flex-row justify-between items-center gap-3">
                    <div className="w-full sm:w-64 relative">
                      <input
                        type="text"
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="テーブル内を検索..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        aria-label="テーブル内容を検索"
                      />
                      <div className="absolute left-3 top-2.5 text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                      </div>
                    </div>
                    
                    {displayMode !== 'standard' && showXbrlTags && (
                      <div className="w-full sm:w-64 relative">
                        <input
                          type="text"
                          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="XBRLタグで検索..."
                          value={searchXbrlTag}
                          onChange={(e) => setSearchXbrlTag(e.target.value)}
                          aria-label="XBRLタグで検索"
                        />
                        <div className="absolute left-3 top-2.5 text-gray-400">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
                          </svg>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <label htmlFor="rows-per-page" className="text-sm text-gray-600">
                        1ページあたりの行数:
                      </label>
                      <select
                        id="rows-per-page"
                        className="border border-gray-300 rounded-md p-1 text-sm bg-white"
                        value={rowsPerPage}
                        onChange={(e) => {
                          setRowsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                      >
                        <option value="5">5</option>
                        <option value="10">10</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* XBRLタグ統計（XBRLモードのみ） */}
                  {displayMode !== 'standard' && showXbrlTags && activeTable.statistics && activeTable.statistics.xbrlTagCount > 0 && (
                    <div className="p-4 bg-gray-50 border-b">
                      <details>
                        <summary className="font-medium text-gray-700 cursor-pointer">
                          XBRLタグ情報 ({activeTable.statistics.xbrlTagCount}個のタグが見つかりました)
                        </summary>
                        <div className="mt-2 overflow-x-auto max-h-40 overflow-y-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead>
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">タグ名</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">出現回数</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {getXbrlTagCounts(activeTable).map((item, index) => (
                                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                  <td className="px-3 py-2 text-sm text-gray-700">
                                    <code>{item.tag}</code>
                                  </td>
                                  <td className="px-3 py-2 text-sm text-gray-700">
                                    {item.count}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </details>
                    </div>
                  )}
                  
                  {/* テーブル表示 - TableRenderer コンポーネントに委譲 */}
                  <TableRenderer
                    table={activeTable}
                    filteredRows={paginatedRows}
                    displayMode={displayMode}
                    isDarkMode={isDarkMode}
                    tableView={tableView}
                    showXbrlTags={showXbrlTags}
                    editMode={editMode}
                    selectedRows={selectedRows}
                    selectedColumns={selectedColumns}
                    toggleRowSelection={toggleRowSelection}
                    toggleColumnSelection={toggleColumnSelection}
                    handleCellEdit={handleCellEdit}
                    handleSort={handleSort}
                    sortConfig={sortConfig}
                    renameHeader={renameHeader}
                  />
                  
                  {/* ページネーション */}
                  {filteredRows.length > rowsPerPage && (
                    <div className="p-4 bg-white border-t flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        {filteredRows.length}行中 {((currentPage - 1) * rowsPerPage) + 1}～{Math.min(currentPage * rowsPerPage, filteredRows.length)}行目を表示
                      </span>
                      
                      <div className="flex gap-1">
                        <button
                          className="px-3 py-1 rounded-md border text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => handlePageChange(1)}
                          disabled={currentPage === 1}
                          aria-label="最初のページへ"
                        >
                          &laquo;
                        </button>
                        <button
                          className="px-3 py-1 rounded-md border text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          aria-label="前のページへ"
                        >
                          &lsaquo;
                        </button>
                        
                        <span className="px-3 py-1 text-sm">
                          {totalPages}ページ中 {currentPage}ページ目
                        </span>
                        
                        <button
                          className="px-3 py-1 rounded-md border text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          aria-label="次のページへ"
                        >
                          &rsaquo;
                        </button>
                        <button
                          className="px-3 py-1 rounded-md border text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => handlePageChange(totalPages)}
                          disabled={currentPage === totalPages}
                          aria-label="最後のページへ"
                        >
                          &raquo;
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* フッター */}
        <div className={`${isDarkMode ? 'bg-gray-800 text-gray-400 border-gray-700' : 'bg-gray-50 text-gray-600 border-gray-200'} p-4 text-center text-sm border-t transition-colors duration-200`}>
          HTMLテーブル抽出ツール統合版 • テーブルからデータを抽出・加工するツール
          <div className="mt-1 text-xs">◆ ダークモードは右上のアイコンから切り替え可能です</div>
        </div>
      </div>
      
      {/* CSS */}
      <style jsx>{`
        .dropdown:hover .dropdown-content {
          display: block;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-in-out;
        }
        
        .loading-spinner {
          border: 3px solid rgba(0, 0, 0, 0.1);
          border-radius: 50%;
          border-top: 3px solid #3b82f6;
          width: 24px;
          height: 24px;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 40px;
          height: 20px;
          background-color: #ccc;
          border-radius: 20px;
          transition: all 0.3s;
          cursor: pointer;
        }
        
        .toggle-switch.active {
          background-color: #3b82f6;
        }
        
        .toggle-handle {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 16px;
          height: 16px;
          background-color: white;
          border-radius: 50%;
          transition: all 0.3s;
        }
        
        .toggle-switch.active .toggle-handle {
          transform: translateX(20px);
        }
      `}</style>
    </div>
  );
};

// TableRenderer.js - テーブル表示コンポーネント
const TableRenderer = ({
  table,
  filteredRows,
  displayMode,
  isDarkMode,
  tableView,
  showXbrlTags,
  editMode,
  selectedRows,
  selectedColumns,
  toggleRowSelection,
  toggleColumnSelection,
  handleCellEdit,
  handleSort,
  sortConfig,
  renameHeader
}) => {
  if (!table) return null;
  
  return (
    <div className="overflow-x-auto table-container">
      <table className={`min-w-full border-collapse ${tableView === 'compact' ? 'text-xs' : ''} ${isDarkMode ? 'bg-gray-900 text-gray-200' : 'bg-white text-gray-800'} transition-colors duration-200`}>
        <thead className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} transition-colors duration-200`}>
          <tr>
            {editMode && (
              <th className="w-10 p-2 border text-center">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  onChange={(e) => {
                    if (e.target.checked) {
                      // Select all rows
                      const allIndexes = filteredRows.map((_, i) => i);
                      toggleRowSelection(allIndexes);
                    } else {
                      // Deselect all rows
                      toggleRowSelection([]);
                    }
                  }}
                  checked={selectedRows.length === filteredRows.length && filteredRows.length > 0}
                />
              </th>
            )}
            {displayMode === 'standard' ? (
              // 標準モード - 単純な文字列ヘッダー
              table.headers.map((header, idx) => (
                <th 
                  key={idx} 
                  className={`${tableView === 'compact' ? 'p-2' : 'p-3'} text-sm font-medium ${isDarkMode ? 'text-gray-300 border-gray-700 hover:bg-gray-700' : 'text-gray-700 border-gray-200 hover:bg-gray-100'} border text-left whitespace-nowrap cursor-pointer ${selectedColumns.includes(idx) ? isDarkMode ? 'bg-blue-900' : 'bg-blue-100' : ''} transition-colors duration-200`}
                  onClick={() => editMode ? toggleColumnSelection(idx) : handleSort(idx)}
                >
                  <div className="flex items-center">
                    {editMode ? (
                      <div className="flex items-center w-full">
                        <input
                          type="checkbox"
                          className="h-4 w-4 mr-2"
                          checked={selectedColumns.includes(idx)}
                          onChange={() => toggleColumnSelection(idx)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <input
                          type="text"
                          className="w-full p-1 border border-gray-300 rounded"
                          value={header}
                          onChange={(e) => renameHeader(idx, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    ) : (
                      <>
                        <span>{header || `列 ${idx + 1}`}</span>
                        {sortConfig.column === idx && (
                          <span className="ml-1">
                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </th>
              ))
            ) : (
              // XBRLモード - オブジェクトヘッダー
              table.headers.map((header, idx) => (
                <th 
                  key={idx} 
                  className={`${tableView === 'compact' ? 'p-2' : 'p-3'} text-sm font-medium ${isDarkMode ? 'text-gray-300 border-gray-700 hover:bg-gray-700' : 'text-gray-700 border-gray-200 hover:bg-gray-100'} border text-left whitespace-nowrap cursor-pointer ${selectedColumns.includes(idx) ? isDarkMode ? 'bg-blue-900' : 'bg-blue-100' : ''} transition-colors duration-200`}
                  onClick={() => editMode ? toggleColumnSelection(idx) : handleSort(idx)}
                >
                  <div className="flex items-center">
                    {editMode ? (
                      <div className="flex items-center w-full">
                        <input
                          type="checkbox"
                          className="h-4 w-4 mr-2"
                          checked={selectedColumns.includes(idx)}
                          onChange={() => toggleColumnSelection(idx)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <input
                          type="text"
                          className="w-full p-1 border border-gray-300 rounded"
                          value={header.value || ''}
                          onChange={(e) => renameHeader(idx, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    ) : (
                      <>
                        <span>{header.value || `列 ${idx + 1}`}</span>
                        {sortConfig.column === idx && (
                          <span className="ml-1">
                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                        {showXbrlTags && header.xbrlTag && (
                          <span className={`ml-1 text-xs ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} transition-colors duration-200`}>
                            {`[${header.xbrlTag}]`}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </th>
              ))