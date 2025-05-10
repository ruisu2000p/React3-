import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

const DEFAULT_DURATION = 3000; // 3秒

export interface NotificationType {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

interface NotificationContextType {
  notifications: NotificationType[];
  addNotification: (notification: Partial<NotificationType>) => string;
  removeNotification: (id: string) => void;
  showSuccess: (message: string, options?: Partial<Omit<NotificationType, 'type' | 'message'>>) => string;
  showError: (message: string, options?: Partial<Omit<NotificationType, 'type' | 'message'>>) => string;
  showWarning: (message: string, options?: Partial<Omit<NotificationType, 'type' | 'message'>>) => string;
  showInfo: (message: string, options?: Partial<Omit<NotificationType, 'type' | 'message'>>) => string;
  clearAll: () => void;
  NotificationContainer: () => React.ReactElement | null;
}

export const NotificationContext = createContext<NotificationContextType | null>(null);

interface NotificationProviderProps {
  children: ReactNode;
}

/**
 * 通知プロバイダーコンポーネント
 * アプリケーション全体で一貫した通知管理を提供します
 */
export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  
  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));
  }, []);
  
  const addNotification = useCallback((notification: Partial<NotificationType>) => {
    const id = Date.now().toString();
    const newNotification: NotificationType = {
      id,
      type: 'info',
      duration: DEFAULT_DURATION,
      message: '',
      ...notification,
    };
    
    setNotifications((prev) => [...prev, newNotification]);
    
    if (newNotification.duration) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }
    
    return id;
  }, [removeNotification]);
  
  const showSuccess = useCallback((message: string, options: Partial<Omit<NotificationType, 'type' | 'message'>> = {}) => {
    return addNotification({ type: 'success', message, ...options });
  }, [addNotification]);
  
  const showError = useCallback((message: string, options: Partial<Omit<NotificationType, 'type' | 'message'>> = {}) => {
    return addNotification({ type: 'error', message, ...options });
  }, [addNotification]);
  
  const showWarning = useCallback((message: string, options: Partial<Omit<NotificationType, 'type' | 'message'>> = {}) => {
    return addNotification({ type: 'warning', message, ...options });
  }, [addNotification]);
  
  const showInfo = useCallback((message: string, options: Partial<Omit<NotificationType, 'type' | 'message'>> = {}) => {
    return addNotification({ type: 'info', message, ...options });
  }, [addNotification]);
  
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);
  
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
  
  const value: NotificationContextType = {
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

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  
  return context;
};
