import React, { useState, useEffect } from 'react';

/**
 * 改良されたボタンコンポーネント（リップルエフェクト付き）
 * 
 * @param {Object} props
 * @param {string} props.variant - ボタンのバリエーション ('primary', 'secondary', 'accent', 'outline', 'ghost')
 * @param {string} props.size - ボタンのサイズ ('xs', 'sm', 'md', 'lg', 'xl')
 * @param {boolean} props.isLoading - 読み込み中状態の表示
 * @param {boolean} props.fullWidth - 親要素の幅いっぱいに表示
 * @param {Function} props.onClick - クリック時のコールバック
 * @param {React.ReactNode} props.children - ボタン内に表示するコンテンツ
 * @param {Object} props.buttonProps - ボタン要素に渡す追加の属性
 */
const Button = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  onClick,
  children,
  className = '',
  ...buttonProps
}) => {
  const [coords, setCoords] = useState({ x: -1, y: -1 });
  const [isRippling, setIsRippling] = useState(false);

  useEffect(() => {
    if (coords.x !== -1 && coords.y !== -1) {
      setIsRippling(true);
      setTimeout(() => setIsRippling(false), 300);
    } else {
      setIsRippling(false);
    }
  }, [coords]);

  useEffect(() => {
    if (!isRippling) setCoords({ x: -1, y: -1 });
  }, [isRippling]);

  // リップルエフェクトの作成
  const createRipple = (e) => {
    const button = e.currentTarget;
    const buttonRect = button.getBoundingClientRect();
    
    const x = e.clientX - buttonRect.left;
    const y = e.clientY - buttonRect.top;
    
    setCoords({ x, y });
  };

  // クリックハンドラ
  const handleClick = (e) => {
    if (isLoading) return;
    createRipple(e);
    if (onClick) onClick(e);
  };

  // クラス名の構築
  const buttonClasses = [
    'btn-after',
    variant ? `btn-${variant}` : '',
    size !== 'md' ? `btn-${size}` : '',
    isLoading ? 'btn-loading' : '',
    fullWidth ? 'w-full' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      className={buttonClasses}
      onClick={handleClick}
      disabled={isLoading || buttonProps.disabled}
      {...buttonProps}
    >
      {isRippling && (
        <span
          className="ripple"
          style={{
            left: coords.x,
            top: coords.y
          }}
        />
      )}
      {children}
    </button>
  );
};

export default Button;
