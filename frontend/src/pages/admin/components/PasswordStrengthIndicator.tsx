import React from 'react';

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
  bgColor: string;
  suggestions: string[];
}

const calculatePasswordStrength = (password: string): PasswordStrength => {
  let score = 0;
  const suggestions: string[] = [];

  if (password.length === 0) {
    return {
      score: 0,
      label: '請輸入密碼',
      color: 'text-gray-500',
      bgColor: 'bg-gray-200',
      suggestions: []
    };
  }

  // 密碼長度不再限制，任何長度都可以
  if (password.length >= 1) {
    score += 1; // 有密碼就給分
  }

  if (password.length >= 8) {
    score += 1; // 長密碼額外加分，但不強制
  }

  // 包含小寫字母
  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    suggestions.push('包含小寫字母 (a-z)');
  }

  // 包含大寫字母
  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    suggestions.push('包含大寫字母 (A-Z)');
  }

  // 包含數字
  if (/\d/.test(password)) {
    score += 1;
  } else {
    suggestions.push('包含數字 (0-9)');
  }

  // 包含特殊字符
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 1;
  } else {
    suggestions.push('包含特殊字符 (!@#$%^&*...)');
  }

  // 避免常見模式
  const commonPatterns = ['123', 'abc', 'password', 'admin', 'user'];
  if (!commonPatterns.some(pattern => password.toLowerCase().includes(pattern))) {
    score += 1;
  } else {
    suggestions.push('避免使用常見的字符組合');
  }

  // 確定強度等級（降低閨值以適應任意長度）
  if (score >= 6) {
    return {
      score,
      label: '非常強',
      color: 'text-green-700',
      bgColor: 'bg-green-500',
      suggestions: []
    };
  } else if (score >= 4) {
    return {
      score,
      label: '強',
      color: 'text-green-600',
      bgColor: 'bg-green-400',
      suggestions: suggestions.slice(0, 2)
    };
  } else if (score >= 3) {
    return {
      score,
      label: '中等',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-400',
      suggestions: suggestions.slice(0, 3)
    };
  } else if (score >= 1) {
    return {
      score,
      label: '弱',
      color: 'text-red-600',
      bgColor: 'bg-red-400',
      suggestions: suggestions.slice(0, 3)
    };
  } else {
    return {
      score,
      label: '很弱',
      color: 'text-red-700',
      bgColor: 'bg-red-500',
      suggestions: suggestions.slice(0, 3)
    };
  }
};

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
  className = ''
}) => {
  const strength = calculatePasswordStrength(password);
  const maxScore = 8;
  const widthPercentage = (strength.score / maxScore) * 100;

  return (
    <div className={`mt-2 ${className}`}>
      {/* 強度條 */}
      <div className="flex items-center space-x-3 mb-2">
        <div className="flex-1">
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full ${strength.bgColor} transition-all duration-300 ease-out`}
              style={{ width: `${widthPercentage}%` }}
            />
          </div>
        </div>
        <span className={`text-sm font-medium ${strength.color} min-w-0 w-16`}>
          {strength.label}
        </span>
      </div>

      {/* 建議 */}
      {strength.suggestions.length > 0 && (
        <div className="text-xs text-gray-600 space-y-1">
          <div className="font-medium">建議改進：</div>
          <ul className="space-y-0.5">
            {strength.suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-center">
                <span className="w-1 h-1 bg-gray-400 rounded-full mr-2 flex-shrink-0" />
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}

      {strength.score >= 3 && (
        <div className="flex items-center text-xs text-green-600 mt-1">
          <span className="mr-1">✓</span>
          密碼強度良好
        </div>
      )}
    </div>
  );
};