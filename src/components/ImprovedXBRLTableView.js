import React, { useState, useEffect, useRef } from 'react';
import { convertXBRLData } from './improved-xbrl-formatter';

const ImprovedXBRLTableView = ({ data, isDarkMode }) => {
  const [processedData, setProcessedData] = useState(null);
  const [viewMode, setViewMode] = useState('comparative'); // 'comparative', 'hierarchical', 'graph'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showXbrlTags, setShowXbrlTags] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedXbrlTag, setSelectedXbrlTag] = useState('');
  const [uniqueXbrlTags, setUniqueXbrlTags] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [expandedSections, setExpandedSections] = useState({});
  const [chartType, setChartType] = useState('bar'); // 'bar', 'line', 'pie'
  const [selectedMainItems, setSelectedMainItems] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const chartRef = useRef(null);
  const [chartLoaded, setChartLoaded] = useState(false);

  // Chart.js ライブラリの読み込み
  useEffect(() => {
    if (!window.Chart && viewMode === 'graph') {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
      script.async = true;
      script.onload = () => {
        setChartLoaded(true);
      };
      document.head.appendChild(script);
    } else if (window.Chart) {
      setChartLoaded(true);
    }
  }, [viewMode]);

  // データの処理
  useEffect(() => {
    if (data) {
      try {
        setLoading(true);
        // 改善されたXBRLフォーマッタを使用してデータを処理
        const result = convertXBRLData(data);
        if (result.success) {
          setProcessedData(result);
          
          // 初期設定でExpandedSectionsを設定
          const initialExpandedState = {};
          if (result.hierarchical && result.hierarchical.data) {
            result.hierarchical.data.forEach((section, index) => {
              initialExpandedState[`level-0-${index}`] = true;
            });
          }
          setExpandedSections(initialExpandedState);
          
          // ユニークなXBRLタグを収集
          const tags = new Set();
          if (result.comparative && result.comparative.comparativeData) {
            result.comparative.comparativeData.forEach(item => {
              if (item.xbrlTag) {
                tags.add(item.xbrlTag);
              }
            });
          }
          setUniqueXbrlTags(Array.from(tags).sort());
          
          // メインアイテム（第1レベル）を選択用に取得
          const mainItems = [];
          if (result.hierarchical && result.hierarchical.data) {
            result.hierarchical.data.forEach(section => {
              if (section.level === 1) {
                mainItems.push({
                  name: section.itemName,
                  previous: section.previousPeriod,
                  current: section.currentPeriod,
                  xbrlTag: section.xbrlTag
                });
              }
            });
          }
          setSelectedMainItems(mainItems.slice(0, 4)); // 最初の4つを選択
          
          setError(null);
        } else {
          setError(result.message);
        }
      } catch (err) {
        setError(`データ処理エラー: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
  }, [data]);

  // 検索用タイマー
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // グラフの描画（DOMの操作を伴うためuseEffect内で実行）
  useEffect(() => {
    if (viewMode === 'graph' && processedData && selectedMainItems.length > 0 && chartRef.current && chartLoaded) {
      try {
        drawChart();
      } catch (err) {
        console.error('グラフ描画エラー:', err);
      }
    }
  }, [viewMode, processedData, selectedMainItems, chartType, isDarkMode, chartLoaded, drawChart]);

  // グラフ描画関数
  const drawChart = () => {
    if (!chartRef.current || !processedData || !window.Chart) return;
    
    const canvas = chartRef.current;
    const ctx = canvas.getContext('2d');
    
    // 既存のグラフがあれば破棄
    if (canvas._chart) {
      canvas._chart.destroy();
    }
    
    // グラフデータの準備
    const labels = selectedMainItems.map(item => item.name);
    const previousData = selectedMainItems.map(item => item.previous || 0);
    const currentData = selectedMainItems.map(item => item.current || 0);
    
    // グラフ共通オプション
    const commonOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: isDarkMode ? '#e5e7eb' : '#1f2937',
            font: {
              size: 12
            }
          }
        },
        title: {
          display: true,
          text: '期間比較',
          color: isDarkMode ? '#e5e7eb' : '#1f2937',
          font: {
            size: 16
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          titleColor: isDarkMode ? '#e5e7eb' : '#1f2937',
          bodyColor: isDarkMode ? '#e5e7eb' : '#1f2937',
          backgroundColor: isDarkMode ? '#374151' : '#ffffff',
          borderColor: isDarkMode ? '#4b5563' : '#e5e7eb',
          borderWidth: 1,
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed !== null) {
                label += new Intl.NumberFormat('ja-JP').format(context.parsed);
              }
              return label;
            }
          }
        }
      },
      scales: chartType !== 'pie' ? {
        x: {
          ticks: {
            color: isDarkMode ? '#e5e7eb' : '#1f2937'
          },
          grid: {
            color: isDarkMode ? '#4b5563' : '#e5e7eb'
          }
        },
        y: {
          ticks: {
            color: isDarkMode ? '#e5e7eb' : '#1f2937',
            callback: function(value) {
              return new Intl.NumberFormat('ja-JP', { 
                notation: 'compact',
                compactDisplay: 'short'
              }).format(value);
            }
          },
          grid: {
            color: isDarkMode ? '#4b5563' : '#e5e7eb'
          }
        }
      } : undefined
    };
    
    // グラフタイプごとの設定
    let chartData;
    let options;
    
    if (chartType === 'pie') {
      // 円グラフの場合、前期と当期の差分を表示
      const diffData = selectedMainItems.map((item, index) => {
        const diff = (item.current || 0) - (item.previous || 0);
        return Math.abs(diff); // 絶対値で表示
      });
      
      chartData = {
        labels: labels,
        datasets: [{
          label: '増減（絶対値）',
          data: diffData,
          backgroundColor: [
            'rgba(54, 162, 235, 0.7)',
            'rgba(255, 99, 132, 0.7)',
            'rgba(255, 206, 86, 0.7)',
            'rgba(75, 192, 192, 0.7)',
            'rgba(153, 102, 255, 0.7)',
            'rgba(255, 159, 64, 0.7)'
          ],
          borderColor: [
            'rgba(54, 162, 235, 1)',
            'rgba(255, 99, 132, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
            'rgba(255, 159, 64, 1)'
          ],
          borderWidth: 1
        }]
      };
      
      options = {
        ...commonOptions
      };
      
      // 円グラフの作成
      canvas._chart = new window.Chart(ctx, {
        type: 'pie',
        data: chartData,
        options: options
      });
    } else {
      // 棒グラフ・線グラフの共通設定
      chartData = {
        labels: labels,
        datasets: [
          {
            label: processedData.hierarchical.metadata.periods.previous,
            data: previousData,
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          },
          {
            label: processedData.hierarchical.metadata.periods.current,
            data: currentData,
            backgroundColor: 'rgba(255, 99, 132, 0.5)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1
          }
        ]
      };
      
      options = {
        ...commonOptions
      };
      
      // 棒グラフ/線グラフの作成
      canvas._chart = new window.Chart(ctx, {
        type: chartType,
        data: chartData,
        options: options
      });
    }
  };

  // フィルタ関数: 検索語とXBRLタグで絞り込み
  const filterItems = (items) => {
    if (!items) return [];
    
    return items.filter(item => {
      // 検索語でフィルタ
      const matchesSearch = !searchTerm || 
        (item.itemName && item.itemName.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // XBRLタグでフィルタ
      const matchesTag = !selectedXbrlTag || 
        (item.xbrlTag && item.xbrlTag === selectedXbrlTag);
      
      return matchesSearch && matchesTag;
    });
  };

  // セクションの展開/折りたたみトグル
  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // メインアイテム選択のトグル
  const toggleMainItemSelection = (item) => {
    setSelectedMainItems(prev => {
      const exists = prev.some(i => i.name === item.name);
      if (exists) {
        return prev.filter(i => i.name !== item.name);
      } else {
        if (prev.length < 6) { // 最大6項目まで選択可能
          return [...prev, item];
        }
        return prev;
      }
    });
  };

  if (loading) {
    return (
      <div className={`p-8 text-center ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mr-2"></div>
        データを処理中...
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 ${isDarkMode ? 'bg-red-900 text-red-200 border-red-800' : 'bg-red-50 text-red-600 border-red-300'} border rounded-md`}>
        エラー: {error}
      </div>
    );
  }

  if (!processedData) {
    return (
      <div className={`p-4 text-center ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        データがありません。有効なXBRLデータを含むHTMLを入力してください。
      </div>
    );
  }

  // フィルタリングされたデータ
  const filteredComparativeData = processedData.comparative ? 
    filterItems(processedData.comparative.comparativeData) : [];

  // レンダリング
  return (
    <div className={`rounded-lg shadow-md overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-white'} transition-colors duration-200`}>
      {/* ヘッダー */}
      <div className={`bg-blue-600 text-white p-4`}>
        <h2 className="text-xl font-bold">{processedData.hierarchical.metadata.reportType}</h2>
        <div className="flex flex-col sm:flex-row justify-between mt-2">
          <span>単位: {processedData.hierarchical.metadata.unit}</span>
          <div className="flex space-x-4 mt-2 sm:mt-0">
            <span>{processedData.hierarchical.metadata.periods.previous}</span>
            <span>{processedData.hierarchical.metadata.periods.current}</span>
          </div>
        </div>
      </div>
      
      {/* ツールバー (デスクトップビュー) */}
      <div className={`${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-200'} p-3 border-b hidden md:flex justify-between items-center transition-colors duration-200`}>
        <div className="flex space-x-2">
          <button 
            className={`px-3 py-1.5 rounded-md transition-colors ${viewMode === 'comparative' ? 'bg-blue-600 text-white' : isDarkMode ? 'bg-gray-600 text-gray-200 hover:bg-gray-500' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            onClick={() => setViewMode('comparative')}
          >
            比較表示
          </button>
          <button 
            className={`px-3 py-1.5 rounded-md transition-colors ${viewMode === 'hierarchical' ? 'bg-blue-600 text-white' : isDarkMode ? 'bg-gray-600 text-gray-200 hover:bg-gray-500' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            onClick={() => setViewMode('hierarchical')}
          >
            階層表示
          </button>
          <button 
            className={`px-3 py-1.5 rounded-md transition-colors ${viewMode === 'graph' ? 'bg-blue-600 text-white' : isDarkMode ? 'bg-gray-600 text-gray-200 hover:bg-gray-500' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            onClick={() => setViewMode('graph')}
          >
            グラフ表示
          </button>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* 検索ボックス */}
          <div className="relative">
            <input
              type="text"
              className={`pl-8 pr-3 py-1 rounded-md text-sm ${isDarkMode ? 'bg-gray-600 border-gray-500 text-gray-100' : 'bg-white border-gray-300 text-gray-800'} border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200`}
              placeholder="検索..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <svg className={`absolute left-2 top-1.5 w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>
          
          {/* XBRLタグフィルタ */}
          {uniqueXbrlTags.length > 0 && (
            <div>
              <select
                className={`py-1 px-2 text-sm rounded-md ${isDarkMode ? 'bg-gray-600 border-gray-500 text-gray-100' : 'bg-white border-gray-300 text-gray-800'} border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200`}
                value={selectedXbrlTag}
                onChange={(e) => setSelectedXbrlTag(e.target.value)}
              >
                <option value="">すべてのXBRLタグ</option>
                {uniqueXbrlTags.map((tag, index) => (
                  <option key={index} value={tag}>{tag}</option>
                ))}
              </select>
            </div>
          )}
          
          {/* XBRLタグ表示トグル */}
          <div className="flex items-center">
            <label className={`flex items-center text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} transition-colors duration-200`}>
              <input
                type="checkbox"
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-colors duration-200"
                checked={showXbrlTags}
                onChange={(e) => setShowXbrlTags(e.target.checked)}
              />
              XBRLタグを表示
            </label>
          </div>
        </div>
      </div>
      
      {/* モバイルハンバーガーメニュー */}
      <div className={`md:hidden ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-200'} p-3 border-b flex justify-between items-center transition-colors duration-200`}>
        <div className="flex space-x-2">
          <button
            className={`px-3 py-1.5 rounded-md transition-colors ${isDarkMode ? 'bg-gray-600 text-gray-200' : 'bg-gray-300 text-gray-700'}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          </button>
        </div>
        
        <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          {viewMode === 'comparative' ? '比較表示' : viewMode === 'hierarchical' ? '階層表示' : 'グラフ表示'}
        </div>
      </div>
      
      {/* モバイルメニューのドロップダウン */}
      {mobileMenuOpen && (
        <div className={`md:hidden ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-200'} p-3 border-b transition-colors duration-200`}>
          <div className="flex flex-col space-y-3">
            <div className="flex space-x-2 justify-between">
              <button 
                className={`flex-1 px-3 py-1.5 rounded-md transition-colors ${viewMode === 'comparative' ? 'bg-blue-600 text-white' : isDarkMode ? 'bg-gray-600 text-gray-200' : 'bg-gray-200 text-gray-700'}`}
                onClick={() => {
                  setViewMode('comparative');
                  setMobileMenuOpen(false);
                }}
              >
                比較表示
              </button>
              <button 
                className={`flex-1 px-3 py-1.5 rounded-md transition-colors ${viewMode === 'hierarchical' ? 'bg-blue-600 text-white' : isDarkMode ? 'bg-gray-600 text-gray-200' : 'bg-gray-200 text-gray-700'}`}
                onClick={() => {
                  setViewMode('hierarchical');
                  setMobileMenuOpen(false);
                }}
              >
                階層表示
              </button>
              <button 
                className={`flex-1 px-3 py-1.5 rounded-md transition-colors ${viewMode === 'graph' ? 'bg-blue-600 text-white' : isDarkMode ? 'bg-gray-600 text-gray-200' : 'bg-gray-200 text-gray-700'}`}
                onClick={() => {
                  setViewMode('graph');
                  setMobileMenuOpen(false);
                }}
              >
                グラフ
              </button>
            </div>
            
            <div className="relative">
              <input
                type="text"
                className={`w-full pl-8 pr-3 py-1 rounded-md text-sm ${isDarkMode ? 'bg-gray-600 border-gray-500 text-gray-100' : 'bg-white border-gray-300 text-gray-800'} border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200`}
                placeholder="検索..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <svg className={`absolute left-2 top-1.5 w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
            
            {uniqueXbrlTags.length > 0 && (
              <select
                className={`w-full py-1 px-2 text-sm rounded-md ${isDarkMode ? 'bg-gray-600 border-gray-500 text-gray-100' : 'bg-white border-gray-300 text-gray-800'} border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200`}
                value={selectedXbrlTag}
                onChange={(e) => setSelectedXbrlTag(e.target.value)}
              >
                <option value="">すべてのXBRLタグ</option>
                {uniqueXbrlTags.map((tag, index) => (
                  <option key={index} value={tag}>{tag}</option>
                ))}
              </select>
            )}
            
            <div className="flex items-center">
              <label className={`flex items-center text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} transition-colors duration-200`}>
                <input
                  type="checkbox"
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-colors duration-200"
                  checked={showXbrlTags}
                  onChange={(e) => setShowXbrlTags(e.target.checked)}
                />
                XBRLタグを表示
              </label>
            </div>
          </div>
        </div>
      )}
      
      {/* グラフ表示モード */}
      {viewMode === 'graph' && (
        <div className={`p-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} transition-colors duration-200`}>
          <div className="mb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex space-x-2">
              <button
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${chartType === 'bar' ? 'bg-blue-600 text-white' : isDarkMode ? 'bg-gray-600 text-gray-200' : 'bg-gray-200 text-gray-700'}`}
                onClick={() => setChartType('bar')}
              >
                棒グラフ
              </button>
              <button
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${chartType === 'line' ? 'bg-blue-600 text-white' : isDarkMode ? 'bg-gray-600 text-gray-200' : 'bg-gray-200 text-gray-700'}`}
                onClick={() => setChartType('line')}
              >
                折れ線グラフ
              </button>
              <button
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${chartType === 'pie' ? 'bg-blue-600 text-white' : isDarkMode ? 'bg-gray-600 text-gray-200' : 'bg-gray-200 text-gray-700'}`}
                onClick={() => setChartType('pie')}
              >
                円グラフ
              </button>
            </div>
            
            <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              ※ 表示する項目を下記から選択してください（最大6項目）
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4">
            {/* グラフ表示エリア */}
            <div className="flex-1 min-h-[300px] md:min-h-[400px]">
              {!chartLoaded ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-2"></div>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>グラフライブラリを読み込み中...</p>
                  </div>
                </div>
              ) : (
                <canvas ref={chartRef} height="400"></canvas>
              )}
            </div>
            
            {/* 項目選択エリア */}
            <div className={`w-full md:w-64 p-3 rounded-md ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} transition-colors duration-200`}>
              <h3 className={`font-medium mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'} transition-colors duration-200`}>
                表示項目の選択
              </h3>
              <div className="max-h-[300px] overflow-y-auto">
                {processedData.hierarchical.data.map((section) => (
                  <div key={section.itemName} className="mb-2">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id={`item-${section.itemName}`}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-colors duration-200"
                        checked={selectedMainItems.some(item => item.name === section.itemName)}
                        onChange={() => toggleMainItemSelection({
                          name: section.itemName,
                          previous: section.previousPeriod,
                          current: section.currentPeriod,
                          xbrlTag: section.xbrlTag
                        })}
                      />
                      <label 
                        htmlFor={`item-${section.itemName}`}
                        className={`ml-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} transition-colors duration-200`}
                      >
                        {section.itemName}
                      </label>
                    </div>
                    {section.children && section.children.length > 0 && (
                      <div className="pl-6 mt-1">
                        {section.children.map((child) => (
                          <div key={child.itemName} className="flex items-center mb-1">
                            <input
                              type="checkbox"
                              id={`item-${child.itemName}`}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-colors duration-200"
                              checked={selectedMainItems.some(item => item.name === child.itemName)}
                              onChange={() => toggleMainItemSelection({
                                name: child.itemName,
                                previous: child.previousPeriod,
                                current: child.currentPeriod,
                                xbrlTag: child.xbrlTag
                              })}
                            />
                            <label 
                              htmlFor={`item-${child.itemName}`}
                              className={`ml-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} transition-colors duration-200`}
                            >
                              {child.itemName}
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 比較表示モード */}
      {viewMode === 'comparative' && (
        <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} transition-colors duration-200`}>
          <div className="overflow-x-auto">
            <table className={`min-w-full divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'} transition-colors duration-200`}>
              <thead className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} transition-colors duration-200`}>
                <tr>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider transition-colors duration-200`}>
                    項目名
                  </th>
                  <th className={`px-6 py-3 text-right text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider transition-colors duration-200`}>
                    {processedData.hierarchical.metadata.periods.previous}
                  </th>
                  <th className={`px-6 py-3 text-right text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider transition-colors duration-200`}>
                    {processedData.hierarchical.metadata.periods.current}
                  </th>
                  <th className={`px-6 py-3 text-right text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider transition-colors duration-200`}>
                    増減
                  </th>
                  <th className={`px-6 py-3 text-right text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider transition-colors duration-200`}>
                    増減率
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'} transition-colors duration-200`}>
                {filteredComparativeData.length > 0 ? (
                  filteredComparativeData.map((item, index) => (
                    <tr 
                      key={index} 
                      className={`${item.level === 1 ? (isDarkMode ? 'bg-gray-700 font-semibold' : 'bg-gray-50 font-semibold') : 
                        index % 2 === 0 ? (isDarkMode ? 'bg-gray-800' : 'bg-white') : 
                        (isDarkMode ? 'bg-gray-750' : 'bg-gray-50')
                      } hover:${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} transition-colors duration-200`}
                    >
                      <td className="px-6 py-2 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className={`${isDarkMode ? 'text-gray-200' : 'text-gray-700'} transition-colors duration-200`}>{item.itemName}</span>
                          {showXbrlTags && item.xbrlTag && (
                            <span className="text-xs text-blue-600">{item.xbrlTag}</span>
                          )}
                        </div>
                      </td>
                      <td className={`px-6 py-2 text-right whitespace-nowrap ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} transition-colors duration-200`}>
                        {formatCurrency(item.previousPeriod)}
                      </td>
                      <td className={`px-6 py-2 text-right whitespace-nowrap ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} transition-colors duration-200`}>
                        {formatCurrency(item.currentPeriod)}
                      </td>
                      <td className="px-6 py-2 text-right whitespace-nowrap">
                        {item.change !== null ? (
                          <span className={getChangeColorClass(item.change, isDarkMode)}>
                            {formatCurrency(item.change, true)}
                          </span>
                        ) : null}
                      </td>
                      <td className={`px-6 py-2 text-right whitespace-nowrap ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} transition-colors duration-200`}>
                        {item.changeRate}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td 
                      colSpan="5" 
                      className={`px-6 py-4 text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} transition-colors duration-200`}
                    >
                      {searchTerm || selectedXbrlTag ? 
                        '検索条件に一致するデータがありません。' : 
                        'データがありません。'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* 検索結果統計 */}
          {(searchTerm || selectedXbrlTag) && filteredComparativeData.length > 0 && (
            <div className={`p-3 ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'} text-sm transition-colors duration-200`}>
              検索結果: {filteredComparativeData.length} 件
              {searchTerm && selectedXbrlTag && (
                <span> (検索語: "{searchTerm}", XBRLタグ: {selectedXbrlTag})</span>
              )}
              {searchTerm && !selectedXbrlTag && (
                <span> (検索語: "{searchTerm}")</span>
              )}
              {!searchTerm && selectedXbrlTag && (
                <span> (XBRLタグ: {selectedXbrlTag})</span>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* 階層表示モード */}
      {viewMode === 'hierarchical' && (
        <div className={`p-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} transition-colors duration-200`}>
          <div className={`mb-4 flex justify-between items-center ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} p-3 rounded-md`}>
            <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              展開/折りたたみには項目名の横の ▼/► をクリックしてください
            </div>
            <div className="flex items-center gap-2">
              <button
                className={`text-sm px-2 py-1 rounded ${isDarkMode ? 'bg-gray-600 text-gray-200 hover:bg-gray-500' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'} transition-colors duration-200`}
                onClick={() => {
                  const newState = {};
                  const collectKeys = (obj) => Object.keys(obj);
                  collectKeys(expandedSections).forEach(key => {
                    newState[key] = true;
                  });
                  setExpandedSections(newState);
                }}
              >
                すべて展開
              </button>
              <button
                className={`text-sm px-2 py-1 rounded ${isDarkMode ? 'bg-gray-600 text-gray-200 hover:bg-gray-500' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'} transition-colors duration-200`}
                onClick={() => {
                  // 第1レベルのみ展開、その他は折りたたむ
                  const newState = {};
                  Object.keys(expandedSections).forEach(key => {
                    if (key.startsWith('level-0-')) {
                      newState[key] = true;
                    } else {
                      newState[key] = false;
                    }
                  });
                  setExpandedSections(newState);
                }}
              >
                すべて折りたたむ
              </button>
            </div>
          </div>
          
          {/* 階層ヘッダー */}
          <div className={`flex justify-between items-center px-4 py-2 font-medium text-sm ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'} rounded-t-md transition-colors duration-200`}>
            <div className="w-1/2 sm:w-2/5">項目名</div>
            <div className="flex justify-end w-1/2 sm:w-3/5">
              <div className="w-1/3 text-right">{processedData.hierarchical.metadata.periods.previous}</div>
              <div className="w-1/3 text-right">{processedData.hierarchical.metadata.periods.current}</div>
              <div className="w-1/3 text-right">増減</div>
            </div>
          </div>
          
          {/* 階層データ */}
          <div className={`border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} rounded-b-md transition-colors duration-200`}>
            {processedData.hierarchical.data.map((section, index) => (
              <RecursiveHierarchicalSection
                key={`section-${index}`}
                section={section}
                showXbrlTags={showXbrlTags}
                sectionId={`level-0-${index}`}
                isExpanded={expandedSections[`level-0-${index}`]}
                toggleSection={toggleSection}
                expandedSections={expandedSections}
                isDarkMode={isDarkMode}
                searchTerm={searchTerm}
                selectedXbrlTag={selectedXbrlTag}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* 注釈 */}
      {processedData.hierarchical.annotations && Object.keys(processedData.hierarchical.annotations).length > 0 && (
        <div className={`p-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} transition-colors duration-200`}>
          <h3 className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2 transition-colors duration-200`}>注釈</h3>
          <ul className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} transition-colors duration-200`}>
            {Object.entries(processedData.hierarchical.annotations).map(([key, value]) => (
              <li key={key} className="mb-1">
                <span className="font-medium">{key}</span>: {value}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// 再帰的な階層セクションコンポーネント
const RecursiveHierarchicalSection = ({ 
  section, 
  showXbrlTags, 
  sectionId,
  isExpanded,
  toggleSection,
  expandedSections,
  isDarkMode,
  level = 0,
  searchTerm,
  selectedXbrlTag
}) => {
  const hasChildren = section.children && section.children.length > 0;
  const paddingLeft = level * 1.5;
  
  // 検索条件によるフィルタリング
  const matchesSearch = !searchTerm || 
    (section.itemName && section.itemName.toLowerCase().includes(searchTerm.toLowerCase()));
  const matchesTag = !selectedXbrlTag || 
    (section.xbrlTag && section.xbrlTag === selectedXbrlTag);
  
  // 子要素の検索結果チェック
  const childrenMatchSearch = hasChildren && section.children.some(child => {
    const childMatchesSearch = !searchTerm || 
      (child.itemName && child.itemName.toLowerCase().includes(searchTerm.toLowerCase()));
    const childMatchesTag = !selectedXbrlTag || 
      (child.xbrlTag && child.xbrlTag === selectedXbrlTag);
    
    return childMatchesSearch && childMatchesTag;
  });
  
  // 検索条件に一致しない場合は表示しない
  if ((searchTerm || selectedXbrlTag) && !matchesSearch && !matchesTag && !childrenMatchSearch) {
    return null;
  }
  
  return (
    <div className={`border-b last:border-b-0 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} transition-colors duration-200`}>
      <div 
        className={`flex items-center p-2 ${
          level === 0 ? (isDarkMode ? 'bg-gray-700 font-semibold' : 'bg-gray-50 font-semibold') : 
          (isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50')
        } transition-colors duration-200`}
        style={{ paddingLeft: `${paddingLeft}rem` }}
      >
        {hasChildren ? (
          <button 
            className={`mr-2 w-5 h-5 flex items-center justify-center text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} transition-colors duration-200`}
            onClick={() => toggleSection(sectionId)}
            aria-label={isExpanded ? '折りたたむ' : '展開する'}
          >
            {isExpanded ? '▼' : '►'}
          </button>
        ) : (
          <div className="mr-2 w-5 h-5"></div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex flex-col">
            <span className={`truncate ${isDarkMode ? 'text-gray-200' : 'text-gray-700'} transition-colors duration-200`}>
              {section.itemName}
            </span>
            {showXbrlTags && section.xbrlTag && (
              <span className="text-xs text-blue-600 truncate">({section.xbrlTag})</span>
            )}
          </div>
        </div>
        
        <div className="flex justify-end space-x-2 sm:space-x-8 ml-2">
          <div className={`text-right ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} transition-colors duration-200`}>
            {formatCurrency(section.previousPeriod)}
          </div>
          <div className={`text-right ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} transition-colors duration-200`}>
            {formatCurrency(section.currentPeriod)}
          </div>
          <div className="text-right">
            {section.previousPeriod !== null && section.currentPeriod !== null ? (
              <span className={getChangeColorClass(section.currentPeriod - section.previousPeriod, isDarkMode)}>
                {formatCurrency(section.currentPeriod - section.previousPeriod, true)}
              </span>
            ) : null}
          </div>
        </div>
      </div>
      
      {isExpanded && hasChildren && (
        <div>
          {section.children.map((child, index) => (
            <RecursiveHierarchicalSection
              key={`${sectionId}-child-${index}`}
              section={child}
              showXbrlTags={showXbrlTags}
              sectionId={`${sectionId}-child-${index}`}
              isExpanded={expandedSections[`${sectionId}-child-${index}`]}
              toggleSection={toggleSection}
              expandedSections={expandedSections}
              isDarkMode={isDarkMode}
              level={level + 1}
              searchTerm={searchTerm}
              selectedXbrlTag={selectedXbrlTag}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// 金額のフォーマット関数
function formatCurrency(value, showSign = false) {
  if (value === null || value === undefined) return '';
  
  const formatter = new Intl.NumberFormat('ja-JP');
  
  if (showSign && value > 0) {
    return `+${formatter.format(value)}`;
  }
  
  return formatter.format(value);
}

// 金額変化の色分けクラスを取得する関数
function getChangeColorClass(change, isDarkMode) {
  if (change > 0) return isDarkMode ? 'text-green-400' : 'text-green-600';
  if (change < 0) return isDarkMode ? 'text-red-400' : 'text-red-600';
  return isDarkMode ? 'text-gray-300' : 'text-gray-700';
}

export default ImprovedXBRLTableView;
