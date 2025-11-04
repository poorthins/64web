import React, { forwardRef, useState } from 'react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(({
  value,
  onChange,
  placeholder = '搜尋用戶姓名、部門或電子郵件...'
}, ref) => {
  const [inputValue, setInputValue] = useState(value)
  const [enterCount, setEnterCount] = useState(0)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const newCount = enterCount + 1
      setEnterCount(newCount)

      if (newCount === 2) {
        // 按兩次 Enter，執行搜尋
        onChange(inputValue)
        setEnterCount(0)
      }

      // 設定計時器，500ms 後重置計數
      setTimeout(() => setEnterCount(0), 500)
    }
  }

  const handleClear = () => {
    setInputValue('')
    onChange('')
    setEnterCount(0)
  }

  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <span className="text-gray-400 text-xl">🔍</span>
      </div>
      <input
        ref={ref}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 placeholder-gray-400"
      />
      {inputValue && (
        <button
          onClick={handleClear}
          className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-700 text-gray-400"
        >
          <span className="text-xl">❌</span>
        </button>
      )}
    </div>
  )
})

SearchBar.displayName = 'SearchBar'

export default SearchBar