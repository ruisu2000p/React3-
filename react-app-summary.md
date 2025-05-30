# HTMLテーブル抽出ツール統合版

## 概要

HTMLテーブル抽出ツール統合版は、HTML文書からテーブルを抽出し、様々な形式で表示・編集・エクスポートするためのReactアプリケーションです。特にXBRL（eXtensible Business Reporting Language）タグを含む財務諸表の処理に特化した機能を持ち、データの階層構造表示や年度間比較などの高度な分析機能を提供します。

## 主な機能

### 1. 入力機能
- **複数の入力方法**: HTMLテキストの直接貼り付け、ファイルアップロード、URLからの取得
- **URLからの取得時にCORSプロキシ対応**: クロスオリジン制限を回避するためのプロキシ機能

### 2. 抽出・処理機能
- **HTMLテーブルの自動抽出**: 複数のテーブルを一度に処理可能
- **XBRLタグの検出と抽出**: 財務データに関連付けられたXBRLタグを自動認識
- **データクリーニング**: 空白の削除、特殊文字の変換（△→-など）
- **インテリジェント処理**: 最も関連性の高い財務テーブルを自動選択

### 3. 表示機能
- **通常のテーブル表示**: シンプルな表形式での表示
- **階層構造表示**: 財務データを適切な階層構造で表示（改善版XBRL抽出ツール）
- **前期・当期の比較表示**: 財務データの期間比較を視覚的に表示
- **ダークモード対応**: システム設定に合わせた外観の切り替え

### 4. 編集機能
- **行・列の追加/削除**: テーブルの構造編集
- **セルの編集**: 個別セルの内容編集
- **テーブルの転置**: 行と列を入れ替える機能
- **データクリーンアップ**: 自動データ整形機能

### 5. エクスポート機能
- **多様な形式でのエクスポート**: CSV、JSON、Excel形式
- **階層構造データのエクスポート**: XBRL財務データを構造化して保存
- **クリップボードへのコピー**: テーブルデータを様々な形式でコピー

## 統合ツール一覧

アプリは4つの主要ツールを統合しています：

### 1. 標準テーブル抽出（HTMLTableExtractor）
- 基本的なHTMLテーブル抽出・表示・編集機能
- あらゆるHTMLテーブルに対応する汎用ツール
- 豊富な編集・操作オプション

### 2. XBRL対応テーブル抽出（XBRLTableExtractor）
- XBRLタグ対応の基本的なテーブル抽出ツール
- 財務データのXBRLタグを認識

### 3. 改善版XBRL抽出（ImprovedXBRLTableExtractor）
- 財務データに特化した高度な抽出・表示ツール
- 階層構造表示、前期・当期の比較機能
- インテリジェントな財務データ処理

### 4. テーブル表示（TableViewApp）
- シンプルなテーブル表示・編集ツール
- 軽量で基本的な機能に絞ったインターフェース

## 技術スタック

- **フロントエンド**: React 18
- **UI**: Tailwind CSS
- **データ処理**:
  - XLSX (Excel操作)
  - Papa Parse (CSV処理)
  - File Saver (ファイル保存)
  - Lodash (ユーティリティ関数)

## 特記事項

### Content Security Policy (CSP) 対応
- evalの使用制限に対応するための設定
- img-srcディレクティブの適切な設定

### JSX警告の修正
- 非ブール属性「jsx」にブール値を渡す問題の修正
- Babel変換プラグインによる対応

## 導入・使用方法

1. 上部のナビゲーションから目的に合ったツールを選択
2. 入力方法（テキスト貼り付け、ファイルアップロード、URL）を選択
3. 必要に応じて詳細オプションを設定
4. 「テーブルを抽出」ボタンで処理を開始
5. 抽出されたテーブルを確認・編集
6. 適切な形式でエクスポート

## 特に優れている点

- **XBRL対応**: 財務諸表のXBRLタグを認識し、構造化データとして処理できる
- **ユーザーフレンドリーなUI**: 直感的な操作性と見やすいデザイン
- **多機能性**: 単純な表示から高度な分析まで幅広いニーズに対応
- **複数ツールの統合**: 目的に応じて最適なツールを選択できる柔軟性

このアプリケーションは、特に財務データの抽出・分析に強みを持ち、XBRLタグを含む財務諸表からデータを効率的に抽出し、構造化された形式で表示・分析・エクスポートすることができます。
