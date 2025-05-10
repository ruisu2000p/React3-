import { useState, useCallback, useEffect } from 'react';

/**
 * フォームバリデーション用のカスタムフック
 * 
 * @param {Object} initialValues - フォームの初期値
 * @param {Object} validationRules - バリデーションルール
 * @param {Function} onSubmit - 送信時に呼び出される関数
 * @returns {Object} フォーム管理のためのオブジェクト
 */
const useFormValidation = (initialValues = {}, validationRules = {}, onSubmit = () => {}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValid, setIsValid] = useState(false);
  
  // 全フィールドのバリデーション実行
  const validateAll = useCallback(() => {
    const newErrors = {};
    let isFormValid = true;
    
    Object.keys(validationRules).forEach(fieldName => {
      const value = values[fieldName];
      const fieldRules = validationRules[fieldName];
      
      // フィールドのバリデーション実行
      const fieldError = validateField(value, fieldRules);
      
      if (fieldError) {
        newErrors[fieldName] = fieldError;
        isFormValid = false;
      }
    });
    
    setErrors(newErrors);
    setIsValid(isFormValid);
    
    return isFormValid;
  }, [values, validationRules]);
  
  // 単一フィールドのバリデーション
  const validateField = (value, rules) => {
    if (!rules) return null;
    
    // 必須チェック
    if (rules.required && (value === undefined || value === null || value === '')) {
      return rules.required === true ? '必須項目です' : rules.required;
    }
    
    // 最小長チェック
    if (rules.minLength && value && value.length < rules.minLength.value) {
      return rules.minLength.message || `${rules.minLength.value}文字以上で入力してください`;
    }
    
    // 最大長チェック
    if (rules.maxLength && value && value.length > rules.maxLength.value) {
      return rules.maxLength.message || `${rules.maxLength.value}文字以下で入力してください`;
    }
    
    // 最小値チェック
    if (rules.min && value !== '' && Number(value) < rules.min.value) {
      return rules.min.message || `${rules.min.value}以上の値を入力してください`;
    }
    
    // 最大値チェック
    if (rules.max && value !== '' && Number(value) > rules.max.value) {
      return rules.max.message || `${rules.max.value}以下の値を入力してください`;
    }
    
    // パターンチェック (正規表現)
    if (rules.pattern && value && !rules.pattern.value.test(value)) {
      return rules.pattern.message || '形式が正しくありません';
    }
    
    // カスタムバリデーション
    if (rules.validate && typeof rules.validate === 'function') {
      const validationResult = rules.validate(value, values);
      if (validationResult !== true) {
        return validationResult;
      }
    }
    
    return null;
  };
  
  // 入力値の変更ハンドラー
  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    
    // チェックボックスの場合は checked プロパティを使用
    const newValue = type === 'checkbox' ? checked : value;
    
    setValues(prev => ({
      ...prev,
      [name]: newValue
    }));
    
    // フィールドがタッチ済みなら即時バリデーション
    if (touched[name]) {
      const fieldRules = validationRules[name];
      const fieldError = validateField(newValue, fieldRules);
      
      setErrors(prev => ({
        ...prev,
        [name]: fieldError
      }));
    }
  }, [touched, validationRules]);
  
  // プログラムによる値の設定
  const setValue = useCallback((name, value) => {
    setValues(prev => ({
      ...prev,
      [name]: value
    }));
    
    // フィールドがタッチ済みなら即時バリデーション
    if (touched[name]) {
      const fieldRules = validationRules[name];
      const fieldError = validateField(value, fieldRules);
      
      setErrors(prev => ({
        ...prev,
        [name]: fieldError
      }));
    }
  }, [touched, validationRules]);
  
  // フォーカスを失った時のハンドラー
  const handleBlur = useCallback((e) => {
    const { name, value } = e.target;
    
    // フィールドをタッチ済みにする
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
    
    // バリデーション実行
    const fieldRules = validationRules[name];
    const fieldError = validateField(value, fieldRules);
    
    setErrors(prev => ({
      ...prev,
      [name]: fieldError
    }));
  }, [validationRules]);
  
  // フォーム送信ハンドラー
  const handleSubmit = useCallback(async (e) => {
    if (e) e.preventDefault();
    
    // 全フィールドをタッチ済みに
    const allTouched = Object.keys(validationRules).reduce((acc, field) => {
      acc[field] = true;
      return acc;
    }, {});
    
    setTouched(allTouched);
    
    // 全フィールドのバリデーション
    const isFormValid = validateAll();
    
    if (isFormValid) {
      setIsSubmitting(true);
      
      try {
        await onSubmit(values);
      } catch (error) {
        console.error('Form submission error:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [values, validateAll, onSubmit, validationRules]);
  
  // フォームのリセット
  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);
  
  // 値が変わったときに全体のバリデーションを更新
  useEffect(() => {
    validateAll();
  }, [values, validateAll]);
  
  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    handleChange,
    handleBlur,
    handleSubmit,
    setValue,
    resetForm,
    validateField,
    validateAll
  };
};

export default useFormValidation;
