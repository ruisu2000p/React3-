/**
 * 改善されたXBRLデータフォーマッタ
 * XBRLデータを階層構造や意味のある列名を持つより使いやすい形式に変換します
 */

// 列情報の存在チェックと安全なアクセス
function safeGetColumnValue(row, columnName, defaultValue = null) {
  if (!row || typeof row !== 'object') return defaultValue;
  return row.hasOwnProperty(columnName) ? row[columnName] : defaultValue;
}

// 平坦なXBRLデータを階層構造に変換する関数
function restructureXBRLData(flatData) {
  if (!Array.isArray(flatData) || flatData.length === 0) {
    return {
      metadata: {
        reportType: '連結貸借対照表',
        unit: '千円',
        periods: {
          previous: '前連結会計年度',
          current: '当連結会計年度'
        }
      },
      data: []
    };
  }

  // データのヘッダーを特定し、列名を判断
  const firstRow = flatData[0];
  const columnMapping = getColumnMapping(firstRow);

  // 元のデータからメタデータを抽出
  const metadata = {
    reportType: '連結貸借対照表',
    unit: '千円',
    periods: {
      previous: safeGetColumnValue(firstRow, columnMapping.previousPeriod, '前連結会計年度'),
      current: safeGetColumnValue(firstRow, columnMapping.currentPeriod, '当連結会計年度')
    }
  };
  
  // 階層構造を構築するための変数を初期化
  let structure = {
    metadata: metadata,
    data: []
  };
  
  // 現在の階層レベルを追跡する変数
  let currentLevel1 = null;
  let currentLevel2 = null;
  let currentLevel3 = null;
  let currentLevel4 = null;
  let currentLevel5 = null;
  
  // データを処理
  for (let i = 1; i < flatData.length; i++) {
    const row = flatData[i];
    
    // 各列に値があるかどうかでレベルを判断
    if (safeGetColumnValue(row, columnMapping.level1, '').trim() !== '') {
      // 第1階層 (例: 資産の部)
      currentLevel1 = {
        itemName: safeGetColumnValue(row, columnMapping.level1, ''),
        level: 1,
        xbrlTag: safeGetColumnValue(row, columnMapping.level1 + '_XBRL', null),
        previousPeriod: null,
        currentPeriod: null,
        children: []
      };
      
      structure.data.push(currentLevel1);
      currentLevel2 = null;
      currentLevel3 = null;
      currentLevel4 = null;
      currentLevel5 = null;
      
    } else if (safeGetColumnValue(row, columnMapping.level2, '').trim() !== '') {
      // 第2階層 (例: 流動資産)
      currentLevel2 = {
        itemName: safeGetColumnValue(row, columnMapping.level2, ''),
        level: 2,
        xbrlTag: safeGetColumnValue(row, columnMapping.level2 + '_XBRL', null),
        previousPeriod: null,
        currentPeriod: null,
        children: []
      };
      
      if (currentLevel1) {
        currentLevel1.children.push(currentLevel2);
      }
      
      currentLevel3 = null;
      currentLevel4 = null;
      currentLevel5 = null;
      
    } else if (safeGetColumnValue(row, columnMapping.level3, '').trim() !== '') {
      // 第3階層 (例: 現金及び預金)
      currentLevel3 = {
        itemName: safeGetColumnValue(row, columnMapping.level3, ''),
        level: 3,
        xbrlTag: safeGetColumnValue(row, columnMapping.level3 + '_XBRL', null),
        previousPeriod: parseFinancialValue(safeGetColumnValue(row, columnMapping.previousPeriod, null)),
        currentPeriod: parseFinancialValue(safeGetColumnValue(row, columnMapping.currentPeriod, null)),
        children: []
      };
      
      if (currentLevel2) {
        currentLevel2.children.push(currentLevel3);
      } else if (currentLevel1) {
        // 第2レベルがない場合、第1レベルの子として追加
        currentLevel1.children.push(currentLevel3);
      }
      
      currentLevel4 = null;
      currentLevel5 = null;
      
    } else if (safeGetColumnValue(row, columnMapping.level4, '').trim() !== '') {
      // 第4階層
      currentLevel4 = {
        itemName: safeGetColumnValue(row, columnMapping.level4, ''),
        level: 4,
        xbrlTag: safeGetColumnValue(row, columnMapping.level4 + '_XBRL', null),
        previousPeriod: parseFinancialValue(safeGetColumnValue(row, columnMapping.previousPeriod, null)),
        currentPeriod: parseFinancialValue(safeGetColumnValue(row, columnMapping.currentPeriod, null)),
        children: []
      };
      
      if (currentLevel3) {
        currentLevel3.children.push(currentLevel4);
      } else if (currentLevel2) {
        currentLevel2.children.push(currentLevel4);
      } else if (currentLevel1) {
        currentLevel1.children.push(currentLevel4);
      }
      
      currentLevel5 = null;
      
    } else if (safeGetColumnValue(row, columnMapping.level5, '').trim() !== '') {
      // 第5階層
      currentLevel5 = {
        itemName: safeGetColumnValue(row, columnMapping.level5, ''),
        level: 5,
        xbrlTag: safeGetColumnValue(row, columnMapping.level5 + '_XBRL', null),
        previousPeriod: parseFinancialValue(safeGetColumnValue(row, columnMapping.previousPeriod, null)),
        currentPeriod: parseFinancialValue(safeGetColumnValue(row, columnMapping.currentPeriod, null)),
        children: []
      };
      
      if (currentLevel4) {
        currentLevel4.children.push(currentLevel5);
      } else if (currentLevel3) {
        currentLevel3.children.push(currentLevel5);
      } else if (currentLevel2) {
        currentLevel2.children.push(currentLevel5);
      } else if (currentLevel1) {
        currentLevel1.children.push(currentLevel5);
      }
    }
    
    // 合計行の場合、親要素の値を設定
    const level3Value = safeGetColumnValue(row, columnMapping.level3, '');
    if (level3Value && level3Value.includes('合計')) {
      if (currentLevel2) {
        currentLevel2.previousPeriod = parseFinancialValue(safeGetColumnValue(row, columnMapping.previousPeriod, null));
        currentLevel2.currentPeriod = parseFinancialValue(safeGetColumnValue(row, columnMapping.currentPeriod, null));
      }
    }
    
    const level2Value = safeGetColumnValue(row, columnMapping.level2, '');
    if (level2Value && level2Value.includes('合計')) {
      if (currentLevel1) {
        currentLevel1.previousPeriod = parseFinancialValue(safeGetColumnValue(row, columnMapping.previousPeriod, null));
        currentLevel1.currentPeriod = parseFinancialValue(safeGetColumnValue(row, columnMapping.currentPeriod, null));
      }
    }
  }
  
  // 特記事項の抽出（※1、※2など）
  const annotations = extractAnnotations(flatData);
  if (Object.keys(annotations).length > 0) {
    structure.annotations = annotations;
  }
  
  return structure;
}

// データの列構造を解析して列名のマッピングを作成
function getColumnMapping(firstRow) {
  // デフォルトのカラムマッピング
  const defaultMapping = {
    level1: '列 1',
    level2: '列 2',
    level3: '列 3',
    level4: '列 4',
    level5: '列 5',
    previousPeriod: '列 11',
    currentPeriod: '(単位：千円)'
  };
  
  // データがない場合はデフォルトを返す
  if (!firstRow) return defaultMapping;
  
  // データの構造を分析して列を特定
  const mapping = { ...defaultMapping };
  
  // オブジェクトのキーを調べる
  const keys = Object.keys(firstRow);
  
  // 前期と当期のカラムを特定
  let lastColumnIndex = -1;
  let secondLastColumnIndex = -1;
  
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    
    // XBRLタグ列は無視
    if (key.endsWith('_XBRL')) continue;
    
    // 前期と当期のカラムを探す
    if (key.includes('前期') || key.includes('前連結') || key.includes('前年度')) {
      mapping.previousPeriod = key;
    } else if (key.includes('当期') || key.includes('当連結') || key.includes('当年度') || key.includes('単位')) {
      mapping.currentPeriod = key;
    }
    
    // 番号付き列名を確認してレベル列を特定
    if (key.match(/^列\s*\d+$/)) {
      const columnNumber = parseInt(key.replace(/[^0-9]/g, ''));
      if (columnNumber === 1) mapping.level1 = key;
      else if (columnNumber === 2) mapping.level2 = key;
      else if (columnNumber === 3) mapping.level3 = key;
      else if (columnNumber === 4) mapping.level4 = key;
      else if (columnNumber === 5) mapping.level5 = key;
      else if (columnNumber > lastColumnIndex) {
        secondLastColumnIndex = lastColumnIndex;
        lastColumnIndex = columnNumber;
      }
    }
  }
  
  // 列名が特定できない場合、最後の列を当期、その前を前期とする
  if (lastColumnIndex > 0 && !mapping.currentPeriod.match(/当期|当連結|単位/)) {
    mapping.currentPeriod = `列 ${lastColumnIndex}`;
  }
  if (secondLastColumnIndex > 0 && !mapping.previousPeriod.match(/前期|前連結/)) {
    mapping.previousPeriod = `列 ${secondLastColumnIndex}`;
  }
  
  return mapping;
}

// 金額を適切な形式に変換する関数
function parseFinancialValue(value) {
  if (!value) return null;
  
  // 文字列でない場合は文字列に変換
  value = String(value);
  
  // カンマを削除し、数値に変換
  value = value.replace(/,/g, '');
  
  // 特記事項の注釈（※1など）を取り除く
  value = value.replace(/※\d+,?/g, '').trim();
  
  // 数値に変換できるか試みる
  const numValue = parseFloat(value);
  if (!isNaN(numValue)) {
    return numValue;
  }
  
  // 数値に変換できない場合、元の値を返す
  return value;
}

// 特記事項（※1など）を抽出する関数
function extractAnnotations(data) {
  const annotations = {};
  const annotationRegex = /※(\d+)/g;
  
  data.forEach(row => {
    if (!row) return;
    
    Object.entries(row).forEach(([key, value]) => {
      if (value && typeof value === 'string') {
        // 正規表現で※1などを検索
        let match;
        while ((match = annotationRegex.exec(value)) !== null) {
          const annotationNumber = match[1];
          if (!annotations[`※${annotationNumber}`]) {
            annotations[`※${annotationNumber}`] = "注釈の詳細情報が利用できません。元の財務諸表を参照してください。";
          }
        }
      }
    });
  });
  
  return annotations;
}

// データを比較しやすい形式に変換する関数
function createComparativeFormat(hierarchicalData) {
  // フラットなテーブル表示用のデータを作成
  const comparativeData = [];
  
  function processNode(node, indent = 0) {
    if (!node) return;
    
    const row = {
      itemName: '　'.repeat(indent) + node.itemName,
      level: node.level,
      xbrlTag: node.xbrlTag,
      previousPeriod: node.previousPeriod,
      currentPeriod: node.currentPeriod,
      change: node.previousPeriod !== null && node.currentPeriod !== null ? 
        node.currentPeriod - node.previousPeriod : null,
      changeRate: node.previousPeriod !== null && node.currentPeriod !== null && node.previousPeriod !== 0 ? 
        ((node.currentPeriod - node.previousPeriod) / node.previousPeriod * 100).toFixed(2) + '%' : null
    };
    
    comparativeData.push(row);
    
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => {
        processNode(child, indent + 1);
      });
    }
  }
  
  if (hierarchicalData.data && Array.isArray(hierarchicalData.data)) {
    hierarchicalData.data.forEach(node => {
      processNode(node);
    });
  }
  
  return {
    metadata: hierarchicalData.metadata,
    comparativeData: comparativeData,
    annotations: hierarchicalData.annotations
  };
}

// イベントハンドラー: XBRLデータの変換処理
function convertXBRLData(xbrlData) {
  try {
    // 入力データをパース（文字列の場合）
    let parsedData = xbrlData;
    if (typeof xbrlData === 'string') {
      parsedData = JSON.parse(xbrlData);
    }
    
    // データを階層構造に変換
    const hierarchicalData = restructureXBRLData(parsedData);
    
    // 比較表示用のフォーマットに変換
    const comparativeData = createComparativeFormat(hierarchicalData);
    
    return {
      hierarchical: hierarchicalData,
      comparative: comparativeData,
      success: true,
      message: "XBRLデータの変換が完了しました。"
    };
  } catch (error) {
    console.error("XBRLデータの変換中にエラーが発生しました:", error);
    return {
      success: false,
      message: `変換エラー: ${error.message}`,
      error: error
    };
  }
}

// モジュールのエクスポート
export {
  convertXBRLData,
  restructureXBRLData,
  createComparativeFormat
};