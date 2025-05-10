import React, { useState, useEffect, useMemo } from 'react';

/**
 * 高度なテーブルコンポーネント - ソート、フィルタリング、ページネーション機能付き
 * 
 * @param {Object} props
 * @param {Array} props.columns - カラム定義配列。各オブジェクトには{id, label, accessor, sortable, filterable}が必要
 * @param {Array} props.data - 表示するデータの配列
 * @param {boolean} props.isLoading - 読み込み中状態
 * @param {Function} props.onRowClick - 行クリック時のコールバック
 * @param {number} props.pageSize - 1ページに表示する行数
 * @param {boolean} props.showPagination - ページネーションを表示するかどうか
 * @param {boolean} props.showSearch - 検索フィールドを表示するかどうか
 * @param {String} props.emptyMessage - データがない場合に表示するメッセージ
 */
const Table = ({
  columns = [],
  data = [],
  isLoading = false,
  onRowClick,
  pageSize = 10,
  showPagination = true,
  showSearch = true,
  emptyMessage = 'データがありません',
  className = '',
}) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  // データが変更されたら、ページを1に戻す
  useEffect(() => {
    setCurrentPage(1);
  }, [data, searchTerm]);
  
  // ソート関数
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // 検索＆ソート適用済みのデータ
  const filteredSortedData = useMemo(() => {
    // 検索フィルタリング
    let filteredData = data;
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      
      filteredData = data.filter(item => {
        return columns.some(column => {
          if (!column.filterable) return false;
          
          const cellValue = column.accessor(item);
          return cellValue != null && 
            String(cellValue).toLowerCase().includes(searchLower);
        });
      });
    }
    
    // ソート
    if (sortConfig.key) {
      const sortableColumn = columns.find(col => col.id === sortConfig.key);
      
      if (sortableColumn) {
        filteredData = [...filteredData].sort((a, b) => {
          const aValue = sortableColumn.accessor(a);
          const bValue = sortableColumn.accessor(b);
          
          // null/undefined チェック
          if (aValue == null && bValue == null) return 0;
          if (aValue == null) return 1;
          if (bValue == null) return -1;
          
          // 数値の場合
          if (typeof aValue === 'number' && typeof bValue === 'number') {
            return sortConfig.direction === 'asc' 
              ? aValue - bValue 
              : bValue - aValue;
          }
          
          // 文字列または他の型の場合
          const aString = String(aValue).toLowerCase();
          const bString = String(bValue).toLowerCase();
          
          return sortConfig.direction === 'asc'
            ? aString.localeCompare(bString)
            : bString.localeCompare(aString);
        });
      }
    }
    
    return filteredData;
  }, [data, columns, searchTerm, sortConfig]);
  
  // ページネーション
  const pageCount = Math.ceil(filteredSortedData.length / pageSize);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredSortedData.slice(start, end);
  }, [filteredSortedData, currentPage, pageSize]);
  
  // ページ変更ハンドラー
  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pageCount) return;
    setCurrentPage(newPage);
  };
  
  // ページネーションの表示範囲を計算
  const getPageNumbers = () => {
    const totalPages = pageCount;
    const currentPageNum = currentPage;
    const maxPages = 5; // 最大表示ページ数
    
    if (totalPages <= maxPages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    // 現在のページを中心に表示
    let startPage = Math.max(currentPageNum - Math.floor(maxPages / 2), 1);
    let endPage = startPage + maxPages - 1;
    
    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = Math.max(endPage - maxPages + 1, 1);
    }
    
    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  };
  
  // テーブルの空状態表示
  const renderEmptyState = () => (
    <tr>
      <td colSpan={columns.length} className="table-empty">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-4">
            <div className="loading-spinner mb-2"></div>
            <p>データを読み込み中...</p>
          </div>
        ) : (
          emptyMessage
        )}
      </td>
    </tr>
  );
  
  return (
    <div className={`table-component ${className}`}>
      {/* 検索フィールド */}
      {showSearch && (
        <div className="table-search-container mb-4">
          <div className="form-group-after">
            <input
              type="text"
              placeholder="テーブル内を検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-after form-control-sm"
            />
          </div>
        </div>
      )}
      
      {/* テーブル */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              {columns.map(column => (
                <th key={column.id} className={column.sortable ? 'sortable' : ''}>
                  <div 
                    className="th-content"
                    onClick={() => column.sortable && requestSort(column.id)}
                  >
                    {column.label}
                    {column.sortable && (
                      <span className={`sort-icon ${
                        sortConfig.key === column.id 
                          ? sortConfig.direction === 'asc' 
                            ? 'sort-asc' 
                            : 'sort-desc'
                          : ''
                      }`}>
                        {sortConfig.key === column.id 
                          ? sortConfig.direction === 'asc' ? '↑' : '↓'
                          : '⇅'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length > 0 ? (
              paginatedData.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={onRowClick ? 'cursor-pointer' : ''}
                >
                  {columns.map(column => (
                    <td key={`${rowIndex}-${column.id}`}>
                      {column.accessor(row)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              renderEmptyState()
            )}
          </tbody>
        </table>
      </div>
      
      {/* ページネーション */}
      {showPagination && pageCount > 1 && (
        <div className="table-pagination">
          <div className="pagination-info">
            {`${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, filteredSortedData.length)} / ${filteredSortedData.length}件`}
          </div>
          <div className="pagination">
            <button 
              className="page-link" 
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
            >
              &laquo;
            </button>
            <button 
              className="page-link" 
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              &lsaquo;
            </button>
            
            {getPageNumbers().map(pageNum => (
              <button
                key={pageNum}
                className={`page-link ${pageNum === currentPage ? 'active' : ''}`}
                onClick={() => handlePageChange(pageNum)}
              >
                {pageNum}
              </button>
            ))}
            
            <button 
              className="page-link" 
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === pageCount}
            >
              &rsaquo;
            </button>
            <button 
              className="page-link" 
              onClick={() => handlePageChange(pageCount)}
              disabled={currentPage === pageCount}
            >
              &raquo;
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Table;
