


export const convertAttributeValue = (value: any): any => {
  if (typeof value === 'boolean') {
    return value.toString();
  }
  return value;
};


const originalConsoleWarn = console.warn;
console.warn = function(message: any, ...args: any[]): void {
  if (typeof message === 'string' && 
      message.includes('Received \'true\' for a non-boolean attribute \'jsx\'')) {
    return;
  }
  return originalConsoleWarn.apply(console, [message, ...args]);
};

(function patchReactDOMProps(): void {
  setTimeout(() => {
    try {
      const ReactDOM = (window as any).ReactDOM || require('react-dom');
      if (!ReactDOM) {
        console.warn('ReactDOMが見つかりませんでした。パッチを適用できません。');
        return;
      }

      if (ReactDOM.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) {
        const internalProps = ReactDOM.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.Properties;
        if (internalProps && internalProps.jsx) {
          internalProps.jsx = false;
        }
      }
    } catch (e) {
      console.warn('JSX属性パッチの適用中にエラーが発生しました:', e);
    }
  }, 100);
})();


export default {
  convertAttributeValue
};
