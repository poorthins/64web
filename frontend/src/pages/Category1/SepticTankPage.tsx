import { useState, useMemo } from 'react';
import FileUpload from '../../components/FileUpload';

interface MonthData {
  month: number;
  hours: number;          // 當月總工時
  proofFile: File | null; // 佐證資料
}

const monthLabels = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];

export default function SepticTankPage() {
  const [monthlyData, setMonthlyData] = useState<MonthData[]>(
    Array.from({ length: 12 }, (_, i) => ({ 
      month: i + 1, 
      hours: 0,
      proofFile: null
    }))
  );

  // 年總工時（自動計算）
  const yearlyTotal = useMemo(
    () => monthlyData.reduce((sum, data) => sum + (Number.isFinite(data.hours) ? data.hours : 0), 0),
    [monthlyData]
  );

  const updateMonthData = (index: number, field: keyof MonthData, value: any) => {
    setMonthlyData(prev => {
      const newData = [...prev];
      newData[index] = { ...newData[index], [field]: value };
      return newData;
    });
  };

  const validateData = () => {
    const errors: string[] = [];
    
    monthlyData.forEach((data, index) => {
      if (data.hours > 0 && !data.proofFile) {
        errors.push(`${monthLabels[index]}有工時但未上傳佐證資料`);
      }
    });

    return errors;
  };

  const handleSave = () => {
    const errors = validateData();
    if (errors.length > 0) {
      alert('請修正以下問題：\n' + errors.join('\n'));
      return;
    }
    
    alert('化糞池工時數據已保存！');
  };

  const handleClear = () => {
    if (confirm('確定要清除所有數據嗎？此操作無法復原。')) {
      setMonthlyData(prev => 
        prev.map(data => ({
          ...data,
          hours: 0,
          proofFile: null
        }))
      );
    }
  };

  return (
    <div className="space-y-8">
      {/* 頁面標題 */}
      <div className="bg-brand-50 border border-brand-200 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-brand-800 mb-3">化糞池工時填報</h2>
        <p className="text-gray-600">請輸入每月份的總工時（小時）並上傳相關佐證資料</p>
      </div>

      {/* 主要內容區域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左側表格區域 */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-800">月份工時</h3>
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

          <div className="overflow-x-auto shadow-lg rounded-xl border border-gray-200">
            <table className="w-full border-collapse bg-white">
              <thead>
                <tr className="bg-gradient-to-r from-brand-500 to-brand-600">
                  <th className="px-6 py-4 text-center text-sm font-semibold text-white border-r border-brand-400/30 whitespace-nowrap">月份</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-white border-r border-brand-400/30 whitespace-nowrap">總工時（小時）</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-white whitespace-nowrap">佐證資料</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((data, index) => (
                  <tr key={data.month} className="border-b border-gray-100 hover:bg-brand-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-800 bg-gray-50/60">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-brand-400"></div>
                        <span>{monthLabels[index]}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        min={0}
                        step={0.1}
                        value={data.hours === 0 ? "" : data.hours}
                        onFocus={(e) => {
                          if (e.target.value === "0") {
                            e.target.value = "";
                          }
                        }}
                        onBlur={(e) => {
                          if (e.target.value === "") {
                            updateMonthData(index, 'hours', 0);
                          }
                        }}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateMonthData(index, 'hours', val === "" ? 0 : parseFloat(val));
                        }}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 hover:border-brand-300 transition-colors duration-200 text-center"
                        placeholder="0"
                        aria-label={`${monthLabels[index]} 總工時`}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center min-h-[80px]">
                        <FileUpload
                          onFileSelect={(file) => updateMonthData(index, 'proofFile', file)}
                          accept=".jpg,.jpeg,.png,.pdf"
                          maxSize={5 * 1024 * 1024}
                          currentFile={data.proofFile}
                          placeholder="上傳佐證"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
                {/* 年度合計列 */}
                <tr className="bg-gradient-to-r from-brand-100 to-brand-50 border-t-2 border-brand-300">
                  <td className="px-6 py-5 text-sm font-bold text-brand-800">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-brand-600"></div>
                      <span>年度合計</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="px-4 py-3 bg-gradient-to-r from-brand-600 to-brand-700 text-white font-bold text-lg rounded-lg text-center shadow-lg">
                      {yearlyTotal.toFixed(1)} 小時
                    </div>
                  </td>
                  <td className="px-6 py-5 text-sm text-gray-400 italic text-center">佐證檔案</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 右側年總工時卡片 */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 h-fit">
          <div className="text-center">
            <div className="text-sm text-gray-500 mb-2">年總工時</div>
            <div className="mx-auto rounded-xl border border-brand-300 bg-brand-50 px-6 py-8 shadow-sm">
              <div className="text-3xl font-extrabold text-brand-700 tracking-wide">
                {yearlyTotal.toFixed(1)}
              </div>
              <div className="text-sm text-gray-500 mt-1">小時</div>
            </div>
            
            <div className="mt-6 space-y-3">
              <div className="text-xs text-gray-500">統計資訊</div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">有數據月份：</span>
                  <span className="font-medium text-gray-800">
                    {monthlyData.filter(data => data.hours > 0).length} 個月
                  </span>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">平均月工時：</span>
                  <span className="font-medium text-gray-800">
                    {monthlyData.filter(data => data.hours > 0).length > 0 
                      ? (yearlyTotal / monthlyData.filter(data => data.hours > 0).length).toFixed(1)
                      : '0.0'
                    } 小時
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 操作按鈕 */}
      <div className="flex justify-center">
        <button 
          onClick={handleSave}
          className="bg-brand-500 hover:bg-brand-600 text-white px-8 py-3 rounded-xl font-medium transition-colors duration-200 shadow-sm flex items-center space-x-2"
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
