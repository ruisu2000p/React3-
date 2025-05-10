import React, { useState, useEffect } from 'react';

interface ToastProps {
  type?: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  onClose?: () => void;
  show: boolean;
}

/**
 * 改良されたトースト通知コンポーネント
 */
const Toast: React.FC<ToastProps> = ({ 
  type = 'info', 
  message, 
  duration = 3000, 
  onClose, 
  show 
}) => {
  const [isVisible, setIsVisible] = useState<boolean>(show);

  useEffect(() => {
    setIsVisible(show);
    
    if (show && duration) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [show, duration]);
  
  const handleClose = (): void => {
    setIsVisible(false);
    setTimeout(() => {
      if (onClose) onClose();
    }, 300); // CSSアニメーション時間と同期
  };
  
  const getIcon = (): string => {
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
