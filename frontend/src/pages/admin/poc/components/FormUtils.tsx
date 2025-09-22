import { UserFormData } from '../data/mockData'

export interface ValidationErrors {
  name?: string
  email?: string
  password?: string
  company?: string
  department?: string
  targetYear?: string
  energyCategories?: string
  dieselGeneratorVersion?: string
}

export const validateUserForm = (data: Partial<UserFormData>): ValidationErrors => {
  const errors: ValidationErrors = {}

  // 姓名驗證
  if (!data.name?.trim()) {
    errors.name = '請輸入姓名'
  } else if (data.name.trim().length < 2) {
    errors.name = '姓名至少需要2個字符'
  }

  // Email 驗證
  if (!data.email?.trim()) {
    errors.email = '請輸入電子郵件'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = '請輸入有效的電子郵件格式'
  }

  // 密碼驗證
  if (!data.password?.trim()) {
    errors.password = '請輸入密碼'
  } else if (data.password.length < 6) {
    errors.password = '密碼至少需要6個字符'
  }

  // 公司驗證
  if (!data.company?.trim()) {
    errors.company = '請輸入公司名稱'
  }

  // 部門驗證
  if (!data.department?.trim()) {
    errors.department = '請輸入部門'
  }

  // 目標年份驗證
  const currentYear = new Date().getFullYear()
  if (!data.targetYear) {
    errors.targetYear = '請選擇目標年份'
  } else if (data.targetYear < currentYear || data.targetYear > currentYear + 10) {
    errors.targetYear = `目標年份必須在 ${currentYear} 到 ${currentYear + 10} 之間`
  }

  // 能源類別驗證
  if (!data.energyCategories || data.energyCategories.length === 0) {
    errors.energyCategories = '請至少選擇一個能源類別'
  }

  // 柴油發電機版本驗證
  if (data.energyCategories?.includes('diesel_generator') && !data.dieselGeneratorVersion) {
    errors.dieselGeneratorVersion = '選擇柴油發電機時必須選擇版本'
  }

  return errors
}

export const hasErrors = (errors: ValidationErrors): boolean => {
  return Object.keys(errors).length > 0
}

export const getFieldError = (errors: ValidationErrors, field: keyof ValidationErrors): string | undefined => {
  return errors[field]
}

export const InputField: React.FC<{
  label: string
  name: string
  type?: string
  value: string
  onChange: (value: string) => void
  error?: string
  placeholder?: string
  required?: boolean
}> = ({ label, name, type = 'text', value, onChange, error, placeholder, required = false }) => {
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type={type}
        id={name}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
          error ? 'border-red-300 bg-red-50' : 'border-gray-300'
        }`}
      />
      {error && (
        <p className="text-sm text-red-600 flex items-center">
          <span className="mr-1">⚠️</span>
          {error}
        </p>
      )}
    </div>
  )
}

export const SelectField: React.FC<{
  label: string
  name: string
  value: string | number
  onChange: (value: string) => void
  options: { value: string | number; label: string }[]
  error?: string
  required?: boolean
}> = ({ label, name, value, onChange, options, error, required = false }) => {
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
          error ? 'border-red-300 bg-red-50' : 'border-gray-300'
        }`}
      >
        <option value="">請選擇...</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-sm text-red-600 flex items-center">
          <span className="mr-1">⚠️</span>
          {error}
        </p>
      )}
    </div>
  )
}