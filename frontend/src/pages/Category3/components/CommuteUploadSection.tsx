import React from 'react';
import { IconUpload } from '../../../components/icons';
import { Trash2 } from 'lucide-react';
import FileDropzone from '../../../components/FileDropzone';
import { EvidenceFile, getFileUrl } from '../../../api/files';
import type { MemoryFile } from '../../../services/documentHandler';
import { FileTypeIcon } from '../../../components/energy/FileTypeIcon';
import { getFileType } from '../../../utils/energy/fileTypeDetector';

interface CommuteUploadSectionProps {
  iconColor: string;
  pageKey: string;
  // Excel 檔案 (單檔上傳)
  excelFile: EvidenceFile[];
  excelMemoryFiles: MemoryFile[];
  onExcelFilesChange: (files: EvidenceFile[]) => void;
  onExcelMemoryFilesChange: (files: MemoryFile[]) => void;
  // 權限控制
  disabled: boolean;
  isReadOnly: boolean;
  canUploadFiles: boolean;
  // 事件處理
  onError: (msg: string) => void;
  onPreviewImage: (src: string) => void;
}

export const CommuteUploadSection: React.FC<CommuteUploadSectionProps> = ({
  iconColor,
  excelFile,
  excelMemoryFiles,
  onExcelFilesChange,
  onExcelMemoryFilesChange,
  disabled,
  isReadOnly,
  canUploadFiles,
  onError,
  onPreviewImage
}) => {
  // 取得單個檔案（EvidenceFile 或 MemoryFile）
  const singleExcelFile = excelFile[0] || null;
  const singleMemoryFile = excelMemoryFiles[0] || null;

  const handleFileSelect = (fileList: FileList) => {
    const files = Array.from(fileList);
    if (files.length > 0) {
      const file = files[0];

      // 驗證檔案類型
      if (!file.name.match(/\.(xlsx|xls)$/i)) {
        onError('只支援 Excel 檔案格式（.xlsx, .xls）');
        return;
      }

      // 建立完整的 MemoryFile
      const memoryFile: MemoryFile = {
        id: `temp_${Date.now()}`,
        file,
        preview: '',
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };

      onExcelMemoryFilesChange([memoryFile]);
    }
  };

  const handleRemove = () => {
    // 清除檔案
    onExcelFilesChange([]);
    onExcelMemoryFilesChange([]);
  };

  return (
    <>
      {/* 標題區塊 - 對齊柴油頁面「資料列表」 */}
      <div style={{ marginTop: '116.75px', marginLeft: '367px' }}>
        <div className="flex items-center gap-[29px]">
          {/* Upload Icon */}
          <div
            className="w-[42px] h-[42px] rounded-[10px] flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: iconColor }}
          >
            <IconUpload size={29} color="white" />
          </div>

          {/* 標題文字 */}
          <div
            style={{
              display: 'flex',
              width: '346px',
              height: '86px',
              flexDirection: 'column',
              justifyContent: 'center',
              flexShrink: 0,
              color: '#000',
              fontFamily: 'Inter',
              fontSize: '28px',
              fontStyle: 'normal',
              fontWeight: 500,
              lineHeight: 'normal'
            }}
          >
            上傳員工通勤資料
          </div>
        </div>
      </div>

      {/* 內容區塊 - SDS 樣式上傳框容器 */}
      <div className="flex justify-center" style={{ marginTop: '34px', marginBottom: '32px' }}>
        <div
          style={{
            width: '1005px',
            minHeight: '449px',
            backgroundColor: '#EBEDF0',
            borderRadius: '37px',
            paddingTop: '68px',
            paddingBottom: '68px',
            paddingLeft: '49px',
            paddingRight: '49px'
          }}
        >
          {/* FileDropzone 組件 */}
          <div>
            <FileDropzone
              width="904px"
              height="210px"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              multiple={false}
              onFileSelect={handleFileSelect}
              disabled={isReadOnly || disabled || !canUploadFiles || !!singleExcelFile || !!singleMemoryFile}
              file={singleMemoryFile}
              onRemove={handleRemove}
              primaryText="點擊或拖放檔案暫存"
              secondaryText="僅支援上傳 1 個 Excel 檔案（.xlsx, .xls），最大 10MB"
            />
          </div>

          {/* 已上傳檔案列表 - 在上傳框內 */}
          {excelFile.length > 0 && (
            <div style={{ marginTop: '32px' }}>
              <h4 className="text-[20px] font-semibold mb-4" style={{ color: '#000', fontFamily: 'Inter' }}>已上傳檔案</h4>
              <div className="space-y-3">
                {excelFile.map((file) => {
                  const fileType = getFileType(file.mime_type, file.file_name);

                  return (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200"
                      style={{ width: '904px' }}
                    >
                      <div className="flex items-center gap-3">
                        <FileTypeIcon fileType={fileType} size={36} />
                        <div>
                          <p className="text-[16px] font-medium">{file.file_name}</p>
                          <p className="text-[14px] text-gray-500">
                            {(file.file_size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      </div>
                      {!isReadOnly && !disabled && (
                        <button
                          onClick={() => onExcelFilesChange(excelFile.filter(f => f.id !== file.id))}
                          className="p-2 text-black hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="刪除檔案"
                        >
                          <Trash2 style={{ width: '32px', height: '32px' }} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 底部佔位空間，避免被 BottomActionBar 擋住 */}
      <div className="h-20"></div>
    </>
  );
};
