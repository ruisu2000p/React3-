import React, { createContext, useContext, useState, useCallback } from 'react';

// 通知のデフォルト設定
const DEFAULT_DURATION = 3000; // 3秒

// 通知コンテキストの作成
const NotificationContext = createContext(null);

/**
 * 通知プロバイダーコンポーネント
 * アプリケーション全体で一貫した通知管理を提供します
 */
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  
  // 新しい通知を追加
  const addNotification = useCallback((notification) => {
    const id = Date.now().toString();
    const newNotification = {
      id,
      type: 'info',
      duration: DEFAULT_DURATION,
      ...notification,
    };
    
    setNotifications((prev) => [...prev, newNotification]);
    
    // 設定された時間経過後に通知を削除
    if (newNotification.duration) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }
    
    return id;
  }, []);
  
  // 通知を削除
  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));
  }, []);
  
  // 特定タイプの通知を追加するショートカット
  const showSuccess = useCallback((message, options = {}) => {
    return addNotification({ type: 'success', message, ...options });
  }, [addNotification]);
  
  const showError = useCallback((message, options = {}) => {
    return addNotification({ type: 'error', message, ...options });
  }, [addNotification]);
  
  const showWarning = useCallback((message, options = {}) => {
    return addNotification({ type: 'warning', message, ...options });
  }, [addNotification]);
  
  const showInfo = useCallback((message, options = {}) => {
    return addNotification({ type: 'info', message, ...options });
  }, [addNotification]);
  
  // 全ての通知をクリア
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);
  
  // 通知コンポーネント自体の実装
  const NotificationContainer = () => {
    if (notifications.length === 0) return null;
    
    return (
      <div className="toast-container">
        {notifications.map((notification) => (
          <div 
            key={notification.id} 
            className={`toast toast-${notification.type} slide-in`}
          >
            <div className="toast-icon">
              {notification.type === 'success' ? '✓' : 
               notification.type === 'error' ? '!' : 
               notification.type === 'warning' ? '⚠' : 'i'}
            </div>
            <div className="toast-content">
              {notification.message}
            </div>
            <button 
              className="toast-close" 
              onClick={() => removeNotification(notification.id)}
              aria-label="閉じる"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    );
  };
  
  // コンテキストに提供する値
  const value = {
    notifications,
    addNotification,
    removeNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    clearAll,
    NotificationContainer,
  };
  
  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
};

// カスタムフック - 通知機能を使用するコンポーネント向け
export const useNotification = () => {
  const context = useContext(NotificationContext);
  
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  
  return context;
};
