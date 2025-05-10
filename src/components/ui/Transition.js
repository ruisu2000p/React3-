import React, { useState, useEffect } from 'react';

/**
 * トランジションアニメーションコンポーネント
 * 
 * @param {Object} props
 * @param {boolean} props.show - 表示/非表示の状態
 * @param {string} props.type - アニメーションの種類 ('fade', 'slide-up', 'slide-down', 'scale', 'zoom')
 * @param {number} props.duration - アニメーションの時間（ミリ秒）
 * @param {string} props.timingFunction - イージング関数
 * @param {number} props.delay - 遅延時間（ミリ秒）
 * @param {React.ReactNode} props.children - 子要素
 */
const Transition = ({
  show = true,
  type = 'fade',
  duration = 300,
  timingFunction = 'ease',
  delay = 0,
  className = '',
  children,
}) => {
  const [shouldRender, setShouldRender] = useState(show);
  const [isVisible, setIsVisible] = useState(show);
  
  // showプロップが変更されたときの処理
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
  
  // マウント後のアニメーション適用
  useEffect(() => {
    if (shouldRender && show) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 10); // 微小遅延でDOM更新を確実に
      return () => clearTimeout(timer);
    }
  }, [shouldRender, show]);
  
  if (!shouldRender) return null;
  
  // アニメーションタイプに応じたスタイルの生成
  const getTransitionStyles = () => {
    const baseStyle = {
      transition: `all ${duration}ms ${timingFunction} ${delay}ms`,
    };
    
    const typeStyles = {
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
