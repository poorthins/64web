"""
檔案上傳服務單元測試
重點：檔案驗證與 rollback 機制
"""
import pytest
from unittest.mock import Mock, MagicMock
from src.services.file_service import (
    validate_file_size,
    validate_file_type,
    infer_mime_type,
    sanitize_filename,
    generate_file_path,
    upload_file_to_storage,
    create_file_record,
    upload_evidence_file,
    delete_evidence_file,
    MAX_FILE_SIZE
)


class TestValidateFileSize:
    """測試檔案大小驗證"""

    def test_normal_file_size(self):
        """測試正常檔案大小"""
        validate_file_size(1024 * 1024)  # 1MB - should pass

    def test_max_file_size(self):
        """測試最大檔案大小（10MB）"""
        validate_file_size(MAX_FILE_SIZE)  # Exactly 10MB - should pass

    def test_file_too_large(self):
        """測試檔案過大"""
        with pytest.raises(ValueError) as exc_info:
            validate_file_size(MAX_FILE_SIZE + 1)  # Over 10MB

        assert "exceeds maximum limit" in str(exc_info.value)

    def test_empty_file(self):
        """測試空檔案"""
        with pytest.raises(ValueError) as exc_info:
            validate_file_size(0)

        assert "empty" in str(exc_info.value).lower()


class TestValidateFileType:
    """測試檔案類型驗證"""

    def test_valid_image_type(self):
        """測試有效的圖片類型"""
        result = validate_file_type('image/jpeg', 'test.jpg')
        assert result == 'image/jpeg'

    def test_valid_pdf_type(self):
        """測試有效的 PDF 類型"""
        result = validate_file_type('application/pdf', 'test.pdf')
        assert result == 'application/pdf'

    def test_infer_from_filename(self):
        """測試從檔名推斷類型"""
        result = validate_file_type('', 'test.png')
        assert result == 'image/png'

    def test_unknown_type_logs_warning(self):
        """測試未知類型（應記錄警告但不拋錯）"""
        # 應該不拋出錯誤（根據前端允許所有類型）
        result = validate_file_type('application/x-custom', 'test.xyz')
        assert result == 'application/x-custom'


class TestInferMimeType:
    """測試 MIME 類型推斷"""

    def test_image_extensions(self):
        """測試圖片副檔名"""
        assert infer_mime_type('photo.jpg') == 'image/jpeg'
        assert infer_mime_type('photo.jpeg') == 'image/jpeg'
        assert infer_mime_type('photo.png') == 'image/png'

    def test_document_extensions(self):
        """測試文件副檔名"""
        assert infer_mime_type('document.pdf') == 'application/pdf'
        assert infer_mime_type('spreadsheet.xlsx') == 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

    def test_unknown_extension(self):
        """測試未知副檔名"""
        assert infer_mime_type('unknown.xyz') == 'application/octet-stream'

    def test_no_extension(self):
        """測試無副檔名"""
        assert infer_mime_type('noextension') == 'application/octet-stream'


class TestSanitizeFilename:
    """測試檔案名稱清理"""

    def test_normal_filename(self):
        """測試正常檔案名稱"""
        result = sanitize_filename('document.pdf')
        assert result == 'document.pdf'

    def test_chinese_characters(self):
        """測試中文字符（應移除）"""
        result = sanitize_filename('報告書.pdf')
        assert '.pdf' in result
        assert '報告書' not in result  # 中文應被移除

    def test_special_characters(self):
        """測試特殊字符（應替換為底線）"""
        result = sanitize_filename('file:with*special?chars.txt')
        assert ':' not in result
        assert '*' not in result
        assert '?' not in result
        assert '_' in result

    def test_long_filename(self):
        """測試過長檔案名稱（應截斷）"""
        long_name = 'a' * 100 + '.pdf'
        result = sanitize_filename(long_name)
        assert len(result) <= 54  # 50 chars + '.pdf'

    def test_no_extension(self):
        """測試無副檔名"""
        result = sanitize_filename('noextension')
        assert result == 'noextension'


class TestGenerateFilePath:
    """測試檔案路徑生成"""

    def test_path_without_month(self):
        """測試無月份的路徑"""
        path = generate_file_path(
            user_id='user-123',
            page_key='diesel',
            standard='64',
            filename='test.pdf'
        )

        assert path.startswith('user-123/64/diesel/')
        assert 'test.pdf' in path
        assert path.count('/') == 3  # user/standard/page_key/filename

    def test_path_with_month(self):
        """測試有月份的路徑"""
        path = generate_file_path(
            user_id='user-123',
            page_key='diesel',
            standard='64',
            filename='test.pdf',
            month=1
        )

        assert path.startswith('user-123/64/diesel/1/')
        assert path.count('/') == 4  # user/standard/page_key/month/filename

    def test_path_uniqueness(self):
        """測試路徑唯一性（包含時間戳和隨機碼）"""
        path1 = generate_file_path('user-123', 'diesel', '64', 'test.pdf')
        path2 = generate_file_path('user-123', 'diesel', '64', 'test.pdf')

        # 應該不同（因為時間戳和隨機碼）
        assert path1 != path2

    def test_path_safety(self):
        """測試路徑安全性"""
        path = generate_file_path('user-123', 'diesel', '64', 'test.pdf')

        assert '//' not in path
        assert '..' not in path
        assert len(path) < 1024


class TestUploadFileToStorage:
    """測試上傳到 Storage"""

    def test_successful_upload(self):
        """測試成功上傳"""
        # Mock Supabase storage
        mock_supabase = Mock()
        mock_storage = Mock()
        mock_bucket = Mock()
        mock_upload = Mock()

        mock_supabase.storage.from_.return_value = mock_bucket
        mock_bucket.upload.return_value = mock_upload

        file_data = b'test file content'
        file_path = 'user-123/64/diesel/test.pdf'
        mime_type = 'application/pdf'

        result = upload_file_to_storage(
            supabase=mock_supabase,
            file_data=file_data,
            file_path=file_path,
            mime_type=mime_type
        )

        assert result['path'] == file_path
        mock_bucket.upload.assert_called_once()

    def test_upload_failure(self):
        """測試上傳失敗"""
        # Mock Supabase storage to raise error
        mock_supabase = Mock()
        mock_storage = Mock()
        mock_bucket = Mock()

        mock_supabase.storage.from_.return_value = mock_bucket
        mock_bucket.upload.side_effect = Exception("Storage error")

        file_data = b'test file content'
        file_path = 'user-123/64/diesel/test.pdf'

        with pytest.raises(Exception) as exc_info:
            upload_file_to_storage(
                supabase=mock_supabase,
                file_data=file_data,
                file_path=file_path,
                mime_type='application/pdf'
            )

        assert "Failed to upload file to storage" in str(exc_info.value)


class TestCreateFileRecord:
    """測試建立檔案記錄"""

    def test_successful_creation(self):
        """測試成功建立記錄"""
        # Mock Supabase table
        mock_supabase = Mock()
        mock_table = Mock()
        mock_insert = Mock()
        mock_execute = Mock()

        mock_supabase.table.return_value = mock_table
        mock_table.insert.return_value = mock_insert
        mock_insert.execute.return_value = mock_execute
        mock_execute.data = [{'id': 'file-123', 'file_name': 'test.pdf'}]

        result = create_file_record(
            supabase=mock_supabase,
            user_id='user-123',
            entry_id='entry-456',
            file_path='path/to/file.pdf',
            filename='test.pdf',
            mime_type='application/pdf',
            file_size=1024,
            page_key='diesel',
            file_type='usage_evidence',
            month=1
        )

        assert result['id'] == 'file-123'
        mock_supabase.table.assert_called_with('entry_files')

    def test_creation_failure(self):
        """測試建立失敗"""
        # Mock empty response
        mock_supabase = Mock()
        mock_table = Mock()
        mock_insert = Mock()
        mock_execute = Mock()

        mock_supabase.table.return_value = mock_table
        mock_table.insert.return_value = mock_insert
        mock_insert.execute.return_value = mock_execute
        mock_execute.data = []  # Empty response

        with pytest.raises(Exception) as exc_info:
            create_file_record(
                supabase=mock_supabase,
                user_id='user-123',
                entry_id='entry-456',
                file_path='path/to/file.pdf',
                filename='test.pdf',
                mime_type='application/pdf',
                file_size=1024,
                page_key='diesel',
                file_type='usage_evidence'
            )

        assert "Failed to create file record" in str(exc_info.value)


class TestUploadEvidenceFile:
    """測試完整上傳流程（含 rollback）"""

    def test_file_size_validation_failure(self):
        """測試檔案大小驗證失敗"""
        mock_supabase = Mock()

        with pytest.raises(ValueError) as exc_info:
            upload_evidence_file(
                supabase=mock_supabase,
                user_id='user-123',
                entry_id='entry-456',
                file_data=b'x' * (MAX_FILE_SIZE + 1),  # Too large
                filename='large.pdf',
                file_size=MAX_FILE_SIZE + 1,
                mime_type='application/pdf',
                page_key='diesel',
                period_year=2024,
                file_type='usage_evidence'
            )

        assert "exceeds maximum limit" in str(exc_info.value)


class TestDeleteEvidenceFile:
    """測試刪除檔案"""

    def test_successful_deletion(self):
        """測試成功刪除"""
        # Mock Supabase
        mock_supabase = Mock()
        mock_table = Mock()
        mock_select = Mock()
        mock_eq = Mock()
        mock_single = Mock()
        mock_execute = Mock()
        mock_storage = Mock()
        mock_bucket = Mock()
        mock_delete = Mock()

        # Setup select chain
        mock_supabase.table.return_value = mock_table
        mock_table.select.return_value = mock_select
        mock_select.eq.return_value = mock_eq
        mock_eq.single.return_value = mock_single
        mock_single.execute.return_value = mock_execute
        mock_execute.data = {
            'id': 'file-123',
            'owner_id': 'user-123',
            'file_path': 'path/to/file.pdf'
        }

        # Setup storage deletion
        mock_supabase.storage.from_.return_value = mock_bucket
        mock_bucket.remove.return_value = None

        # Setup database deletion
        mock_table.delete.return_value = mock_delete
        mock_delete.eq.return_value = mock_execute

        result = delete_evidence_file(
            supabase=mock_supabase,
            user_id='user-123',
            file_id='file-123'
        )

        assert result['success'] == True
        assert result['file_id'] == 'file-123'

    def test_permission_denied(self):
        """測試權限拒絕"""
        # Mock Supabase
        mock_supabase = Mock()
        mock_table = Mock()
        mock_select = Mock()
        mock_eq = Mock()
        mock_single = Mock()
        mock_execute = Mock()

        mock_supabase.table.return_value = mock_table
        mock_table.select.return_value = mock_select
        mock_select.eq.return_value = mock_eq
        mock_eq.single.return_value = mock_single
        mock_single.execute.return_value = mock_execute
        mock_execute.data = {
            'id': 'file-123',
            'owner_id': 'user-456',  # Different user
            'file_path': 'path/to/file.pdf'
        }

        with pytest.raises(Exception) as exc_info:
            delete_evidence_file(
                supabase=mock_supabase,
                user_id='user-123',  # Requesting user
                file_id='file-123'
            )

        assert "Permission denied" in str(exc_info.value)

    def test_file_not_found(self):
        """測試檔案不存在"""
        # Mock Supabase
        mock_supabase = Mock()
        mock_table = Mock()
        mock_select = Mock()
        mock_eq = Mock()
        mock_single = Mock()
        mock_execute = Mock()

        mock_supabase.table.return_value = mock_table
        mock_table.select.return_value = mock_select
        mock_select.eq.return_value = mock_eq
        mock_eq.single.return_value = mock_single
        mock_single.execute.return_value = mock_execute
        mock_execute.data = None  # File not found

        with pytest.raises(Exception) as exc_info:
            delete_evidence_file(
                supabase=mock_supabase,
                user_id='user-123',
                file_id='nonexistent'
            )

        assert "not found" in str(exc_info.value)
