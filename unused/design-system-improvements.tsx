import React, { useState, useEffect } from 'react';

const DesignSystemShowcase = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('colors');
  const [showModal, setShowModal] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const [isCustomValid, setIsCustomValid] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [hasRipple, setHasRipple] = useState(null);
  
  // モーダルが開いたときにボディのスクロールを無効化
  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showModal]);
  
  // トーストを表示する関数
  const triggerToast = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };
  
  // カスタム入力の検証
  const validateCustomInput = (value) => {
    if (value.length < 3) {
      setIsCustomValid(false);
      return false;
    }
    setIsCustomValid(true);
    return true;
  };
  
  // ボタンリップルエフェクト
  const createRipple = (event) => {
    const button = event.currentTarget;
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;
    
    const ripple = document.createElement('span');
    ripple.style.width = ripple.style.height = `${diameter}px`;
    ripple.style.left = `${event.clientX - button.getBoundingClientRect().left - radius}px`;
    ripple.style.top = `${event.clientY - button.getBoundingClientRect().top - radius}px`;
    ripple.className = 'ripple';
    
    // 既存のリップルをクリア
    const existingRipple = button.querySelector('.ripple');
    if (existingRipple) {
      existingRipple.remove();
    }
    
    button.appendChild(ripple);
    
    // リップルアニメーション後に削除
    setTimeout(() => {
      ripple.remove();
    }, 600);
  };
  
  return (
    <div className={`design-system-container ${darkMode ? 'dark-mode' : 'light-mode'}`}>
      {/* ヘッダー */}
      <header className="header">
        <div className="logo">モダンUI/UXデザインシステム</div>
        <div className="theme-toggle">
          <span className="theme-label">ダークモード</span>
          <div 
            className={`theme-switcher ${darkMode ? 'active' : ''}`} 
            onClick={() => setDarkMode(!darkMode)}
          >
            <div className="theme-thumb"></div>
          </div>
        </div>
      </header>
      
      {/* タブナビゲーション */}
      <div className="tab-navigation">
        <button 
          className={`tab-button ${activeTab === 'colors' ? 'active' : ''}`}
          onClick={() => setActiveTab('colors')}
        >
          カラーシステム
        </button>
        <button 
          className={`tab-button ${activeTab === 'buttons' ? 'active' : ''}`}
          onClick={() => setActiveTab('buttons')}
        >
          ボタン
        </button>
        <button 
          className={`tab-button ${activeTab === 'forms' ? 'active' : ''}`}
          onClick={() => setActiveTab('forms')}
        >
          フォーム
        </button>
        <button 
          className={`tab-button ${activeTab === 'components' ? 'active' : ''}`}
          onClick={() => setActiveTab('components')}
        >
          コンポーネント
        </button>
        <button 
          className={`tab-button ${activeTab === 'animation' ? 'active' : ''}`}
          onClick={() => setActiveTab('animation')}
        >
          アニメーション
        </button>
      </div>
      
      {/* コンテンツエリア */}
      <div className="content-area">
        {/* カラーシステム */}
        {activeTab === 'colors' && (
          <div className="tab-content colors-tab">
            <h2>セマンティックカラーシステム</h2>
            <p className="description">
              意味を持ったカラー変数を追加することで、状態や目的に応じた一貫したデザインが可能になります。
            </p>
            
            <div className="section">
              <h3>基本カラー</h3>
              <div className="color-grid">
                <div className="color-item primary">
                  <div className="color-preview"></div>
                  <div className="color-info">
                    <span className="color-name">Primary</span>
                    <span className="color-value">var(--color-primary)</span>
                  </div>
                </div>
                <div className="color-item secondary">
                  <div className="color-preview"></div>
                  <div className="color-info">
                    <span className="color-name">Secondary</span>
                    <span className="color-value">var(--color-secondary)</span>
                  </div>
                </div>
                <div className="color-item accent">
                  <div className="color-preview"></div>
                  <div className="color-info">
                    <span className="color-name">Accent</span>
                    <span className="color-value">var(--color-accent)</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="section">
              <h3>状態カラー</h3>
              <div className="color-grid">
                <div className="color-item hover">
                  <div className="color-preview"></div>
                  <div className="color-info">
                    <span className="color-name">Hover</span>
                    <span className="color-value">var(--color-hover-light)</span>
                  </div>
                </div>
                <div className="color-item focus">
                  <div className="color-preview"></div>
                  <div className="color-info">
                    <span className="color-name">Focus</span>
                    <span className="color-value">var(--color-focus-ring)</span>
                  </div>
                </div>
                <div className="color-item pressed">
                  <div className="color-preview"></div>
                  <div className="color-info">
                    <span className="color-name">Pressed</span>
                    <span className="color-value">var(--color-pressed)</span>
                  </div>
                </div>
                <div className="color-item disabled">
                  <div className="color-preview"></div>
                  <div className="color-info">
                    <span className="color-name">Disabled</span>
                    <span className="color-value">var(--color-disabled-bg)</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="section">
              <h3>表面カラー</h3>
              <div className="color-grid">
                <div className="color-item surface">
                  <div className="color-preview"></div>
                  <div className="color-info">
                    <span className="color-name">Surface</span>
                    <span className="color-value">var(--color-surface-primary)</span>
                  </div>
                </div>
                <div className="color-item surface-secondary">
                  <div className="color-preview"></div>
                  <div className="color-info">
                    <span className="color-name">Surface Secondary</span>
                    <span className="color-value">var(--color-surface-secondary)</span>
                  </div>
                </div>
                <div className="color-item surface-tertiary">
                  <div className="color-preview"></div>
                  <div className="color-info">
                    <span className="color-name">Surface Tertiary</span>
                    <span className="color-value">var(--color-surface-tertiary)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* ボタン */}
        {activeTab === 'buttons' && (
          <div className="tab-content buttons-tab">
            <h2>インタラクティブなボタン</h2>
            <p className="description">
              インタラクションに対する視覚的フィードバックを強化し、ユーザー操作をより直感的にします。
            </p>
            
            <div className="section">
              <h3>従来のボタン (Before)</h3>
              <div className="button-grid">
                <button className="btn-before btn-primary">プライマリボタン</button>
                <button className="btn-before btn-secondary">セカンダリボタン</button>
                <button className="btn-before btn-accent">アクセントボタン</button>
                <button className="btn-before btn-outline">アウトラインボタン</button>
              </div>
            </div>
            
            <div className="section">
              <h3>改善されたボタン (After)</h3>
              <div className="button-grid">
                <button className="btn-after btn-primary" onClick={createRipple}>プライマリボタン</button>
                <button className="btn-after btn-secondary" onClick={createRipple}>セカンダリボタン</button>
                <button className="btn-after btn-accent" onClick={createRipple}>アクセントボタン</button>
                <button className="btn-after btn-outline" onClick={createRipple}>アウトラインボタン</button>
              </div>
            </div>
            
            <div className="section">
              <h3>状態によるボタン変化</h3>
              <div className="state-showcase">
                <div className="state-item">
                  <span className="state-label">通常</span>
                  <button className="btn-after btn-primary">ボタン</button>
                </div>
                <div className="state-item">
                  <span className="state-label">ホバー</span>
                  <button className="btn-after btn-primary hover">ボタン</button>
                </div>
                <div className="state-item">
                  <span className="state-label">アクティブ</span>
                  <button className="btn-after btn-primary active">ボタン</button>
                </div>
                <div className="state-item">
                  <span className="state-label">フォーカス</span>
                  <button className="btn-after btn-primary focus">ボタン</button>
                </div>
                <div className="state-item">
                  <span className="state-label">無効</span>
                  <button className="btn-after btn-primary" disabled>ボタン</button>
                </div>
              </div>
            </div>
            
            <div className="section">
              <h3>リップルエフェクト付きボタン</h3>
              <p className="description">クリックしてリップルエフェクトを確認してください。</p>
              <div className="ripple-buttons">
                <button 
                  className="btn-ripple btn-primary" 
                  onClick={(e) => {
                    createRipple(e);
                    setHasRipple('primary');
                    setTimeout(() => setHasRipple(null), 600);
                  }}
                >
                  リップルエフェクト付き
                </button>
                <button 
                  className="btn-ripple btn-secondary" 
                  onClick={(e) => {
                    createRipple(e);
                    setHasRipple('secondary');
                    setTimeout(() => setHasRipple(null), 600);
                  }}
                >
                  クリックしてみてください
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* フォーム */}
        {activeTab === 'forms' && (
          <div className="tab-content forms-tab">
            <h2>フォームUXの改善</h2>
            <p className="description">
              よりインタラクティブで使いやすいフォーム要素で、ユーザーの入力体験を向上させます。
            </p>
            
            <div className="section">
              <h3>フォーム要素のビフォー/アフター</h3>
              <div className="form-comparison">
                <div className="form-column">
                  <h4>従来のフォーム (Before)</h4>
                  <div className="form-group-before">
                    <label>ユーザー名</label>
                    <input type="text" placeholder="ユーザー名を入力" className="input-before" />
                  </div>
                  <div className="form-group-before">
                    <label>メールアドレス</label>
                    <input type="email" placeholder="メールアドレスを入力" className="input-before" />
                  </div>
                  <div className="form-group-before">
                    <label>パスワード</label>
                    <input type="password" placeholder="パスワードを入力" className="input-before" />
                  </div>
                </div>
                
                <div className="form-column">
                  <h4>改善されたフォーム (After)</h4>
                  <div className="form-group-after form-floating">
                    <input type="text" id="username" placeholder=" " className="input-after" />
                    <label htmlFor="username">ユーザー名</label>
                  </div>
                  <div className="form-group-after form-floating">
                    <input type="email" id="email" placeholder=" " className="input-after" />
                    <label htmlFor="email">メールアドレス</label>
                  </div>
                  <div className="form-group-after form-floating">
                    <input type="password" id="password" placeholder=" " className="input-after" />
                    <label htmlFor="password">パスワード</label>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="section">
              <h3>バリデーションフィードバック</h3>
              <div className="validation-example">
                <div className="form-group-after form-floating">
                  <input 
                    type="text" 
                    id="custom" 
                    placeholder=" " 
                    className={`input-after ${!isCustomValid ? 'is-invalid' : ''}`}
                    value={customValue}
                    onChange={(e) => {
                      setCustomValue(e.target.value);
                      validateCustomInput(e.target.value);
                    }}
                  />
                  <label htmlFor="custom">3文字以上入力してください</label>
                  {!isCustomValid && (
                    <div className="invalid-feedback">
                      3文字以上入力してください
                    </div>
                  )}
                </div>
                <button 
                  className="btn-after btn-primary"
                  onClick={() => {
                    if (validateCustomInput(customValue)) {
                      triggerToast();
                    }
                  }}
                >
                  送信
                </button>
              </div>
            </div>
            
            <div className="section">
              <h3>カスタムフォーム要素</h3>
              <div className="custom-form-elements">
                <div className="form-row">
                  <div className="checkbox-container">
                    <input type="checkbox" id="custom-check" />
                    <span className="checkbox-custom"></span>
                    <label htmlFor="custom-check">カスタムチェックボックス</label>
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="radio-group">
                    <div className="radio-container">
                      <input type="radio" id="option1" name="options" />
                      <span className="radio-custom"></span>
                      <label htmlFor="option1">オプション 1</label>
                    </div>
                    <div className="radio-container">
                      <input type="radio" id="option2" name="options" />
                      <span className="radio-custom"></span>
                      <label htmlFor="option2">オプション 2</label>
                    </div>
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="toggle-container">
                    <div className={`toggle-switch ${darkMode ? 'active' : ''}`} onClick={() => setDarkMode(!darkMode)}>
                      <div className="toggle-handle"></div>
                    </div>
                    <span className="toggle-label">トグルスイッチ</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* コンポーネント */}
        {activeTab === 'components' && (
          <div className="tab-content components-tab">
            <h2>モダンUIコンポーネント</h2>
            <p className="description">
              よりインタラクティブで使いやすい主要なUIコンポーネントを提案します。
            </p>
            
            <div className="section">
              <h3>モーダルダイアログ</h3>
              <button 
                className="btn-after btn-primary"
                onClick={() => setShowModal(true)}
              >
                モーダルを開く
              </button>
              
              {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                  <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                      <h3 className="modal-title">改善されたモーダル</h3>
                      <button 
                        className="modal-close"
                        onClick={() => setShowModal(false)}
                      >
                        ×
                      </button>
                    </div>
                    <div className="modal-body">
                      <p>このモーダルは、滑らかなアニメーションと背景のぼかし効果により、より良いユーザー体験を提供します。</p>
                      <p>モバイルデバイスでは自動的に下からのスライドアップになります。</p>
                    </div>
                    <div className="modal-footer">
                      <button 
                        className="btn-after btn-outline"
                        onClick={() => setShowModal(false)}
                      >
                        キャンセル
                      </button>
                      <button 
                        className="btn-after btn-primary"
                        onClick={() => {
                          setShowModal(false);
                          triggerToast();
                        }}
                      >
                        確認
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="section">
              <h3>カード</h3>
              <div className="card-showcase">
                <div className="card-before">
                  <div className="card-header">
                    <h4>従来のカード (Before)</h4>
                  </div>
                  <div className="card-body">
                    <p>基本的なカードコンポーネント</p>
                  </div>
                  <div className="card-footer">
                    <button className="btn-before btn-primary">アクション</button>
                  </div>
                </div>
                
                <div className="card-after">
                  <div className="card-header">
                    <h4>改善されたカード (After)</h4>
                  </div>
                  <div className="card-body">
                    <p>微細な影とホバー効果で奥行きを表現</p>
                  </div>
                  <div className="card-footer">
                    <button className="btn-after btn-primary" onClick={createRipple}>アクション</button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="section">
              <h3>アラートとトースト</h3>
              <div className="alert-showcase">
                <div className="alert alert-success">
                  <div className="alert-icon">✓</div>
                  <div className="alert-content">
                    <strong>成功:</strong> 操作が正常に完了しました
                  </div>
                </div>
                
                <div className="alert alert-error">
                  <div className="alert-icon">!</div>
                  <div className="alert-content">
                    <strong>エラー:</strong> 問題が発生しました
                  </div>
                </div>
                
                <button 
                  className="btn-after btn-primary"
                  onClick={triggerToast}
                >
                  トースト通知を表示
                </button>
              </div>
              
              {showToast && (
                <div className="toast-container">
                  <div className="toast toast-success">
                    <div className="toast-icon">✓</div>
                    <div className="toast-content">
                      正常に処理されました
                    </div>
                    <button 
                      className="toast-close"
                      onClick={() => setShowToast(false)}
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* アニメーション */}
        {activeTab === 'animation' && (
          <div className="tab-content animation-tab">
            <h2>モーションとアニメーション</h2>
            <p className="description">
              適切なアニメーションはユーザー体験を向上させ、UIに生命感を与えます。
            </p>
            
            <div className="section">
              <h3>スタガー効果 (Stagger Effect)</h3>
              <button 
                className="btn-after btn-primary"
                onClick={() => {
                  const container = document.querySelector('.stagger-demo');
                  container.classList.remove('stagger-fade-in');
                  void container.offsetWidth; // リフロー強制
                  container.classList.add('stagger-fade-in');
                }}
              >
                アニメーションを再生
              </button>
              
              <div className="stagger-demo stagger-fade-in">
                <div className="stagger-item">アイテム 1</div>
                <div className="stagger-item">アイテム 2</div>
                <div className="stagger-item">アイテム 3</div>
                <div className="stagger-item">アイテム 4</div>
                <div className="stagger-item">アイテム 5</div>
              </div>
            </div>
            
            <div className="section">
              <h3>スケルトンローディング</h3>
              <div className="skeleton-demo">
                <div className="skeleton-card">
                  <div className="skeleton skeleton-image"></div>
                  <div className="skeleton-content">
                    <div className="skeleton skeleton-title"></div>
                    <div className="skeleton skeleton-text"></div>
                    <div className="skeleton skeleton-text"></div>
                    <div className="skeleton skeleton-text"></div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="section">
              <h3>トランジション効果</h3>
              <div className="transition-demo">
                <div className="transition-options">
                  <button className="btn-after btn-outline" onClick={() => document.querySelector('.transition-target').classList.toggle('expanded')}>
                    拡大/縮小
                  </button>
                  <button className="btn-after btn-outline" onClick={() => document.querySelector('.transition-target').classList.toggle('rotated')}>
                    回転
                  </button>
                  <button className="btn-after btn-outline" onClick={() => document.querySelector('.transition-target').classList.toggle('moved')}>
                    移動
                  </button>
                  <button className="btn-after btn-outline" onClick={() => document.querySelector('.transition-target').classList.toggle('colored')}>
                    色変更
                  </button>
                </div>
                
                <div className="transition-target"></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// CSSスタイル
const styles = `
  /* ベース変数 */
  :root {
    /* カラーパレット */
    --color-primary: #4361ee;
    --color-primary-dark: #3a56d4;
    --color-primary-light: #637aff;
    --color-primary-rgb: 67, 97, 238;
    
    --color-secondary: #7209b7;
    --color-secondary-dark: #5f0799;
    --color-secondary-light: #8b21d0;
    --color-secondary-rgb: 114, 9, 183;
    
    --color-accent: #f72585;
    --color-accent-dark: #d91872;
    --color-accent-light: #ff4d9a;
    --color-accent-rgb: 247, 37, 133;
    
    /* 新セマンティックカラー */
    --color-surface-primary: #ffffff;
    --color-surface-secondary: rgba(67, 97, 238, 0.05);
    --color-surface-tertiary: #f1f5f9;
    
    --color-hover-light: rgba(67, 97, 238, 0.08);
    --color-hover-dark: rgba(67, 97, 238, 0.15);
    --color-focus-ring: rgba(67, 97, 238, 0.25);
    --color-pressed: rgba(67, 97, 238, 0.2);
    --color-selected: rgba(67, 97, 238, 0.12);
    
    --color-disabled-bg: #f1f5f9;
    --color-disabled-text: #94a3b8;
    --color-disabled-border: #e2e8f0;
    
    /* ニュートラルカラー */
    --color-bg: #f8fafc;
    --color-bg-secondary: #ffffff;
    --color-text: #1e293b;
    --color-text-light: #64748b;
    --color-text-lighter: #94a3b8;
    --color-border: #e2e8f0;
    
    /* ステータスカラー */
    --color-success: #10b981;
    --color-success-rgb: 16, 185, 129;
    --color-error: #ef4444;
    --color-error-rgb: 239, 68, 68;
    --color-warning: #f59e0b;
    --color-warning-rgb: 245, 158, 11;
    --color-info: #3b82f6;
    --color-info-rgb: 59, 130, 246;
    
    /* トランジション */
    --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
    --transition-normal: 300ms cubic-bezier(0.4, 0, 0.2, 1);
    --transition-slow: 500ms cubic-bezier(0.4, 0, 0.2, 1);
    --transition-bounce: 300ms cubic-bezier(0.175, 0.885, 0.32, 1.275);
    
    /* イージング */
    --ease-out: cubic-bezier(0.19, 1, 0.22, 1);
    --ease-elastic: cubic-bezier(0.68, -0.55, 0.265, 1.55);
    
    /* 空間 */
    --space-1: 0.25rem;
    --space-2: 0.5rem;
    --space-3: 0.75rem;
    --space-4: 1rem;
    --space-5: 1.5rem;
    --space-6: 2rem;
    
    /* ボーダー半径 */
    --radius-sm: 0.25rem;
    --radius-md: 0.5rem;
    --radius-lg: 0.75rem;
    --radius-xl: 1rem;
    --radius-full: 9999px;
    
    /* シャドウ */
    --shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  }
  
  /* ダークモード変数 */
  .dark-mode {
    --color-surface-primary: #1e293b;
    --color-surface-secondary: rgba(129, 140, 248, 0.1);
    --color-surface-tertiary: #334155;
    
    --color-bg: #0f172a;
    --color-bg-secondary: #1e293b;
    --color-text: #f1f5f9;
    --color-text-light: #cbd5e1;
    --color-text-lighter: #94a3b8;
    --color-border: #334155;
    
    --color-primary: #818cf8;
    --color-primary-dark: #6366f1;
    --color-primary-light: #a5b4fc;
    --color-primary-rgb: 129, 140, 248;
    
    --color-hover-light: rgba(129, 140, 248, 0.15);
    --color-focus-ring: rgba(129, 140, 248, 0.25);
    --color-pressed: rgba(129, 140, 248, 0.3);
    
    --color-disabled-bg: #334155;
    --color-disabled-text: #64748b;
    --color-disabled-border: #475569;
  }
  
  /* ベーススタイル */
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    line-height: 1.5;
    transition: background-color var(--transition-normal), color var(--transition-normal);
  }
  
  .design-system-container {
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding: var(--space-4);
    background-color: var(--color-bg);
    color: var(--color-text);
    transition: background-color var(--transition-normal), color var(--transition-normal);
  }
  
  /* ヘッダースタイル */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-4) 0;
    margin-bottom: var(--space-5);
    border-bottom: 1px solid var(--color-border);
  }
  
  .logo {
    font-size: 1.25rem;
    font-weight: 600;
  }
  
  .theme-toggle {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }
  
  .theme-label {
    font-size: 0.875rem;
    color: var(--color-text-light);
  }
  
  .theme-switcher {
    position: relative;
    width: 48px;
    height: 24px;
    border-radius: var(--radius-full);
    background-color: var(--color-border);
    cursor: pointer;
    transition: background-color var(--transition-normal);
  }
  
  .theme-switcher.active {
    background-color: var(--color-primary);
  }
  
  .theme-thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background-color: #fff;
    transition: transform var(--transition-normal) var(--ease-out);
  }
  
  .theme-switcher.active .theme-thumb {
    transform: translateX(24px);
  }
  
  /* タブナビゲーション */
  .tab-navigation {
    display: flex;
    gap: var(--space-2);
    margin-bottom: var(--space-5);
    overflow-x: auto;
    scrollbar-width: none;
    border-bottom: 1px solid var(--color-border);
  }
  
  .tab-navigation::-webkit-scrollbar {
    display: none;
  }
  
  .tab-button {
    padding: var(--space-3) var(--space-4);
    background: none;
    border: none;
    color: var(--color-text-light);
    font-size: 0.875rem;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: color var(--transition-normal), border-color var(--transition-normal);
    white-space: nowrap;
  }
  
  .tab-button:hover {
    color: var(--color-primary);
  }
  
  .tab-button.active {
    color: var(--color-primary);
    border-bottom-color: var(--color-primary);
  }
  
  /* コンテンツエリア */
  .content-area {
    margin-top: var(--space-5);
  }
  
  .tab-content {
    animation: fade-in 0.3s var(--ease-out);
  }
  
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  h2 {
    font-size: 1.5rem;
    margin-bottom: var(--space-3);
    font-weight: 600;
  }
  
  h3 {
    font-size: 1.1rem;
    margin-bottom: var(--space-3);
    font-weight: 500;
  }
  
  h4 {
    font-size: 1rem;
    margin-bottom: var(--space-2);
    font-weight: 500;
  }
  
  .description {
    color: var(--color-text-light);
    margin-bottom: var(--space-5);
    font-size: 0.875rem;
  }
  
  .section {
    margin-bottom: var(--space-6);
    padding: var(--space-4);
    background-color: var(--color-surface-primary);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
  }
  
  /* カラーグリッド */
  .color-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: var(--space-4);
    margin-top: var(--space-3);
  }
  
  .color-item {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  
  .color-preview {
    height: 60px;
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
  }
  
  .color-info {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }
  
  .color-name {
    font-weight: 500;
    font-size: 0.875rem;
  }
  
  .color-value {
    font-size: 0.75rem;
    color: var(--color-text-light);
  }
  
  /* カラープレビュー */
  .primary .color-preview { background-color: var(--color-primary); }
  .secondary .color-preview { background-color: var(--color-secondary); }
  .accent .color-preview { background-color: var(--color-accent); }
  
  .hover .color-preview { background-color: var(--color-hover-light); }
  .focus .color-preview { background-color: var(--color-focus-ring); }
  .pressed .color-preview { background-color: var(--color-pressed); }
  .disabled .color-preview { background-color: var(--color-disabled-bg); }
  
  .surface .color-preview { background-color: var(--color-surface-primary); }
  .surface-secondary .color-preview { background-color: var(--color-surface-secondary); }
  .surface-tertiary .color-preview { background-color: var(--color-surface-tertiary); }
  
  /* ボタングリッド */
  .button-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: var(--space-3);
    margin-top: var(--space-3);
  }
  
  /* 従来のボタン */
  .btn-before {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-md);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    border: none;
    transition: background-color var(--transition-fast);
  }
  
  .btn-before.btn-primary {
    background-color: var(--color-primary);
    color: white;
  }
  
  .btn-before.btn-secondary {
    background-color: var(--color-secondary);
    color: white;
  }
  
  .btn-before.btn-accent {
    background-color: var(--color-accent);
    color: white;
  }
  
  .btn-before.btn-outline {
    background-color: transparent;
    color: var(--color-primary);
    border: 1px solid var(--color-primary);
  }
  
  /* 改善されたボタン */
  .btn-after {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-md);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    border: none;
    transition: all var(--transition-normal);
    box-shadow: var(--shadow-sm);
    position: relative;
    overflow: hidden;
  }
  
  .btn-after.btn-primary {
    background-color: var(--color-primary);
    color: white;
  }
  
  .btn-after.btn-secondary {
    background-color: var(--color-secondary);
    color: white;
  }
  
  .btn-after.btn-accent {
    background-color: var(--color-accent);
    color: white;
  }
  
  .btn-after.btn-outline {
    background-color: transparent;
    color: var(--color-primary);
    border: 1px solid var(--color-primary);
    box-shadow: none;
  }
  
  .btn-after:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }
  
  .btn-after:active {
    transform: scale(0.98);
    box-shadow: 0 0 0 3px var(--color-focus-ring);
  }
  
  .btn-after:disabled {
    background-color: var(--color-disabled-bg);
    color: var(--color-disabled-text);
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
  
  /* ボタン状態のシミュレーション */
  .state-showcase {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-4);
    margin-top: var(--space-3);
  }
  
  .state-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
  }
  
  .state-label {
    font-size: 0.75rem;
    color: var(--color-text-light);
  }
  
  .btn-after.hover {
    background-color: var(--color-primary-dark);
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }
  
  .btn-after.active {
    transform: scale(0.98);
    box-shadow: 0 0 0 3px var(--color-focus-ring);
  }
  
  .btn-after.focus {
    box-shadow: 0 0 0 3px var(--color-focus-ring);
  }
  
  /* リップルエフェクト */
  .ripple-buttons {
    display: flex;
    gap: var(--space-3);
    margin-top: var(--space-3);
  }
  
  .btn-ripple {
    position: relative;
    overflow: hidden;
  }
  
  .ripple {
    position: absolute;
    border-radius: 50%;
    transform: scale(0);
    animation: ripple 0.6s linear;
    background-color: rgba(255, 255, 255, 0.4);
    pointer-events: none;
  }
  
  @keyframes ripple {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }
  
  /* フォーム比較 */
  .form-comparison {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-6);
    margin-top: var(--space-3);
  }
  
  @media (max-width: 768px) {
    .form-comparison {
      grid-template-columns: 1fr;
    }
  }
  
  .form-column {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }
  
  /* 従来のフォーム */
  .form-group-before {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  
  .form-group-before label {
    font-size: 0.875rem;
    color: var(--color-text);
  }
  
  .input-before {
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: 0.875rem;
    color: var(--color-text);
    background-color: var(--color-bg-secondary);
  }
  
  .input-before:focus {
    outline: none;
    border-color: var(--color-primary);
  }
  
  /* 改善されたフォーム */
  .form-group-after {
    margin-bottom: var(--space-4);
    position: relative;
  }
  
  .form-floating {
    position: relative;
  }
  
  .input-after {
    width: 100%;
    padding: var(--space-3) var(--space-3);
    padding-top: var(--space-5);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: 0.875rem;
    color: var(--color-text);
    background-color: var(--color-surface-primary);
    transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  }
  
  .input-after:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px var(--color-focus-ring);
  }
  
  .form-floating label {
    position: absolute;
    top: 0;
    left: 0;
    padding: var(--space-3) var(--space-3);
    color: var(--color-text-light);
    pointer-events: none;
    transition: transform 0.25s var(--ease-out), 
                font-size 0.25s var(--ease-out),
                color 0.25s var(--ease-out);
  }
  
  .form-floating input:focus ~ label,
  .form-floating input:not(:placeholder-shown) ~ label {
    transform: translateY(-0.5rem) scale(0.85);
    padding-left: var(--space-3);
    padding-top: var(--space-2);
    color: var(--color-primary);
  }
  
  /* バリデーション */
  .validation-example {
    margin-top: var(--space-3);
  }
  
  .input-after.is-invalid {
    border-color: var(--color-error);
    animation: shake 0.5s;
  }
  
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20%, 60% { transform: translateX(-5px); }
    40%, 80% { transform: translateX(5px); }
  }
  
  .invalid-feedback {
    color: var(--color-error);
    font-size: 0.75rem;
    margin-top: var(--space-1);
  }
  
  /* カスタムフォーム要素 */
  .custom-form-elements {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    margin-top: var(--space-3);
  }
  
  .form-row {
    display: flex;
    align-items: center;
  }
  
  /* チェックボックス */
  .checkbox-container {
    display: flex;
    align-items: center;
    position: relative;
    padding-left: 30px;
    cursor: pointer;
  }
  
  .checkbox-container input {
    position: absolute;
    opacity: 0;
    cursor: pointer;
    height: 0;
    width: 0;
  }
  
  .checkbox-custom {
    position: absolute;
    left: 0;
    height: 20px;
    width: 20px;
    background-color: var(--color-surface-primary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    transition: all var(--transition-fast);
  }
  
  .checkbox-container:hover .checkbox-custom {
    border-color: var(--color-primary);
  }
  
  .checkbox-container input:checked ~ .checkbox-custom {
    background-color: var(--color-primary);
    border-color: var(--color-primary);
  }
  
  .checkbox-custom:after {
    content: "";
    position: absolute;
    display: none;
    left: 7px;
    top: 3px;
    width: 5px;
    height: 10px;
    border: solid white;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
  }
  
  .checkbox-container input:checked ~ .checkbox-custom:after {
    display: block;
  }
  
  /* ラジオボタン */
  .radio-group {
    display: flex;
    gap: var(--space-4);
  }
  
  .radio-container {
    display: flex;
    align-items: center;
    position: relative;
    padding-left: 30px;
    cursor: pointer;
  }
  
  .radio-container input {
    position: absolute;
    opacity: 0;
    cursor: pointer;
    height: 0;
    width: 0;
  }
  
  .radio-custom {
    position: absolute;
    left: 0;
    height: 20px;
    width: 20px;
    background-color: var(--color-surface-primary);
    border: 1px solid var(--color-border);
    border-radius: 50%;
    transition: all var(--transition-fast);
  }
  
  .radio-container:hover .radio-custom {
    border-color: var(--color-primary);
  }
  
  .radio-container input:checked ~ .radio-custom {
    border-color: var(--color-primary);
  }
  
  .radio-custom:after {
    content: "";
    position: absolute;
    display: none;
    width: 10px;
    height: 10px;
    background-color: var(--color-primary);
    border-radius: 50%;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
  
  .radio-container input:checked ~ .radio-custom:after {
    display: block;
  }
  
  /* トグルスイッチ */
  .toggle-container {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }
  
  .toggle-switch {
    position: relative;
    width: 48px;
    height: 24px;
    border-radius: var(--radius-full);
    background-color: var(--color-border);
    cursor: pointer;
    transition: background-color var(--transition-normal);
    overflow: hidden;
  }
  
  .toggle-switch::before {
    content: '';
    position: absolute;
    width: 100%;
    height: 100%;
    background: rgba(var(--color-primary-rgb), 0.2);
    transform: scale(0);
    border-radius: 50%;
    opacity: 0;
    transition: all 0.5s ease;
  }
  
  .toggle-switch.active::before {
    transform: scale(2);
    opacity: 1;
  }
  
  .toggle-switch.active {
    background-color: var(--color-primary);
  }
  
  .toggle-handle {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background-color: white;
    transition: transform var(--transition-normal) var(--ease-out);
  }
  
  .toggle-switch.active .toggle-handle {
    transform: translateX(24px);
  }
  
  .toggle-label {
    font-size: 0.875rem;
    color: var(--color-text);
  }
  
  /* モーダル */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(5px);
    animation: fade-in 0.3s var(--ease-out);
  }
  
  .modal-dialog {
    background-color: var(--color-surface-primary);
    border-radius: var(--radius-lg);
    width: 90%;
    max-width: 500px;
    box-shadow: var(--shadow-xl);
    animation: modal-slide-in 0.4s var(--ease-out);
  }
  
  @keyframes modal-slide-in {
    from { transform: translateY(-30px) scale(0.95); opacity: 0; }
    to { transform: translateY(0) scale(1); opacity: 1; }
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-4);
    border-bottom: 1px solid var(--color-border);
  }
  
  .modal-title {
    font-weight: 600;
    margin: 0;
  }
  
  .modal-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: var(--color-text-light);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    transition: background-color var(--transition-fast);
  }
  
  .modal-close:hover {
    background-color: var(--color-hover-light);
  }
  
  .modal-body {
    padding: var(--space-4);
  }
  
  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-3);
    padding: var(--space-4);
    border-top: 1px solid var(--color-border);
  }
  
  /* カードショーケース */
  .card-showcase {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-4);
    margin-top: var(--space-3);
  }
  
  @media (max-width: 768px) {
    .card-showcase {
      grid-template-columns: 1fr;
    }
  }
  
  .card-before {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    overflow: hidden;
  }
  
  .card-after {
    border-radius: var(--radius-md);
    overflow: hidden;
    box-shadow: var(--shadow-md);
    transition: transform var(--transition-normal), box-shadow var(--transition-normal);
  }
  
  .card-after:hover {
    transform: translateY(-5px);
    box-shadow: var(--shadow-lg);
  }
  
  .card-header {
    padding: var(--space-3);
    border-bottom: 1px solid var(--color-border);
    background-color: var(--color-surface-secondary);
  }
  
  .card-body {
    padding: var(--space-4);
  }
  
  .card-footer {
    padding: var(--space-3);
    border-top: 1px solid var(--color-border);
    background-color: var(--color-surface-secondary);
  }
  
  /* アラートとトースト */
  .alert-showcase {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    margin-top: var(--space-3);
  }
  
  .alert {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    padding: var(--space-3);
    border-radius: var(--radius-md);
  }
  
  .alert-success {
    background-color: rgba(var(--color-success-rgb), 0.1);
    border-left: 4px solid var(--color-success);
    color: var(--color-success);
  }
  
  .alert-error {
    background-color: rgba(var(--color-error-rgb), 0.1);
    border-left: 4px solid var(--color-error);
    color: var(--color-error);
  }
  
  .alert-icon {
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
  }
  
  .alert-success .alert-icon {
    background-color: var(--color-success);
    color: white;
  }
  
  .alert-error .alert-icon {
    background-color: var(--color-error);
    color: white;
  }
  
  .alert-content {
    flex-grow: 1;
  }
  
  /* トースト */
  .toast-container {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 1000;
  }
  
  .toast {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3);
    background-color: var(--color-surface-primary);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    animation: toast-slide-in 0.3s var(--ease-out);
    min-width: 300px;
  }
  
  @keyframes toast-slide-in {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  .toast-success {
    border-left: 4px solid var(--color-success);
  }
  
  .toast-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background-color: var(--color-success);
    color: white;
    font-weight: bold;
  }
  
  .toast-content {
    flex-grow: 1;
  }
  
  .toast-close {
    background: none;
    border: none;
    font-size: 1.2rem;
    cursor: pointer;
    color: var(--color-text-light);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
  }
  
  /* アニメーション */
  .stagger-demo {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin-top: var(--space-4);
  }
  
  .stagger-item {
    padding: var(--space-3);
    background-color: var(--color-surface-secondary);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
  }
  
  .stagger-fade-in > * {
    opacity: 0;
    animation: fade-in 0.5s var(--ease-out) forwards;
  }
  
  .stagger-fade-in > *:nth-child(1) { animation-delay: 0.1s; }
  .stagger-fade-in > *:nth-child(2) { animation-delay: 0.2s; }
  .stagger-fade-in > *:nth-child(3) { animation-delay: 0.3s; }
  .stagger-fade-in > *:nth-child(4) { animation-delay: 0.4s; }
  .stagger-fade-in > *:nth-child(5) { animation-delay: 0.5s; }
  
  /* スケルトンローディング */
  .skeleton-demo {
    margin-top: var(--space-4);
  }
  
  .skeleton-card {
    display: flex;
    flex-direction: column;
    background-color: var(--color-surface-primary);
    border-radius: var(--radius-md);
    overflow: hidden;
    box-shadow: var(--shadow-sm);
  }
  
  .skeleton {
    position: relative;
    overflow: hidden;
    background-color: var(--color-surface-secondary);
    border-radius: var(--radius-sm);
  }
  
  .skeleton::after {
    content: "";
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    transform: translateX(-100%);
    background-image: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0) 0,
      rgba(255, 255, 255, 0.2) 20%,
      rgba(255, 255, 255, 0.5) 60%,
      rgba(255, 255, 255, 0)
    );
    animation: shimmer 2s infinite;
  }
  
  @keyframes shimmer {
    100% { transform: translateX(100%); }
  }
  
  .skeleton-image {
    width: 100%;
    height: 200px;
  }
  
  .skeleton-content {
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  
  .skeleton-title {
    height: 24px;
    width: 80%;
  }
  
  .skeleton-text {
    height: 16px;
    width: 100%;
  }
  
  .skeleton-text:last-child {
    width: 60%;
  }
  
  /* トランジションデモ */
  .transition-demo {
    margin-top: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    align-items: center;
  }
  
  .transition-options {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .transition-target {
    width: 100px;
    height: 100px;
    background-color: var(--color-primary);
    border-radius: var(--radius-md);
    transition: all 0.5s var(--ease-out);
  }
  
  .transition-target.expanded {
    width: 200px;
    height: 200px;
  }
  
  .transition-target.rotated {
    transform: rotate(180deg);
  }
  
  .transition-target.moved {
    transform: translateY(50px);
  }
  
  .transition-target.colored {
    background-color: var(--color-accent);
  }
  
  /* レスポンシブ対応 */
  @media (max-width: 768px) {
    .form-comparison,
    .card-showcase {
      grid-template-columns: 1fr;
    }
    
    .color-grid,
    .button-grid {
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    }
  }
  
  @media (max-width: 576px) {
    .modal-dialog {
      width: 100%;
      height: 80vh;
      margin: 0;
      border-radius: 0;
      border-top-left-radius: var(--radius-lg);
      border-top-right-radius: var(--radius-lg);
      animation: modal-slide-up 0.3s var(--ease-out);
      align-self: flex-end;
    }
    
    @keyframes modal-slide-up {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }
  }
`;

// スタイルを挿入
document.head.insertAdjacentHTML('beforeend', `<style>${styles}</style>`);

export default DesignSystemShowcase;
