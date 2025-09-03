import { useState, useMemo } from 'react';
import FileUpload from '../../components/FileUpload';

interface ElectricityBillData {
  paymentMonth: string;           // 繳費年月 (例: 113/01)
  startDate: string;              // 計費期間起日
  endDate: string;                // 計費期間迄日
  usage: number;                  // 計費度數 (kWh)
  proofFile: File | null;         // 電費單掃描件
}

interface MonthlyResult {
  month: string;                  // 月份 (例: 113/01)
  billingPeriod: string;          // 計費期間
  billingDays: number;            // 計費天數
  billingUsage: number;           // 計費度數
  percentage: number;             // 占比 (%)
  actualUsage: number;            // 實際應計入用電量 (kWh)
}

const TARGET_YEAR = 113; // 目標收集年度
const COLLECTION_START = '113/01/01';
const COLLECTION_END = '113/12/31';

// 生成月份選項 (從112/12到114/01)
const monthOptions = [
  '112/12', '113/01', '113/02', '113/03', '113/04', '113/05', '113/06',
  '113/07', '113/08', '113/09', '113/10', '113/11', '113/12', '114/01'
];

export default function ElectricityBillPage() {
  const [billData, setBillData] = useState<ElectricityBillData[]>([
    {
      paymentMonth: '',
      startDate: '',
      endDate: '',
      usage: 0,
      proofFile: null
    }
  ]);

  // 計算日期差異（天數）
  const calculateDaysBetween = (startDate: string, endDate: string): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 包含起始日
  };

  // 計算某月在指定期間內的天數
  const calculateMonthDays = (year: number, month: number, startDate: string, endDate: string): number => {
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0); // 該月最後一天
    const periodStart = new Date(startDate);
    const periodEnd = new Date(endDate);

    const overlapStart = new Date(Math.max(monthStart.getTime(), periodStart.getTime()));
    const overlapEnd = new Date(Math.min(monthEnd.getTime(), periodEnd.getTime()));

    if (overlapStart > overlapEnd) return 0;

    return Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  // 計算月度結果
  const monthlyResults = useMemo((): MonthlyResult[] => {
    const results: MonthlyResult[] = [];
    
    // 為每個目標月份初始化結果
    for (let month = 1; month <= 12; month++) {
      const monthStr = `${TARGET_YEAR}/${month.toString().padStart(2, '0')}`;
      results.push({
        month: monthStr,
        billingPeriod: '',
        billingDays: 0,
        billingUsage: 0,
        percentage: 0,
        actualUsage: 0
      });
    }

    // 處理每筆電費單數據
    billData.forEach(bill => {
      if (!bill.startDate || !bill.endDate || bill.usage <= 0) return;

      const totalDays = calculateDaysBetween(bill.startDate, bill.endDate);
      
      // 計算這筆電費單對每個月的分攤
      for (let month = 1; month <= 12; month++) {
        const monthDays = calculateMonthDays(TARGET_YEAR, month, bill.startDate, bill.endDate);
        
        if (monthDays > 0) {
          const monthIndex = month - 1;
          const monthTotalDays = new Date(TARGET_YEAR, month, 0).getDate();
          const allocatedUsage = bill.usage * (monthDays / totalDays);
          const percentage = (monthDays / monthTotalDays) * 100;

          results[monthIndex].billingPeriod = `${bill.startDate} ~ ${bill.endDate}`;
          results[monthIndex].billingDays = totalDays;
          results[monthIndex].billingUsage += bill.usage;
          results[monthIndex].percentage = percentage;
          results[monthIndex].actualUsage += allocatedUsage;
        }
      }
    });

    return results;
  }, [billData]);

  // 計算年度總用電量
  const yearlyTotal = useMemo(() => {
    return monthlyResults.reduce((sum, result) => sum + result.actualUsage, 0);
  }, [monthlyResults]);

  // 檢查缺漏月份
  const missingMonths = useMemo(() => {
    const missing: string[] = [];
    const filledMonths = new Set(billData.filter(bill => bill.paymentMonth).map(bill => bill.paymentMonth));
    
    for (let month = 1; month <= 12; month++) {
      const monthStr = `${TARGET_YEAR}/${month.toString().padStart(2, '0')}`;
      if (!filledMonths.has(monthStr) && monthlyResults[month - 1].actualUsage === 0) {
        missing.push(monthStr);
      }
    }
    
    return missing;
  }, [billData, monthlyResults]);

  // 檢查完整覆蓋
  const coverageCheck = useMemo(() => {
    const sortedBills = billData
      .filter(bill => bill.startDate && bill.endDate)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    if (sortedBills.length === 0) {
      return { isComplete: false, message: '尚未填寫任何電費單資料' };
    }

    const firstBillStart = new Date(sortedBills[0].startDate);
    const lastBillEnd = new Date(sortedBills[sortedBills.length - 1].endDate);
    const targetStart = new Date('2024-01-01'); // 113年對應2024年
    const targetEnd = new Date('2024-12-31');

    if (firstBillStart > targetStart || lastBillEnd < targetEnd) {
      return { 
        isComplete: false, 
        message: `覆蓋期間不完整。需要完整覆蓋 ${COLLECTION_START} ~ ${COLLECTION_END}` 
      };
    }

    // 檢查期間是否連續
    for (let i = 1; i < sortedBills.length; i++) {
      const prevEnd = new Date(sortedBills[i - 1].endDate);
      const currentStart = new Date(sortedBills[i].startDate);
      const daysDiff = Math.abs(currentStart.getTime() - prevEnd.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysDiff > 1) {
        return { 
          isComplete: false, 
          message: `期間不連續：${sortedBills[i - 1].endDate} 與 ${sortedBills[i].startDate} 之間有空隙` 
        };
      }
    }

    return { isComplete: true, message: '覆蓋期間完整' };
  }, [billData]);

  const updateBillData = (index: number, field: keyof ElectricityBillData, value: any) => {
    setBillData(prev => {
      const newData = [...prev];
      newData[index] = { ...newData[index], [field]: value };
      return newData;
    });
  };

  const addNewBill = () => {
    setBillData(prev => [...prev, {
      paymentMonth: '',
      startDate: '',
      endDate: '',
      usage: 0,
      proofFile: null
    }]);
  };

  const removeBill = (index: number) => {
    if (billData.length > 1) {
      setBillData(prev => prev.filter((_, i) => i !== index));
    }
  };

  const validateData = () => {
    const errors: string[] = [];
    
    billData.forEach((bill, index) => {
      if (!bill.paymentMonth) {
        errors.push(`第${index + 1}筆資料：請選擇繳費年月`);
      }
      if (!bill.startDate || !bill.endDate) {
        errors.push(`第${index + 1}筆資料：請填寫完整計費期間`);
      }
      if (bill.usage <= 0) {
        errors.push(`第${index + 1}筆資料：用電度數必須大於0`);
      }
      if (!bill.proofFile) {
        errors.push(`第${index + 1}筆資料：請上傳電費單掃描件`);
      }
    });

    if (missingMonths.length > 0) {
      errors.push(`缺少月份：${missingMonths.join('、')}，請補上相關電費單`);
    }

    if (!coverageCheck.isComplete) {
      errors.push(coverageCheck.message);
    }

    return errors;
  };

  const handleSave = () => {
    const errors = validateData();
    if (errors.length > 0) {
      alert('請修正以下問題：\n' + errors.join('\n'));
      return;
    }
    
    alert('電費單數據已保存！');
  };

  const handleClear = () => {
    if (confirm('確定要清除所有數據嗎？此操作無法復原。')) {
      setBillData([{
        paymentMonth: '',
        startDate: '',
        endDate: '',
        usage: 0,
        proofFile: null
      }]);
    }
  };

  return (
    <div className="space-y-8">
      {/* 頁面標題與說明 */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-green-800 mb-3">電費單收集與計算器</h2>
        <div className="text-gray-600 space-y-2">
          <p><strong>目標收集年度：</strong>{TARGET_YEAR} 年 (2024 年)</p>
          <p><strong>收集期間：</strong>{COLLECTION_START} ~ {COLLECTION_END}</p>
          <p className="text-sm">
            📌 由於電費單週期通常跨月，請上傳從 112/12 月開始到 114/01 月結束的所有電費單，
            系統會自動計算跨月分攤比例。
          </p>
        </div>
      </div>

      {/* 覆蓋檢查狀態 */}
      <div className={`border rounded-xl p-4 ${
        coverageCheck.isComplete ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
      }`}>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            coverageCheck.isComplete ? 'bg-green-500' : 'bg-yellow-500'
          }`}></div>
          <span className={`font-medium ${
            coverageCheck.isComplete ? 'text-green-800' : 'text-yellow-800'
          }`}>
            {coverageCheck.message}
          </span>
        </div>
        {missingMonths.length > 0 && (
          <div className="mt-2 text-sm text-yellow-700">
            缺少月份：{missingMonths.join('、')}
          </div>
        )}
      </div>

      {/* 電費單輸入區域 */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-800">電費單資料輸入</h3>
          <div className="flex space-x-3">
            <button
              onClick={addNewBill}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>新增電費單</span>
            </button>
            <button
              onClick={handleClear}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>清除全部</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto shadow-lg rounded-xl border border-gray-200">
          <table className="w-full border-collapse bg-white">
            <thead>
              <tr className="bg-gradient-to-r from-green-500 to-green-600">
                <th className="px-4 py-4 text-center text-sm font-semibold text-white border-r border-green-400/30 whitespace-nowrap">繳費年月</th>
                <th className="px-4 py-4 text-center text-sm font-semibold text-white border-r border-green-400/30 whitespace-nowrap">計費期間(起)</th>
                <th className="px-4 py-4 text-center text-sm font-semibold text-white border-r border-green-400/30 whitespace-nowrap">計費期間(迄)</th>
                <th className="px-4 py-4 text-center text-sm font-semibold text-white border-r border-green-400/30 whitespace-nowrap">用電度數(kWh)</th>
                <th className="px-4 py-4 text-center text-sm font-semibold text-white border-r border-green-400/30 whitespace-nowrap">電費單掃描件</th>
                <th className="px-4 py-4 text-center text-sm font-semibold text-white whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody>
              {billData.map((bill, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-green-50/50 transition-colors">
                  <td className="px-4 py-4">
                    <select
                      value={bill.paymentMonth}
                      onChange={(e) => updateBillData(index, 'paymentMonth', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 hover:border-green-300 transition-colors duration-200"
                    >
                      <option value="">選擇年月</option>
                      {monthOptions.map(month => (
                        <option key={month} value={month}>{month}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-4">
                    <input
                      type="date"
                      value={bill.startDate}
                      onChange={(e) => updateBillData(index, 'startDate', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 hover:border-green-300 transition-colors duration-200"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <input
                      type="date"
                      value={bill.endDate}
                      onChange={(e) => updateBillData(index, 'endDate', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 hover:border-green-300 transition-colors duration-200"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={bill.usage || ""}
                      onChange={(e) => updateBillData(index, 'usage', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 hover:border-green-300 transition-colors duration-200 text-center"
                      placeholder="度數"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center min-h-[60px]">
                      <FileUpload
                        onFileSelect={(file) => updateBillData(index, 'proofFile', file)}
                        accept=".jpg,.jpeg,.png,.pdf"
                        maxSize={5 * 1024 * 1024}
                        currentFile={bill.proofFile}
                        placeholder="上傳電費單"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-center">
                      <button
                        onClick={() => removeBill(index)}
                        disabled={billData.length === 1}
                        className="text-red-500 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed p-1 rounded-full hover:bg-red-50 transition-colors"
                        title="刪除此筆記錄"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 月度分攤結果 */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-6">月度分攤結果</h3>
        
        <div className="overflow-x-auto shadow-lg rounded-xl border border-gray-200">
          <table className="w-full border-collapse bg-white">
            <thead>
              <tr className="bg-gradient-to-r from-blue-500 to-blue-600">
                <th className="px-4 py-4 text-center text-sm font-semibold text-white border-r border-blue-400/30 whitespace-nowrap">繳費年月</th>
                <th className="px-4 py-4 text-center text-sm font-semibold text-white border-r border-blue-400/30 whitespace-nowrap">計費期間</th>
                <th className="px-4 py-4 text-center text-sm font-semibold text-white border-r border-blue-400/30 whitespace-nowrap">計費天數</th>
                <th className="px-4 py-4 text-center text-sm font-semibold text-white border-r border-blue-400/30 whitespace-nowrap">計費度數</th>
                <th className="px-4 py-4 text-center text-sm font-semibold text-white border-r border-blue-400/30 whitespace-nowrap">占比(%)</th>
                <th className="px-4 py-4 text-center text-sm font-semibold text-white whitespace-nowrap">實際用電量(kWh)</th>
              </tr>
            </thead>
            <tbody>
              {monthlyResults.map((result) => (
                <tr key={result.month} className="border-b border-gray-100 hover:bg-blue-50/50 transition-colors">
                  <td className="px-4 py-4 text-sm font-medium text-gray-800 text-center">{result.month}</td>
                  <td className="px-4 py-4 text-sm text-gray-600 text-center">{result.billingPeriod || '-'}</td>
                  <td className="px-4 py-4 text-sm text-gray-600 text-center">{result.billingDays || '-'}</td>
                  <td className="px-4 py-4 text-sm text-gray-600 text-center">{result.billingUsage > 0 ? result.billingUsage.toFixed(1) : '-'}</td>
                  <td className="px-4 py-4 text-sm text-gray-600 text-center">{result.percentage > 0 ? result.percentage.toFixed(2) + '%' : '-'}</td>
                  <td className="px-4 py-4 text-sm font-medium text-center">
                    <span className={result.actualUsage > 0 ? 'text-blue-600 font-semibold' : 'text-gray-400'}>
                      {result.actualUsage > 0 ? result.actualUsage.toFixed(2) : '0.00'}
                    </span>
                  </td>
                </tr>
              ))}
              {/* 年度合計列 */}
              <tr className="bg-gradient-to-r from-blue-100 to-blue-50 border-t-2 border-blue-300">
                <td className="px-4 py-5 text-sm font-bold text-blue-800 text-center">年度合計</td>
                <td className="px-4 py-5 text-sm text-gray-400 italic text-center">-</td>
                <td className="px-4 py-5 text-sm text-gray-400 italic text-center">-</td>
                <td className="px-4 py-5 text-sm text-gray-400 italic text-center">-</td>
                <td className="px-4 py-5 text-sm text-gray-400 italic text-center">-</td>
                <td className="px-4 py-5">
                  <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold text-lg rounded-lg text-center shadow-lg">
                    {yearlyTotal.toFixed(2)} kWh
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 操作按鈕 */}
      <div className="flex justify-center">
        <button 
          onClick={handleSave}
          className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-xl font-medium transition-colors duration-200 shadow-sm flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          <span>保存數據</span>
        </button>
      </div>
    </div>
  );
}
