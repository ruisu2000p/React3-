# HTML Table Extractor (統合版) / React3-app

HTML文書からテーブルを抽出し、様々な形式で表示・編集・エクスポートするための統合ツールです。XBRL対応の財務データ抽出機能も備えています。

## 機能

* HTML文書からテーブルを抽出
* XBRLタグの認識と抽出
* 財務データの階層構造表示
* 前期と当期の比較表示
* グラフによるデータ可視化
* CSV、JSON、Excelへのエクスポート
* テーブル編集機能
* ダークモード対応

## 使用技術

* React 18
* Tailwind CSS
* XLSX (Excel操作)
* Papa Parse (CSV処理)
* File Saver (ファイル保存)
* Lodash (ユーティリティ)

## インストール

```bash
# リポジトリのクローン
git clone https://github.com/yourusername/html-table-extractor.git
cd html-table-extractor

# 依存パッケージのインストール
npm install

# 開発サーバーの起動
npm start
```

## 統合ツール一覧

1. **標準テーブル抽出**:
   シンプルなHTMLテーブル抽出・編集ツール

2. **XBRL対応テーブル抽出**:
   XBRLタグを認識可能な抽出ツール

3. **改善版XBRL抽出（推奨）**:
   財務データを階層構造で表示、年度比較、グラフ表示機能付き

4. **テーブル表示**:
   軽量でシンプルなテーブル表示・編集ツール

## 修正された問題

### Content Security Policy (CSP) evalの修正

- **問題**: `Content Security Policy of your site blocks the use of 'eval' in JavaScript`
  
- **修正方法**:
  1. `public/index.html`にCSPメタタグを追加
  2. webpack設定の変更 (`config-overrides.js`)
  3. `package.json`に新しいスクリプトを追加:
     - `start:no-eval` - evalを使用しない開発サーバー起動コマンド
     - `build:no-eval` - evalを使用しないビルドコマンド

- **使用方法**:
  ```bash
  # 必要なパッケージのインストール
  npm install --save-dev react-app-rewired
  
  # アプリの起動（eval制限対応版）
  npm run start:no-eval
  
  # アプリのビルド（eval制限対応版）
  npm run build:no-eval
  ```

### Content Security Policy (CSP) - 画像リソースの制限問題修正

- **問題**: `img-src`ディレクティブが適切に設定されていないため、画像リソースがブロックされる

- **修正方法**:
  - `public/index.html`のCSPメタタグを更新し、`img-src`ディレクティブを追加
  ```html
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: localhost:* blob:; connect-src 'self' https://cors-anywhere.herokuapp.com">
  ```

### JSX警告の修正

- **問題**: 非ブール属性「jsx」にブール値「true」を渡すことによる警告
  ```
  Warning: Received 'true' for a non-boolean attribute 'jsx'.
  ```

- **修正方法**:
  1. `fixJSXWarning.js`を作成して警告を抑制（一時的対応）
  2. 問題のコンポーネントを直接修正（推奨）:
  ```jsx
  // 問題のコード
  <Element jsx={true} />
  
  // 修正後
  <Element jsx="true" />
  ```

### 強化されたJSX修正（総合対策）

以下の複合的なアプローチを実装:

1. **Babel変換プラグイン** (`babel-jsx-fix.js`)
2. **Babel設定ファイル** (`.babelrc`)
3. **Webpack設定のカスタマイズ** (`config-overrides.js`)
4. **React DOM内部のモンキーパッチ** (`fixJSXWarning.js`)

## 使い方

1. 上部のナビゲーションから利用したいツールを選択
2. HTMLの入力方法を選択（テキスト貼り付け、ファイルアップロード、URL入力）
3. 「テーブルを抽出」ボタンをクリックして処理を開始
4. 抽出されたテーブルを確認、必要に応じて編集
5. 適切な形式でエクスポート

## 注意事項

* 大きなファイルを処理する場合、ブラウザによってはパフォーマンスが低下する場合があります
* CORSポリシーの制限により、一部のURLからは直接データを取得できない場合があります（プロキシオプションを使用してください）
* XBRLタグの抽出は、適切にマークアップされたHTMLドキュメントでのみ機能します
* 本番環境では、より制限の厳しいCSPポリシーを使用し、可能な限り`unsafe-eval`の使用を避けるべきです

## ライセンス

MIT License
