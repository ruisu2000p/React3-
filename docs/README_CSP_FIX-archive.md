# Content Security Policy (CSP) evalの修正について

## 問題

アプリケーションで以下のCSPエラーが発生しています：

```
Content Security Policy of your site blocks the use of 'eval' in JavaScript
```

これは、Webサイトのセキュリティポリシー(CSP)が、潜在的なセキュリティリスクを減らすために`eval()`や類似のコード実行関数の使用を制限しているためです。

## 修正方法

以下の解決方法を実装しました：

### 1. CSPメタタグの追加

`public/index.html`に以下のCSPメタタグを追加しました：

```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://cors-anywhere.herokuapp.com">
```

これにより、開発環境でJavaScriptの`eval()`の使用が許可されます。

### 2. webpack設定の変更

Webpackの設定を変更して`eval()`を使用しないソースマップを生成するように設定しました。このために：

1. `config-overrides.js`ファイルを作成
2. `package.json`に新しいスクリプトを追加：
   - `start:no-eval` - evalを使用しない開発サーバー起動コマンド
   - `build:no-eval` - evalを使用しないビルドコマンド

## 使用方法

### 必要なパッケージのインストール

```bash
npm install --save-dev react-app-rewired
```

### アプリの起動（eval制限対応版）

```bash
npm run start:no-eval
```

### アプリのビルド（eval制限対応版）

```bash
npm run build:no-eval
```

## 注意事項

1. `unsafe-eval`ディレクティブの使用はセキュリティリスクが伴います。これは開発環境での一時的な解決策です。

2. 本番環境では、より制限の厳しいCSPポリシーを使用し、可能な限り`unsafe-eval`の使用を避けるべきです。

3. 長期的な解決策としては、evalを使用するコードやライブラリを特定し、代替手段に置き換えることを検討してください。

## よくある原因

1. React開発モードでのホットリロード機能
2. 一部のライブラリが内部で`eval()`や`new Function()`を使用
3. JSONスキーマベースのフォームライブラリ
4. ソースマップのための開発ツール

## 追加の対応が必要な場合

特定のライブラリがevalを使用している場合は、そのライブラリの代替を検討するか、本番環境では使用しないようにしてください。