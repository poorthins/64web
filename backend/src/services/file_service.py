"""
檔案上傳服務
包含 pseudo-transaction 模式的錯誤回滾機制
"""
from typing import Dict, Any, Optional, BinaryIO
import logging
import os
import time
import re
from datetime import datetime

logger = logging.getLogger(__name__)

# 允許的檔案類型（MIME types）
ALLOWED_MIME_TYPES = {
    # 圖片
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif',
    # 文件
    'application/pdf',
    # Excel
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    # Word
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    # 純文字
    'text/plain', 'text/csv',
    # 壓縮檔
    'application/zip', 'application/x-zip-compressed',
}

# 檔案大小限制（10MB）
MAX_FILE_SIZE = 10 * 1024 * 1024


def validate_file_size(file_size: int) -> None:
    """
    驗證檔案大小

    Args:
        file_size: 檔案大小（bytes）

    Raises:
        ValueError: 檔案過大
    """
    if file_size > MAX_FILE_SIZE:
        raise ValueError(f"File size exceeds maximum limit of {MAX_FILE_SIZE / 1024 / 1024}MB")

    if file_size == 0:
        raise ValueError("File is empty")


def validate_file_type(mime_type: str, filename: str) -> str:
    """
    驗證檔案類型

    Args:
        mime_type: MIME 類型
        filename: 檔案名稱

    Returns:
        驗證後的 MIME 類型

    Raises:
        ValueError: 不支援的檔案類型
    """
    # 如果 MIME type 為空，嘗試從副檔名推斷
    if not mime_type or mime_type == 'application/octet-stream':
        mime_type = infer_mime_type(filename)

    # 驗證 MIME type
    if mime_type not in ALLOWED_MIME_TYPES:
        logger.warning(f"File type not in allowed list: {mime_type}, filename: {filename}")
        # 不拋出錯誤，只記錄警告（根據前端程式碼，允許所有類型）

    return mime_type


def infer_mime_type(filename: str) -> str:
    """
    從檔案名稱推斷 MIME 類型

    Args:
        filename: 檔案名稱

    Returns:
        MIME 類型
    """
    extension = filename.split('.')[-1].lower() if '.' in filename else ''

    mime_map = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'heic': 'image/heic',
        'heif': 'image/heif',
        'pdf': 'application/pdf',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'xls': 'application/vnd.ms-excel',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'doc': 'application/msword',
        'txt': 'text/plain',
        'csv': 'text/csv',
        'zip': 'application/zip',
    }

    return mime_map.get(extension, 'application/octet-stream')


def sanitize_filename(filename: str) -> str:
    """
    清理檔案名稱，確保與 Supabase Storage 兼容

    Args:
        filename: 原始檔案名稱

    Returns:
        清理後的檔案名稱
    """
    # 保留副檔名
    if '.' in filename:
        name, ext = filename.rsplit('.', 1)
    else:
        name, ext = filename, ''

    # Unicode 正規化並移除非 ASCII 字符
    safe_name = name.encode('ascii', 'ignore').decode('ascii')

    # 替換特殊字符和空格
    safe_name = re.sub(r'[\/\\:*?"<>|\s]+', '_', safe_name)

    # 移除連續底線
    safe_name = re.sub(r'_{2,}', '_', safe_name)

    # 移除開頭和結尾的底線
    safe_name = safe_name.strip('_')

    # 限制長度
    safe_name = safe_name[:50] if safe_name else 'file'

    # 重組檔案名稱
    return f"{safe_name}.{ext}" if ext else safe_name


def generate_file_path(
    user_id: str,
    page_key: str,
    standard: str,
    filename: str,
    month: Optional[int] = None
) -> str:
    """
    生成檔案儲存路徑

    Args:
        user_id: 用戶 ID
        page_key: 能源類型鍵值
        standard: ISO 標準代碼
        filename: 檔案名稱
        month: 月份（可選）

    Returns:
        檔案路徑：{user_id}/{standard}/{page_key}/{month?}/{timestamp}_{filename}
    """
    timestamp = int(time.time() * 1000)
    random_suffix = os.urandom(3).hex()
    safe_filename = sanitize_filename(filename)

    # 組合唯一檔案名稱
    unique_filename = f"{timestamp}_{random_suffix}_{safe_filename}"

    # 構造路徑
    if month:
        path = f"{user_id}/{standard}/{page_key}/{month}/{unique_filename}"
    else:
        path = f"{user_id}/{standard}/{page_key}/{unique_filename}"

    # 驗證路徑安全性
    if '//' in path or '..' in path or len(path) > 1024:
        raise ValueError("Invalid file path generated")

    return path


def upload_file_to_storage(
    supabase,
    file_data: bytes,
    file_path: str,
    mime_type: str
) -> Dict[str, Any]:
    """
    上傳檔案到 Supabase Storage

    Args:
        supabase: Supabase client
        file_data: 檔案二進制數據
        file_path: 儲存路徑
        mime_type: MIME 類型

    Returns:
        上傳結果：{'path': str}

    Raises:
        Exception: 上傳失敗
    """
    try:
        logger.info(f"Uploading file to storage: {file_path}")

        result = supabase.storage.from_('evidence').upload(
            file_path,
            file_data,
            file_options={
                'content-type': mime_type,
                'upsert': 'true'
            }
        )

        logger.info(f"Successfully uploaded to storage: {file_path}")
        return {'path': file_path}

    except Exception as e:
        logger.error(f"Storage upload failed: {str(e)}")
        raise Exception(f"Failed to upload file to storage: {str(e)}")


def create_file_record(
    supabase,
    user_id: str,
    entry_id: str,
    file_path: str,
    filename: str,
    mime_type: str,
    file_size: int,
    page_key: str,
    file_type: str,
    month: Optional[int] = None,
    record_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    建立檔案資料庫記錄

    Args:
        supabase: Supabase client
        user_id: 用戶 ID
        entry_id: 能源條目 ID
        file_path: 儲存路徑
        filename: 原始檔案名稱
        mime_type: MIME 類型
        file_size: 檔案大小
        page_key: 能源類型鍵值
        file_type: 檔案類型
        month: 月份（可選）
        record_id: 記錄 ID（可選）

    Returns:
        建立的檔案記錄

    Raises:
        Exception: 建立失敗
    """
    file_record = {
        'owner_id': user_id,
        'entry_id': entry_id,
        'file_path': file_path,
        'file_name': filename,
        'mime_type': mime_type,
        'file_size': file_size,
        'page_key': page_key,
        'file_type': file_type,
        'month': month,
        'record_id': record_id
    }

    logger.info(f"Creating file record for user {user_id}")

    result = supabase.table('entry_files').insert(file_record).execute()

    if not result.data or len(result.data) == 0:
        raise Exception("Failed to create file record: no data returned")

    created_file = result.data[0]
    logger.info(f"Successfully created file record: {created_file['id']}")

    return created_file


def upload_evidence_file(
    supabase,
    user_id: str,
    entry_id: str,
    file_data: bytes,
    filename: str,
    file_size: int,
    mime_type: str,
    page_key: str,
    period_year: int,
    file_type: str,
    standard: str = '64',
    month: Optional[int] = None,
    record_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    上傳證據檔案（使用 pseudo-transaction 模式）

    Args:
        supabase: Supabase client
        user_id: 用戶 ID
        entry_id: 能源條目 ID
        file_data: 檔案二進制數據
        filename: 原始檔案名稱
        file_size: 檔案大小（bytes）
        mime_type: MIME 類型
        page_key: 能源類型鍵值
        period_year: 期間年份
        file_type: 檔案類型
        standard: ISO 標準代碼
        month: 月份（可選）
        record_id: 記錄 ID（可選）

    Returns:
        建立的檔案記錄（包含 file_id）

    Raises:
        Exception: 上傳失敗時拋出異常，並自動回滾
    """
    uploaded_file_path = None

    try:
        # 1. 驗證檔案
        validate_file_size(file_size)
        validated_mime_type = validate_file_type(mime_type, filename)

        # 2. 生成檔案路徑
        file_path = generate_file_path(
            user_id=user_id,
            page_key=page_key,
            standard=standard,
            filename=filename,
            month=month
        )

        # 3. 上傳到 Storage
        upload_result = upload_file_to_storage(
            supabase=supabase,
            file_data=file_data,
            file_path=file_path,
            mime_type=validated_mime_type
        )

        uploaded_file_path = upload_result['path']

        # 4. 建立資料庫記錄
        file_record = create_file_record(
            supabase=supabase,
            user_id=user_id,
            entry_id=entry_id,
            file_path=uploaded_file_path,
            filename=filename,
            mime_type=validated_mime_type,
            file_size=file_size,
            page_key=page_key,
            file_type=file_type,
            month=month,
            record_id=record_id
        )

        return {
            'success': True,
            'file_id': file_record['id'],
            'file_path': file_record['file_path'],
            'file_name': file_record['file_name'],
            'file_size': file_record['file_size']
        }

    except Exception as e:
        logger.error(f"Error uploading file: {str(e)}")

        # 5. 錯誤回滾：如果上傳了檔案，刪除它
        if uploaded_file_path:
            try:
                logger.warning(f"Rolling back: deleting file from storage {uploaded_file_path}")
                supabase.storage.from_('evidence').remove([uploaded_file_path])
                logger.info(f"Successfully rolled back file {uploaded_file_path}")
            except Exception as rollback_error:
                logger.error(f"Rollback failed: {str(rollback_error)}")

        # 重新拋出原始錯誤
        raise


def delete_evidence_file(
    supabase,
    user_id: str,
    file_id: str
) -> Dict[str, Any]:
    """
    刪除證據檔案

    Args:
        supabase: Supabase client
        user_id: 用戶 ID（用於權限驗證）
        file_id: 檔案 ID

    Returns:
        刪除結果

    Raises:
        Exception: 刪除失敗或權限不足時拋出異常
    """
    try:
        # 1. 驗證權限：檢查檔案是否屬於該用戶
        existing = supabase.table('entry_files')\
            .select('id, owner_id, file_path')\
            .eq('id', file_id)\
            .single()\
            .execute()

        if not existing.data:
            raise Exception(f"File {file_id} not found")

        if existing.data['owner_id'] != user_id:
            raise Exception(f"Permission denied: file does not belong to user")

        file_path = existing.data['file_path']

        # 2. 從 Storage 刪除檔案
        try:
            logger.info(f"Deleting file from storage: {file_path}")
            supabase.storage.from_('evidence').remove([file_path])
            logger.info(f"Successfully deleted from storage: {file_path}")
        except Exception as storage_error:
            logger.warning(f"Storage deletion failed (continuing): {str(storage_error)}")
            # 繼續刪除資料庫記錄，即使 Storage 刪除失敗

        # 3. 從資料庫刪除記錄
        logger.info(f"Deleting file record: {file_id}")
        supabase.table('entry_files').delete().eq('id', file_id).execute()
        logger.info(f"Successfully deleted file record: {file_id}")

        return {
            'success': True,
            'file_id': file_id
        }

    except Exception as e:
        logger.error(f"Error deleting file: {str(e)}")
        raise
