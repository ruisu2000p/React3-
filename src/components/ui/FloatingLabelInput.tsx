import React, { ChangeEvent, FocusEvent } from 'react';

interface FloatingLabelInputProps {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: FocusEvent<HTMLInputElement>) => void;
  isValid?: boolean;
  errorMessage?: string;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
}

/**
 * フローティングラベル付き入力コンポーネント
 */
const FloatingLabelInput: React.FC<FloatingLabelInputProps> = ({
  id,
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  isValid,
  errorMessage,
  inputProps = {},
}) => {
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
        onBlur={onBlur}
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
