/**
 * HeatValueSection - 低位熱值編輯區塊
 *
 * 包含：
 * - 低位熱值填寫進度標題
 * - 月度熱值進度表格
 * - 低位熱值輸入框
 * - 熱值報表上傳
 * - 儲存按鈕
 */

import { MonthlyHeatValueGrid } from './MonthlyHeatValueGrid'
import { MonthlyHeatValueInput } from './MonthlyHeatValueInput'
import { HeatValueReportUpload } from './HeatValueReportUpload'
import { HeatValueEditingState } from '../../../types/naturalGasTypes'
import { EvidenceFile } from '../../../api/files'
import { MemoryFile } from '../../../utils/documentHandler'

interface HeatValueSectionProps {
  // 月度熱值數據
  monthlyHeatValues: Record<number, number>
  monthlyHeatValueFiles: Record<number, EvidenceFile[]>
  monthlyHeatValueMemoryFiles: Record<number, MemoryFile[]>

  // 當前編輯狀態
  currentEditingHeatValue: HeatValueEditingState
  showMonthPicker: boolean

  // 權限
  canEdit: boolean
  isApproved: boolean

  // 事件處理
  onSelectMonth: (month: number) => void
  onEditHeatValueMonth: (month: number) => void
  onSaveHeatValue: () => void
  onToggleMonthPicker: (show: boolean) => void
  onHeatValueChange: (value: number) => void
  onMemoryFilesChange: (month: number, files: MemoryFile[]) => void
  onFilesChange: (month: number, files: EvidenceFile[]) => void
  onDeleteEvidence: (fileId: string) => Promise<void>
  onError: (error: string) => void
  onLightboxOpen: (src: string) => void
}

export const HeatValueSection = ({
  monthlyHeatValues,
  monthlyHeatValueFiles,
  monthlyHeatValueMemoryFiles,
  currentEditingHeatValue,
  showMonthPicker,
  canEdit,
  isApproved,
  onSelectMonth,
  onEditHeatValueMonth,
  onSaveHeatValue,
  onToggleMonthPicker,
  onHeatValueChange,
  onMemoryFilesChange,
  onFilesChange,
  onDeleteEvidence,
  onError,
  onLightboxOpen
}: HeatValueSectionProps) => {
  return (
    <>
      {/* 低位熱值填寫進度 */}
      <div style={{ marginTop: '103px', marginLeft: '367px' }}>
        <div className="flex items-center gap-[29px]">
          <div className="w-[42px] h-[42px] rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#49A1C7' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="31" height="31" viewBox="0 0 31 31" fill="none">
              <path d="M15.4999 28.4167C22.6336 28.4167 28.4166 22.6337 28.4166 15.5C28.4166 8.36636 22.6336 2.58337 15.4999 2.58337C8.36624 2.58337 2.58325 8.36636 2.58325 15.5C2.58325 22.6337 8.36624 28.4167 15.4999 28.4167Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M15.4999 23.25C19.7801 23.25 23.2499 19.7802 23.2499 15.5C23.2499 11.2198 19.7801 7.75004 15.4999 7.75004C11.2197 7.75004 7.74992 11.2198 7.74992 15.5C7.74992 19.7802 11.2197 23.25 15.4999 23.25Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M15.4999 18.0834C16.9267 18.0834 18.0833 16.9268 18.0833 15.5C18.0833 14.0733 16.9267 12.9167 15.4999 12.9167C14.0732 12.9167 12.9166 14.0733 12.9166 15.5C12.9166 16.9268 14.0732 18.0834 15.4999 18.0834Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="flex flex-col justify-center h-[86px]">
            <h3 className="text-[28px] font-bold text-black">
              低位熱值填寫進度
            </h3>
          </div>
        </div>
      </div>

      {/* 月曆檢視 */}
      <div style={{ marginTop: '34px', marginBottom: '32px' }}>
        <div className="flex justify-center">
          <div>
            <MonthlyHeatValueGrid
              monthlyHeatValues={monthlyHeatValues}
              monthlyHeatValueFiles={monthlyHeatValueFiles}
              monthlyHeatValueMemoryFiles={monthlyHeatValueMemoryFiles}
              canEdit={canEdit}
              isApproved={isApproved}
              onEdit={onEditHeatValueMonth}
            />
          </div>
        </div>
      </div>

      {/* 低位熱值標題 */}
      <div data-section="heat-value" style={{ marginTop: '103px', marginLeft: '367px' }}>
        <div className="flex items-center gap-[29px]">
          <div className="w-[42px] h-[42px] rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#49A1C7' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="29" height="29" viewBox="0 0 29 29" fill="none">
              <path d="M25.375 6.04175C25.375 8.04378 20.5061 9.66675 14.5 9.66675C8.4939 9.66675 3.625 8.04378 3.625 6.04175M25.375 6.04175C25.375 4.03972 20.5061 2.41675 14.5 2.41675C8.4939 2.41675 3.625 4.03972 3.625 6.04175M25.375 6.04175V22.9584C25.375 24.9642 20.5417 26.5834 14.5 26.5834C8.45833 26.5834 3.625 24.9642 3.625 22.9584V6.04175M25.375 14.5001C25.375 16.5059 20.5417 18.1251 14.5 18.1251C8.45833 18.1251 3.625 16.5059 3.625 14.5001" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="flex flex-col justify-center h-[86px]">
            <h3 className="text-[28px] font-bold text-black">
              低位熱值
            </h3>
          </div>
        </div>
      </div>

      {/* 填寫框 */}
      <div className="flex justify-center" style={{ marginTop: '39px' }}>
        <div
          style={{
            width: '1005px',
            minHeight: '520px',
            flexShrink: 0,
            borderRadius: '37px',
            background: '#49A1C7',
            paddingTop: '27px',
            paddingLeft: '49px',
            paddingRight: '49px',
            paddingBottom: '45px'
          }}
        >
          {/* 月份與低位熱值輸入 */}
          <MonthlyHeatValueInput
            selectedMonth={currentEditingHeatValue.month || 1}
            onMonthChange={onSelectMonth}
            showMonthPicker={showMonthPicker}
            onToggleMonthPicker={onToggleMonthPicker}
            heatValue={currentEditingHeatValue.value}
            onHeatValueChange={onHeatValueChange}
            canEdit={canEdit}
            isApproved={isApproved}
          />

          {/* 熱值報表上傳 */}
          <HeatValueReportUpload
            selectedMonth={currentEditingHeatValue.month || 1}
            monthlyMemoryFiles={{
              [currentEditingHeatValue.month || 1]: currentEditingHeatValue.memoryFiles
            }}
            monthlyFiles={{
              ...monthlyHeatValueFiles,
              [currentEditingHeatValue.month || 1]: currentEditingHeatValue.evidenceFiles || []
            }}
            onMemoryFilesChange={onMemoryFilesChange}
            onFilesChange={onFilesChange}
            onDeleteEvidence={onDeleteEvidence}
            onError={onError}
            onLightboxOpen={onLightboxOpen}
            canEdit={canEdit}
            isApproved={isApproved}
          />
        </div>
      </div>

      {/* 儲存按鈕 */}
      <div style={{ marginTop: '46px' }} className="flex justify-center">
        <button
          onClick={onSaveHeatValue}
          disabled={!canEdit && !isApproved}
          style={{
            width: '227px',
            height: '52px',
            borderRadius: '8px',
            background: '#000',
            border: 'none',
            color: '#FFF',
            fontFamily: 'Inter',
            fontSize: '20px',
            fontWeight: 400,
            cursor: (canEdit || isApproved) ? 'pointer' : 'not-allowed',
            opacity: (canEdit || isApproved) ? 1 : 0.5,
            transition: 'background 0.2s, opacity 0.2s'
          }}
          className="hover:opacity-80"
        >
          {currentEditingHeatValue.month && monthlyHeatValues[currentEditingHeatValue.month] !== undefined ? '變更儲存' : '儲存'}
        </button>
      </div>
    </>
  )
}
