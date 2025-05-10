import React, { useState, useEffect } from 'react';

interface TransitionProps {
  show?: boolean;
  type?: 'fade' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right' | 'scale' | 'zoom';
  duration?: number;
  timingFunction?: string;
  delay?: number;
  className?: string;
  children: React.ReactNode;
}

interface TransitionStyles {
  transition?: string;
  opacity?: number;
  transform?: string;
}

/**
 * トランジションアニメーションコンポーネント
 */
const Transition: React.FC<TransitionProps> = ({
  show = true,
  type = 'fade',
  duration = 300,
  timingFunction = 'ease',
  delay = 0,
  className = '',
  children,
}) => {
  const [shouldRender, setShouldRender] = useState<boolean>(show);
  const [isVisible, setIsVisible] = useState<boolean>(show);
  
  useEffect(() => {
    if (show) {
      setShouldRender(true);
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration]);
  
  useEffect(() => {
    if (shouldRender && show) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 10); // 微小遅延でDOM更新を確実に
      return () => clearTimeout(timer);
    }
  }, [shouldRender, show]);
  
  if (!shouldRender) return null;
  
  const getTransitionStyles = (): TransitionStyles => {
    const baseStyle: TransitionStyles = {
      transition: `all ${duration}ms ${timingFunction} ${delay}ms`,
    };
    
    const typeStyles: Record<string, TransitionStyles> = {
      fade: {
        opacity: isVisible ? 1 : 0,
      },
      'slide-up': {
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
      },
      'slide-down': {
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(-20px)',
      },
      'slide-left': {
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateX(0)' : 'translateX(20px)',
      },
      'slide-right': {
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateX(0)' : 'translateX(-20px)',
      },
      scale: {
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'scale(1)' : 'scale(0.95)',
      },
      zoom: {
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'scale(1)' : 'scale(0.5)',
      },
    };
    
    return { ...baseStyle, ...typeStyles[type] };
  };
  
  return (
    <div className={className} style={getTransitionStyles()}>
      {children}
    </div>
  );
};

export default Transition;
