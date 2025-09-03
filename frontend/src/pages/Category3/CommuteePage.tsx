export default function CommutePage() {
  return (
    <div className="space-y-6">
      <div className="bg-brand-50 border border-brand-200 rounded-lg p-4">
        <h2 className="text-xl font-semibold text-brand-800 mb-3">員工通勤 碳排放計算</h2>
        <p className="text-gray-600">請輸入員工通勤相關數據進行碳排放計算</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            員工人數
            <input 
              type="number" 
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500"
              placeholder="請輸入員工人數"
            />
          </label>
        </div>
        
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            平均通勤距離 (公里)
            <input 
              type="number" 
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500"
              placeholder="請輸入平均通勤距離"
            />
          </label>
        </div>
      </div>
      
      <button className="bg-brand-500 hover:bg-brand-600 text-white px-6 py-2 rounded-lg transition-colors duration-200">
        計算碳排放
      </button>
    </div>
  );
}