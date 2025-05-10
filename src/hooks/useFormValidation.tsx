import { useState, useCallback, useEffect } from 'react';

interface ValidationRule {
  required?: boolean | string;
  minLength?: {
    value: number;
    message?: string;
  };
  maxLength?: {
    value: number;
    message?: string;
  };
  min?: {
    value: number;
    message?: string;
  };
  max?: {
    value: number;
    message?: string;
  };
  pattern?: {
    value: RegExp;
    message?: string;
  };
  validate?: (value: any, values: any) => boolean | string;
}

interface ValidationRules {
  [key: string]: ValidationRule;
}

interface DefaultFormValues {
  [key: string]: any;
}

interface FormErrors {
  [key: string]: string | null;
}

interface FormTouched {
  [key: string]: boolean;
}

interface FormValidationReturn<T extends DefaultFormValues> {
  values: T;
  errors: FormErrors;
  touched: FormTouched;
  isSubmitting: boolean;
  isValid: boolean;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  handleBlur: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  handleSubmit: (e?: React.FormEvent) => Promise<void>;
  setValue: (name: string, value: any) => void;
  resetForm: () => void;
  validateField: (value: any, rules?: ValidationRule) => string | null;
  validateAll: () => boolean;
}

/**
 * フォームバリデーション用のカスタムフック
 * 
 * @param initialValues - フォームの初期値
 * @param validationRules - バリデーションルール
 * @param onSubmit - 送信時に呼び出される関数
 * @returns フォーム管理のためのオブジェクト
 */
const useFormValidation = <T extends DefaultFormValues>(
  initialValues: T = {} as T, 
  validationRules: ValidationRules = {}, 
  onSubmit: (values: T) => Promise<void> | void = () => {}
): FormValidationReturn<T> => {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<FormTouched>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isValid, setIsValid] = useState<boolean>(false);
  
  const validateField = (value: any, rules?: ValidationRule): string | null => {
    if (!rules) return null;
    
    if (rules.required && (value === undefined || value === null || value === '')) {
      return rules.required === true ? '必須項目です' : String(rules.required);
    }
    
    if (rules.minLength && value && value.length < rules.minLength.value) {
      return rules.minLength.message || `${rules.minLength.value}文字以上で入力してください`;
    }
    
    if (rules.maxLength && value && value.length > rules.maxLength.value) {
      return rules.maxLength.message || `${rules.maxLength.value}文字以下で入力してください`;
    }
    
    if (rules.min && value !== '' && Number(value) < rules.min.value) {
      return rules.min.message || `${rules.min.value}以上の値を入力してください`;
    }
    
    if (rules.max && value !== '' && Number(value) > rules.max.value) {
      return rules.max.message || `${rules.max.value}以下の値を入力してください`;
    }
    
    if (rules.pattern && value && !rules.pattern.value.test(value)) {
      return rules.pattern.message || '形式が正しくありません';
    }
    
    if (rules.validate && typeof rules.validate === 'function') {
      const validationResult = rules.validate(value, values);
      if (validationResult !== true) {
        return validationResult as string;
      }
    }
    
    return null;
  };
  
  const validateAll = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    let isFormValid = true;
    
    Object.keys(validationRules).forEach(fieldName => {
      const value = values[fieldName];
      const fieldRules = validationRules[fieldName];
      
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
  
  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ): void => {
    const { name, value, type } = e.target;
    
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    setValues((prev: T) => ({
      ...prev,
      [name]: newValue
    }));
    
    if (touched[name]) {
      const fieldRules = validationRules[name];
      const fieldError = validateField(newValue, fieldRules);
      
      setErrors((prev: FormErrors) => ({
        ...prev,
        [name]: fieldError
      }));
    }
  }, [touched, validationRules]);
  
  const setValue = useCallback((name: string, value: any): void => {
    setValues((prev: T) => ({
      ...prev,
      [name]: value
    }));
    
    if (touched[name]) {
      const fieldRules = validationRules[name];
      const fieldError = validateField(value, fieldRules);
      
      setErrors((prev: FormErrors) => ({
        ...prev,
        [name]: fieldError
      }));
    }
  }, [touched, validationRules]);
  
  const handleBlur = useCallback((
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ): void => {
    const { name, value } = e.target;
    
    setTouched((prev: FormTouched) => ({
      ...prev,
      [name]: true
    }));
    
    const fieldRules = validationRules[name];
    const fieldError = validateField(value, fieldRules);
    
    setErrors((prev: FormErrors) => ({
      ...prev,
      [name]: fieldError
    }));
  }, [validationRules]);
  
  const handleSubmit = useCallback(async (e?: React.FormEvent): Promise<void> => {
    if (e) e.preventDefault();
    
    const allTouched = Object.keys(validationRules).reduce<FormTouched>((acc, field) => {
      acc[field] = true;
      return acc;
    }, {});
    
    setTouched(allTouched);
    
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
  
  const resetForm = useCallback((): void => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);
  
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
