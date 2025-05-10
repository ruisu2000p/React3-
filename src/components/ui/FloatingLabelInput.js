import React from 'react';

/**
 * フローティングラベル付き入力コンポーネント
 * 
 * @param {Object} props
 * @param {string} props.id - 入力フィールドのID
 * @param {string} props.label - ラベルテキスト
 * @param {string} props.type - 入力タイプ ('text', 'email', 'password' など)
 * @param {string} props.value - 入力値
 * @param {Function} props.onChange - 値変更時のコールバック
 * @param {boolean} props.isValid - 検証結果 (true=有効, false=無効, undefined=未検証)
 * @param {string} props.errorMessage - エラーメッセージ
 * @param {Object} props.inputProps - その他のinput要素に渡す属性
 */
const FloatingLabelInput = ({
  id,
  label,
  type = 'text',
  value,
  onChange,
  isValid,
  errorMessage,
  inputProps = {},
}) => {
  // 検証クラスの決定
  const validationClass = isValid === undefined
    ? ''
    : isValid
      ? 'is-valid'
      : 'is-invalid';
  
  return (
    <div className="form-group-after form-floating">
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        className={`input-after ${validationClass}`}
        placeholder=" " // スペースを入れることで:not(:placeholder-shown)が機能する
        {...inputProps}
      />
      <label htmlFor={id}>{label}</label>
      
      {!isValid && errorMessage && (
        <div className="invalid-feedback">
          {errorMessage}
        </div>
      )}
    </div>
  );
};

export default FloatingLabelInput;
