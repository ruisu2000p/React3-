import React, { useState, useEffect } from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  fullWidth?: boolean;
  className?: string;
  children: React.ReactNode;
}

interface Coordinates {
  x: number;
  y: number;
}

/**
 * 改良されたボタンコンポーネント（リップルエフェクト付き）
 */
const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  onClick,
  children,
  className = '',
  ...buttonProps
}) => {
  const [coords, setCoords] = useState<Coordinates>({ x: -1, y: -1 });
  const [isRippling, setIsRippling] = useState<boolean>(false);

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

  const createRipple = (e: React.MouseEvent<HTMLButtonElement>): void => {
    const button = e.currentTarget;
    const buttonRect = button.getBoundingClientRect();
    
    const x = e.clientX - buttonRect.left;
    const y = e.clientY - buttonRect.top;
    
    setCoords({ x, y });
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>): void => {
    if (isLoading) return;
    createRipple(e);
    if (onClick) onClick(e);
  };

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
