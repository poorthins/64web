import { Shield } from 'lucide-react'
import { useMobileType3Page } from './hooks/useMobileType3Page'
import { MobileType3PageShell } from './components/MobileType3PageShell'
import { FIRE_EXTINGUISHER_CONFIG } from './common/mobileEnergyConfig'
import { useFireExtinguisherSpecManager } from './hooks/useFireExtinguisherSpecManager'
import { FireExtinguisherSpecInputFields } from './components/FireExtinguisherSpecInputFields'
import { FireExtinguisherSpecListSection } from './components/FireExtinguisherSpecListSection'
import { FireExtinguisherUsageInputFields } from './components/FireExtinguisherUsageInputFields'
import { FileDropzone, type MemoryFile } from '../../components/FileDropzone'
import { TYPE3_ALLOWED_FILE_TYPES, TYPE3_FILE_UPLOAD_HINT } from '../../utils/fileUpload'
import { createMemoryFile } from '../../utils/fileUploadHelpers'

export default function FireExtinguisherPage() {
  // Type 3 核心邏輯 + 全局檔案支援
  const page = useMobileType3Page({
    config: FIRE_EXTINGUISHER_CONFIG,
    dataFieldName: 'fireExtinguisherData',
    useSpecManager: useFireExtinguisherSpecManager,
    mode: 'weight',
    parseSpecName: (name: string) => {
      // 格式：設備類型_單支藥劑量(KG/支)
      // 例如：ABC 乾粉滅火器_2.5
      const parts = name.split('_')
      if (parts.length !== 2) return null

      const itemName = parts[0]
      const unitWeight = parseFloat(parts[1])

      if (!itemName || isNaN(unitWeight)) return null

      return { name: itemName, unitWeight }
    },
    // ⭐ 全局檔案配置：消防安全設備檢修表
    globalFiles: [{
      key: 'inspectionReport',
      fileType: 'annual_evidence',
      required: false,
      label: '消防安全設備檢修表'
    }]
  })

  // ⭐ 從 Hook 獲取全局檔案（自動管理，無需手動 useEffect）
  const inspectionReport = page.globalFilesState?.inspectionReport || null
  const setInspectionReport = page.updateGlobalFile?.('inspectionReport') || (() => {})

  return (
    <MobileType3PageShell
      {...page}
      beforeSpecsContent={
        <InspectionReportSection
          inspectionReport={inspectionReport}
          setInspectionReport={setInspectionReport}
          isReadOnly={page.isReadOnly}
          submitting={page.submitting}
          iconColor={FIRE_EXTINGUISHER_CONFIG.iconColor}
          onImageClick={(src) => page.setLightboxSrc(src)}
        />
      }
      SpecInputFields={FireExtinguisherSpecInputFields}
      SpecListSection={FireExtinguisherSpecListSection}
      UsageInputFields={FireExtinguisherUsageInputFields}
    />
  )
}

// ==================== 檢修表上傳區組件（內嵌） ====================
interface InspectionReportSectionProps {
  inspectionReport: MemoryFile | null
  setInspectionReport: (file: MemoryFile | null) => void
  isReadOnly: boolean
  submitting: boolean
  iconColor: string
  onImageClick: (src: string) => void
}

function InspectionReportSection({
  inspectionReport,
  setInspectionReport,
  isReadOnly,
  submitting,
  iconColor,
  onImageClick
}: InspectionReportSectionProps) {
  return (
    <div style={{ marginTop: '60px' }}>
      {/* 標題 */}
      <div className="flex items-center gap-[29px] mb-6" style={{ marginLeft: '367px' }}>
        {/* Shield Icon */}
        <div
          className="w-[42px] h-[42px] rounded-[10px] flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: iconColor }}
        >
          <Shield size={24} color="white" />
        </div>

        {/* 標題文字 */}
        <div className="flex flex-col justify-center">
          <h3 className="text-[28px] font-bold text-black">
            消防安全設備檢修表
          </h3>
        </div>
      </div>

      {/* 上傳區 - 綠色外框容器（置中）*/}
      <div className="flex justify-center">
        <div
          className="relative"
          style={{
            width: '925px',
            height: '446px',
            flexShrink: 0,
            borderRadius: '37px',
            background: iconColor
          }}
        >
          {/* 上傳框 */}
          <div className="absolute" style={{ top: '68px', left: '49px' }}>
            <FileDropzone
              width="827px"
              height="210px"
              accept={TYPE3_ALLOWED_FILE_TYPES}
              multiple={false}
              file={inspectionReport}
              onFileSelect={(files) => {
                const file = files[0]
                if (file) {
                  const memoryFile = createMemoryFile(file)
                  setInspectionReport(memoryFile)
                }
              }}
              onRemove={() => {
                if (inspectionReport?.preview) {
                  URL.revokeObjectURL(inspectionReport.preview)
                }
                setInspectionReport(null)
              }}
              onFileClick={(file) => {
                if (file.preview) {
                  onImageClick(file.preview)
                }
              }}
              disabled={isReadOnly || submitting || !!inspectionReport}
              readOnly={isReadOnly || submitting}
              primaryText="點擊或拖放檢修表"
              secondaryText={TYPE3_FILE_UPLOAD_HINT}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
