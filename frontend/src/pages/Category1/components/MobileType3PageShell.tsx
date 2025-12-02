/**
 * MobileType3PageShell - Type 3 頁面共用 UI 骨架
 *
 * 用於 WD40、LPG、Acetylene、WeldingRod、FireExtinguisher 等頁面
 * 只提供骨架，內容由動態傳入的 Component 決定
 */

import ConfirmClearModal from '../../../components/ConfirmClearModal'
import SharedPageLayout from '../../../layouts/SharedPageLayout'
import { MobileEnergyGroupListSection } from '../common/MobileEnergyGroupListSection'
import { ImageLightbox } from '../common/ImageLightbox'
import { useMobileType3Page } from '../hooks/useMobileType3Page'

// ==================== 型別定義 ====================

type MobileType3PageShellProps = ReturnType<typeof useMobileType3Page> & {
  /** 規格輸入欄位組件 */
  SpecInputFields: React.ComponentType<any>
  /** 規格列表組件 */
  SpecListSection: React.ComponentType<any>
  /** 使用數據輸入組件 */
  UsageInputFields: React.ComponentType<any>
  /** 規格設定上方的額外內容（選填，例如滅火器的檢修表） */
  beforeSpecsContent?: React.ReactNode
}

// ==================== Shell Component ====================

export function MobileType3PageShell({
  // Components
  SpecInputFields,
  SpecListSection,
  UsageInputFields,
  beforeSpecsContent,

  // Config & Basic
  config,
  pageKey,
  year,
  role,
  isReviewMode,
  reviewEntryId,
  reviewUserId,
  approvalStatus,
  isReadOnly,
  currentStatus,
  submitting,
  currentEntryId,

  // Specs
  savedSpecs,
  currentEditingSpec,
  editingSpecId,
  updateCurrentSpec,
  handleSaveSpec,
  handleEditSpec,
  handleDeleteSpec,

  // Usage Groups
  currentEditingGroup,
  setCurrentEditingGroup,
  savedGroups,
  addRecordToCurrentGroup,
  updateCurrentGroupRecord,
  updateCurrentGroupSpecId,
  removeRecordFromCurrentGroup,
  clearCurrentGroupEvidence,
  saveCurrentGroup,
  editGroup,
  deleteGroup,

  // Submit & Actions
  handleSubmit,
  handleSave,
  handleClear,
  handleClearConfirm,

  // Review
  reviewAmount,
  reviewUnit,

  // UI State
  dataListRef,
  thumbnails,
  lightboxSrc,
  setLightboxSrc,
  showClearConfirmModal,
  setShowClearConfirmModal,
  clearLoading,

  // Notifications
  submitError,
  submitSuccess,
  adminSuccess,
  error,
  clearSuccess,
  clearError
}: MobileType3PageShellProps) {
  return (
    <>
      {/* ==================== 隱藏原生輸入樣式 ==================== */}
      <style>{`
        input[type="date"]::-webkit-calendar-picker-indicator {
          display: none;
          -webkit-appearance: none;
        }
        input[type="date"]::-webkit-inner-spin-button,
        input[type="date"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>

      <SharedPageLayout
        pageHeader={{
          category: config.category,
          title: config.title,
          subtitle: config.subtitle,
          iconColor: config.iconColor,
          categoryPosition: config.categoryPosition
        }}
        statusBanner={{
          approvalStatus,
          isReviewMode,
          accentColor: config.iconColor
        }}
        instructionText={config.instructionText}
        bottomActionBar={{
          currentStatus,
          submitting,
          onSubmit: handleSubmit,
          onSave: handleSave,
          onClear: handleClear,
          show: !isReadOnly && !approvalStatus.isApproved && !isReviewMode,
          accentColor: config.iconColor
        }}
        reviewSection={{
          isReviewMode,
          reviewEntryId,
          reviewUserId,
          currentEntryId,
          pageKey,
          year,
          category: config.title,
          amount: reviewAmount,
          unit: reviewUnit,
          role,
          onSave: handleSave,
          isSaving: submitting
        }}
        notificationState={{
          success: submitSuccess || adminSuccess,
          error: submitError || error,
          clearSuccess,
          clearError
        }}
      >
        {/* ==================== 額外內容（如檢修表） ==================== */}
        {beforeSpecsContent}

        {/* ==================== 區塊 1：規格設定 ==================== */}
        <SpecInputFields
          spec={currentEditingSpec}
          onFieldChange={updateCurrentSpec}
          onSave={handleSaveSpec}
          editingSpecId={editingSpecId}
          isReadOnly={isReadOnly}
          thumbnails={thumbnails}
          onImageClick={(src: string) => setLightboxSrc(src)}
        />

        {/* ==================== 區塊 2：規格列表 ==================== */}
        <SpecListSection
          specs={savedSpecs}
          thumbnails={thumbnails}
          onEdit={handleEditSpec}
          onDelete={handleDeleteSpec}
          onImageClick={(src: string) => setLightboxSrc(src)}
          isReadOnly={isReadOnly}
        />

        {/* ==================== 區塊 3：使用數據標題 ==================== */}
        <div style={{ marginTop: '116.75px', marginLeft: '367px' }}>
          <div className="flex items-center gap-[29px]">
            <div
              className="w-[42px] h-[42px] rounded-[10px] flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: config.iconColor }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="29" height="29" viewBox="0 0 29 29" fill="none">
                <path
                  d="M25.375 6.04163C25.375 8.04366 20.5061 9.66663 14.5 9.66663C8.4939 9.66663 3.625 8.04366 3.625 6.04163M25.375 6.04163C25.375 4.03959 20.5061 2.41663 14.5 2.41663C8.4939 2.41663 3.625 4.03959 3.625 6.04163M25.375 6.04163V22.9583C25.375 24.9641 20.5417 26.5833 14.5 26.5833C8.45833 26.5833 3.625 24.9641 3.625 22.9583V6.04163M25.375 14.5C25.375 16.5058 20.5417 18.125 14.5 18.125C8.45833 18.125 3.625 16.5058 3.625 14.5"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="flex flex-col justify-center h-[86px]">
              <h3 className="text-[28px] font-bold text-black">
                使用數據
              </h3>
            </div>
          </div>
        </div>

        {/* ==================== 區塊 4：使用數據表單 ==================== */}
        <UsageInputFields
          currentGroup={currentEditingGroup}
          onUpdate={updateCurrentGroupRecord}
          onUpdateSpecId={updateCurrentGroupSpecId}
          onDelete={removeRecordFromCurrentGroup}
          onAddRecord={addRecordToCurrentGroup}
          onFileChange={(files: any) => setCurrentEditingGroup(prev => ({ ...prev, memoryFiles: files }))}
          onRemoveEvidence={clearCurrentGroupEvidence}
          specs={savedSpecs}
          isReadOnly={isReadOnly}
          iconColor={config.iconColor}
          thumbnails={thumbnails}
          onImageClick={(src: string) => setLightboxSrc(src)}
        />

        {/* ==================== 新增群組按鈕 ==================== */}
        <div className="flex justify-center" style={{ marginTop: '46px' }}>
          <button
            onClick={saveCurrentGroup}
            disabled={submitting}
            style={{
              width: '237px',
              height: '46.25px',
              flexShrink: 0,
              borderRadius: '7px',
              border: '1px solid rgba(0, 0, 0, 0.50)',
              background: submitting ? '#9CA3AF' : '#000',
              boxShadow: '0 4px 4px 0 rgba(0, 0, 0, 0.25)',
              cursor: submitting ? 'not-allowed' : 'pointer',
              color: '#FFF',
              textAlign: 'center',
              fontFamily: 'var(--sds-typography-body-font-family)',
              fontSize: '20px',
              fontStyle: 'normal',
              fontWeight: 'var(--sds-typography-body-font-weight-regular)',
              lineHeight: '100%'
            }}
          >
            {currentEditingGroup.groupId ? '儲存變更' : '+ 新增群組'}
          </button>
        </div>

        {/* ==================== 區塊 5：資料列表 ==================== */}
        <div ref={dataListRef}>
          <MobileEnergyGroupListSection
            savedGroups={savedGroups}
            thumbnails={thumbnails}
            isReadOnly={isReadOnly}
            approvalStatus={approvalStatus}
            isReviewMode={isReviewMode}
            onEditGroup={editGroup}
            onDeleteGroup={deleteGroup}
            onPreviewImage={(src: string) => setLightboxSrc(src)}
            iconColor={config.iconColor}
          />
        </div>
      </SharedPageLayout>

      {/* ==================== 圖片 Lightbox ==================== */}
      <ImageLightbox
        src={lightboxSrc}
        onClose={() => setLightboxSrc(null)}
      />

      {/* ==================== 清除確認 Modal ==================== */}
      <ConfirmClearModal
        show={showClearConfirmModal}
        onCancel={() => setShowClearConfirmModal(false)}
        onConfirm={handleClearConfirm}
        isClearing={clearLoading}
      />
    </>
  )
}
