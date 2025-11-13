import { useState, useEffect } from 'react';
import { EntryStatus } from '../../components/StatusSwitcher';
import ConfirmClearModal from '../../components/ConfirmClearModal';
import SuccessModal from '../../components/SuccessModal';
import SharedPageLayout from '../../layouts/SharedPageLayout';
import Toast from '../../components/Toast';
import { CommuteDownloadSection } from './components/CommuteDownloadSection';
import { CommuteUploadSection } from './components/CommuteUploadSection';
import { useEditPermissions } from '../../hooks/useEditPermissions';
import { useFrontendStatus } from '../../hooks/useFrontendStatus';
import { useApprovalStatus } from '../../hooks/useApprovalStatus';
import { useReviewMode } from '../../hooks/useReviewMode';
import { useEnergyData } from '../../hooks/useEnergyData';
import { useEnergyClear } from '../../hooks/useEnergyClear';
import { useSubmitGuard } from '../../hooks/useSubmitGuard';
import { useGhostFileCleaner } from '../../hooks/useGhostFileCleaner';
import { useRole } from '../../hooks/useRole';
import { useAdminSave } from '../../hooks/useAdminSave';
import { EvidenceFile } from '../../api/files';
import { upsertEnergyEntry } from '../../api/entries';
import { smartOverwriteFiles } from '../../api/smartFileOverwrite';
import type { MemoryFile } from '../../services/documentHandler';

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
  const [initialStatus, setInitialStatus] = useState<EntryStatus>('submitted');
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);
  const { executeSubmit, submitting } = useSubmitGuard();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalType, setSuccessModalType] = useState<'save' | 'submit'>('submit');
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 檔案狀態（只保留 Excel 檔案）
  const [excelFile, setExcelFile] = useState<EvidenceFile[]>([]);
  const [excelMemoryFiles, setExcelMemoryFiles] = useState<MemoryFile[]>([]);

  // 前端狀態管理 Hook
  const frontendStatus = useFrontendStatus({
    initialStatus,
    entryId: currentEntryId,
    onStatusChange: () => {},
    onError: (error) => setError(error),
    onSuccess: (message) => setSuccess(message)
  });

  const { currentStatus, setCurrentStatus, handleSubmitSuccess } = frontendStatus;

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

  // 清除 Hook
  const {
    clear,
    clearing: clearLoading
  } = useEnergyClear(currentEntryId, currentStatus);

  // 幽靈檔案清理 Hook
  const { cleanFiles } = useGhostFileCleaner();

  // 管理員儲存 Hook
  const { save: adminSave } = useAdminSave(pageKey, reviewEntryId);

  // 載入 entry 資料
  useEffect(() => {
    if (loadedEntry && !dataLoading) {
      setInitialStatus(loadedEntry.status as EntryStatus);
      setCurrentEntryId(loadedEntry.id);
      setCurrentStatus(loadedEntry.status as EntryStatus);
    } else if (loadedEntry === null && !dataLoading) {
      // 無記錄，重置狀態
      setCurrentEntryId(null);
      setInitialStatus('saved');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedEntry, dataLoading]);

  // 載入檔案
  useEffect(() => {
    if (loadedFiles.length > 0) {
      const cleanAndAssignFiles = async () => {
        const validFiles = await cleanFiles(loadedFiles);

        // 只處理 Excel 檔案（支援 .xlsx 和 .xls）
        const excelFiles = validFiles.filter(f =>
          f.file_type === 'other' &&
          /\.(xlsx|xls)$/i.test(f.file_name)
        );

        setExcelFile(excelFiles);
      };
      cleanAndAssignFiles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedFiles]);

  const handleSubmit = async () => {
    await executeSubmit(async () => {
      // 建立填報輸入資料
      const entryInput = {
        page_key: pageKey,
        period_year: year,
        unit: COMMUTE_CONFIG.unit,
        monthly: { '1': 0 }, // 只上傳檔案，不記錄數值
        notes: '員工通勤資料',
        payload: {}
      };

      // 新增或更新 energy_entries（使用 false 避免 RLS 錯誤）
      const { entry_id } = await upsertEnergyEntry(entryInput, false);

      if (!currentEntryId) {
        setCurrentEntryId(entry_id);
      }

      // 使用智慧型檔案覆蓋（累積模式：保留舊檔案 + 追加新檔案）
      await smartOverwriteFiles([
        {
          itemKey: 'excel',
          newFiles: excelMemoryFiles,
          existingFiles: excelFile,
          fileType: 'other' as const,
          mode: 'append' as const  // 累積模式：保留舊檔案
        }
      ], {
        entryId: entry_id,
        pageKey,
        year,
        debug: true
      });

      // 重新載入檔案
      await reload();

      // 清空記憶體檔案
      setExcelMemoryFiles([]);

      // 提交成功
      await handleSubmitSuccess();

      // 重新載入審核狀態，更新狀態橫幅
      reloadApprovalStatus();

      setSuccessModalType('submit');
      setShowSuccessModal(true);
    }).catch(error => {
      console.error('[CommuteePage] Submit error:', error);
      setError(error instanceof Error ? error.message : '提交失敗，請重試');
    });
  };

  const handleSave = async () => {
    await executeSubmit(async () => {
      setError(null);
      setSuccess(null);

      // 審核模式：使用 useAdminSave hook
      if (isReviewMode && reviewEntryId) {
        console.log('📝 管理員審核模式：使用 useAdminSave hook', reviewEntryId);

        const filesToUpload = [
          ...excelMemoryFiles.map((mf: MemoryFile) => ({
            file: mf.file,
            metadata: { recordIndex: 0, allRecordIds: ['commute'] }
          }))
        ];

        await adminSave({
          updateData: {
            unit: COMMUTE_CONFIG.unit,
            amount: 0,
            payload: {
              monthly: { '1': 0 }
            }
          },
          files: filesToUpload
        });

        await reload();
        reloadApprovalStatus();
        setExcelMemoryFiles([]);
        setSuccess('✅ 儲存成功！資料已更新');
        return;
      }

      // 非審核模式：建立填報輸入資料
      const entryInput = {
        page_key: pageKey,
        period_year: year,
        unit: COMMUTE_CONFIG.unit,
        monthly: { '1': 0 },
        notes: '員工通勤資料',
        payload: {}
      };

      // 新增或更新 energy_entries（使用 true 保持現有狀態）
      const { entry_id } = await upsertEnergyEntry(entryInput, true);

      if (!currentEntryId) {
        setCurrentEntryId(entry_id);
      }

      // 使用智慧型檔案覆蓋（累積模式：保留舊檔案 + 追加新檔案）
      await smartOverwriteFiles([
        {
          itemKey: 'excel',
          newFiles: excelMemoryFiles,
          existingFiles: excelFile,
          fileType: 'other' as const,
          mode: 'append' as const
        }
      ], {
        entryId: entry_id,
        pageKey,
        year,
        debug: true
      });

      // 重新載入檔案
      await reload();

      // 清空記憶體檔案
      setExcelMemoryFiles([]);

      // 重新載入審核狀態，更新狀態橫幅
      reloadApprovalStatus();

      setSuccess('暫存成功！資料已儲存');
      setSuccessModalType('save');
      setShowSuccessModal(true);
    }).catch(error => {
      console.error('[CommuteePage] Save error:', error);
      setError(error instanceof Error ? error.message : '暫存失敗');
    });
  };

  const handleClear = () => {
    setShowClearConfirmModal(true);
  };

  const handleClearConfirm = async () => {
    try {
      // 收集所有檔案
      const allFiles = [...excelFile];
      const allMemoryFiles = [...excelMemoryFiles];

      // 使用 Hook 清除
      await clear({
        filesToDelete: allFiles,
        memoryFilesToClean: allMemoryFiles
      });

      // 重置前端狀態
      setExcelMemoryFiles([]);
      setExcelFile([]);
      setCurrentEntryId(null);
      setShowClearConfirmModal(false);

      // 重新載入審核狀態，清除狀態橫幅
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
          excelMemoryFiles={excelMemoryFiles}
          onExcelFilesChange={setExcelFile}
          onExcelMemoryFilesChange={setExcelMemoryFiles}
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
          isClearing={clearLoading}
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
          message={success || ''}
          type={successModalType}
          onClose={() => setShowSuccessModal(false)}
        />
      </SharedPageLayout>
    </>
  );
}

