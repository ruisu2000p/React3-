import React, { useEffect } from 'react';

/**
 * 改良されたモーダルダイアログコンポーネント
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - モーダルの表示状態
 * @param {string} props.title - モーダルのタイトル
 * @param {Function} props.onClose - 閉じるボタンクリック時のコールバック
 * @param {React.ReactNode} props.children - モーダル内に表示するコンテンツ
 * @param {React.ReactNode} props.footer - モーダルのフッター（任意）
 * @param {string} props.size - モーダルのサイズ ('sm', 'md', 'lg')
 */
const Modal = ({ 
  isOpen, 
  title, 
  onClose, 
  children, 
  footer,
  size = 'md' 
}) => {
  // モーダル表示時に背景スクロールを防止
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // ESCキーでモーダルを閉じる
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);
  
  // モーダルの外側クリックで閉じる
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  if (!isOpen) return null;
  
  // サイズクラスの決定
  const sizeClass = size === 'sm' ? 'modal-sm' : size === 'lg' ? 'modal-lg' : '';
  
  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div 
        className={`modal-dialog ${sizeClass}`} 
        role="dialog" 
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="modal-header">
          <h3 className="modal-title" id="modal-title">{title}</h3>
          <button 
            type="button" 
            className="modal-close" 
            onClick={onClose}
            aria-label="閉じる"
          >
            ×
          </button>
        </div>
        
        <div className="modal-body">
          {children}
        </div>
        
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
