import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import './fixJSXWarning';  // JSX非ブール属性の警告を抑制するパッチ

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
