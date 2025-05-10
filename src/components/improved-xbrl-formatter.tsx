/**
 * 改善されたXBRLデータフォーマッタ
 * XBRLデータを階層構造や意味のある列名を持つより使いやすい形式に変換します
 */

interface XBRLItem {
  itemName: string;
  level: number;
  xbrlTag: string | null;
  previousPeriod: number | string | null;
  currentPeriod: number | string | null;
  children: XBRLItem[];
}

interface XBRLMetadata {
  reportType: string;
  unit: string;
  periods: {
    previous: string;
    current: string;
  };
}

interface XBRLStructure {
  metadata: XBRLMetadata;
  data: XBRLItem[];
  annotations?: Record<string, string>;
}

interface ComparativeRow {
  itemName: string;
  level: number;
  xbrlTag: string | null;
  previousPeriod: number | string | null;
  currentPeriod: number | string | null;
  change: number | string | null;
  changeRate: string | null;
}

interface ComparativeFormat {
  metadata: XBRLMetadata;
  comparativeData: ComparativeRow[];
  annotations?: Record<string, string>;
}

interface ColumnMapping {
  level1: string;
  level2: string;
  level3: string;
  level4: string;
  level5: string;
  previousPeriod: string;
  currentPeriod: string;
}

interface ConversionResult {
  hierarchical?: XBRLStructure;
  comparative?: ComparativeFormat;
  success: boolean;
  message: string;
  error?: Error;
}

function safeGetColumnValue(row: Record<string, any> | null | undefined, columnName: string, defaultValue: any = null): any {
  if (!row || typeof row !== 'object') return defaultValue;
  return row.hasOwnProperty(columnName) ? row[columnName] : defaultValue;
}

function restructureXBRLData(flatData: any[]): XBRLStructure {
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

  const firstRow = flatData[0];
  const columnMapping = getColumnMapping(firstRow);

  const metadata: XBRLMetadata = {
    reportType: '連結貸借対照表',
    unit: '千円',
    periods: {
      previous: safeGetColumnValue(firstRow, columnMapping.previousPeriod, '前連結会計年度'),
      current: safeGetColumnValue(firstRow, columnMapping.currentPeriod, '当連結会計年度')
    }
  };
  
  let structure: XBRLStructure = {
    metadata: metadata,
    data: []
  };
  
  let currentLevel1: XBRLItem | null = null;
  let currentLevel2: XBRLItem | null = null;
  let currentLevel3: XBRLItem | null = null;
  let currentLevel4: XBRLItem | null = null;
  let currentLevel5: XBRLItem | null = null;
  
  for (let i = 1; i < flatData.length; i++) {
    const row = flatData[i];
    
    if (safeGetColumnValue(row, columnMapping.level1, '').trim() !== '') {
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
        currentLevel1.children.push(currentLevel3);
      }
      
      currentLevel4 = null;
      currentLevel5 = null;
      
    } else if (safeGetColumnValue(row, columnMapping.level4, '').trim() !== '') {
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
  
  const annotations = extractAnnotations(flatData);
  if (Object.keys(annotations).length > 0) {
    structure.annotations = annotations;
  }
  
  return structure;
}

function getColumnMapping(firstRow: Record<string, any> | null | undefined): ColumnMapping {
  const defaultMapping: ColumnMapping = {
    level1: '列 1',
    level2: '列 2',
    level3: '列 3',
    level4: '列 4',
    level5: '列 5',
    previousPeriod: '列 11',
    currentPeriod: '(単位：千円)'
  };
  
  if (!firstRow) return defaultMapping;
  
  const mapping: ColumnMapping = { ...defaultMapping };
  
  const keys = Object.keys(firstRow);
  
  let lastColumnIndex = -1;
  let secondLastColumnIndex = -1;
  
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    
    if (key.endsWith('_XBRL')) continue;
    
    if (key.includes('前期') || key.includes('前連結') || key.includes('前年度')) {
      mapping.previousPeriod = key;
    } else if (key.includes('当期') || key.includes('当連結') || key.includes('当年度') || key.includes('単位')) {
      mapping.currentPeriod = key;
    }
    
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
  
  if (lastColumnIndex > 0 && !mapping.currentPeriod.match(/当期|当連結|単位/)) {
    mapping.currentPeriod = `列 ${lastColumnIndex}`;
  }
  if (secondLastColumnIndex > 0 && !mapping.previousPeriod.match(/前期|前連結/)) {
    mapping.previousPeriod = `列 ${secondLastColumnIndex}`;
  }
  
  return mapping;
}

function parseFinancialValue(value: any): number | string | null {
  if (!value) return null;
  
  value = String(value);
  
  value = value.replace(/,/g, '');
  
  value = value.replace(/※\d+,?/g, '').trim();
  
  const numValue = parseFloat(value);
  if (!isNaN(numValue)) {
    return numValue;
  }
  
  return value;
}

function extractAnnotations(data: any[]): Record<string, string> {
  const annotations: Record<string, string> = {};
  const annotationRegex = /※(\d+)/g;
  
  data.forEach(row => {
    if (!row) return;
    
    Object.entries(row).forEach(([key, value]) => {
      if (value && typeof value === 'string') {
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

function createComparativeFormat(hierarchicalData: XBRLStructure): ComparativeFormat {
  const comparativeData: ComparativeRow[] = [];
  
  function processNode(node: XBRLItem, indent = 0): void {
    if (!node) return;
    
    const row: ComparativeRow = {
      itemName: '　'.repeat(indent) + node.itemName,
      level: node.level,
      xbrlTag: node.xbrlTag,
      previousPeriod: node.previousPeriod,
      currentPeriod: node.currentPeriod,
      change: node.previousPeriod !== null && node.currentPeriod !== null && 
              typeof node.previousPeriod === 'number' && typeof node.currentPeriod === 'number' ? 
        node.currentPeriod - node.previousPeriod : null,
      changeRate: node.previousPeriod !== null && node.currentPeriod !== null && 
                  typeof node.previousPeriod === 'number' && typeof node.currentPeriod === 'number' && 
                  node.previousPeriod !== 0 ? 
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

function convertXBRLData(xbrlData: any[] | string): ConversionResult {
  try {
    let parsedData: any[] = xbrlData as any[];
    if (typeof xbrlData === 'string') {
      parsedData = JSON.parse(xbrlData);
    }
    
    const hierarchicalData = restructureXBRLData(parsedData);
    
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
      message: `変換エラー: ${(error as Error).message}`,
      error: error as Error
    };
  }
}

export {
  convertXBRLData,
  restructureXBRLData,
  createComparativeFormat
};
