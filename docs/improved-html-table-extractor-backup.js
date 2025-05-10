import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import _ from 'lodash';

const HTMLTableExtractor = () => {
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
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ column: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [processingStats, setProcessingStats] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const fileInputRef = useRef(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [fileName, setFileName] = useState('extracted-table');
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [showManipulationTools, setShowManipulationTools] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([]);

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
        setError('No tables found in the HTML content. Check if the content contains <table> elements.');
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
                  
                  // Handle colspan and rowspan
                  const colspan = parseInt(cell.getAttribute('colspan')) || 1;
                  for (let i = 0; i < colspan; i++) {
                    rowData.push(i === 0 ? text : '');
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
                  headers = Array(maxCols).fill(0).map((_, i) => `Column ${i+1}`);
                }
              } else {
                headers = Array(maxCols).fill(0).map((_, i) => `Column ${i+1}`);
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
        setSuccessMessage(`Successfully extracted ${extractedTables.length} tables!`);
        setLoading(false);
      };
      
      processNextBatch();

    } catch (err) {
      setError(`Error parsing HTML: ${err.message}`);
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
        setError('Please select a valid HTML or XML file');
        setFile(null);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      
      if (selectedFile.size > maxSize) {
        setError(`File size exceeds the limit of 15MB. Your file is ${(selectedFile.size / (1024 * 1024)).toFixed(2)}MB`);
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
          setSuccessMessage(`File loaded successfully. ${tableCount} tables detected. Click "Extract Tables" to process.`);
        } catch (err) {
          setError(`Error reading file: ${err.message}`);
        }
      };
      reader.onerror = () => {
        setError('Failed to read the file. Please try again.');
      };
      reader.readAsText(selectedFile);
    }
  };

  // Handle URL fetch with proxy option
  const fetchFromUrl = async () => {
    if (!url) {
      setError('Please enter a URL');
      return;
    }

    // Validate URL
    try {
      new URL(url); // Will throw if invalid
    } catch (e) {
      setError('Please enter a valid URL (e.g., https://example.com)');
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
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const html = await response.text();
      setHtmlContent(html);
      
      // Set filename based on URL
      try {
        const urlObj = new URL(url);
        setFileName(urlObj.hostname.replace('www.', ''));
      } catch (e) {
        setFileName('extracted-table');
      }
      
      extractTables(html);
    } catch (err) {
      let errorMessage = `Error fetching URL: ${err.message}.`;
      
      if (!useProxy && err.message.includes('CORS')) {
        errorMessage += ' CORS error detected. Try enabling the CORS proxy option.';
      } else if (useProxy) {
        errorMessage += ' There was an error using the proxy. The proxy server might be at capacity or the URL might be blocked.';
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
        setError('Please paste some HTML content');
        return;
      }
      extractTables(htmlContent);
    } else if (inputType === 'file') {
      if (!file) {
        setError('Please select a file');
        return;
      }
      // File content is already loaded into htmlContent
      extractTables(htmlContent);
    } else if (inputType === 'url') {
      fetchFromUrl();
    }
  };

  // Convert table to various formats
  const tableToCSV = (table) => {
    if (!table) return '';
    
    const rows = [table.headers, ...table.rows];
    return Papa.unparse(rows, {
      quotes: true, // Use quotes around fields
      quoteChar: '"',
      escapeChar: '"',
      delimiter: ",",
      header: true,
      skipEmptyLines: true
    });
  };
  
  const tableToJSON = (table) => {
    if (!table) return '';
    
    const { headers, rows } = table;
    const jsonArray = rows.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header || `Column ${index + 1}`] = row[index] || '';
      });
      return obj;
    });
    
    return JSON.stringify(jsonArray, null, 2);
  };
  
  const tableToExcel = (table) => {
    if (!table) return null;
    
    const { headers, rows } = table;
    const data = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    
    return wb;
  };

  // Download table in different formats
  const downloadCSV = (table, index) => {
    if (!table) return;
    
    const csv = tableToCSV(table);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${fileName}-table${index}.csv`);
    setSuccessMessage('Table downloaded as CSV!');
  };
  
  const downloadJSON = (table, index) => {
    if (!table) return;
    
    const json = tableToJSON(table);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    saveAs(blob, `${fileName}-table${index}.json`);
    setSuccessMessage('Table downloaded as JSON!');
  };
  
  const downloadExcel = (table, index) => {
    if (!table) return;
    
    const wb = tableToExcel(table);
    XLSX.writeFile(wb, `${fileName}-table${index}.xlsx`);
    setSuccessMessage('Table downloaded as Excel!');
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
          combinedRows.push(['Table ' + (index + 1)]);
          combinedRows.push([]);  // Empty row as separator
        } else {
          combinedRows.push(['Table 1']);
          combinedRows.push([]);
        }
        
        // Add the table data
        combinedRows.push(table.headers);
        combinedRows = [...combinedRows, ...table.rows];
        
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
      saveAs(blob, `${fileName}-all-tables.csv`);
      setSuccessMessage('All tables downloaded as CSV!');
    } else if (format === 'json') {
      // Create an array of tables
      const jsonData = tables.map((table, index) => {
        const rows = table.rows.map(row => {
          const obj = {};
          table.headers.forEach((header, idx) => {
            obj[header || `Column ${idx + 1}`] = row[idx] || '';
          });
          return obj;
        });
        
        return {
          tableName: `Table ${index + 1}`,
          headers: table.headers,
          data: rows
        };
      });
      
      const json = JSON.stringify(jsonData, null, 2);
      const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
      saveAs(blob, `${fileName}-all-tables.json`);
      setSuccessMessage('All tables downloaded as JSON!');
    } else if (format === 'excel') {
      // Create a workbook with multiple sheets
      const wb = XLSX.utils.book_new();
      
      tables.forEach((table, index) => {
        const data = [table.headers, ...table.rows];
        const ws = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, `Table ${index + 1}`);
      });
      
      XLSX.writeFile(wb, `${fileName}-all-tables.xlsx`);
      setSuccessMessage('All tables downloaded as Excel!');
    }
  };

  // Filter and sort table data for display
  const getFilteredRows = (table) => {
    if (!table) return [];
    
    let filteredRows = [...table.rows];
    
    // Apply search filter
    if (searchTerm) {
      const lowercasedSearch = searchTerm.toLowerCase();
      filteredRows = filteredRows.filter(row => 
        row.some(cell => 
          String(cell).toLowerCase().includes(lowercasedSearch)
        )
      );
    }
    
    // Apply sorting
    if (sortConfig.column !== null) {
      filteredRows.sort((a, b) => {
        const aValue = a[sortConfig.column] || '';
        const bValue = b[sortConfig.column] || '';
        
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
      content = table.headers.join('\t') + '\n';
      table.rows.forEach(row => {
        content += row.join('\t') + '\n';
      });
    }
    
    navigator.clipboard.writeText(content)
      .then(() => {
        setSuccessMessage(`Table copied to clipboard as ${format.toUpperCase()}!`);
      })
      .catch(err => {
        setError(`Failed to copy to clipboard: ${err.message}`);
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
        count + row.filter(cell => cell !== '').length, 0
      ),
      totalCells: table.rows.length * table.headers.length
    };
  };
  
  // Table manipulation functions
  const addNewRow = () => {
    if (!tables[activeTableIndex]) return;
    
    const table = {...tables[activeTableIndex]};
    const newRow = Array(table.headers.length).fill('');
    
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
    
    // Add new header
    const newColumnIndex = table.headers.length;
    const updatedHeaders = [...table.headers, `Column ${newColumnIndex + 1}`];
    
    // Add empty cell to each row
    const updatedRows = table.rows.map(row => [...row, '']);
    
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
    
    // Filter out selected columns from headers
    const updatedHeaders = table.headers.filter((_, index) => !selectedColumns.includes(index));
    
    // Filter out selected columns from each row
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
    
    setEditingCell({ row: rowIndex, col: colIndex });
    setEditValue(tables[activeTableIndex].rows[rowIndex][colIndex]);
  };
  
  const saveEdit = () => {
    if (!editingCell) return;
    
    const { row, col } = editingCell;
    const updatedTable = {...tables[activeTableIndex]};
    const updatedRows = [...updatedTable.rows];
    updatedRows[row] = [...updatedRows[row]];
    updatedRows[row][col] = editValue;
    
    updatedTable.rows = updatedRows;
    
    const updatedTables = [...tables];
    updatedTables[activeTableIndex] = updatedTable;
    setTables(updatedTables);
    
    // Reset editing state
    setEditingCell(null);
    setEditValue('');
  };
  
  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };
  
  const transposeTable = () => {
    if (!tables[activeTableIndex]) return;
    
    const table = tables[activeTableIndex];
    
    // Create transposed structure
    // Headers become first column, each row becomes a header
    const transposedHeaders = ['Headers', ...table.rows.map((_, idx) => `Row ${idx + 1}`)];
    
    const transposedRows = [];
    
    // First, create a row for each header
    table.headers.forEach((header, headerIndex) => {
      const newRow = [header]; // First column is the original header
      
      // Add values from each original row
      table.rows.forEach(row => {
        newRow.push(row[headerIndex]);
      });
      
      transposedRows.push(newRow);
    });
    
    const transposedTable = {
      ...table,
      headers: transposedHeaders,
      rows: transposedRows
    };
    
    const updatedTables = [...tables];
    updatedTables[activeTableIndex] = transposedTable;
    setTables(updatedTables);
    setSuccessMessage('テーブルが転置されました');
  };
  
  const sortTableByColumn = (columnIndex) => {
    if (!tables[activeTableIndex]) return;
    
    const table = {...tables[activeTableIndex]};
    const direction = sortConfig.column === columnIndex && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    
    // Sort the rows
    const sortedRows = [...table.rows].sort((a, b) => {
      const aValue = a[columnIndex] || '';
      const bValue = b[columnIndex] || '';
      
      // Check if both values are numbers
      const aNum = parseFloat(aValue);
      const bNum = parseFloat(bValue);
      
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return direction === 'asc' ? aNum - bNum : bNum - aNum;
      }
      
      // String comparison
      const comparison = String(aValue).localeCompare(String(bValue));
      return direction === 'asc' ? comparison : -comparison;
    });
    
    const updatedTable = {
      ...table,
      rows: sortedRows
    };
    
    const updatedTables = [...tables];
    updatedTables[activeTableIndex] = updatedTable;
    setTables(updatedTables);
    setSortConfig({ column: columnIndex, direction });
    setSuccessMessage(`テーブルが「${table.headers[columnIndex]}」列でソートされました`);
  };
  
  const renameHeader = (headerIndex, newName) => {
    if (!tables[activeTableIndex]) return;
    
    const table = {...tables[activeTableIndex]};
    const updatedHeaders = [...table.headers];
    updatedHeaders[headerIndex] = newName;
    
    const updatedTable = {
      ...table,
      headers: updatedHeaders
    };
    
    const updatedTables = [...tables];
    updatedTables[activeTableIndex] = updatedTable;
    setTables(updatedTables);
    setSuccessMessage('ヘッダー名が変更されました');
  };
  
  const filterEmptyRows = () => {
    if (!tables[activeTableIndex]) return;
    
    const table = {...tables[activeTableIndex]};
    const filteredRows = table.rows.filter(row => 
      row.some(cell => cell.trim() !== '')
    );
    
    const updatedTable = {
      ...table,
      rows: filteredRows
    };
    
    const updatedTables = [...tables];
    updatedTables[activeTableIndex] = updatedTable;
    setTables(updatedTables);
    setSuccessMessage('空の行がフィルタリングされました');
  };
  
  const mergeSelectedTables = () => {
    if (tables.length < 2) {
      setError('マージするには少なくとも2つのテーブルが必要です');
      return;
    }
    
    // Create a new table with combined data
    const firstTable = tables[0];
    const allHeaders = [...firstTable.headers];
    
    // Collect all unique headers from all tables
    for (let i = 1; i < tables.length; i++) {
      const table = tables[i];
      table.headers.forEach(header => {
        if (!allHeaders.includes(header)) {
          allHeaders.push(header);
        }
      });
    }
    
    // Create rows with all headers
    const mergedRows = [];
    
    // Process rows from each table
    tables.forEach(table => {
      table.rows.forEach(row => {
        const newRow = Array(allHeaders.length).fill('');
        
        // Map the values to the correct position in the new row
        table.headers.forEach((header, headerIndex) => {
          const targetIndex = allHeaders.indexOf(header);
          newRow[targetIndex] = row[headerIndex];
        });
        
        mergedRows.push(newRow);
      });
    });
    
    // Create the merged table
    const mergedTable = {
      id: 'merged-table',
      headers: allHeaders,
      rows: mergedRows,
      originalTable: '<table></table>',
      statistics: {
        rowCount: mergedRows.length,
        columnCount: allHeaders.length,
        emptyCells: mergedRows.reduce((count, row) => 
          count + row.filter(cell => cell === '').length, 0
        ),
        totalCells: mergedRows.length * allHeaders.length
      }
    };
    
    // Add the merged table to the tables array
    setTables([...tables, mergedTable]);
    setActiveTableIndex(tables.length);
    setSuccessMessage('全てのテーブルがマージされました');
  };
  
  const toggleRowSelection = (rowIndex) => {
    if (selectedRows.includes(rowIndex)) {
      setSelectedRows(selectedRows.filter(idx => idx !== rowIndex));
    } else {
      setSelectedRows([...selectedRows, rowIndex]);
    }
  };
  
  const toggleColumnSelection = (colIndex) => {
    if (selectedColumns.includes(colIndex)) {
      setSelectedColumns(selectedColumns.filter(idx => idx !== colIndex));
    } else {
      setSelectedColumns([...selectedColumns, colIndex]);
    }
  };
  
  const clearSelections = () => {
    setSelectedRows([]);
    setSelectedColumns([]);
  };
  
  const splitTableAtRow = (rowIndex) => {
    if (!tables[activeTableIndex] || rowIndex < 1) return;
    
    const table = tables[activeTableIndex];
    
    // Create two new tables with the same headers
    const firstTableRows = table.rows.slice(0, rowIndex);
    const secondTableRows = table.rows.slice(rowIndex);
    
    const firstTable = {
      ...table,
      id: `${table.id}-part1`,
      rows: firstTableRows,
      statistics: {
        ...table.statistics,
        rowCount: firstTableRows.length,
        totalCells: firstTableRows.length * table.headers.length
      }
    };
    
    const secondTable = {
      ...table,
      id: `${table.id}-part2`,
      rows: secondTableRows,
      statistics: {
        ...table.statistics,
        rowCount: secondTableRows.length,
        totalCells: secondTableRows.length * table.headers.length
      }
    };
    
    // Replace the current table with the two new ones
    const updatedTables = [...tables];
    updatedTables.splice(activeTableIndex, 1, firstTable, secondTable);
    setTables(updatedTables);
    setSuccessMessage(`テーブルが${rowIndex}行目で分割されました`);
  };
  
  const cleanupData = () => {
    if (!tables[activeTableIndex]) return;
    
    const table = {...tables[activeTableIndex]};
    
    // Clean up each cell:
    // 1. Trim whitespace
    // 2. Normalize number formats
    // 3. Fix common issues
    const cleanedRows = table.rows.map(row =>
      row.map(cell => {
        // Convert to string and trim
        let cleanedCell = String(cell).trim();
        
        // Try to normalize number format if it looks like a number
        if (/^-?[\d,.]+$/.test(cleanedCell)) {
          // Remove thousands separators and standardize decimal point
          cleanedCell = cleanedCell.replace(/,/g, '');
          
          // If it's a valid number, format it nicely
          const num = parseFloat(cleanedCell);
          if (!isNaN(num)) {
            // Use default number formatting, or customize as needed
            cleanedCell = num.toString();
          }
        }
        
        // Fix common issues like special characters
        cleanedCell = cleanedCell
          .replace('△', '-')
          .replace('−', '-')
          .replace('　', ' ');
          
        return cleanedCell;
      })
    );
    
    // Clean headers too
    const cleanedHeaders = table.headers.map(header => header.trim());
    
    const updatedTable = {
      ...table,
      headers: cleanedHeaders,
      rows: cleanedRows
    };
    
    const updatedTables = [...tables];
    updatedTables[activeTableIndex] = updatedTable;
    setTables(updatedTables);
    setSuccessMessage('データが整理されました');
  };

  // Prepare aria-labels for accessibility
  const getAriaLabels = () => {
    const labels = {
      inputSection: `HTML input section - Current mode: ${inputType}`,
      tableNavigation: `Table navigation - ${tables.length} tables available`,
      tableContent: tables[activeTableIndex] 
        ? `Table ${activeTableIndex + 1} with ${tables[activeTableIndex].headers.length} columns and ${tables[activeTableIndex].rows.length} rows`
        : 'No table selected'
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
      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
          <h1 className="text-3xl font-bold">HTML Table Extractor Pro</h1>
          <p className="mt-2 text-blue-100">Extract, view, analyze, and export tables from HTML content</p>
        </div>
        
        {/* Main Content Area */}
        <div className="p-6">
          
          {/* Input Selection */}
          <div className="mb-8" aria-labelledby="input-section-label" aria-label={ariaLabels.inputSection}>
            <h2 id="input-section-label" className="text-xl font-semibold text-gray-800 mb-4">Input Source</h2>
            
            <div className="flex flex-wrap gap-2 mb-6">
              <button
                className={`px-4 py-2 rounded-md transition-colors ${inputType === 'paste' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
                onClick={() => setInputType('paste')}
                aria-pressed={inputType === 'paste'}
              >
                Paste HTML
              </button>
              <button
                className={`px-4 py-2 rounded-md transition-colors ${inputType === 'file' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
                onClick={() => setInputType('file')}
                aria-pressed={inputType === 'file'}
              >
                Upload File
              </button>
              <button
                className={`px-4 py-2 rounded-md transition-colors ${inputType === 'url' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
                onClick={() => setInputType('url')}
                aria-pressed={inputType === 'url'}
              >
                Fetch from URL
              </button>
            </div>

            {/* Paste HTML Input */}
            {inputType === 'paste' && (
              <div className="animate-fadeIn">
                <label htmlFor="html-content" className="block text-sm font-medium text-gray-700 mb-1">
                  Paste HTML content containing tables:
                </label>
                <textarea
                  id="html-content"
                  className="w-full h-64 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Paste HTML content here... (e.g., <table><tr><td>Data</td></tr></table>)"
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  aria-describedby="paste-hint"
                />
                <p id="paste-hint" className="mt-1 text-sm text-gray-500">
                  Paste HTML containing &lt;table&gt; elements. You can copy from websites or view source.
                </p>
              </div>
            )}

            {/* File Upload Input */}
            {inputType === 'file' && (
              <div className="animate-fadeIn">
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-8 transition-colors hover:border-blue-400 bg-gray-50">
                  <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h10a2 2 0 012 2v14a2 2 0 01-2 2z"></path>
                  </svg>
                  <p className="mb-2 text-sm text-gray-700">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">HTML, HTM, or XHTML files (Max 15MB)</p>
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
                  <div className="mt-3 flex items-center justify-between p-3 bg-blue-50 rounded-md">
                    <div className="flex items-center">
                      <svg className="w-6 h-6 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                      <span className="text-sm text-gray-700">{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <button
                      className="text-sm text-red-600 hover:text-red-800"
                      onClick={() => {
                        setFile(null);
                        setHtmlContent('');
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                    >
                      Remove
                    </button>
                  </div>
                )}
                <p id="file-hint" className="mt-1 text-sm text-gray-500">
                  Select an HTML file containing tables to extract.
                </p>
              </div>
            )}

            {/* URL Input */}
            {inputType === 'url' && (
              <div className="animate-fadeIn">
                <label htmlFor="url-input" className="block text-sm font-medium text-gray-700 mb-1">
                  Enter URL containing HTML tables:
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-grow">
                    <input
                      id="url-input"
                      type="text"
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://example.com/page-with-tables"
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
                  <label htmlFor="use-proxy" className="ml-2 text-sm text-gray-700">
                    Use CORS proxy (for cross-origin issues)
                  </label>
                </div>
                {useProxy && (
                  <div className="mt-2">
                    <label htmlFor="proxy-url" className="block text-sm font-medium text-gray-700 mb-1">
                      Proxy URL:
                    </label>
                    <input
                      id="proxy-url"
                      type="text"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://cors-proxy.example.com/"
                      value={proxyUrl}
                      onChange={(e) => setProxyUrl(e.target.value)}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Default is cors-anywhere.herokuapp.com, but you may need to use a different proxy. The proxy URL should end with a slash.
                    </p>
                  </div>
                )}
                <p id="url-hint" className="mt-1 text-sm text-gray-500">
                  Note: Direct URL fetching may not work due to CORS restrictions. Enable the proxy option if you encounter errors.
                </p>
              </div>
            )}
            
            {/* Advanced Options Toggle */}
            <div className="mt-4">
              <button
                type="button"
                className="text-sm text-blue-600 hover:text-blue-800 focus:outline-none flex items-center"
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                aria-expanded={showAdvancedOptions}
              >
                <svg className={`w-4 h-4 mr-1 transform ${showAdvancedOptions ? 'rotate-90' : ''} transition-transform`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                </svg>
                Advanced Options
              </button>
            </div>
            
            {/* Advanced Options Panel */}
            {showAdvancedOptions && (
              <div className="mt-3 p-4 bg-gray-50 rounded-md animate-fadeIn">
                <h3 className="text-md font-medium text-gray-700 mb-2">Extraction Options</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center">
                    <input
                      id="detect-headers"
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      checked={extractionOptions.detectHeaders}
                      onChange={(e) => setExtractionOptions({...extractionOptions, detectHeaders: e.target.checked})}
                    />
                    <label htmlFor="detect-headers" className="ml-2 text-sm text-gray-700">
                      Auto-detect table headers
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
                    <label htmlFor="trim-whitespace" className="ml-2 text-sm text-gray-700">
                      Trim whitespace
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
                    <label htmlFor="ignore-empty-rows" className="ml-2 text-sm text-gray-700">
                      Ignore empty rows
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
                    <label htmlFor="convert-special-chars" className="ml-2 text-sm text-gray-700">
                      Convert special characters
                    </label>
                  </div>
                </div>
                
                <div className="mt-3">
                  <label htmlFor="filename-prefix" className="block text-sm font-medium text-gray-700 mb-1">
                    Filename prefix for exports:
                  </label>
                  <input
                    id="filename-prefix"
                    type="text"
                    className="w-full sm:w-64 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="extracted-table"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-start">
              <button
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center"
                onClick={processInput}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Extracting ({extractionProgress}%)
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                    </svg>
                    Extract Tables
                  </>
                )}
              </button>
            </div>
          </div>
          
          {/* Feedback Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-md animate-fadeIn" role="alert">
              <div className="flex">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span>{error}</span>
              </div>
            </div>
          )}
          
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 text-green-700 rounded-md animate-fadeIn" role="alert">
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
            <div className="mb-6 p-4 bg-blue-50 rounded-md animate-fadeIn">
              <h3 className="text-md font-medium text-gray-700 mb-2">Processing Summary</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div className="bg-white p-3 rounded-md shadow-sm">
                  <div className="text-gray-500">Tables Found</div>
                  <div className="text-2xl font-semibold text-blue-600">{processingStats.totalTables}</div>
                </div>
                <div className="bg-white p-3 rounded-md shadow-sm">
                  <div className="text-gray-500">Total Rows</div>
                  <div className="text-2xl font-semibold text-blue-600">{processingStats.totalRows}</div>
                </div>
                <div className="bg-white p-3 rounded-md shadow-sm">
                  <div className="text-gray-500">Total Columns</div>
                  <div className="text-2xl font-semibold text-blue-600">{processingStats.totalColumns}</div>
                </div>
                <div className="bg-white p-3 rounded-md shadow-sm">
                  <div className="text-gray-500">Processing Time</div>
                  <div className="text-2xl font-semibold text-blue-600">{processingStats.processingTime}s</div>
                </div>
              </div>
            </div>
          )}

          {/* Results Section */}
          {tables.length > 0 && (
            <div className="mt-8 animate-fadeIn">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h2 className="text-xl font-semibold text-gray-800">
                  Extracted Tables ({tables.length})
                </h2>
                
                <div className="flex flex-wrap gap-2">
                  <div className="dropdown relative inline-block">
                    <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                      </svg>
                      Download All
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                      </svg>
                    </button>
                    <div className="dropdown-content hidden absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                      <button 
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                        onClick={() => downloadAllTables('csv')}
                      >
                        Download as CSV
                      </button>
                      <button 
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                        onClick={() => downloadAllTables('json')}
                      >
                        Download as JSON
                      </button>
                      <button 
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                        onClick={() => downloadAllTables('excel')}
                      >
                        Download as Excel
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
                            : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                        }`}
                        onClick={() => setActiveTableIndex(index)}
                        aria-pressed={activeTableIndex === index}
                        aria-label={`Table ${index + 1} with ${table.headers.length} columns and ${table.rows.length} rows`}
                      >
                        Table {index + 1}
                        <span className="ml-1 text-xs opacity-80">
                          ({table.rows.length} rows)
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Table */}
              {activeTable && (
                <div className="mb-6 border rounded-lg overflow-hidden shadow-sm" aria-label={ariaLabels.tableContent}>
                  {/* Table Header Bar */}
                  <div className="p-4 bg-gray-50 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h3 className="font-medium text-gray-800">Table {activeTableIndex + 1}</h3>
                      {currentTableStats && (
                        <p className="text-sm text-gray-500 mt-1">
                          {filteredRows.length} of {currentTableStats.totalRows} rows displayed • 
                          {currentTableStats.columns} columns • 
                          {Math.round((currentTableStats.nonEmptyCells / currentTableStats.totalCells) * 100)}% cells with content
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
                          Export
                          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                          </svg>
                        </button>
                        <div className="dropdown-content hidden absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                          <button 
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                            onClick={() => downloadCSV(activeTable, activeTableIndex + 1)}
                          >
                            Export as CSV
                          </button>
                          <button 
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                            onClick={() => downloadJSON(activeTable, activeTableIndex + 1)}
                          >
                            Export as JSON
                          </button>
                          <button 
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                            onClick={() => downloadExcel(activeTable, activeTableIndex + 1)}
                          >
                            Export as Excel
                          </button>
                        </div>
                      </div>
                      
                      <div className="dropdown relative inline-block">
                        <button className="px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path>
                          </svg>
                          Copy
                          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                          </svg>
                        </button>
                        <div className="dropdown-content hidden absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                          <button 
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                            onClick={() => copyToClipboard('csv')}
                          >
                            Copy as CSV
                          </button>
                          <button 
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                            onClick={() => copyToClipboard('json')}
                          >
                            Copy as JSON
                          </button>
                          <button 
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                            onClick={() => copyToClipboard('text')}
                          >
                            Copy as Text
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Search and Filtering */}
                  <div className="p-4 bg-white border-b flex flex-col sm:flex-row justify-between items-center gap-3">
                    <div className="w-full sm:w-64 relative">
                      <input
                        type="text"
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Search table content..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        aria-label="Search table content"
                      />
                      <div className="absolute left-3 top-2.5 text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <label htmlFor="rows-per-page" className="text-sm text-gray-600">
                        Rows per page:
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
                  
                  {/* Manipulation Tools */}
                  {showManipulationTools && (
                    <div className="p-4 bg-gray-50 border-b">
                      <h4 className="font-medium text-gray-800 mb-3">テーブル操作ツール</h4>
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
                          onClick={mergeSelectedTables}
                        >
                          <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                          </svg>
                          テーブルを結合
                        </button>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <label className="text-sm text-gray-600 mr-2">編集モード:</label>
                          <button 
                            className={`w-12 h-6 rounded-full p-1 transition-colors ${editMode ? 'bg-blue-600' : 'bg-gray-300'}`}
                            onClick={() => setEditMode(!editMode)}
                            aria-pressed={editMode}
                            aria-label="Toggle edit mode"
                          >
                            <span className={`block w-4 h-4 rounded-full transition-transform ${editMode ? 'bg-white transform translate-x-6' : 'bg-white'}`}></span>
                          </button>
                          <span className="ml-2 text-sm">{editMode ? 'オン' : 'オフ'}</span>
                        </div>
                        
                        <button 
                          className="p-1 text-gray-600 hover:text-gray-800 text-sm"
                          onClick={clearSelections}
                          disabled={selectedRows.length === 0 && selectedColumns.length === 0}
                        >
                          <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                          </svg>
                          選択をクリア
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Edit Cell Modal */}
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
                  
                  {/* Table Display */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse">
                      <thead className="bg-gray-50">
                        <tr>
                          {editMode && (
                            <th className="w-10 p-2 border text-center">
                              <input
                                type="checkbox"
                                className="h-4 w-4"
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    // Select all rows
                                    setSelectedRows(Array.from({ length: paginatedRows.length }, (_, i) => i));
                                  } else {
                                    // Deselect all rows
                                    setSelectedRows([]);
                                  }
                                }}
                                checked={selectedRows.length === paginatedRows.length && paginatedRows.length > 0}
                              />
                            </th>
                          )}
                          {activeTable.headers.map((header, idx) => (
                            <th 
                              key={idx} 
                              className={`p-3 text-sm font-medium text-gray-700 border text-left whitespace-nowrap cursor-pointer hover:bg-gray-100 ${selectedColumns.includes(idx) ? 'bg-blue-100' : ''}`}
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
                                    <span>{header || `Column ${idx + 1}`}</span>
                                    {sortConfig.column === idx && (
                                      <span className="ml-1">
                                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                      </span>
                                    )}
                                  </>
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
                              className={`${rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${
                                selectedRows.includes(rowIdx) ? 'bg-blue-100' : 'hover:bg-blue-50'
                              }`}
                            >
                              {editMode && (
                                <td className="w-10 p-2 border text-center">
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4"
                                    checked={selectedRows.includes(rowIdx)}
                                    onChange={() => toggleRowSelection(rowIdx)}
                                  />
                                </td>
                              )}
                              {row.map((cell, cellIdx) => (
                                <td 
                                  key={cellIdx} 
                                  className={`p-3 text-sm text-gray-700 border ${
                                    selectedColumns.includes(cellIdx) ? 'bg-blue-100' : ''
                                  }`}
                                  onClick={() => editMode && handleCellEdit(rowIdx, cellIdx)}
                                >
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td 
                              colSpan={editMode ? activeTable.headers.length + 1 : activeTable.headers.length} 
                              className="p-4 text-center text-gray-500"
                            >
                              {searchTerm ? '一致する結果がありません。' : 'データがありません。'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Pagination */}
                  {filteredRows.length > rowsPerPage && (
                    <div className="p-4 bg-white border-t flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, filteredRows.length)} of {filteredRows.length} rows
                      </span>
                      
                      <div className="flex gap-1">
                        <button
                          className="px-3 py-1 rounded-md border text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => handlePageChange(1)}
                          disabled={currentPage === 1}
                          aria-label="Go to first page"
                        >
                          &laquo;
                        </button>
                        <button
                          className="px-3 py-1 rounded-md border text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          aria-label="Go to previous page"
                        >
                          &lsaquo;
                        </button>
                        
                        <span className="px-3 py-1 text-sm">
                          Page {currentPage} of {totalPages}
                        </span>
                        
                        <button
                          className="px-3 py-1 rounded-md border text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          aria-label="Go to next page"
                        >
                          &rsaquo;
                        </button>
                        <button
                          className="px-3 py-1 rounded-md border text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => handlePageChange(totalPages)}
                          disabled={currentPage === totalPages}
                          aria-label="Go to last page"
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
        <div className="bg-gray-50 p-4 text-center text-sm text-gray-600 border-t">
          HTML Table Extractor Pro • Extract tables from HTML content easily
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
      `}</style>
    </div>
  );
};

export default HTMLTableExtractor;