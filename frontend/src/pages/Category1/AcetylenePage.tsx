import { useState } from 'react';
import FileUpload from '../../components/FileUpload';

interface MonthData {
  month: number;
  quantity: number;
  totalUsage: number;
  proofFile: File | null;
}

export default function AcetylenePage() {
  const [monthlyData, setMonthlyData] = useState<MonthData[]>(
    Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      quantity: 0,
      totalUsage: 0,
      proofFile: null
    }))
  );

  const monthNames = [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'
  ];

  const updateMonthData = (index: number, field: keyof MonthData, value: any) => {
    setMonthlyData(prev => {
      const newData = [...prev];
      newData[index] = { ...newData[index], [field]: value };
      
      if (field === 'quantity') {
        newData[index].totalUsage = newData[index].quantity;
      }
      
      return newData;
    });
  };

  const getTotalUsage = () => {
    return monthlyData.reduce((sum, data) => sum + data.totalUsage, 0);
  };

  const validateData = () => {
    const errors: string[] = [];

    monthlyData.forEach((data, index) => {
      if (data.quantity > 0 && !data.proofFile) {
        errors.push(`${monthNames[index]}有使用量但未上傳使用證明`);
      }
    });

    return errors;
  };

  const handleCalculate = () => {
    const errors = validateData();
    if (errors.length > 0) {
      alert('請修正以下問題：\n' + errors.join('\n'));
      return;
    }
    
    alert(`計算完成！年度總使用量：${getTotalUsage().toFixed(2)} kg`);
  };


  return (
    <div className="space-y-8">
      <div className="bg-brand-50 border border-brand-200 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-brand-800 mb-3">乙炔 碳排放計算</h2>
        <p className="text-gray-600">請填入各月份乙炔使用數據進行碳排放計算</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-6">月份使用量數據</h3>
        
        <div className="overflow-x-auto shadow-lg rounded-xl border border-gray-200">
          <table className="w-full border-collapse bg-white">
            <thead>
              <tr className="bg-gradient-to-r from-brand-500 to-brand-600">
                <th className="px-6 py-4 text-left text-sm font-semibold text-white border-r border-brand-400/30">月份</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white border-r border-brand-400/30">使用量(kg)</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-white">使用證明</th>
              </tr>
            </thead>
            <tbody>
              {monthlyData.map((data, index) => (
                <tr key={index} className="hover:bg-brand-50 transition-colors duration-200 border-b border-gray-100">
                  <td className="px-6 py-4 text-sm font-medium text-gray-800 bg-gray-50/50">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-brand-400 rounded-full"></div>
                      <span>{monthNames[index]}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={data.quantity || ''}
                      onChange={(e) => updateMonthData(index, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 hover:border-brand-300 transition-colors duration-200"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <div className="w-36">
                        <FileUpload
                          onFileSelect={(file) => updateMonthData(index, 'proofFile', file)}
                          accept=".jpg,.jpeg,.png,.pdf"
                          maxSize={5 * 1024 * 1024}
                          currentFile={data.proofFile}
                          placeholder="上傳證明"
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              <tr className="bg-gradient-to-r from-brand-100 to-brand-50 border-t-2 border-brand-300">
                <td className="px-6 py-5 text-sm font-bold text-brand-800">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-brand-600 rounded-full"></div>
                    <span>年度總計</span>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="px-4 py-3 bg-gradient-to-r from-brand-600 to-brand-700 text-white font-bold text-lg rounded-lg text-center shadow-lg">
                    {getTotalUsage().toFixed(2)} kg
                  </div>
                </td>
                <td className="px-6 py-5 text-sm text-gray-400 italic text-center">證明檔案</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-center">
        <button 
          onClick={handleCalculate}
          className="bg-brand-500 hover:bg-brand-600 text-white px-8 py-3 rounded-xl font-medium transition-colors duration-200 shadow-sm"
        >
          計算碳排放
        </button>
      </div>
    </div>
  );
}
