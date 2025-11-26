/**
 * LPGSpecInputFields - LPG 規格輸入欄位組件
 *
 * 包含：
 * - 品名_單位重量 (KG/桶) 輸入框
 * - 重量證明上傳區
 * - 保存按鈕
 */

import { FileDropzone, MemoryFile, EvidenceFile as FileDropzoneEvidenceFile } from '../../../components/FileDropzone'
import { createMemoryFile } from '../../../utils/fileUploadHelpers'
import { TYPE3_ALLOWED_FILE_TYPES, TYPE3_FILE_UPLOAD_HINT } from '../../../constants/fileUpload'
import { LPGSpec } from '../hooks/useLPGSpecManager'
import type { EvidenceFile } from '../../../api/files'

// ==================== 樣式常數 ====================
const STYLES = {
  container: {
    width: '925px',
    height: '644px',
    flexShrink: 0,
    borderRadius: '37px',
    background: '#2DB14C',
    position: 'relative' as const
  },
  field: {
    width: '827px',
    height: '52px',
    flexShrink: 0,
    border: '1px solid rgba(0, 0, 0, 0.25)',
    background: '#FFF',
    color: '#000',
    fontFamily: 'Inter',
    fontSize: '20px',
    fontWeight: 400,
    paddingLeft: '20px',
    paddingRight: '20px',
  },
  label: {
    display: 'block',
    marginBottom: '0px',
    color: '#000',
    fontFamily: 'Inter',
    fontSize: '20px',
    fontStyle: 'normal' as const,
    fontWeight: 300,
    lineHeight: 'normal' as const
  },
  sectionTitle: {
    marginBottom: '0px',
    color: '#000',
    fontFamily: 'Inter',
    fontSize: '20px',
    fontStyle: 'normal' as const,
    fontWeight: 400,
    lineHeight: 'normal' as const
  }
} as const

// ==================== 介面定義 ====================
interface LPGSpecInputFieldsProps {
  spec: LPGSpec
  onFieldChange: (field: keyof LPGSpec, value: any) => void
  onSave: () => void
  editingSpecId: string | null
  isReadOnly: boolean
  thumbnails: Record<string, string>  // ⭐ 新增：縮圖 URL 對照表
  onImageClick: (src: string) => void  // ⭐ 新增：圖片點擊處理
}

// ==================== 主組件 ====================
export function LPGSpecInputFields({
  spec,
  onFieldChange,
  onSave,
  editingSpecId,
  isReadOnly,
  thumbnails,  // ⭐ 新增
  onImageClick  // ⭐ 新增
}: LPGSpecInputFieldsProps) {
  // ⭐ 準備 FileDropzone 所需的資料（優先使用 memoryFiles，其次使用 evidenceFiles）
  const evidenceFile = spec.evidenceFiles?.[0]
  const memoryFile = spec.memoryFiles?.[0]
  const evidenceFileForDropzone: FileDropzoneEvidenceFile | null = evidenceFile ? {
    id: evidenceFile.id,
    file_path: evidenceFile.file_path,
    file_name: evidenceFile.file_name,
    file_size: evidenceFile.file_size,
    mime_type: evidenceFile.mime_type
  } : null
  const thumbnailUrl = evidenceFile ? thumbnails[evidenceFile.id] : null
  return (
    <>
      {/* 標題 */}
      <div style={{ marginTop: '103px', marginLeft: '367px' }}>
        <div className="flex items-center gap-[29px]">
          <div className="w-[42px] h-[42px] rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#2DB14C" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 29 29" fill="none">
              <g clipPath="url(#clip0_605_19084)">
                <path d="M14.5002 18.125C16.5022 18.125 18.1252 16.5021 18.1252 14.5C18.1252 12.498 16.5022 10.875 14.5002 10.875C12.4981 10.875 10.8752 12.498 10.8752 14.5C10.8752 16.5021 12.4981 18.125 14.5002 18.125Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M23.4418 18.125C23.281 18.4895 23.233 18.8938 23.3041 19.2858C23.3751 19.6777 23.562 20.0394 23.8406 20.3242L23.9131 20.3967C24.1378 20.6211 24.316 20.8877 24.4376 21.1811C24.5593 21.4744 24.6219 21.7889 24.6219 22.1065C24.6219 22.4241 24.5593 22.7386 24.4376 23.0319C24.316 23.3253 24.1378 23.5918 23.9131 23.8163C23.6886 24.041 23.4221 24.2192 23.1287 24.3408C22.8353 24.4625 22.5209 24.5251 22.2033 24.5251C21.8857 24.5251 21.5712 24.4625 21.2778 24.3408C20.9845 24.2192 20.7179 24.041 20.4935 23.8163L20.421 23.7438C20.1362 23.4652 19.7745 23.2784 19.3825 23.2073C18.9906 23.1362 18.5863 23.1842 18.2218 23.345C17.8644 23.4982 17.5596 23.7525 17.3449 24.0767C17.1303 24.4009 17.015 24.7808 17.0135 25.1696V25.375C17.0135 26.016 16.7589 26.6307 16.3057 27.0839C15.8525 27.5371 15.2378 27.7917 14.5968 27.7917C13.9559 27.7917 13.3412 27.5371 12.888 27.0839C12.4348 26.6307 12.1802 26.016 12.1802 25.375V25.2663C12.1708 24.8663 12.0413 24.4785 11.8086 24.1531C11.5759 23.8277 11.2506 23.5798 10.8752 23.4417C10.5107 23.2809 10.1064 23.2329 9.71445 23.304C9.32247 23.375 8.96077 23.5619 8.676 23.8405L8.6035 23.913C8.37905 24.1377 8.11252 24.3159 7.81914 24.4375C7.52576 24.5591 7.21129 24.6217 6.8937 24.6217C6.57612 24.6217 6.26164 24.5591 5.96826 24.4375C5.67489 24.3159 5.40836 24.1377 5.18391 23.913C4.95922 23.6885 4.78097 23.422 4.65935 23.1286C4.53773 22.8352 4.47514 22.5208 4.47514 22.2032C4.47514 21.8856 4.53773 21.5711 4.65935 21.2777C4.78097 20.9843 4.95922 20.7178 5.18391 20.4934L5.25641 20.4209C5.53498 20.1361 5.72184 19.7744 5.79292 19.3824C5.86399 18.9904 5.81601 18.5862 5.65516 18.2217C5.50199 17.8643 5.24766 17.5595 4.92347 17.3448C4.59929 17.1301 4.2194 17.0149 3.83058 17.0134H3.62516C2.98422 17.0134 2.36953 16.7588 1.91632 16.3055C1.46311 15.8523 1.2085 15.2376 1.2085 14.5967C1.2085 13.9558 1.46311 13.3411 1.91632 12.8879C2.36953 12.4347 2.98422 12.18 3.62516 12.18H3.73391C4.13386 12.1707 4.52175 12.0412 4.84715 11.8085C5.17255 11.5758 5.4204 11.2505 5.5585 10.875C5.71934 10.5106 5.76732 10.1063 5.69625 9.71433C5.62518 9.32235 5.43831 8.96065 5.15975 8.67587L5.08725 8.60337C4.86255 8.37893 4.6843 8.1124 4.56268 7.81902C4.44107 7.52564 4.37847 7.21117 4.37847 6.89358C4.37847 6.57599 4.44107 6.26152 4.56268 5.96814C4.6843 5.67476 4.86255 5.40823 5.08725 5.18379C5.31169 4.9591 5.57822 4.78085 5.8716 4.65923C6.16498 4.53761 6.47945 4.47501 6.79704 4.47501C7.11462 4.47501 7.4291 4.53761 7.72248 4.65923C8.01586 4.78085 8.28239 4.9591 8.50683 5.18379L8.57933 5.25629C8.86411 5.53486 9.22581 5.72172 9.61778 5.7928C10.0098 5.86387 10.414 5.81589 10.7785 5.65504H10.8752C11.2325 5.50187 11.5373 5.24754 11.752 4.92335C11.9667 4.59917 12.0819 4.21928 12.0835 3.83046V3.62504C12.0835 2.9841 12.3381 2.36941 12.7913 1.9162C13.2445 1.46299 13.8592 1.20837 14.5002 1.20837C15.1411 1.20837 15.7558 1.46299 16.209 1.9162C16.6622 2.36941 16.9168 2.9841 16.9168 3.62504V3.73379C16.9184 4.12262 17.0336 4.5025 17.2483 4.82669C17.463 5.15087 17.7678 5.4052 18.1252 5.55837C18.4896 5.71922 18.8939 5.7672 19.2859 5.69613C19.6779 5.62506 20.0395 5.43819 20.3243 5.15962L20.3968 5.08712C20.6213 4.86243 20.8878 4.68418 21.1812 4.56256C21.4746 4.44095 21.789 4.37835 22.1066 4.37835C22.4242 4.37835 22.7387 4.44095 23.0321 4.56256C23.3254 4.68418 23.592 4.86243 23.8164 5.08712C24.0411 5.31157 24.2194 5.5781 24.341 5.87148C24.4626 6.16486 24.5252 6.47933 24.5252 6.79692C24.5252 7.1145 24.4626 7.42898 24.341 7.72235C24.2194 8.01573 24.0411 8.28226 23.8164 8.50671L23.7439 8.57921C23.4653 8.86399 23.2785 9.22568 23.2074 9.61766C23.1363 10.0096 23.1843 10.4139 23.3452 10.7784V10.875C23.4983 11.2324 23.7527 11.5372 24.0768 11.7519C24.401 11.9666 24.7809 12.0818 25.1697 12.0834H25.3752C26.0161 12.0834 26.6308 12.338 27.084 12.7912C27.5372 13.2444 27.7918 13.8591 27.7918 14.5C27.7918 15.141 27.5372 15.7557 27.084 16.2089C26.6308 16.6621 26.0161 16.9167 25.3752 16.9167H25.2664C24.8776 16.9183 24.4977 17.0335 24.1735 17.2482C23.8493 17.4629 23.595 17.7677 23.4418 18.125Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </g>
              <defs>
                <clipPath id="clip0_605_19084">
                  <rect width="29" height="29" fill="white"/>
                </clipPath>
              </defs>
            </svg>
          </div>
          <div className="flex flex-col justify-center h-[86px]">
            <h3 style={{
              color: '#000',
              fontFamily: 'Inter',
              fontSize: '28px',
              fontStyle: 'normal',
              fontWeight: 500,
              lineHeight: 'normal'
            }}>
              品項設定
            </h3>
          </div>
        </div>
      </div>

      <div className="flex justify-center" style={{ marginTop: '39px' }}>
        <div style={STYLES.container}>
          {/* 文字框：品項清單說明 */}
          <div style={{
            position: 'absolute',
            top: '27px',
            left: '49px',
            width: '827px',
            height: '73px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            alignItems: 'flex-start'
          }}>
            <div style={STYLES.sectionTitle}>品項清單</div>
            <div style={STYLES.label}> *輸入品名_單位重量 (KG/桶)</div>
          </div>

        {/* 品項清單輸入框 */}
        <div style={{ position: 'absolute', top: '105px', left: '49px' }}>
          <input
            type="text"
            value={spec.name}
            onChange={(e) => onFieldChange('name', e.target.value)}
            disabled={isReadOnly}
            placeholder="例如：液化石油氣_20KG"
            className="rounded-[5px] focus:outline-none focus:ring-2 focus:ring-white"
            style={STYLES.field}
          />
        </div>

        {/* 文字框：重量證明說明 */}
        <div style={{
          position: 'absolute',
          top: '212px',
          left: '49px',
          width: '827px',
          height: '73px',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'flex-start'
        }}>
          <div style={STYLES.sectionTitle}>重量證明</div>
          <div style={STYLES.label}>* 如: 有重量資訊的購買單據/ 規格書/ 對話紀錄截圖/ 有公司章的文件等</div>
        </div>

        {/* 重量證明上傳 */}
        <div style={{ position: 'absolute', top: '290px', left: '49px' }}>
          <FileDropzone
            width="827px"
            height="210px"
            accept={TYPE3_ALLOWED_FILE_TYPES}
            multiple={false}
            file={memoryFile || null}  // ⭐ 新上傳的檔案
            evidenceFile={evidenceFileForDropzone}  // ⭐ 已儲存的檔案
            evidenceFileUrl={thumbnailUrl}  // ⭐ 縮圖 URL
            onFileSelect={(files) => {
              if (files[0]) {
                onFieldChange('memoryFiles', [createMemoryFile(files[0])])
              }
            }}
            onRemove={() => {
              // ⭐ 清除 memoryFiles 和 evidenceFiles
              onFieldChange('memoryFiles', [])
              if (evidenceFile) {
                onFieldChange('evidenceFiles', [])
              }
            }}
            onEvidenceFileClick={(url) => onImageClick(url)}  // ⭐ 點擊已儲存的圖片
            disabled={isReadOnly}
            readOnly={isReadOnly}
            primaryText="點擊或拖放重量證明"
            secondaryText={TYPE3_FILE_UPLOAD_HINT}
          />
        </div>
      </div>
      </div>

      {/* 保存按鈕 */}
      <div className="flex justify-center" style={{ marginTop: '46px' }}>
        <button
          onClick={onSave}
          style={{
            width: '237px',
            height: '46.25px',
            flexShrink: 0,
            borderRadius: '7px',
            border: '1px solid rgba(0, 0, 0, 0.50)',
            background: '#000',
            boxShadow: '0 4px 4px 0 rgba(0, 0, 0, 0.25)',
            cursor: 'pointer',
            color: '#FFF',
            textAlign: 'center',
            fontFamily: 'var(--sds-typography-body-font-family)',
            fontSize: '20px',
            fontStyle: 'normal',
            fontWeight: 'var(--sds-typography-body-font-weight-regular)',
            lineHeight: '100%'
          }}
        >
          {editingSpecId ? '儲存變更' : '+ 新增品項'}
        </button>
      </div>
    </>
  )
}
