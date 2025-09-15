// 測試 entries API 的工具函式
import { sumMonthly, validateMonthlyData } from '../api/entries'

// 測試用例
export function testSumMonthly() {
  
  // 測試案例 1: 正常數據
  const case1 = { '1': 10, '2': 20, '3': 15, '12': 5 }
  const result1 = sumMonthly(case1)

  // 測試案例 2: 包含負值
  const case2 = { '1': 10, '2': -5, '3': 15 }
  const result2 = sumMonthly(case2)

  // 測試案例 3: 包含無效值
  const case3 = { '1': 10, '2': NaN, '3': 15, '4': null as any }
  const result3 = sumMonthly(case3)

  // 測試案例 4: 空物件
  const case4 = {}
  const result4 = sumMonthly(case4)
}

export function testValidateMonthlyData() {
  
  // 測試案例 1: 正常數據
  const case1 = { '1': 10, '2': 20, '12': 15 }
  const result1 = validateMonthlyData(case1)

  // 測試案例 2: 無效月份
  const case2 = { '0': 10, '13': 20, '1': 15 }
  const result2 = validateMonthlyData(case2)

  // 測試案例 3: 負值
  const case3 = { '1': 10, '2': -5, '3': 15 }
  const result3 = validateMonthlyData(case3)
}

export function runAllTests() {
  testSumMonthly()
  testValidateMonthlyData()
}

// 在開發環境下自動運行測試
if (import.meta.env.DEV) {
  // 可以在瀏覽器控制台中呼叫 runAllTests()
  (window as any).runAllTests = runAllTests
}