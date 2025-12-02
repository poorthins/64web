import { useState, useEffect } from 'react';
import { EntryStatus } from '../../components/StatusSwitcher';
import ConfirmClearModal from '../../components/ConfirmClearModal';
import SuccessModal from '../../components/SuccessModal';
import SharedPageLayout from '../../layouts/SharedPageLayout';
import Toast from '../../components/Toast';
import { CommuteDownloadSection } from './components/CommuteDownloadSection';
import { CommuteUploadSection } from './components/CommuteUploadSection';
import { useEditPermissions } from '../../hooks/useEditPermissions';
import { useApprovalStatus } from '../../hooks/useApprovalStatus';
import { useReviewMode } from '../../hooks/useReviewMode';
import { useEnergyData } from '../../hooks/useEnergyData';
import { useGhostFileCleaner } from '../../hooks/useGhostFileCleaner';
import { useRole } from '../../hooks/useRole';
import { useAdminSave } from '../../hooks/useAdminSave';
import { EvidenceFile, deleteEvidenceFile } from '../../api/files';
import { deleteEnergyEntry } from '../../api/entries';
import type { MemoryFile } from '../../utils/documentHandler';
import { entryAPI, fileAPI } from '../../api/v2';

const COMMUTE_CONFIG = {
  pageKey: 'employee_commute',
  category: 'E',
  title: '員工通勤',
  subtitle: "Employee's Daily Commute",
  unit: '公里',
  iconColor: '#60ACB3',
  categoryPosition: { left: 646, top: 39 },
  instructionText: '請先下載 Excel 範例檔案,其中包含員工資料表和出勤表兩個工作表,並上傳填寫完成的員工通勤 Excel 檔案。'
};

export default function CommutePage() {
  // 審核模式檢測
  const { isReviewMode, reviewEntryId, reviewUserId } = useReviewMode();

  const pageKey = COMMUTE_CONFIG.pageKey;
  const [year] = useState(new Date().getFullYear());
  const [currentStatus, setCurrentStatus] = useState<EntryStatus>('submitted');
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalType, setSuccessModalType] = useState<'save' | 'submit'>('submit');
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 檔案狀態（只保留 Excel 檔案）- Type 5 單檔上傳
  const [excelFile, setExcelFile] = useState<EvidenceFile | null>(null);
  const [excelMemoryFile, setExcelMemoryFile] = useState<MemoryFile | null>(null);

  // 簡化的提交保護函數
  const executeSubmit = async (fn: () => Promise<void>) => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await fn();
    } catch (err) {
      const message = err instanceof Error ? err.message : '操作失敗，請重試';
      setError(message);
      console.error('[CommuteePage] Error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // 角色檢查
  const { role } = useRole();

  // 審核模式下只有管理員可編輯
  const isReadOnly = isReviewMode && role !== 'admin';

  const editPermissions = useEditPermissions(currentStatus, isReadOnly, role ?? undefined);

  // 資料載入 Hook
  const entryIdToLoad = isReviewMode && reviewEntryId ? reviewEntryId : undefined;
  const {
    entry: loadedEntry,
    files: loadedFiles,
    loading: dataLoading,
    error: dataError,
    reload
  } = useEnergyData(pageKey, year, entryIdToLoad);

  // 審核狀態 Hook
  const { reload: reloadApprovalStatus, ...approvalStatus } = useApprovalStatus(pageKey, year);

  // 幽靈檔案清理 Hook
  const { cleanFiles } = useGhostFileCleaner();

  // 管理員儲存 Hook
  const { save: adminSave } = useAdminSave(pageKey, reviewEntryId);

  // 載入 entry 資料
  useEffect(() => {
    if (loadedEntry && !dataLoading) {
      setCurrentEntryId(loadedEntry.id);
      setCurrentStatus(loadedEntry.status as EntryStatus);
    } else if (loadedEntry === null && !dataLoading) {
      // 無記錄，重置狀態
      setCurrentEntryId(null);
      setCurrentStatus('submitted');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedEntry, dataLoading]);

  // 載入檔案
  useEffect(() => {
    if (loadedFiles.length > 0) {
      const cleanAndAssignFiles = async () => {
        const validFiles = await cleanFiles(loadedFiles);

        // 只處理 Excel 檔案（支援 .xlsx 和 .xls）- Type 5 單檔
        const excelFiles = validFiles.filter(f =>
          f.file_type === 'other' &&
          /\.(xlsx|xls)$/i.test(f.file_name)
        );

        const newExcelFile = excelFiles[0] || null;
        setExcelFile(newExcelFile);

        // 如果載入到新檔案，清除暫存（表示已上傳成功）
        if (newExcelFile) {
          setExcelMemoryFile(null);
        }
      };
      cleanAndAssignFiles();
    } else {
      setExcelFile(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedFiles]);

  // 統一提交函數
  const submitData = async (isDraft: boolean) => {
    // 檢查是否有檔案
    if (!excelFile && !excelMemoryFile) {
      throw new Error('請上傳 Excel 檔案');
    }

    await executeSubmit(async () => {
      // 1️⃣ 提交 entry（只記錄 metadata）
      const response = await entryAPI.submitEnergyEntry({
        page_key: pageKey,
        period_year: year,
        unit: COMMUTE_CONFIG.unit,
        notes: '員工通勤資料',
        status: isDraft ? 'saved' : 'submitted',
        payload: {
          excelFileName: excelMemoryFile?.file_name || excelFile?.file_name || '員工通勤.xlsx'
        }
      });

      setCurrentEntryId(response.entry_id);

      // 2️⃣ 上傳 Excel 檔案
      if (excelMemoryFile) {
        await fileAPI.uploadEvidenceFile(excelMemoryFile.file, {
          page_key: pageKey,
          period_year: year,
          file_type: 'other',
          entry_id: response.entry_id,
          record_id: 'commute_excel', // 固定 ID
          standard: '64'
        });
      }

      // 3️⃣ 更新狀態
      setSuccess(isDraft ? '暫存成功！資料已儲存' : '提交成功！');
      setCurrentStatus(isDraft ? 'saved' : 'submitted');

      // 4️⃣ 重新載入（useEffect 會自動清除 memory file）
      await reload();
      reloadApprovalStatus();

      // 顯示成功彈窗
      setSuccessModalType(isDraft ? 'save' : 'submit');
      setShowSuccessModal(true);
    });
  };

  const handleSubmit = async () => {
    await submitData(false);
  };

  const handleSave = async () => {
    // 審核模式：使用 adminSave hook
    if (isReviewMode && reviewEntryId) {
      await executeSubmit(async () => {
        console.log('📝 管理員審核模式：使用 useAdminSave hook', reviewEntryId);

        const filesToUpload = excelMemoryFile ? [{
          file: excelMemoryFile.file,
          metadata: { recordIndex: 0, allRecordIds: ['commute'] }
        }] : [];

        await adminSave({
          updateData: {
            unit: COMMUTE_CONFIG.unit,
            amount: 0,
            payload: {}
          },
          files: filesToUpload
        });

        // reload（useEffect 會自動清除 memory file）
        await reload();
        reloadApprovalStatus();
        setSuccess('✅ 儲存成功！資料已更新');
      });
      return;
    }

    // 非審核模式：直接呼叫 submitData
    await submitData(true);
  };

  const handleClear = () => {
    setShowClearConfirmModal(true);
  };

  const handleClearConfirm = async () => {
    try {
      // 刪除 entry
      if (currentEntryId) {
        await deleteEnergyEntry(currentEntryId);
      }

      // 刪除檔案
      if (excelFile) {
        await deleteEvidenceFile(excelFile.id);
      }

      // 重置狀態
      setExcelFile(null);
      setExcelMemoryFile(null);
      setCurrentEntryId(null);
      setCurrentStatus('submitted');
      setShowClearConfirmModal(false);

      // 重新載入
      await reload();
      reloadApprovalStatus();

      setSuccess('資料已完全清除');
    } catch (error) {
      setError(error instanceof Error ? error.message : '清除失敗，請重試');
    }
  };

  // 下載範例檔案
  const downloadTemplate = () => {
    const link = document.createElement('a');
    link.href = '/examples/commute-template.xlsx';
    link.download = '員工通勤範例檔案.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <SharedPageLayout
        pageHeader={{
          category: COMMUTE_CONFIG.category,
          title: COMMUTE_CONFIG.title,
          subtitle: COMMUTE_CONFIG.subtitle,
          iconColor: COMMUTE_CONFIG.iconColor,
          categoryPosition: COMMUTE_CONFIG.categoryPosition
        }}
        statusBanner={{
          approvalStatus,
          isReviewMode,
          accentColor: COMMUTE_CONFIG.iconColor
        }}
        instructionText={COMMUTE_CONFIG.instructionText}
        bottomActionBar={{
          currentStatus,
          submitting,
          onSubmit: handleSubmit,
          onSave: handleSave,
          onClear: handleClear,
          show: !isReadOnly && !approvalStatus.isApproved && !isReviewMode,
          accentColor: COMMUTE_CONFIG.iconColor
        }}
        reviewSection={{
          isReviewMode,
          reviewEntryId,
          reviewUserId,
          currentEntryId,
          pageKey,
          year,
          category: COMMUTE_CONFIG.title,
          amount: 0,
          unit: COMMUTE_CONFIG.unit,
          role,
          onSave: handleSave,
          isSaving: submitting
        }}
      >
        {/* 區塊 1：下載範例檔案 */}
        <CommuteDownloadSection
          iconColor={COMMUTE_CONFIG.iconColor}
          onDownload={downloadTemplate}
        />

        {/* 區塊 2：上傳員工通勤資料 */}
        <CommuteUploadSection
          iconColor={COMMUTE_CONFIG.iconColor}
          pageKey={pageKey}
          excelFile={excelFile}
          excelMemoryFile={excelMemoryFile}
          onExcelFileChange={setExcelFile}
          onExcelMemoryFileChange={setExcelMemoryFile}
          disabled={submitting || !editPermissions.canUploadFiles}
          isReadOnly={isReadOnly || approvalStatus.isApproved}
          canUploadFiles={editPermissions.canUploadFiles}
          onError={(msg) => setError(msg)}
          onPreviewImage={() => {}}
        />

        {/* 清除確認模態框 */}
        <ConfirmClearModal
          show={showClearConfirmModal}
          onConfirm={handleClearConfirm}
          onCancel={() => setShowClearConfirmModal(false)}
          isClearing={submitting}
        />

        {/* Toast 訊息 */}
        {error && (
          <Toast
            message={error}
            type="error"
            onClose={() => setError(null)}
          />
        )}

        {success && (
          <Toast
            message={success}
            type="success"
            onClose={() => setSuccess(null)}
          />
        )}

        {/* 提交成功彈窗 */}
        <SuccessModal
          show={showSuccessModal}
          type={successModalType}
          onClose={() => setShowSuccessModal(false)}
        />
      </SharedPageLayout>
    </>
  );
}

