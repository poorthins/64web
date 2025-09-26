import { useState, useCallback, useEffect } from 'react';

interface ValidationRule {
  validator: (value: any) => boolean;
  message: string;
}

interface ValidationRules {
  [key: string]: ValidationRule[];
}

interface ValidationErrors {
  [key: string]: string | undefined;
}

export const useFormValidation = <T extends Record<string, any>>(
  initialData: T,
  rules: ValidationRules
) => {
  const [data, setData] = useState<T>(initialData);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  // 驗證單個欄位
  const validateField = useCallback((fieldName: string, value: any): string | undefined => {
    const fieldRules = rules[fieldName];
    if (!fieldRules) return undefined;

    for (const rule of fieldRules) {
      if (!rule.validator(value)) {
        return rule.message;
      }
    }
    return undefined;
  }, [rules]);

  // 驗證所有欄位
  const validateAll = useCallback((): ValidationErrors => {
    const newErrors: ValidationErrors = {};

    Object.keys(rules).forEach(fieldName => {
      const error = validateField(fieldName, data[fieldName]);
      if (error) {
        newErrors[fieldName] = error;
      }
    });

    return newErrors;
  }, [data, rules, validateField]);

  // 更新欄位值
  const updateField = useCallback((fieldName: string, value: any) => {
    setData(prev => ({ ...prev, [fieldName]: value }));

    // 即時驗證（僅針對已經被觸碰過的欄位）
    if (touchedFields.has(fieldName)) {
      const fieldError = validateField(fieldName, value);
      setErrors(prev => ({
        ...prev,
        [fieldName]: fieldError
      }));
    }
  }, [touchedFields, validateField]);

  // 標記欄位為已觸碰
  const touchField = useCallback((fieldName: string) => {
    setTouchedFields(prev => new Set([...prev, fieldName]));

    // 立即驗證該欄位
    const fieldError = validateField(fieldName, data[fieldName]);
    setErrors(prev => ({
      ...prev,
      [fieldName]: fieldError
    }));
  }, [data, validateField]);

  // 檢查是否有錯誤
  const hasErrors = useCallback((errorsToCheck?: ValidationErrors): boolean => {
    const errorsObj = errorsToCheck || errors;
    return Object.values(errorsObj).some(error => error !== undefined);
  }, [errors]);

  // 重置表單
  const reset = useCallback(() => {
    setData(initialData);
    setErrors({});
    setTouchedFields(new Set());
  }, [initialData]);

  // 驗證並取得所有錯誤
  const validateAndGetErrors = useCallback((): ValidationErrors => {
    const allErrors = validateAll();
    setErrors(allErrors);

    // 標記所有欄位為已觸碰
    setTouchedFields(new Set(Object.keys(rules)));

    return allErrors;
  }, [validateAll, rules]);

  return {
    data,
    errors,
    touchedFields,
    updateField,
    touchField,
    hasErrors,
    reset,
    validateField,
    validateAll,
    validateAndGetErrors,
    isFieldTouched: (fieldName: string) => touchedFields.has(fieldName),
    getFieldError: (fieldName: string) => errors[fieldName]
  };
};

// 常用驗證規則
export const createValidationRules = () => ({
  required: (message = '此欄位為必填'): ValidationRule => ({
    validator: (value: any) => {
      if (typeof value === 'string') return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0;
      return value !== null && value !== undefined;
    },
    message
  }),

  email: (message = '請輸入有效的電子郵件地址'): ValidationRule => ({
    validator: (value: string) => {
      if (!value) return true; // 空值由 required 驗證
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    },
    message
  }),

  minLength: (min: number, message?: string): ValidationRule => ({
    validator: (value: string) => {
      if (!value) return true; // 空值由 required 驗證
      return value.length >= min;
    },
    message: message || `至少需要 ${min} 個字符`
  }),

  maxLength: (max: number, message?: string): ValidationRule => ({
    validator: (value: string) => {
      if (!value) return true;
      return value.length <= max;
    },
    message: message || `最多 ${max} 個字符`
  }),

  password: (message = '請輸入密碼'): ValidationRule => ({
    validator: (value: string) => {
      if (!value) return true; // 空值由 required 驗證
      return true; // 不限制密碼格式
    },
    message
  }),

  arrayMinLength: (min: number, message?: string): ValidationRule => ({
    validator: (value: any[]) => {
      if (!Array.isArray(value)) return false;
      return value.length >= min;
    },
    message: message || `至少需要選擇 ${min} 項`
  }),

  custom: (validator: (value: any) => boolean, message: string): ValidationRule => ({
    validator,
    message
  })
});