# プロジェクト整理の記録

このファイルは、プロジェクトのファイル整理作業の記録です。

## 実施した作業

### 2025年5月9日の整理

1. **重複するREADMEファイルの整理**
   - 複数のREADMEファイルの内容を統合
   - メインのREADME.mdファイルに全ての重要情報を統合
   - 個別のREADMEファイルはdocsディレクトリに移動して保存

2. **バックアップファイルの管理**
   - `.bak`拡張子のファイルをdocsディレクトリに移動
   - ファイル名を意味のある名前に変更

3. **ディレクトリ構造の整理**
   - `docs`ディレクトリを作成してドキュメントを整理
   - ルートディレクトリをクリーンに保持

## 移動されたファイル

以下のファイルが移動されました：

- `html-table-extractor-spec.md.bak` → `docs/html-table-extractor-spec.md`
- `improved-html-table-extractor.js.bak` → `docs/improved-html-table-extractor-backup.js`
- `README_CSP_FIX.md` → `docs/README_CSP_FIX-archive.md`
- `README_CSP_IMG_FIX.md` → `docs/README_CSP_IMG_FIX-archive.md` 
- `README_JSX_FIX.md` → `docs/README_JSX_FIX-archive.md`
- `README_JSX_FIX_ENHANCED.md` → `docs/README_JSX_FIX_ENHANCED-archive.md`

## 現在のプロジェクト構造

```
react2/
├── .babelrc                      # Babel設定ファイル
├── .gitignore                    # Gitの無視ファイル設定
├── babel-jsx-fix.js              # JSX修正用Babelプラグイン
├── build/                        # ビルド出力ディレクトリ
├── config-overrides.js           # Webpack設定カスタマイズファイル
├── docs/                         # ドキュメントディレクトリ
│   ├── html-table-extractor-spec.md        # 仕様書
│   ├── improved-html-table-extractor-backup.js  # バックアップコード
│   ├── README_CSP_FIX-archive.md           # 過去のREADME (CSP修正)
│   ├── README_CSP_IMG_FIX-archive.md       # 過去のREADME (画像CSP修正)
│   ├── README_CLEANUP.md                   # 整理作業の記録（このファイル）
│   ├── README_JSX_FIX-archive.md           # 過去のREADME (JSX修正)
│   └── README_JSX_FIX_ENHANCED-archive.md  # 過去のREADME (拡張JSX修正)
├── node_modules/                 # 依存パッケージディレクトリ
├── package-lock.json             # パッケージロックファイル
├── package.json                  # プロジェクト設定・依存関係
├── postcss.config.js             # PostCSS設定ファイル
├── public/                       # 静的ファイルディレクトリ
├── README.md                     # メインREADMEファイル（統合版）
├── src/                          # ソースコードディレクトリ
└── tailwind.config.js            # Tailwind CSS設定ファイル
```
