// JSXの非ブール属性をコンパイル時に修正するBabelプラグイン
module.exports = function(babel) {
  const { types: t } = babel;
  
  return {
    name: "transform-jsx-boolean-to-string",
    visitor: {
      JSXAttribute(path) {
        // 属性名がjsxで値がブール値の場合
        if (
          path.node.name.name === "jsx" && 
          path.node.value && 
          path.node.value.type === "JSXExpressionContainer" &&
          path.node.value.expression.type === "BooleanLiteral"
        ) {
          // ブール値を文字列リテラルに変換
          path.node.value = t.stringLiteral(
            path.node.value.expression.value.toString()
          );
        }
      }
    }
  };
};