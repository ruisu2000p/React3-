import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

const XBRLTableExtractor = () => {
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
    includeXbrlTags: true,
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
  const [isDarkMode, setIsDarkMode] = useState(
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  const [tableView, setTableView] = useState('grid'); // 'grid' or 'compact'
  const [showXbrlTags, setShowXbrlTags] = useState(true); // 新しいステート：XBRLタグを表示するかどうか

  useEffect(() => {
    // Reset current page when table changes
    setCurrentPage(1);
    // Reset search when table changes
    setSearchTerm('');
    // Reset sort when table changes
    setSortConfig({ column: null, direction: 'asc' });
  }, [activeTableIndex]);

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
      const lowerCaseCells = row.map(cell => String(cell.value).toLowerCase());
      
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
        const nonNumericCells = row.filter(cell => isNaN(Number(cell.value)));
        const allNonNumeric = nonNumericCells.length === row.length;
        
        // Check if this row's format differs from the next row
        let differentFormat = false;
        for (let i = 0; i < Math.min(row.length, nextRow.length); i++) {
          if (isNaN(Number(row[i].value)) !== isNaN(Number(nextRow[i].value))) {
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

  // Function to extract tables from HTML with enhanced features - XBRL aware version
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
                    text = text.trim().replace(/\\s+/g, ' ');
                  }
                  
                  if (extractionOptions.convertSpecialChars) {
                    // Convert special characters like Japanese financial notation
                    text = text.replace('△', '-');
                    // Handle HTML entities
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = text;
                    text = tempDiv.textContent;
                  }
                  
                  // Extract XBRL tags if enabled
                  let xbrlTag = null;
                  if (extractionOptions.includeXbrlTags) {
                    // Look for XBRL tags - first try direct approach
                    try {
                      // Try to find ix:nonfraction tags (financial values)
                      const ixNonfractions = cell.querySelectorAll('ix\\:nonfraction');
                      if (ixNonfractions && ixNonfractions.length > 0) {
                        xbrlTag = ixNonfractions[0].getAttribute('name');
                      }
                      
                      // If not found, try ix:nonnumeric tags (text values)
                      if (!xbrlTag) {
                        const ixNonnumerics = cell.querySelectorAll('ix\\:nonnumeric');
                        if (ixNonnumerics && ixNonnumerics.length > 0) {
                          xbrlTag = ixNonnumerics[0].getAttribute('name');
                        }
                      }
                    } catch (e) {
                      console.log('Error finding XBRL tags with namespace', e);
                    }
                    
                    // Fallback approaches if direct selector failed
                    if (!xbrlTag) {
                      // Try with attribute selectors
                      const xbrlElements = cell.querySelectorAll('[name^="jppfs_cor:"], [name^="jpcrp"]');
                      if (xbrlElements && xbrlElements.length > 0) {
                        xbrlTag = xbrlElements[0].getAttribute('name');
                      }
                    }
                    
                    // If still not found, try searching all elements
                    if (!xbrlTag) {
                      // Deep search through all elements in the cell
                      const allElements = cell.querySelectorAll('*');
                      for (let i = 0; i < allElements.length; i++) {
                        const el = allElements[i];
                        const name = el.getAttribute('name');
                        if (name && (name.startsWith('jppfs_cor:') || name.startsWith('jpcrp'))) {
                          xbrlTag = name;
                          break;
                        }
                      }
                    }
                  }
                  
                  // Handle colspan and rowspan
                  const colspan = parseInt(cell.getAttribute('colspan')) || 1;
                  for (let i = 0; i < colspan; i++) {
                    rowData.push({
                      value: i === 0 ? text : '',
                      xbrlTag: i === 0 ? xbrlTag : null
                    });
                  }
                });

                if (!extractionOptions.ignoreEmptyRows || rowData.some(cell => cell.value.trim() !== '')) {
                  maxCols = Math.max(maxCols, rowData.length);
                  extractedRows.push(rowData);
                }
              });

              // Adjust rows to have equal number of columns
              const normalizedRows = extractedRows.map(row => {
                if (row.length < maxCols) {
                  return [...row, ...Array(maxCols - row.length).fill({value: '', xbrlTag: null})];
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
                  headers = Array(maxCols).fill(0).map((_, i) => ({value: `列 ${i+1}`, xbrlTag: null}));
                }
              } else {
                headers = Array(maxCols).fill(0).map((_, i) => ({value: `列 ${i+1}`, xbrlTag: null}));
              }

              // Collect all unique XBRL tags found in the table
              const xbrlTags = new Set();
              headers.forEach(cell => {
                if (cell.xbrlTag) xbrlTags.add(cell.xbrlTag);
              });
              normalizedRows.forEach(row => {
                row.forEach(cell => {
                  if (cell.xbrlTag) xbrlTags.add(cell.xbrlTag);
                });
              });

              extractedTables.push({
                id: `table-${tableIndex}`,
                headers,
                rows: normalizedRows,
                originalTable: table.outerHTML,
                statistics: {
                  rowCount: normalizedRows.length,
                  columnCount: headers.length,
                  emptyCells: normalizedRows.reduce((count, row) => 
                    count + row.filter(cell => cell.value === '').length, 0
                  ),
                  totalCells: normalizedRows.length * headers.length,
                  xbrlTagCount: xbrlTags.size,
                  xbrlTags: Array.from(xbrlTags)
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
        // Calculate total XBRL tags found
        const allXbrlTags = new Set();
        extractedTables.forEach(table => {
          table.statistics.xbrlTags.forEach(tag => allXbrlTags.add(tag));
        });
        
        setTables(extractedTables);
        setProcessingStats({
          totalTables: extractedTables.length,
          totalRows: extractedTables.reduce((sum, table) => sum + table.rows.length, 0),
          totalColumns: extractedTables.reduce((sum, table) => sum + table.headers.length, 0),
          totalXbrlTags: allXbrlTags.size,
          processingTime: ((endTime - startTime) / 1000).toFixed(2)
        });
        
        const xbrlMessage = allXbrlTags.size > 0 
          ? `（${allXbrlTags.size}個のXBRLタグを検出）` 
          : '（XBRLタグは検出されませんでした）';
        
        setSuccessMessage(`${extractedTables.length}個のテーブルを抽出しました！${xbrlMessage}`);
        setLoading(false);
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
      
      if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\\.(html|htm|xhtml|xml)$/i)) {
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
      setFileName(selectedFile.name.replace(/\\.(html|htm|xhtml|xml)$/i, ''));
      
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

  // Convert table to various formats with XBRL tag support
  const tableToCSV = (table) => {
    if (!table) return '';
    
    // Create headers and rows with separate XBRL tag columns when showXbrlTags is true
    let headers, rows;
    
    if (showXbrlTags) {
      // For each column in the original table, create two columns: one for the value and one for XBRL tags
      headers = [];
      table.headers.forEach(header => {
        headers.push(header.value); // Original header
        headers.push(`${header.value}_XBRL`); // XBRL tag column
      });
      
      rows = table.rows.map(row => {
        const newRow = [];
        row.forEach(cell => {
          newRow.push(cell.value); // Original value
          newRow.push(cell.xbrlTag || ''); // XBRL tag (or empty string if none)
        });
        return newRow;
      });
    } else {
      // Standard display without XBRL tags
      headers = table.headers.map(header => header.value);
      rows = table.rows.map(row => row.map(cell => cell.value));
    }
    
    return Papa.unparse([headers, ...rows], {
      quotes: true, // Use quotes around fields
      quoteChar: '"',
      escapeChar: '"',
      delimiter: ",",
      header: false,
      skipEmptyLines: true
    });
  };
  
  const tableToJSON = (table) => {
    if (!table) return '';
    
    const { headers, rows } = table;
    let jsonArray = [];
    
    // Convert to JSON with separate XBRL tag properties if enabled
    if (showXbrlTags) {
      jsonArray = rows.map(row => {
        const obj = {};
        headers.forEach((header, index) => {
          const cell = row[index] || {value: '', xbrlTag: null};
          const headerName = header.value || `列 ${index + 1}`;
          
          // Store the value in the original property
          obj[headerName] = cell.value || '';
          
          // Add a separate property for the XBRL tag with _XBRL suffix
          obj[`${headerName}_XBRL`] = cell.xbrlTag || '';
        });
        return obj;
      });
    } else {
      // Simple JSON without XBRL tags
      jsonArray = rows.map(row => {
        const obj = {};
        headers.forEach((header, index) => {
          const cell = row[index] || {value: '', xbrlTag: null};
          const headerName = header.value || `列 ${index + 1}`;
          obj[headerName] = cell.value || '';
        });
        return obj;
      });
    }
    
    return JSON.stringify(jsonArray, null, 2);
  };
  
  const tableToExcel = (table) => {
    if (!table) return null;
    
    // Create headers and rows with separate XBRL tag columns when showXbrlTags is true
    let headers, rows;
    
    if (showXbrlTags) {
      // For each column in the original table, create two columns: one for the value and one for XBRL tags
      headers = [];
      table.headers.forEach(header => {
        headers.push(header.value); // Original header
        headers.push(`${header.value}_XBRL`); // XBRL tag column
      });
      
      rows = table.rows.map(row => {
        const newRow = [];
        row.forEach(cell => {
          newRow.push(cell.value); // Original value
          newRow.push(cell.xbrlTag || ''); // XBRL tag (or empty string if none)
        });
        return newRow;
      });
    } else {
      // Standard display without XBRL tags
      headers = table.headers.map(header => header.value);
      rows = table.rows.map(row => row.map(cell => cell.value));
    }
    
    const data = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    
    // If XBRL tags are enabled, add a second sheet with XBRL tag information
    if (showXbrlTags && table && table.statistics && table.statistics.xbrlTagCount > 0) {
      // Create a list of all XBRL tags found in the table
      const tagCounts = getXbrlTagCounts(table);
      const xbrlTagData = [
        ['XBRL Tag', 'Count']
      ];
      
      // Add tag data as arrays
      tagCounts.forEach(item => {
        xbrlTagData.push([item.tag, item.count]);
      });
      
      const xbrlWs = XLSX.utils.aoa_to_sheet(xbrlTagData);
      XLSX.utils.book_append_sheet(wb, xbrlWs, "XBRLタグ情報");
    }
    
    return wb;
  };
  
  // Function to count occurrences of each XBRL tag in a table
  const getXbrlTagCounts = (table) => {
    if (!table) return [];
    
    const tagCounts = {};
    
    // Count tags in headers
    table.headers.forEach(header => {
      if (header.xbrlTag) {
        tagCounts[header.xbrlTag] = (tagCounts[header.xbrlTag] || 0) + 1;
      }
    });
    
    // Count tags in rows
    table.rows.forEach(row => {
      row.forEach(cell => {
        if (cell.xbrlTag) {
          tagCounts[cell.xbrlTag] = (tagCounts[cell.xbrlTag] || 0) + 1;
        }
      });
    });
    
    // Convert to array of objects for sorting
    return Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count); // Sort by count descending
  };

  // Download table in different formats
  const downloadCSV = (table, index) => {
    if (!table) return;
    
    const csv = tableToCSV(table);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${fileName}-テーブル${index}.csv`);
    setSuccessMessage(`テーブルをCSV形式でダウンロードしました！`);
  };
  
  const downloadJSON = (table, index) => {
    if (!table) return;
    
    const json = tableToJSON(table);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    saveAs(blob, `${fileName}-テーブル${index}.json`);
    setSuccessMessage('テーブルをJSON形式でダウンロードしました！');
  };
  
  const downloadExcel = (table, index) => {
    if (!table) return;
    
    const wb = tableToExcel(table);
    XLSX.writeFile(wb, `${fileName}-テーブル${index}.xlsx`);
    setSuccessMessage('テーブルをExcel形式でダウンロードしました！');
  };

  // Download all tables in different formats
  const downloadAllTables = (format) => {
    if (tables.length === 0) return;

    if (format === 'csv') {
      // Create a combined CSV with table separators
      let combinedRows = [];
      
      tables.forEach((table, index) => {
        // Add a separator row if not the first table
        if (index > 0) {
          combinedRows.push([`テーブル ${index + 1}`]);
          combinedRows.push([]);  // Empty row as separator
        } else {
          combinedRows.push([`テーブル 1`]);
          combinedRows.push([]);
        }
        
        // Convert headers and rows with separate XBRL tag columns if enabled
        let headers, rows;
        
        if (showXbrlTags) {
          // For each column in the original table, create two columns: one for the value and one for XBRL tags
          headers = [];
          table.headers.forEach(header => {
            headers.push(header.value); // Original header
            headers.push(`${header.value}_XBRL`); // XBRL tag column
          });
          
          rows = table.rows.map(row => {
            const newRow = [];
            row.forEach(cell => {
              newRow.push(cell.value); // Original value
              newRow.push(cell.xbrlTag || ''); // XBRL tag (or empty string if none)
            });
            return newRow;
          });
        } else {
          // Standard display without XBRL tags
          headers = table.headers.map(header => header.value);
          rows = table.rows.map(row => row.map(cell => cell.value));
        }
        
        // Add the table data
        combinedRows.push(headers);
        combinedRows = [...combinedRows, ...rows];
        
        // Add an empty row after the table
        combinedRows.push([]);
      });
      
      const csv = Papa.unparse(combinedRows, {
        quotes: true,
        quoteChar: '"',
        escapeChar: '"',
        delimiter: ",",
        header: false,
        skipEmptyLines: false
      });
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, `${fileName}-全テーブル.csv`);
      setSuccessMessage('すべてのテーブルをCSV形式でダウンロードしました！');
    } else if (format === 'json') {
      // Create an array of tables with XBRL info if enabled
      const jsonData = tables.map((table, index) => {
        // Create a simple table object with just the table name and headers
        const tableObj = {
          tableName: `テーブル ${index + 1}`,
          headers: showXbrlTags ? 
            table.headers.map(h => h.value) : 
            table.headers.map(h => h.value)
        };
        
        // Process rows based on showXbrlTags setting
        const processedRows = table.rows.map(row => {
          if (showXbrlTags) {
            // Include XBRL tags in separate fields
            const obj = {};
            table.headers.forEach((header, idx) => {
              const cell = row[idx] || {value: '', xbrlTag: null};
              const headerName = header.value || `列 ${idx + 1}`;
              // Store the value in the original property
              obj[headerName] = cell.value || '';
              
              // Add a separate property for the XBRL tag with _XBRL suffix
              obj[`${headerName}_XBRL`] = cell.xbrlTag || '';
            });
            return obj;
          } else {
            // Simple values only
            const obj = {};
            table.headers.forEach((header, idx) => {
              const cell = row[idx] || {value: '', xbrlTag: null};
              const headerName = header.value || `列 ${idx + 1}`;
              obj[headerName] = cell.value || '';
            });
            return obj;
          }
        });
        
        // Add data to the table object
        tableObj.data = processedRows;
        
        // Add XBRL statistics if enabled - as simple arrays
        if (showXbrlTags && table.statistics.xbrlTagCount > 0) {
          tableObj.xbrlTagCount = table.statistics.xbrlTagCount;
          tableObj.xbrlTags = table.statistics.xbrlTags;
          tableObj.xbrlTagFrequency = getXbrlTagCounts(table).map(item => [
            item.tag,
            item.count
          ]);
        }
        
        return tableObj;
      });
      
      const json = JSON.stringify(jsonData, null, 2);
      const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
      saveAs(blob, `${fileName}-全テーブル.json`);
      setSuccessMessage('すべてのテーブルをJSON形式でダウンロードしました！');
    } else if (format === 'excel') {
      // Create a workbook with multiple sheets
      const wb = XLSX.utils.book_new();
      
      tables.forEach((table, index) => {
        // Convert headers and rows for Excel with separate XBRL tag columns if enabled
        let headers, rows;
        
        if (showXbrlTags) {
          // For each column in the original table, create two columns: one for the value and one for XBRL tags
          headers = [];
          table.headers.forEach(header => {
            headers.push(header.value); // Original header
            headers.push(`${header.value}_XBRL`); // XBRL tag column
          });
          
          rows = table.rows.map(row => {
            const newRow = [];
            row.forEach(cell => {
              newRow.push(cell.value); // Original value
              newRow.push(cell.xbrlTag || ''); // XBRL tag (or empty string if none)
            });
            return newRow;
          });
        } else {
          // Standard display without XBRL tags
          headers = table.headers.map(header => header.value);
          rows = table.rows.map(row => row.map(cell => cell.value));
        }
        
        const data = [headers, ...rows];
        const ws = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, `テーブル ${index + 1}`);
        
        // If XBRL tags are present, add a sheet with tag info for each table
        if (showXbrlTags && table && table.statistics && table.statistics.xbrlTagCount > 0) {
          // Create XBRL tag information sheet
          const tagCounts = getXbrlTagCounts(table);
          const xbrlTagData = [
            ['XBRL Tag', 'Count']
          ];
          
          // Add tag data as arrays
          tagCounts.forEach(item => {
            xbrlTagData.push([item.tag, item.count]);
          });
          
          const xbrlWs = XLSX.utils.aoa_to_sheet(xbrlTagData);
          XLSX.utils.book_append_sheet(wb, xbrlWs, `XBRLタグ ${index + 1}`);
        }
      });
      
      // Add a summary sheet with all XBRL tags if enabled
      if (showXbrlTags) {
        // Collect all XBRL tags across all tables
        const allTagCounts = {};
        tables.forEach(table => {
          if (table && table.statistics && table.statistics.xbrlTagCount > 0) {
            const tagCounts = getXbrlTagCounts(table);
            tagCounts.forEach(({tag, count}) => {
              allTagCounts[tag] = (allTagCounts[tag] || 0) + count;
            });
          }
        });
        
        // Create summary sheet
        const summaryData = [
          ['全テーブルのXBRLタグ一覧', ''],
          ['XBRL Tag', '出現回数']
        ];
        
        // Add tags as rows
        Object.entries(allTagCounts)
          .sort((a, b) => b[1] - a[1]) // Sort by count descending
          .forEach(([tag, count]) => {
            summaryData.push([tag, count]);
          });
        
        const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, summaryWs, 'XBRLタグ一覧');
      }
      
      XLSX.writeFile(wb, `${fileName}-全テーブル.xlsx`);
      setSuccessMessage('すべてのテーブルをExcel形式でダウンロードしました！');
    }
  };

  // Filter and sort table data for display
  const getFilteredRows = (table) => {
    if (!table) return [];
    
    let filteredRows = [...table.rows];
    
    // Apply search filter on values
    if (searchTerm) {
      const lowercasedSearch = searchTerm.toLowerCase();
      filteredRows = filteredRows.filter(row => 
        row.some(cell => 
          String(cell.value).toLowerCase().includes(lowercasedSearch)
        )
      );
    }
    
    // Apply search filter on XBRL tags if enabled
    if (showXbrlTags && searchXbrlTag) {
      const lowercasedTagSearch = searchXbrlTag.toLowerCase();
      filteredRows = filteredRows.filter(row => 
        row.some(cell => 
          cell.xbrlTag && cell.xbrlTag.toLowerCase().includes(lowercasedTagSearch)
        )
      );
    }
    
    // Apply sorting
    if (sortConfig.column !== null) {
      filteredRows.sort((a, b) => {
        const aValue = a[sortConfig.column]?.value || '';
        const bValue = b[sortConfig.column]?.value || '';
        
        // Check if both values are numbers
        const aNum = parseFloat(aValue);
        const bNum = parseFloat(bValue);
        
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
        }
        
        // String comparison
        const comparison = String(aValue).localeCompare(String(bValue));
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }
    
    return filteredRows;
  };
  
  // Get paginated rows
  const getPaginatedRows = (rows) => {
    const startIdx = (currentPage - 1) * rowsPerPage;
    return rows.slice(startIdx, startIdx + rowsPerPage);
  };
  
  // Handle sort
  const handleSort = (columnIndex) => {
    let direction = 'asc';
    if (sortConfig.column === columnIndex) {
      direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    }
    setSortConfig({ column: columnIndex, direction });
  };
  
  // Handle pagination
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  // Copy table to clipboard
  const copyToClipboard = (format) => {
    if (!tables[activeTableIndex]) return;
    
    const table = tables[activeTableIndex];
    let content = '';
    
    if (format === 'csv') {
      content = tableToCSV(table);
    } else if (format === 'json') {
      content = tableToJSON(table);
    } else if (format === 'text') {
      // Simple text format with tabs
      let headers, rows;
      
      if (showXbrlTags) {
        // For each column in the original table, create two columns: one for the value and one for XBRL tags
        headers = [];
        table.headers.forEach(header => {
          headers.push(header.value); // Original header
          headers.push(`${header.value}_XBRL`); // XBRL tag column
        });
        
        rows = table.rows.map(row => {
          const newRow = [];
          row.forEach(cell => {
            newRow.push(cell.value); // Original value
            newRow.push(cell.xbrlTag || ''); // XBRL tag (or empty string if none)
          });
          return newRow.join('\t');
        });
      } else {
        // Standard display without XBRL tags
        headers = table.headers.map(header => header.value);
        rows = table.rows.map(row => {
          return row.map(cell => cell.value).join('\t');
        });
      }
      
      content = headers.join('\t') + '\n' + rows.join('\n');
    }
    
    navigator.clipboard.writeText(content)
      .then(() => {
        setSuccessMessage(`テーブルを${format.toUpperCase()}形式でクリップボードにコピーしました！`);
      })
      .catch(err => {
        setError(`クリップボードへのコピーに失敗しました: ${err.message}`);
      });
  };

  // Get statistics for current table
  const getCurrentTableStats = () => {
    if (!tables[activeTableIndex]) return null;
    
    const table = tables[activeTableIndex];
    const filteredRows = getFilteredRows(table);
    
    return {
      totalRows: table.rows.length,
      filteredRows: filteredRows.length,
      columns: table.headers.length,
      nonEmptyCells: table.rows.reduce((count, row) => 
        count + row.filter(cell => cell.value !== '').length, 0
      ),
      totalCells: table.rows.length * table.headers.length,
      xbrlTagCount: table.statistics.xbrlTagCount || 0
    };
  };

  // Prepare aria-labels for accessibility
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

  const ariaLabels = getAriaLabels();
  const currentTableStats = getCurrentTableStats();
  const activeTable = tables[activeTableIndex];
  const filteredRows = activeTable ? getFilteredRows(activeTable) : [];
  const paginatedRows = getPaginatedRows(filteredRows);
  const totalPages = Math.ceil(filteredRows.length / rowsPerPage);

  return (
    <div className="bg-gray-50 min-h-screen p-4 md:p-6">
      <div className={`max-w-7xl mx-auto ${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md overflow-hidden transition-colors duration-200`}>
        
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white relative">
          <h1 className="text-3xl font-bold">XBRL対応テーブル抽出ツール</h1>
          <p className="mt-2 text-blue-100">HTMLコンテンツからテーブルとXBRLタグを抽出、表示、分析、エクスポート</p>
          
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
                alert('XBRL対応テーブル抽出ツールの使い方:\n\n1. HTMLを入力: 貼り付け、ファイルアップロード、またはURLから\n2. 「テーブルを抽出」ボタンをクリック\n3. 抽出されたテーブルとXBRLタグの表示、編集、エクスポートができます\n\n詳細なヘルプは編集ツールメニューをご覧ください。');
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
          <div className="mb-8" aria-labelledby="input-section-label" aria-label={ariaLabels.inputSection}>
            <h2 id="input-section-label" className={`text-xl font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-800'} mb-4 transition-colors duration-200`}>入力ソース</h2>
            
            <div className="flex flex-wrap gap-2 mb-6">
              <button
                className={`px-4 py-2 rounded-md transition-colors ${inputType === 'paste' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
                onClick={() => setInputType('paste')}
                aria-pressed={inputType === 'paste'}
              >
                HTMLを貼り付け
              </button>
              <button
                className={`px-4 py-2 rounded-md transition-colors ${inputType === 'file' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
                onClick={() => setInputType('file')}
                aria-pressed={inputType === 'file'}
              >
                ファイルをアップロード
              </button>
              <button
                className={`px-4 py-2 rounded-md transition-colors ${inputType === 'url' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
                onClick={() => setInputType('url')}
                aria-pressed={inputType === 'url'}
              >
                URLから取得
              </button>
            </div>

            {/* Paste HTML Input */}
            {inputType === 'paste' && (
              <div className="animate-fadeIn">
                <label htmlFor="html-content" className="block text-sm font-medium text-gray-700 mb-1">
                  テーブルを含むHTMLコンテンツを貼り付けてください:
                </label>
                <textarea
                  id="html-content"
                  className={`w-full h-64 p-3 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-200' : 'border-gray-300 bg-white text-gray-800'} rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200`}
                  placeholder="ここにHTMLコンテンツを貼り付け... (例: <table><tr><td>データ</td></tr></table>)"
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  aria-describedby="paste-hint"
                />
                <p id="paste-hint" className={`mt-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} transition-colors duration-200`}>
                  &lt;table&gt;要素を含むHTMLを貼り付けてください。XBRLタグが含まれているコンテンツも自動的に処理されます。
                </p>
              </div>
            )}

            {/* File Upload Input */}
            {inputType === 'file' && (
              <div className="animate-fadeIn">
                <div className={`flex flex-col items-center justify-center border-2 border-dashed ${isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-gray-50'} rounded-lg p-8 transition-colors hover:border-blue-400 duration-200`}>
                  <svg className={`w-12 h-12 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} mb-3`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
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
                  <div className={`mt-3 flex items-center justify-between p-3 ${isDarkMode ? 'bg-blue-900' : 'bg-blue-50'} rounded-md transition-colors duration-200`}>
                    <div className="flex items-center">
                      <svg className={`w-6 h-6 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} mr-2`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
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
                <p id="file-hint" className={`mt-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} transition-colors duration-200`}>
                  テーブルとXBRLタグを抽出するHTMLファイルを選択してください。
                </p>
              </div>
            )}

            {/* URL Input */}
            {inputType === 'url' && (
              <div className="animate-fadeIn">
                <label htmlFor="url-input" className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1 transition-colors duration-200`}>
                  HTMLテーブルを含むURLを入力してください:
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-grow">
                    <input
                      id="url-input"
                      type="text"
                      className={`w-full p-3 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-200' : 'border-gray-300 bg-white text-gray-800'} rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200`}
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
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={useProxy}
                    onChange={(e) => setUseProxy(e.target.checked)}
                  />
                  <label htmlFor="use-proxy" className={`ml-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} transition-colors duration-200`}>
                    CORSプロキシを使用する（クロスオリジン問題の解決に）
                  </label>
                </div>
                {useProxy && (
                  <div className="mt-2">
                    <label htmlFor="proxy-url" className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1 transition-colors duration-200`}>
                      プロキシURL:
                    </label>
                    <input
                      id="proxy-url"
                      type="text"
                      className={`w-full p-2 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-200' : 'border-gray-300 bg-white text-gray-800'} rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200`}
                      placeholder="https://cors-proxy.example.com/"
                      value={proxyUrl}
                      onChange={(e) => setProxyUrl(e.target.value)}
                    />
                    <p className={`mt-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} transition-colors duration-200`}>
                      デフォルトはcors-anywhere.herokuapp.comですが、別のプロキシが必要な場合があります。プロキシURLはスラッシュで終わる必要があります。
                    </p>
                  </div>
                )}
                <p id="url-hint" className={`mt-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} transition-colors duration-200`}>
                  注意：CORS制限により直接URLからの取得ができない場合があります。エラーが発生した場合はプロキシオプションを有効にしてください。
                </p>
              </div>
            )}
            
            {/* Advanced Options Toggle */}
            <div className="mt-4">
              <button
                type="button"
                className={`text-sm ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'} focus:outline-none flex items-center transition-colors duration-200`}
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
              <div className={`mt-3 p-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-md animate-fadeIn transition-colors duration-200`}>
                <h3 className={`text-md font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'} mb-2 transition-colors duration-200`}>抽出オプション</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center">
                    <input
                      id="detect-headers"
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      checked={extractionOptions.detectHeaders}
                      onChange={(e) => setExtractionOptions({...extractionOptions, detectHeaders: e.target.checked})}
                    />
                    <label htmlFor="detect-headers" className={`ml-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} transition-colors duration-200`}>
                      テーブルヘッダーを自動検出
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="trim-whitespace"
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      checked={extractionOptions.trimWhitespace}
                      onChange={(e) => setExtractionOptions({...extractionOptions, trimWhitespace: e.target.checked})}
                    />
                    <label htmlFor="trim-whitespace" className={`ml-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} transition-colors duration-200`}>
                      空白を削除
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="ignore-empty-rows"
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      checked={extractionOptions.ignoreEmptyRows}
                      onChange={(e) => setExtractionOptions({...extractionOptions, ignoreEmptyRows: e.target.checked})}
                    />
                    <label htmlFor="ignore-empty-rows" className={`ml-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} transition-colors duration-200`}>
                      空の行を無視
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="convert-special-chars"
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      checked={extractionOptions.convertSpecialChars}
                      onChange={(e) => setExtractionOptions({...extractionOptions, convertSpecialChars: e.target.checked})}
                    />
                    <label htmlFor="convert-special-chars" className={`ml-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} transition-colors duration-200`}>
                      特殊文字を変換
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="include-xbrl-tags"
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      checked={extractionOptions.includeXbrlTags}
                      onChange={(e) => setExtractionOptions({...extractionOptions, includeXbrlTags: e.target.checked})}
                    />
                    <label htmlFor="include-xbrl-tags" className={`ml-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} transition-colors duration-200`}>
                      XBRLタグを抽出
                    </label>
                  </div>
                </div>
                
                <div className="mt-3">
                  <label htmlFor="filename-prefix" className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1 transition-colors duration-200`}>
                    エクスポートファイル名のプレフィックス:
                  </label>
                  <input
                    id="filename-prefix"
                    type="text"
                    className={`w-full sm:w-64 p-2 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-200' : 'border-gray-300 bg-white text-gray-800'} rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200`}
                    placeholder="テーブル抽出"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-start">
              <button
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center shadow-lg transform hover:scale-105 transition-transform"
                onClick={processInput}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="loading-spinner mr-2"></div>
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
            <div className={`mb-6 p-4 ${isDarkMode ? 'bg-red-900 border-red-700 text-red-200' : 'bg-red-50 border-red-500 text-red-700'} border-l-4 rounded-md animate-fadeIn transition-colors duration-200`} role="alert">
              <div className="flex">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span>{error.includes('No tables found') ? 'テーブルが見つかりませんでした。HTMLコンテンツに<table>要素が含まれているか確認してください。' : error}</span>
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
          
          {/* Processing Stats */}
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
                  <div className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} transition-colors duration-200`}>XBRLタグ数</div>
                  <div className={`text-2xl font-semibold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} transition-colors duration-200`}>{processingStats.totalXbrlTags || 0}</div>
                </div>
                <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-3 rounded-md shadow-sm transition-colors duration-200 col-span-2 sm:col-span-4`}>
                  <div className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} transition-colors duration-200`}>処理時間</div>
                  <div className={`text-xl font-semibold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} transition-colors duration-200`}>{processingStats.processingTime}秒</div>
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
                
                <div className="flex flex-wrap gap-2">
                  {/* XBRL Tags Toggle */}
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
                    {showXbrlTags && (
                      <div className="text-xs text-gray-500 mt-1">
                        ※エクスポート時はXBRLタグが別列で表示されます
                      </div>
                    )}
                  </div>
                  
                  {/* View Toggle */}
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
                  
                  <div className="dropdown relative inline-block">
                    <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none transition-colors flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                      </svg>
                      すべてダウンロード
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                      </svg>
                    </button>
                    <div className="dropdown-content hidden absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                      <button 
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                        onClick={() => downloadAllTables('csv')}
                      >
                        CSVでダウンロード
                      </button>
                      <button 
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                        onClick={() => downloadAllTables('json')}
                      >
                        JSONでダウンロード
                      </button>
                      <button 
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                        onClick={() => downloadAllTables('excel')}
                      >
                        Excelでダウンロード
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Table Navigation */}
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
                          ({table.rows.length} 行
                          {table.statistics.xbrlTagCount > 0 && `, ${table.statistics.xbrlTagCount} タグ`})
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Table */}
              {activeTable && (
                <div className={`mb-6 border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} rounded-lg overflow-hidden shadow-sm transition-colors duration-200`} aria-label={ariaLabels.tableContent}>
                  {/* Table Header Bar */}
                  <div className={`p-4 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors duration-200`}>
                    <div>
                      <h3 className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'} transition-colors duration-200`}>テーブル {activeTableIndex + 1}</h3>
                      {currentTableStats && (
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1 transition-colors duration-200`}>
                          {filteredRows.length} / {currentTableStats.totalRows} 行を表示 • 
                          {currentTableStats.columns} 列 • 
                          {currentTableStats.xbrlTagCount > 0 && ` ${currentTableStats.xbrlTagCount} XBRLタグ • `}
                          セルデータ充足率 {Math.round((currentTableStats.nonEmptyCells / currentTableStats.totalCells) * 100)}%
                        </p>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {/* Table Actions */}
                      <div className="dropdown relative inline-block">
                        <button className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                          </svg>
                          エクスポート
                          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                          </svg>
                        </button>
                        <div className="dropdown-content hidden absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                          <button 
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                            onClick={() => downloadCSV(activeTable, activeTableIndex + 1)}
                          >
                            CSVとして保存
                          </button>
                          <button 
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                            onClick={() => downloadJSON(activeTable, activeTableIndex + 1)}
                          >
                            JSONとして保存
                          </button>
                          <button 
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                            onClick={() => downloadExcel(activeTable, activeTableIndex + 1)}
                          >
                            Excelとして保存
                          </button>
                        </div>
                      </div>
                      
                      <div className="dropdown relative inline-block">
                        <button className="px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path>
                          </svg>
                          コピー
                          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                          </svg>
                        </button>
                        <div className="dropdown-content hidden absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                          <button 
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                            onClick={() => copyToClipboard('csv')}
                          >
                            CSVとしてコピー
                          </button>
                          <button 
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                            onClick={() => copyToClipboard('json')}
                          >
                            JSONとしてコピー
                          </button>
                          <button 
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                            onClick={() => copyToClipboard('text')}
                          >
                            テキストとしてコピー
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Search and Filtering */}
                  <div className={`p-4 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b flex flex-col sm:flex-row justify-between items-center gap-3 transition-colors duration-200`}>
                    <div className="w-full sm:w-64 relative">
                      <input
                        type="text"
                        className={`w-full pl-9 pr-3 py-2 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-200' : 'border-gray-300 bg-white text-gray-800'} rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200`}
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
                    
                    {showXbrlTags && (
                      <div className="w-full sm:w-64 relative">
                        <input
                          type="text"
                          className={`w-full pl-9 pr-3 py-2 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-200' : 'border-gray-300 bg-white text-gray-800'} rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200`}
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
                      <label htmlFor="rows-per-page" className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} transition-colors duration-200`}>
                        1ページあたりの行数:
                      </label>
                      <select
                        id="rows-per-page"
                        className={`border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-200' : 'border-gray-300 bg-white text-gray-800'} rounded-md p-1 text-sm transition-colors duration-200`}
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
                  
                  {/* Display XBRL Tag Stats */}
                  {showXbrlTags && activeTable && activeTable.statistics.xbrlTagCount > 0 && (
                    <div className={`p-4 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} border-b transition-colors duration-200`}>
                      <details>
                        <summary className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} cursor-pointer transition-colors duration-200`}>
                          XBRLタグ情報 ({activeTable.statistics.xbrlTagCount}個のタグが見つかりました)
                        </summary>
                        <div className="mt-2 overflow-x-auto max-h-40 overflow-y-auto">
                          <table className={`min-w-full divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'} transition-colors duration-200`}>
                            <thead>
                              <tr>
                                <th className={`px-3 py-2 text-left text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider transition-colors duration-200`}>タグ名</th>
                                <th className={`px-3 py-2 text-left text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider transition-colors duration-200`}>出現回数</th>
                              </tr>
                            </thead>
                            <tbody className={`${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'} divide-y transition-colors duration-200`}>
                              {getXbrlTagCounts(activeTable).map((item, index) => (
                                <tr key={index} className={index % 2 === 0 ? (isDarkMode ? 'bg-gray-900' : 'bg-white') : (isDarkMode ? 'bg-gray-800' : 'bg-gray-50')}>
                                  <td className={`px-3 py-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} transition-colors duration-200`}>
                                    <code>{item.tag}</code>
                                  </td>
                                  <td className={`px-3 py-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} transition-colors duration-200`}>
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
                  
                  {/* Table Display */}
                  <div className="overflow-x-auto table-container">
                    <table className={`min-w-full border-collapse ${tableView === 'compact' ? 'text-xs' : ''} ${isDarkMode ? 'bg-gray-900 text-gray-200' : 'bg-white text-gray-800'} transition-colors duration-200`}>
                      <thead className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} transition-colors duration-200`}>
                        <tr>
                          {activeTable.headers.map((header, idx) => (
                            <th 
                              key={idx} 
                              className={`${tableView === 'compact' ? 'p-2' : 'p-3'} text-sm font-medium ${isDarkMode ? 'text-gray-300 border-gray-700 hover:bg-gray-700' : 'text-gray-700 border-gray-200 hover:bg-gray-100'} border text-left whitespace-nowrap cursor-pointer transition-colors duration-200`}
                              onClick={() => handleSort(idx)}
                            >
                              <div className="flex items-center">
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
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedRows.length > 0 ? (
                          paginatedRows.map((row, rowIdx) => (
                            <tr 
                              key={rowIdx} 
                              className={`${rowIdx % 2 === 0 ? (isDarkMode ? 'bg-gray-900' : 'bg-white') : (isDarkMode ? 'bg-gray-800' : 'bg-gray-50')} transition-colors duration-200`}
                            >
                              {row.map((cell, cellIdx) => (
                                <td 
                                  key={cellIdx} 
                                  className={`${tableView === 'compact' ? 'p-2' : 'p-3'} text-sm ${isDarkMode ? 'text-gray-300 border-gray-700' : 'text-gray-700 border-gray-200'} border transition-colors duration-200`}
                                >
                                  <div>
                                    {cell.value}
                                    {showXbrlTags && cell.xbrlTag && (
                                      <div className={`text-xs ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} mt-1 transition-colors duration-200`}>
                                        {`[${cell.xbrlTag}]`}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              ))}
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td 
                              colSpan={activeTable.headers.length} 
                              className={`p-4 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} transition-colors duration-200`}
                            >
                              {searchTerm || searchXbrlTag ? '検索結果が見つかりません。検索条件を変更してください。' : 'このテーブルにはデータがありません。'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Pagination */}
                  {filteredRows.length > rowsPerPage && (
                    <div className={`p-4 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-t flex justify-between items-center transition-colors duration-200`}>
                      <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} transition-colors duration-200`}>
                        {filteredRows.length}行中 {((currentPage - 1) * rowsPerPage) + 1}～{Math.min(currentPage * rowsPerPage, filteredRows.length)}行目を表示
                      </span>
                      
                      <div className="flex gap-1">
                        <button
                          className={`px-3 py-1 rounded-md border ${isDarkMode ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'} text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200`}
                          onClick={() => handlePageChange(1)}
                          disabled={currentPage === 1}
                          aria-label="最初のページへ"
                        >
                          &laquo;
                        </button>
                        <button
                          className={`px-3 py-1 rounded-md border ${isDarkMode ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'} text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200`}
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          aria-label="前のページへ"
                        >
                          &lsaquo;
                        </button>
                        
                        <span className={`px-3 py-1 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} transition-colors duration-200`}>
                          {totalPages}ページ中 {currentPage}ページ目
                        </span>
                        
                        <button
                          className={`px-3 py-1 rounded-md border ${isDarkMode ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'} text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200`}
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          aria-label="次のページへ"
                        >
                          &rsaquo;
                        </button>
                        <button
                          className={`px-3 py-1 rounded-md border ${isDarkMode ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'} text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200`}
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
        
        {/* Footer */}
        <div className={`${isDarkMode ? 'bg-gray-800 text-gray-400 border-gray-700' : 'bg-gray-50 text-gray-600 border-gray-200'} p-4 text-center text-sm border-t transition-colors duration-200`}>
          XBRL対応テーブル抽出ツール • HTMLからテーブルとXBRLタグを簡単に抽出
          <div className="mt-1 text-xs">◆ ダークモードは右上のアイコンから切り替え可能です</div>
        </div>
      </div>
      
      {/* CSS for Dropdowns */}
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
      `}</style>
    </div>
  );
};

export default XBRLTableExtractor;