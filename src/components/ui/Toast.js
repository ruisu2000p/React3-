import React, { useState, useEffect } from 'react';

/**
 * 改良されたトースト通知コンポーネント
 * 
 * @param {Object} props
 * @param {string} props.type - トーストの種類 ('success', 'error', 'warning', 'info')
 * @param {string} props.message - 表示するメッセージ
 * @param {number} props.duration - 表示時間(ms)、デフォルトは3000ms
 * @param {Function} props.onClose - 閉じる時に呼び出される関数
 * @param {boolean} props.show - トーストの表示/非表示状態
 */
const Toast = ({ type = 'info', message, duration = 3000, onClose, show }) => {
  const [isVisible, setIsVisible] = useState(show);

  useEffect(() => {
    setIsVisible(show);
    
    if (show && duration) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [show, duration]);
  
  const handleClose = () => {
    setIsVisible(false);
    // アニメーション終了後に実際に閉じる
    setTimeout(() => {
      if (onClose) onClose();
    }, 300); // CSSアニメーション時間と同期
  };
  
  // トーストアイコンの選択
  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '!';
      case 'warning':
        return '⚠';
      case 'info':
      default:
        return 'i';
    }
  };
  
  if (!isVisible) return null;
  
  return (
    <div className="toast-container">
      <div className={`toast toast-${type} ${isVisible ? 'slide-in' : 'slide-out'}`}>
        <div className={`toast-icon toast-icon-${type}`}>
          {getIcon()}
        </div>
        <div className="toast-content">
          {message}
        </div>
        <button 
          className="toast-close" 
          onClick={handleClose}
          aria-label="閉じる"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default Toast;
