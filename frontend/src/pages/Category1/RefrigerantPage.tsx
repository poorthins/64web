import { useState } from 'react';
import FileUpload from '../../components/FileUpload';

interface RefrigerantData {
  id: number;
  equipmentType: string;
  equipmentLocation: string;
  refrigerantType: string;
  fillAmount: number;
  unit: 'gram' | 'kg';
  proofFile: File | null;
}

export default function RefrigerantPage() {
  const [refrigerantData, setRefrigerantData] = useState<RefrigerantData[]>([
    {
      id: 1,
      equipmentType: '',
      equipmentLocation: '',
      refrigerantType: '',
      fillAmount: 0,
      unit: 'kg',
      proofFile: null
    }
  ]);

  const addNewEntry = () => {
    const newEntry: RefrigerantData = {
      id: Date.now(),
      equipmentType: '',
      equipmentLocation: '',
      refrigerantType: '',
      fillAmount: 0,
      unit: 'kg',
      proofFile: null
    };
    setRefrigerantData([...refrigerantData, newEntry]);
  };

  const removeEntry = (id: number) => {
    if (refrigerantData.length > 1) {
      setRefrigerantData(refrigerantData.filter(item => item.id !== id));
    }
  };

  const updateEntry = (id: number, field: keyof RefrigerantData, value: any) => {
    setRefrigerantData(prev => 
      prev.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const handleSave = () => {
    const errors: string[] = [];
    
    refrigerantData.forEach((data, index) => {
      if (!data.equipmentType.trim()) {
        errors.push(`第${index + 1}項設備類型不能為空`);
      }
      if (!data.equipmentLocation.trim()) {
        errors.push(`第${index + 1}項設備位置不能為空`);
      }
      if (!data.refrigerantType.trim()) {
        errors.push(`第${index + 1}項冷媒類型不能為空`);
      }
      if (data.fillAmount <= 0) {
        errors.push(`第${index + 1}項填充量必須大於0`);
      }
      if (!data.proofFile) {
        errors.push(`第${index + 1}項未上傳佐證資料`);
      }
    });

    if (errors.length > 0) {
      alert('請修正以下問題：\n' + errors.join('\n'));
      return;
    }
    
    alert('冷媒設備資料已保存！');
  };

  return (
    <div className="space-y-8">
      <div className="bg-brand-50 border border-brand-200 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-brand-800 mb-3">冷媒設備管理</h2>
        <p className="text-gray-600">請填入冷媒設備相關資料並上傳佐證文件</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-800">冷媒設備資料</h3>
          <button
            onClick={addNewEntry}
            className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>新增設備</span>
          </button>
        </div>
        
        <div className="overflow-x-auto shadow-lg rounded-xl border border-gray-200">
          <table className="w-full border-collapse bg-white">
            <thead>
              <tr className="bg-gradient-to-r from-brand-500 to-brand-600">
                <th className="px-4 py-4 text-center text-sm font-semibold text-white border-r border-brand-400/30">設備類型</th>
                <th className="px-4 py-4 text-center text-sm font-semibold text-white border-r border-brand-400/30">設備位置</th>
                <th className="px-4 py-4 text-center text-sm font-semibold text-white border-r border-brand-400/30">冷媒類型</th>
                <th className="px-4 py-4 text-center text-sm font-semibold text-white border-r border-brand-400/30">填充量</th>
                <th className="px-4 py-4 text-center text-sm font-semibold text-white border-r border-brand-400/30">單位</th>
                <th className="px-4 py-4 text-center text-sm font-semibold text-white border-r border-brand-400/30">佐證資料</th>
                <th className="px-4 py-4 text-center text-sm font-semibold text-white whitespace-nowrap">編輯</th>
              </tr>
            </thead>
            <tbody>
              {refrigerantData.map((data) => (
                <tr key={data.id} className="hover:bg-brand-50 transition-colors duration-200 border-b border-gray-100">
                  <td className="px-4 py-4">
                    <input
                      type="text"
                      value={data.equipmentType}
                      onChange={(e) => updateEntry(data.id, 'equipmentType', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 hover:border-brand-300 transition-colors duration-200"
                      placeholder="例：冷氣機"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <input
                      type="text"
                      value={data.equipmentLocation}
                      onChange={(e) => updateEntry(data.id, 'equipmentLocation', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 hover:border-brand-300 transition-colors duration-200"
                      placeholder="例：辦公室A棟"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <input
                      type="text"
                      value={data.refrigerantType}
                      onChange={(e) => updateEntry(data.id, 'refrigerantType', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 hover:border-brand-300 transition-colors duration-200"
                      placeholder="例：R-410A"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={data.fillAmount || ''}
                      onChange={(e) => updateEntry(data.id, 'fillAmount', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 hover:border-brand-300 transition-colors duration-200"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <select
                      value={data.unit}
                      onChange={(e) => updateEntry(data.id, 'unit', e.target.value as 'gram' | 'kg')}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 hover:border-brand-300 transition-colors duration-200 bg-white min-w-[90px]"
                    >
                      <option value="kg">公斤</option>
                      <option value="gram">公克</option>
                    </select>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-center">
                      <div className="w-36">
                        <FileUpload
                          onFileSelect={(file) => updateEntry(data.id, 'proofFile', file)}
                          accept=".jpg,.jpeg,.png,.pdf"
                          maxSize={5 * 1024 * 1024}
                          currentFile={data.proofFile}
                          placeholder="上傳佐證"
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-center">
                      {refrigerantData.length > 1 && (
                        <button
                          onClick={() => removeEntry(data.id)}
                          className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors duration-200"
                          title="刪除此項目"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-center">
        <button 
          onClick={handleSave}
          className="bg-brand-500 hover:bg-brand-600 text-white px-8 py-3 rounded-xl font-medium transition-colors duration-200 shadow-sm"
        >
          保存資料
        </button>
      </div>
    </div>
  );
}
