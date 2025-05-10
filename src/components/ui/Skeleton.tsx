import React from 'react';

interface SkeletonProps {
  type?: 'text' | 'circle' | 'rectangle' | 'card' | 'table';
  width?: string | number;
  height?: string | number;
  count?: number;
  animated?: boolean;
  className?: string;
}

/**
 * スケルトンローディングコンポーネント
 */
const Skeleton: React.FC<SkeletonProps> = ({
  type = 'text',
  width,
  height,
  count = 1,
  animated = true,
  className = '',
}) => {
  const baseClass = `skeleton ${animated ? 'skeleton-animated' : ''} ${className}`;
  
  if (type === 'circle') {
    return (
      <div 
        className={`${baseClass} skeleton-circle`}
        style={{ 
          width: width || '40px', 
          height: height || width || '40px',
          borderRadius: '50%'
        }}
      />
    );
  }
  
  if (type === 'rectangle') {
    return (
      <div 
        className={`${baseClass} skeleton-rectangle`}
        style={{ 
          width: width || '100%', 
          height: height || '100px'
        }}
      />
    );
  }
  
  if (type === 'card') {
    return (
      <div className={`${baseClass} skeleton-card`} style={{ width: width || '100%' }}>
        <div 
          className="skeleton skeleton-image"
          style={{ height: height || '200px' }}
        />
        <div className="skeleton-content p-4">
          <div className="skeleton skeleton-title mb-4" style={{ height: '24px' }} />
          <div className="skeleton skeleton-text" style={{ width: '100%' }} />
          <div className="skeleton skeleton-text" style={{ width: '90%' }} />
          <div className="skeleton skeleton-text" style={{ width: '80%' }} />
        </div>
      </div>
    );
  }
  
  if (type === 'table') {
    return (
      <div className={`${baseClass} skeleton-table`}>
        {/* ヘッダー行 */}
        <div className="skeleton-table-header flex gap-2 mb-4">
          {Array(5).fill(0).map((_, index) => (
            <div 
              key={`header-${index}`}
              className="skeleton" 
              style={{ 
                height: '30px',
                flex: index === 0 ? '0 0 40px' : '1 1 0'
              }} 
            />
          ))}
        </div>
        
        {/* データ行 */}
        {Array(5).fill(0).map((_, rowIndex) => (
          <div key={`row-${rowIndex}`} className="skeleton-table-row flex gap-2 mb-3">
            {Array(5).fill(0).map((_, colIndex) => (
              <div 
                key={`cell-${rowIndex}-${colIndex}`}
                className="skeleton" 
                style={{ 
                  height: '20px',
                  flex: colIndex === 0 ? '0 0 40px' : '1 1 0',
                  width: colIndex === 0 ? '40px' : 'auto'
                }} 
              />
            ))}
          </div>
        ))}
      </div>
    );
  }
  
  return (
    <div className={`${baseClass} skeleton-text-container`}>
      {Array(count).fill(0).map((_, index) => (
        <div
          key={index}
          className={`${baseClass} skeleton-text`}
          style={{ 
            width: index === count - 1 ? '80%' : '100%',
            height: height || '1em',
            marginBottom: index === count - 1 ? 0 : '0.7em'
          }}
        />
      ))}
    </div>
  );
};

export default Skeleton;
