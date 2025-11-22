"""
能源條目提交服務
包含 pseudo-transaction 模式的錯誤回滾機制
"""
from typing import Dict, Any, Optional
import logging
from datetime import datetime, date

logger = logging.getLogger(__name__)

# Category mapping (與前端保持一致)
CATEGORY_MAP = {
    'wd40': 'WD-40',
    'acetylene': '乙炔',
    'refrigerant': '冷媒',
    'septic_tank': '化糞池',
    'natural_gas': '天然氣',
    'urea': '尿素',
    'diesel_generator': '柴油(固定源)',
    'diesel': '柴油(移動源)',
    'gasoline': '汽油',
    'sf6': '六氟化硫',
    'generator_test': '發電機測試資料',
    'lpg': '液化石油氣',
    'fire_extinguisher': '滅火器',
    'welding_rod': '焊條',
    'electricity': '外購電力',
    'employee_commute': '員工通勤'
}


def get_category_from_page_key(page_key: str) -> str:
    """
    根據 page_key 取得類別名稱（中文）

    Args:
        page_key: 能源類型鍵值

    Returns:
        中文類別名稱

    Raises:
        ValueError: 未知的 page_key
    """
    if page_key not in CATEGORY_MAP:
        raise ValueError(f"Unknown page_key: {page_key}")

    return CATEGORY_MAP[page_key]


def calculate_amount(monthly: Dict[str, float]) -> float:
    """
    計算月份數據總和

    Args:
        monthly: 月份數據 {month: value}

    Returns:
        總量
    """
    return round(sum(monthly.values()), 2)


def get_period_dates(year: int) -> tuple:
    """
    取得年度期間的開始和結束日期

    Args:
        year: 年份

    Returns:
        (period_start, period_end) tuple
    """
    period_start = date(year, 1, 1)
    period_end = date(year, 12, 31)
    return period_start.isoformat(), period_end.isoformat()


def create_energy_entry(
    supabase,
    user_id: str,
    page_key: str,
    period_year: int,
    unit: str,
    monthly: Dict[str, float],
    notes: Optional[str] = None,
    payload: Optional[Dict[str, Any]] = None,
    extraPayload: Optional[Dict[str, Any]] = None,
    status: str = "submitted"
) -> Dict[str, Any]:
    """
    創建能源條目（使用 pseudo-transaction 模式）

    Args:
        supabase: Supabase client
        user_id: 用戶 ID
        page_key: 能源類型鍵值
        period_year: 填報年份
        unit: 單位
        monthly: 月份數據
        notes: 備註
        payload: 主要 payload
        extraPayload: 額外 payload
        status: 狀態

    Returns:
        創建的條目數據（包含 entry_id）

    Raises:
        Exception: 創建失敗時拋出異常，並自動回滾
    """
    created_entry_id = None

    try:
        # 1. 準備數據
        category = get_category_from_page_key(page_key)
        amount = calculate_amount(monthly)
        period_start, period_end = get_period_dates(period_year)

        # 2. 合併 payload（將 monthly 放入 payload）
        final_payload = payload or {}
        final_payload['monthly'] = monthly

        entry_data = {
            'owner_id': user_id,
            'page_key': page_key,
            'category': category,
            'period_year': period_year,
            'period_start': period_start,
            'period_end': period_end,
            'unit': unit,
            'amount': amount,
            'notes': notes,
            'payload': final_payload,
            'status': status
        }

        # extraPayload 是 optional，只在有值且資料庫支援時才加入
        if extraPayload is not None:
            entry_data['extraPayload'] = extraPayload

        logger.info(f"Creating/Updating energy entry for user {user_id}, page_key: {page_key}")
        print(f"[DEBUG] About to UPSERT with owner_id={user_id}, category={category}, period_year={period_year}")
        print(f"[DEBUG] Full entry_data: {entry_data}")

        # 3. Upsert energy_entries (如果存在就更新,否則新增)
        result = supabase.table('energy_entries').upsert(
            entry_data,
            on_conflict='owner_id,category,period_year'  # 根據 unique constraint 更新
        ).execute()

        print(f"[DEBUG] UPSERT completed. result.data: {result.data}")

        if not result.data or len(result.data) == 0:
            raise Exception("Failed to create/update energy entry: no data returned")

        created_entry = result.data[0]
        created_entry_id = created_entry['id']

        logger.info(f"Successfully created entry {created_entry_id}")

        return {
            'success': True,
            'entry_id': created_entry_id,
            'entry': created_entry
        }

    except Exception as e:
        logger.error(f"Error creating energy entry: {str(e)}")

        # 4. 錯誤回滾：如果創建了 entry，刪除它
        if created_entry_id:
            try:
                logger.warning(f"Rolling back: deleting entry {created_entry_id}")
                supabase.table('energy_entries').delete().eq('id', created_entry_id).execute()
                logger.info(f"Successfully rolled back entry {created_entry_id}")
            except Exception as rollback_error:
                logger.error(f"Rollback failed: {str(rollback_error)}")

        # 重新拋出原始錯誤
        raise


def update_energy_entry(
    supabase,
    entry_id: str,
    user_id: str,
    monthly: Optional[Dict[str, float]] = None,
    notes: Optional[str] = None,
    payload: Optional[Dict[str, Any]] = None,
    extraPayload: Optional[Dict[str, Any]] = None,
    status: Optional[str] = None
) -> Dict[str, Any]:
    """
    更新能源條目

    Args:
        supabase: Supabase client
        entry_id: 條目 ID
        user_id: 用戶 ID（用於權限驗證）
        monthly: 月份數據（更新時）
        notes: 備註
        payload: payload
        extraPayload: extraPayload
        status: 狀態

    Returns:
        更新結果

    Raises:
        Exception: 更新失敗或權限不足時拋出異常
    """
    try:
        # 1. 驗證權限：檢查 entry 是否屬於該用戶
        existing = supabase.table('energy_entries')\
            .select('id, owner_id, payload')\
            .eq('id', entry_id)\
            .single()\
            .execute()

        if not existing.data:
            raise Exception(f"Entry {entry_id} not found")

        if existing.data['owner_id'] != user_id:
            raise Exception(f"Permission denied: entry does not belong to user")

        # 2. 準備更新數據
        update_data = {}

        if monthly is not None:
            # 更新 amount
            update_data['amount'] = calculate_amount(monthly)

            # 更新 payload 中的 monthly
            current_payload = existing.data.get('payload', {})
            current_payload['monthly'] = monthly
            update_data['payload'] = current_payload

        if notes is not None:
            update_data['notes'] = notes

        if payload is not None:
            update_data['payload'] = payload

        if extraPayload is not None:
            update_data['extraPayload'] = extraPayload

        if status is not None:
            update_data['status'] = status

        if not update_data:
            return {'success': True, 'message': 'No changes to update'}

        # 3. 執行更新
        logger.info(f"Updating entry {entry_id}")
        result = supabase.table('energy_entries')\
            .update(update_data)\
            .eq('id', entry_id)\
            .execute()

        logger.info(f"Successfully updated entry {entry_id}")

        return {
            'success': True,
            'entry_id': entry_id,
            'updated_fields': list(update_data.keys())
        }

    except Exception as e:
        logger.error(f"Error updating energy entry: {str(e)}")
        raise
