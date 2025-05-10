import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import Papa from 'papaparse';
import './BasicTableView.css';

const BasicTableView = ({ data, isDarkMode }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ column: null, direction: 'asc' });
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [showManipulationTools, setShowManipulationTools] = useState(false);
  const [fileName, setFileName] = useState('テーブル抽出');
  const [tableData, setTableData] = useState(null);

  // Initialize table data from props
  useEffect(() => {
    if (data) {
      setTableData(data);
    }
  }, [data]);

  useEffect(() => {
    // Reset current page when table changes
    setCurrentPage(1);
    // Reset search when table changes
    setSearchTerm('');
    // Reset sort when table changes
    setSortConfig({ column: null, direction: 'asc' });
  }, [data]);

  if (!tableData) {
    return (
      <div className={`p-4 text-center ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        データがありません。テーブルデータを読み込んでください。
      </div>
    );
  }

  // Filter and sort table data for display
  const getFilteredRows = () => {
    let filteredRows = [...tableData.rows];
    
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

  // Get statistics for current table
  const getCurrentTableStats = () => {
    if (!tableData) return null;
    
    const filteredRows = getFilteredRows();
    
    return {
      totalRows: tableData.rows.length,
      filteredRows: filteredRows.length,
      columns: tableData.headers.length,
      nonEmptyCells: tableData.rows.reduce((count, row) => 
        count + row.filter(cell => cell !== '').length, 0
      ),
      totalCells: tableData.rows.length * tableData.headers.length
    };
  };

  // Cell edit functions
  const handleCellEdit = (rowIndex, colIndex) => {
    if (!editMode) return;
    
    setEditingCell({ row: rowIndex, col: colIndex });
    setEditValue(tableData.rows[rowIndex][colIndex]);
  };
  
  const saveEdit = () => {
    if (!editingCell) return;
    
    const { row, col } = editingCell;
    const updatedRows = [...tableData.rows];
    updatedRows[row] = [...updatedRows[row]];
    updatedRows[row][col] = editValue;
    
    setTableData({
      ...tableData,
      rows: updatedRows
    });
    
    // Reset editing state
    setEditingCell(null);
    setEditValue('');
  };
  
  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  // Row selection functions
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

  // Table manipulation
  const addNewRow = () => {
    if (!tableData) return;
    
    const newRow = Array(tableData.headers.length).fill('');
    
    setTableData({
      ...tableData,
      rows: [...tableData.rows, newRow]
    });
  };
  
  const addNewColumn = () => {
    if (!tableData) return;
    
    // Add new header
    const newColumnIndex = tableData.headers.length;
    const updatedHeaders = [...tableData.headers, `列 ${newColumnIndex + 1}`];
    
    // Add empty cell to each row
    const updatedRows = tableData.rows.map(row => [...row, '']);
    
    setTableData({
      ...tableData,
      headers: updatedHeaders,
      rows: updatedRows
    });
  };
  
  const deleteSelectedRows = () => {
    if (!tableData || selectedRows.length === 0) return;
    
    const rowsToKeep = tableData.rows.filter((_, index) => !selectedRows.includes(index));
    
    setTableData({
      ...tableData,
      rows: rowsToKeep
    });
    setSelectedRows([]);
  };
  
  const deleteSelectedColumns = () => {
    if (!tableData || selectedColumns.length === 0) return;
    
    // Filter out selected columns from headers
    const updatedHeaders = tableData.headers.filter((_, index) => !selectedColumns.includes(index));
    
    // Filter out selected columns from each row
    const updatedRows = tableData.rows.map(row => 
      row.filter((_, index) => !selectedColumns.includes(index))
    );
    
    setTableData({
      ...tableData,
      headers: updatedHeaders,
      rows: updatedRows
    });
    setSelectedColumns([]);
  };

  const renameHeader = (headerIndex, newName) => {
    if (!tableData) return;
    
    const updatedHeaders = [...tableData.headers];
    updatedHeaders[headerIndex] = newName;
    
    setTableData({
      ...tableData,
      headers: updatedHeaders
    });
  };
  
  const filterEmptyRows = () => {
    if (!tableData) return;
    
    const filteredRows = tableData.rows.filter(row => 
      row.some(cell => cell.trim && cell.trim() !== '')
    );
    
    setTableData({
      ...tableData,
      rows: filteredRows
    });
  };
  
  const cleanupData = () => {
    if (!tableData) return;
    
    // Clean up each cell:
    // 1. Trim whitespace
    // 2. Normalize number formats
    // 3. Fix common issues
    const cleanedRows = tableData.rows.map(row =>
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
    const cleanedHeaders = tableData.headers.map(header => header.trim());
    
    setTableData({
      ...tableData,
      headers: cleanedHeaders,
      rows: cleanedRows
    });
  };

  // Export functions
  const tableToCSV = () => {
    if (!tableData) return '';
    
    const rows = [tableData.headers, ...tableData.rows];
    return Papa.unparse(rows, {
      quotes: true, // Use quotes around fields
      quoteChar: '"',
      escapeChar: '"',
      delimiter: ",",
      header: true,
      skipEmptyLines: true
    });
  };
  
  const tableToJSON = () => {
    if (!tableData) return '';
    
    const { headers, rows } = tableData;
    const jsonArray = rows.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header || `列 ${index + 1}`] = row[index] || '';
      });
      return obj;
    });
    
    return JSON.stringify(jsonArray, null, 2);
  };
  
  const tableToExcel = () => {
    if (!tableData) return null;
    
    const { headers, rows } = tableData;
    const data = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    
    return wb;
  };

  const downloadCSV = () => {
    if (!tableData) return;
    
    const rows = [tableData.headers, ...tableData.rows];
    const csv = Papa.unparse(rows, {
      quotes: true,
      quoteChar: '"',
      escapeChar: '"',
      delimiter: ",",
      header: true,
      skipEmptyLines: true
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${fileName}.csv`);
  };
  
  const downloadJSON = () => {
    if (!tableData) return;
    
    const json = tableToJSON();
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    saveAs(blob, `${fileName}.json`);
  };
  
  const downloadExcel = () => {
    if (!tableData) return;
    
    const wb = tableToExcel();
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  };

  // Copy to clipboard
  const copyToClipboard = (format) => {
    if (!tableData) return;
    
    let content = '';
    
    if (format === 'csv') {
      const rows = [tableData.headers, ...tableData.rows];
      content = Papa.unparse(rows, {
        quotes: true,
        quoteChar: '"',
        escapeChar: '"',
        delimiter: ",",
        header: true,
        skipEmptyLines: true
      });
    } else if (format === 'json') {
      content = tableToJSON();
    } else if (format === 'text') {
      // Simple text format with tabs
      content = tableData.headers.join('\t') + '\n';
      tableData.rows.forEach(row => {
        content += row.join('\t') + '\n';
      });
    }
    
    navigator.clipboard.writeText(content)
      .catch(err => {
        console.error('クリップボードへのコピーに失敗しました:', err);
      });
  };

  const filteredRows = getFilteredRows();
  const paginatedRows = getPaginatedRows(filteredRows);
  const totalPages = Math.ceil(filteredRows.length / rowsPerPage);
  const currentTableStats = getCurrentTableStats();

  return (
    <div className={`rounded-lg shadow-md overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-white'} transition-colors duration-200`}>
      {/* Table Header */}
      <div className={`bg-blue-600 text-white p-4`}>
        <h2 className="text-xl font-bold">テーブル表示</h2>
        <p className="mt-1 text-sm text-blue-100">テーブルの表示、フィルタリング、ソート、エクスポート</p>
      </div>
      
      {/* Table Control Panel */}
      <div className={`p-4 bg-white border-b flex flex-col sm:flex-row justify-between items-center gap-3 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
        <div className="w-full sm:w-64 relative">
          <input
            type="text"
            className={`w-full pl-9 pr-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              isDarkMode 
                ? 'bg-gray-600 border-gray-500 text-gray-100' 
                : 'bg-white border-gray-300 text-gray-800'
            }`}
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
        
        <div className="flex items-center space-x-2">
          <button 
            className={`px-3 py-1.5 rounded-md transition-colors ${
              isDarkMode 
                ? 'bg-blue-500 text-white hover:bg-blue-600' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
            onClick={() => setShowManipulationTools(!showManipulationTools)}
          >
            <svg className="w-4 h-4 mr-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
            {showManipulationTools ? '編集ツールを隠す' : '編集ツールを表示'}
          </button>
          
          <label htmlFor="rows-per-page" className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            表示:
          </label>
          <select
            id="rows-per-page"
            className={`border rounded-md p-1 text-sm ${
              isDarkMode 
                ? 'bg-gray-600 border-gray-500 text-gray-100' 
                : 'bg-white border-gray-300 text-gray-800'
            }`}
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
      </div>
      
      {/* Table Manipulation Tools */}
      {showManipulationTools && (
        <div className={`p-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} border-b ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
          <h4 className={`font-medium mb-3 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>テーブル操作ツール</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            <button 
              className={`p-2 text-sm rounded ${isDarkMode ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
              onClick={addNewRow}
            >
              <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              行を追加
            </button>
            <button 
              className={`p-2 text-sm rounded ${isDarkMode ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
              onClick={addNewColumn}
            >
              <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              列を追加
            </button>
            <button 
              className={`p-2 text-sm rounded ${isDarkMode ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
              onClick={cleanupData}
            >
              <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path>
              </svg>
              データ整理
            </button>
            <button 
              className={`p-2 text-sm rounded ${isDarkMode ? 'bg-yellow-500 text-white hover:bg-yellow-600' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'}`}
              onClick={filterEmptyRows}
            >
              <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
              </svg>
              空行を削除
            </button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            <button 
              className={`p-2 text-sm rounded disabled:opacity-50 disabled:cursor-not-allowed ${
                isDarkMode 
                  ? 'bg-red-500 text-white hover:bg-red-600' 
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
              }`}
              onClick={deleteSelectedRows}
              disabled={selectedRows.length === 0}
            >
              <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
              選択行を削除 ({selectedRows.length})
            </button>
            <button 
              className={`p-2 text-sm rounded disabled:opacity-50 disabled:cursor-not-allowed ${
                isDarkMode 
                  ? 'bg-red-500 text-white hover:bg-red-600' 
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
              }`}
              onClick={deleteSelectedColumns}
              disabled={selectedColumns.length === 0}
            >
              <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
              選択列を削除 ({selectedColumns.length})
            </button>
            
            <div className="dropdown relative inline-block">
              <button className={`p-2 text-sm rounded w-full text-left ${
                isDarkMode 
                  ? 'bg-indigo-500 text-white hover:bg-indigo-600' 
                  : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
              }`}>
                <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                エクスポート
                <svg className="w-4 h-4 inline-block ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>
              <div className="dropdown-content hidden absolute left-0 mt-1 w-48 rounded-md shadow-lg z-10 border border-gray-200">
                <div className={`py-1 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-100'}`}>
                  <button 
                    className={`block w-full text-left px-4 py-2 text-sm ${
                      isDarkMode 
                        ? 'text-gray-200 hover:bg-gray-600' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={downloadCSV}
                  >
                    CSVとして保存
                  </button>
                  <button 
                    className={`block w-full text-left px-4 py-2 text-sm ${
                      isDarkMode 
                        ? 'text-gray-200 hover:bg-gray-600' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={downloadJSON}
                  >
                    JSONとして保存
                  </button>
                  <button 
                    className={`block w-full text-left px-4 py-2 text-sm ${
                      isDarkMode 
                        ? 'text-gray-200 hover:bg-gray-600' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={downloadExcel}
                  >
                    Excelとして保存
                  </button>
                </div>
              </div>
            </div>
            
            <div className="dropdown relative inline-block">
              <button className={`p-2 text-sm rounded w-full text-left ${
                isDarkMode 
                  ? 'bg-purple-500 text-white hover:bg-purple-600' 
                  : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
              }`}>
                <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path>
                </svg>
                コピー
                <svg className="w-4 h-4 inline-block ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>
              <div className="dropdown-content hidden absolute left-0 mt-1 w-48 rounded-md shadow-lg z-10 border border-gray-200">
                <div className={`py-1 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-100'}`}>
                  <button 
                    className={`block w-full text-left px-4 py-2 text-sm ${
                      isDarkMode 
                        ? 'text-gray-200 hover:bg-gray-600' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => copyToClipboard('csv')}
                  >
                    CSVとしてコピー
                  </button>
                  <button 
                    className={`block w-full text-left px-4 py-2 text-sm ${
                      isDarkMode 
                        ? 'text-gray-200 hover:bg-gray-600' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => copyToClipboard('json')}
                  >
                    JSONとしてコピー
                  </button>
                  <button 
                    className={`block w-full text-left px-4 py-2 text-sm ${
                      isDarkMode 
                        ? 'text-gray-200 hover:bg-gray-600' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => copyToClipboard('text')}
                  >
                    テキストとしてコピー
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <label className={`text-sm mr-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>編集モード:</label>
              <div 
                className={`toggle-switch relative inline-block w-10 h-5 rounded-full transition-colors ${editMode ? 'bg-blue-600' : isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`}
                onClick={() => setEditMode(!editMode)}
                role="switch"
                aria-checked={editMode}
              >
                <span 
                  className={`toggle-switch-handle absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${editMode ? 'transform translate-x-5' : ''}`}
                ></span>
              </div>
              <span className={`ml-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{editMode ? 'オン' : 'オフ'}</span>
            </div>
            
            <button 
              className={`p-1 text-sm ${isDarkMode ? 'text-gray-300 hover:text-gray-100' : 'text-gray-600 hover:text-gray-800'}`}
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
      
      {/* Table Statistics */}
      {currentTableStats && (
        <div className={`px-4 py-2 ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-gray-600'} border-b ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
          <div className="flex flex-wrap justify-between text-sm">
            <span>
              全 {currentTableStats.totalRows} 行
              {searchTerm && ` (フィルタ: ${currentTableStats.filteredRows} 行)`}
            </span>
            <span>
              {currentTableStats.columns} 列、
              データ充足率: {Math.round((currentTableStats.nonEmptyCells / currentTableStats.totalCells) * 100)}%
            </span>
          </div>
        </div>
      )}
      
      {/* Table Display */}
      <div className="overflow-x-auto">
        <table className={`min-w-full border-collapse ${isDarkMode ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-800'}`}>
          <thead className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <tr>
              {editMode && (
                <th className="w-10 p-2 border text-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    onChange={(e) => {
                      if (e.target.checked) {
                        // Select all visible rows
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
              {tableData.headers.map((header, idx) => (
                <th 
                  key={idx} 
                  className={`p-3 text-sm font-medium border text-left whitespace-nowrap cursor-pointer ${
                    isDarkMode 
                      ? 'text-gray-300 border-gray-700 hover:bg-gray-600' 
                      : 'text-gray-700 border-gray-200 hover:bg-gray-100'
                  } ${selectedColumns.includes(idx) ? isDarkMode ? 'bg-blue-800' : 'bg-blue-100' : ''}`}
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
                          className={`w-full p-1 border rounded ${
                            isDarkMode 
                              ? 'bg-gray-600 border-gray-500 text-gray-200' 
                              : 'bg-white border-gray-300 text-gray-800'
                          }`}
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
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.length > 0 ? (
              paginatedRows.map((row, rowIdx) => (
                <tr 
                  key={rowIdx} 
                  className={`
                    ${rowIdx % 2 === 0 
                      ? (isDarkMode ? 'bg-gray-800' : 'bg-white') 
                      : (isDarkMode ? 'bg-gray-750' : 'bg-gray-50')
                    }
                    ${selectedRows.includes(rowIdx) 
                      ? (isDarkMode ? 'bg-blue-800' : 'bg-blue-100') 
                      : (isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-blue-50')
                    }
                  `}
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
                      className={`p-3 text-sm border ${
                        isDarkMode 
                          ? 'text-gray-300 border-gray-700' 
                          : 'text-gray-700 border-gray-200'
                      } ${selectedColumns.includes(cellIdx) ? (isDarkMode ? 'bg-blue-800' : 'bg-blue-100') : ''}`}
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
                  colSpan={editMode ? tableData.headers.length + 1 : tableData.headers.length} 
                  className={`p-4 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
                >
                  {searchTerm ? '検索結果が見つかりません。検索条件を変更してください。' : 'このテーブルにはデータがありません。'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {filteredRows.length > rowsPerPage && (
        <div className={`p-4 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'} border-t flex justify-between items-center`}>
          <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {filteredRows.length}行中 {((currentPage - 1) * rowsPerPage) + 1}～{Math.min(currentPage * rowsPerPage, filteredRows.length)}行目を表示
          </span>
          
          <div className="flex gap-1">
            <button
              className={`px-3 py-1 rounded-md border text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                isDarkMode 
                  ? 'bg-gray-600 text-gray-200 border-gray-500' 
                  : 'bg-white text-gray-700 border-gray-300'
              }`}
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              aria-label="最初のページへ"
            >
              &laquo;
            </button>
            <button
              className={`px-3 py-1 rounded-md border text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                isDarkMode 
                  ? 'bg-gray-600 text-gray-200 border-gray-500' 
                  : 'bg-white text-gray-700 border-gray-300'
              }`}
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label="前のページへ"
            >
              &lsaquo;
            </button>
            
            <span className={`px-3 py-1 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {totalPages}ページ中 {currentPage}ページ目
            </span>
            
            <button
              className={`px-3 py-1 rounded-md border text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                isDarkMode 
                  ? 'bg-gray-600 text-gray-200 border-gray-500' 
                  : 'bg-white text-gray-700 border-gray-300'
              }`}
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              aria-label="次のページへ"
            >
              &rsaquo;
            </button>
            <button
              className={`px-3 py-1 rounded-md border text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                isDarkMode 
                  ? 'bg-gray-600 text-gray-200 border-gray-500' 
                  : 'bg-white text-gray-700 border-gray-300'
              }`}
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              aria-label="最後のページへ"
            >
              &raquo;
            </button>
          </div>
        </div>
      )}
      
      {/* Cell Edit Modal */}
      {editingCell && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-lg p-6 max-w-md w-full ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`text-lg font-medium mb-4 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>セルを編集</h3>
            <div className="mb-4">
              <label htmlFor="cell-edit-input" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                セル値:
              </label>
              <textarea
                id="cell-edit-input"
                className={`w-full p-2 border rounded-md ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-gray-200' 
                    : 'bg-white border-gray-300 text-gray-800'
                }`}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                rows="4"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                className={`px-4 py-2 rounded-md ${
                  isDarkMode 
                    ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                }`}
                onClick={cancelEdit}
              >
                キャンセル
              </button>
              <button
                className={`px-4 py-2 rounded-md ${
                  isDarkMode 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
                onClick={saveEdit}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* CSS for Dropdowns */}
      <style>{`
        .dropdown:hover .dropdown-content {
          display: block;
        }
        
        .toggle-switch {
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default BasicTableView;