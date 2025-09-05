// 測試 entries API 的工具函式
import { sumMonthly, validateMonthlyData } from '../api/entries'

// 測試用例
export function testSumMonthly() {
  console.log('=== 測試 sumMonthly 函式 ===')
  
  // 測試案例 1: 正常數據
  const case1 = { '1': 10, '2': 20, '3': 15, '12': 5 }
  const result1 = sumMonthly(case1)
  console.log('案例 1:', case1, '→ 總和:', result1) // 預期: 50

  // 測試案例 2: 包含負值
  const case2 = { '1': 10, '2': -5, '3': 15 }
  const result2 = sumMonthly(case2)
  console.log('案例 2:', case2, '→ 總和:', result2) // 預期: 25 (負值被忽略)

  // 測試案例 3: 包含無效值
  const case3 = { '1': 10, '2': NaN, '3': 15, '4': null as any }
  const result3 = sumMonthly(case3)
  console.log('案例 3:', case3, '→ 總和:', result3) // 預期: 25

  // 測試案例 4: 空物件
  const case4 = {}
  const result4 = sumMonthly(case4)
  console.log('案例 4:', case4, '→ 總和:', result4) // 預期: 0
}

export function testValidateMonthlyData() {
  console.log('\n=== 測試 validateMonthlyData 函式 ===')
  
  // 測試案例 1: 正常數據
  const case1 = { '1': 10, '2': 20, '12': 15 }
  const result1 = validateMonthlyData(case1)
  console.log('案例 1:', case1, '→', result1)

  // 測試案例 2: 無效月份
  const case2 = { '0': 10, '13': 20, '1': 15 }
  const result2 = validateMonthlyData(case2)
  console.log('案例 2:', case2, '→', result2)

  // 測試案例 3: 負值
  const case3 = { '1': 10, '2': -5, '3': 15 }
  const result3 = validateMonthlyData(case3)
  console.log('案例 3:', case3, '→', result3)
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