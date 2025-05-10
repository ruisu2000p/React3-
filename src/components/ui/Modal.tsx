import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * 改良されたモーダルダイアログコンポーネント
 */
const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  title, 
  onClose, 
  children, 
  footer,
  size = 'md' 
}) => {
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

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent): void => {
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
  
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  if (!isOpen) return null;
  
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
