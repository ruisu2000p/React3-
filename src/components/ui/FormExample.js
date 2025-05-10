import React from 'react';
import useFormValidation from '../../hooks/useFormValidation';
import { useNotification } from '../../contexts/NotificationContext';
import Button from './Button';
import FloatingLabelInput from './FloatingLabelInput';

/**
 * 高度なフォームバリデーション実装のサンプルコンポーネント
 */
const FormExample = () => {
  const { showSuccess, showError } = useNotification();
  
  // フォーム送信処理
  const handleSubmit = async (values) => {
    // 実際のアプリケーションではここでAPIリクエストなどを行います
    try {
      console.log('Form submitted with values:', values);
      
      // 送信成功シミュレーション
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      showSuccess('フォームが正常に送信されました');
      resetForm(); // 送信後にフォームをリセット
      return true;
    } catch (error) {
      showError('フォーム送信中にエラーが発生しました');
      return false;
    }
  };
  
  // バリデーションルール
  const validationRules = {
    name: {
      required: '名前は必須です',
      minLength: { value: 2, message: '名前は2文字以上で入力してください' },
      maxLength: { value: 50, message: '名前は50文字以下で入力してください' }
    },
    email: {
      required: 'メールアドレスは必須です',
      pattern: {
        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
        message: '有効なメールアドレスを入力してください'
      }
    },
    age: {
      required: '年齢は必須です',
      min: { value: 18, message: '18歳以上で入力してください' },
      max: { value: 120, message: '120歳以下で入力してください' },
      validate: (value) => {
        return Number.isInteger(Number(value)) || '整数で入力してください';
      }
    },
    password: {
      required: 'パスワードは必須です',
      minLength: { value: 8, message: 'パスワードは8文字以上で入力してください' },
      validate: (value) => {
        if (!/[A-Z]/.test(value)) return '少なくとも1つの大文字を含めてください';
        if (!/[a-z]/.test(value)) return '少なくとも1つの小文字を含めてください';
        if (!/[0-9]/.test(value)) return '少なくとも1つの数字を含めてください';
        return true;
      }
    },
    confirmPassword: {
      required: 'パスワード確認は必須です',
      validate: (value, values) => value === values.password || 'パスワードが一致しません'
    }
  };
  
  // フォームバリデーションフックの使用
  const {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    handleChange,
    handleBlur,
    handleSubmit: submitForm,
    resetForm
  } = useFormValidation(
    {
      name: '',
      email: '',
      age: '',
      password: '',
      confirmPassword: ''
    },
    validationRules,
    handleSubmit
  );
  
  return (
    <div className="form-example">
      <h2>サンプルフォーム</h2>
      <p className="text-sm text-muted mb-4">
        すべてのフィールドには独自のバリデーションルールがあります。
        入力して送信ボタンを押すと、リアルタイムで検証が行われます。
      </p>
      
      <form onSubmit={submitForm} className="space-y-4">
        {/* 名前フィールド */}
        <FloatingLabelInput
          id="name"
          label="名前"
          value={values.name}
          onChange={handleChange}
          onBlur={handleBlur}
          isValid={touched.name ? !errors.name : undefined}
          errorMessage={errors.name}
          inputProps={{
            name: 'name',
            autoComplete: 'name'
          }}
        />
        
        {/* メールフィールド */}
        <FloatingLabelInput
          id="email"
          label="メールアドレス"
          type="email"
          value={values.email}
          onChange={handleChange}
          onBlur={handleBlur}
          isValid={touched.email ? !errors.email : undefined}
          errorMessage={errors.email}
          inputProps={{
            name: 'email',
            autoComplete: 'email'
          }}
        />
        
        {/* 年齢フィールド */}
        <FloatingLabelInput
          id="age"
          label="年齢"
          type="number"
          value={values.age}
          onChange={handleChange}
          onBlur={handleBlur}
          isValid={touched.age ? !errors.age : undefined}
          errorMessage={errors.age}
          inputProps={{
            name: 'age',
            min: 18,
            max: 120
          }}
        />
        
        {/* パスワードフィールド */}
        <FloatingLabelInput
          id="password"
          label="パスワード"
          type="password"
          value={values.password}
          onChange={handleChange}
          onBlur={handleBlur}
          isValid={touched.password ? !errors.password : undefined}
          errorMessage={errors.password}
          inputProps={{
            name: 'password',
            autoComplete: 'new-password'
          }}
        />
        
        {/* パスワード確認フィールド */}
        <FloatingLabelInput
          id="confirmPassword"
          label="パスワード確認"
          type="password"
          value={values.confirmPassword}
          onChange={handleChange}
          onBlur={handleBlur}
          isValid={touched.confirmPassword ? !errors.confirmPassword : undefined}
          errorMessage={errors.confirmPassword}
          inputProps={{
            name: 'confirmPassword',
            autoComplete: 'new-password'
          }}
        />
        
        {/* 送信ボタン */}
        <div className="flex gap-3 mt-6">
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            送信
          </Button>
          
          <Button
            type="button"
            variant="outline"
            onClick={resetForm}
            disabled={isSubmitting}
          >
            リセット
          </Button>
        </div>
      </form>
    </div>
  );
};

export default FormExample;
