import React from 'react';
import { IconUpload } from '../../../components/icons';
import FileDropzone from '../../../components/FileDropzone';
import { EvidenceFile } from '../../../api/files';
import type { MemoryFile } from '../../../utils/documentHandler';

interface CommuteUploadSectionProps {
  iconColor: string;
  pageKey: string;
  // Excel 檔案 (單檔上傳)
  excelFile: EvidenceFile | null;
  excelMemoryFile: MemoryFile | null;
  onExcelFileChange: (file: EvidenceFile | null) => void;
  onExcelMemoryFileChange: (file: MemoryFile | null) => void;
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
  excelMemoryFile,
  onExcelFileChange,
  onExcelMemoryFileChange,
  disabled,
  isReadOnly,
  canUploadFiles,
  onError,
  onPreviewImage
}) => {
  // 顯示邏輯：優先顯示暫存檔案，沒有的話顯示已上傳檔案
  const displayFile: MemoryFile | null = excelMemoryFile || (excelFile ? {
    id: excelFile.id,
    file: new File([], excelFile.file_name),
    preview: '',
    file_name: excelFile.file_name,
    file_size: excelFile.file_size,
    mime_type: excelFile.mime_type
  } : null);

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

      onExcelMemoryFileChange(memoryFile);
    }
  };

  const handleRemove = () => {
    // 清除檔案
    onExcelFileChange(null);
    onExcelMemoryFileChange(null);
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
              disabled={isReadOnly || disabled || !canUploadFiles || !!displayFile}
              file={displayFile}
              onRemove={handleRemove}
              primaryText="點擊或拖放檔案暫存"
              secondaryText="僅支援上傳 1 個 Excel 檔案（.xlsx, .xls），最大 10MB"
            />
          </div>
        </div>
      </div>

      {/* 底部佔位空間，避免被 BottomActionBar 擋住 */}
      <div className="h-20"></div>
    </>
  );
};
