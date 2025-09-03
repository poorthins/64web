import { useState } from 'react';

interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  accept?: string;
  maxSize?: number;
  currentFile?: File | null;
  placeholder?: string;
}

export default function FileUpload({ 
  onFileSelect, 
  accept = "*", 
  maxSize = 10 * 1024 * 1024, 
  currentFile,
  placeholder = "點擊上傳檔案"
}: FileUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (file: File) => {
    setError(null);
    
    if (file.size > maxSize) {
      setError(`檔案大小不能超過 ${Math.round(maxSize / 1024 / 1024)}MB`);
      return;
    }

    onFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return Math.round(bytes / 1024 / 1024 * 100) / 100 + ' MB';
  };

  return (
    <div className="w-full flex flex-col items-center justify-center space-y-2">
      {currentFile ? (
        <div className="bg-brand-50 border border-brand-200 rounded-lg p-3 w-full max-w-xs">
          <div className="flex flex-col items-center space-y-2">
            <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-800 truncate max-w-[120px]" title={currentFile.name}>
                {currentFile.name}
              </p>
              <p className="text-xs text-gray-500">{formatFileSize(currentFile.size)}</p>
            </div>
            <button
              onClick={() => onFileSelect(null)}
              className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors"
              title="刪除檔案"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors duration-200 w-full max-w-xs ${
            dragOver 
              ? 'border-brand-400 bg-brand-50' 
              : 'border-gray-300 bg-gray-50 hover:border-brand-400 hover:bg-brand-50'
          }`}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
        >
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div className="flex flex-col items-center space-y-1">
              <p className="text-xs text-gray-600">{placeholder}</p>
              <label className="inline-flex items-center px-3 py-1.5 bg-brand-500 text-white text-xs font-medium rounded-lg hover:bg-brand-600 transition-colors duration-200 cursor-pointer">
                選擇檔案
                <input
                  type="file"
                  accept={accept}
                  onChange={handleFileInput}
                  className="sr-only"
                />
              </label>
            </div>
            <p className="text-xs text-gray-500">
              最大 {Math.round(maxSize / 1024 / 1024)}MB
            </p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-2 w-full max-w-xs">
          <p className="text-xs text-red-600 text-center">{error}</p>
        </div>
      )}
    </div>
  );
}
