// webpack設定をカスタマイズするためのファイル
module.exports = function override(config, env) {
  // 開発環境でevalを使用しない設定
  if (env === 'development') {
    // 開発環境でも'eval'を使用しないdevtool設定に変更
    config.devtool = 'cheap-module-source-map';

    // テスト用ビルドでも同様の設定を適用
    if (process.env.NODE_ENV === 'test') {
      config.devtool = 'cheap-module-source-map';
    }
  }

  // Babelローダーを拡張してカスタムBabelプラグインを適用
  const babelRules = config.module.rules
    .find(rule => Array.isArray(rule.oneOf))
    .oneOf
    .filter(rule => rule.loader && rule.loader.includes('babel-loader'));

  if (babelRules.length > 0) {
    babelRules.forEach(rule => {
      // Babelの設定がない場合は作成
      if (!rule.options) rule.options = {};
      if (!rule.options.plugins) rule.options.plugins = [];
      
      // カスタムJSX変換プラグインを追加
      rule.options.plugins.push('./babel-jsx-fix.js');
    });
  }

  return config;
};