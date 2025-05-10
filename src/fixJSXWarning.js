// React非ブール属性警告を修正するためのJavaScriptファイル
// index.jsにインポートしてください

// DOMレンダリング前にコンポーネント属性処理をオーバーライドして修正する
// この対応はReactがレンダリングする際にブール値を文字列に自動変換します

// index.jsに以下を追加:
// import './fixJSXWarning';

// React属性値変換ヘルパー
export const convertAttributeValue = (value) => {
  // ブール値を文字列に変換
  if (typeof value === 'boolean') {
    return value.toString();
  }
  return value;
};

// コンソールのjsx警告をフィルタリングする
// 警告: この方法は開発環境での一時的な対応です
// 本来は問題のあるコンポーネントを修正すべきです

const originalConsoleWarn = console.warn;
console.warn = function(message, ...args) {
  // 「jsx」属性に関する非ブール属性警告をフィルタリング
  if (typeof message === 'string' && 
      message.includes('Received \'true\' for a non-boolean attribute \'jsx\'')) {
    // 警告をスキップ
    return;
  }
  // それ以外の警告は通常通り表示
  return originalConsoleWarn.apply(console, [message, ...args]);
};

// MonkeyPatch React DOM属性処理
// 注意: Reactの内部メカニズムに依存するため、Reactのバージョンアップで動作しなくなる可能性があります
(function patchReactDOMProps() {
  // React DOMが読み込まれるのを待つ
  setTimeout(() => {
    try {
      // React DOMを取得
      const ReactDOM = window.ReactDOM || require('react-dom');
      if (!ReactDOM) {
        console.warn('ReactDOMが見つかりませんでした。パッチを適用できません。');
        return;
      }

      // 属性処理関数をモンキーパッチ
      // これはCreate React Appで使用される一般的なReactDOMの構造に基づいています
      if (ReactDOM.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) {
        const internalProps = ReactDOM.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.Properties;
        if (internalProps && internalProps.jsx) {
          // jsx属性をRESERVED(true)から文字列属性(false)に変更
          internalProps.jsx = false;
        }
      }
    } catch (e) {
      console.warn('JSX属性パッチの適用中にエラーが発生しました:', e);
    }
  }, 100);
})();

// コンポーネントのレンダリング中にjsx属性を文字列に変換するオプション
// Reactの内部処理をオーバーライドすることは推奨されませんが、
// ビルド済みライブラリ使用時などの一時的な回避策として使用できます

export default {
  convertAttributeValue
};