"""
碳排放計算服務
"""
from typing import Dict
import logging

logger = logging.getLogger(__name__)

# 排放係數資料庫（kgCO2e per unit）
# 來源：台灣環保署溫室氣體排放係數管理表 6.0.4
# 單位：公斤 CO2e / 公升 (液體燃料)、公斤 CO2e / 度 (電力)
EMISSION_FACTORS = {
    # 範疇一：直接排放
    'diesel': 2.6068,          # 柴油 (移動源)
    'diesel_generator': 2.6068, # 柴油 (固定源)
    'gasoline': 2.2683,        # 汽油
    'natural_gas': 1.8790,     # 天然氣 (單位: kgCO2e/m³)
    'lpg': 1.7766,             # 液化石油氣
    'acetylene': 2.9,          # 乙炔 (估計值)
    'refrigerant': 1.0,        # 冷媒 (依類型不同，需細分)
    'sf6': 22800.0,            # 六氟化硫 (GWP值)
    'wd40': 0.5,               # WD-40 (估計值)
    'fire_extinguisher': 1.0,  # 滅火器 (依類型不同)
    'welding_rod': 0.8,        # 焊條 (估計值)
    'urea': 0.732,             # 尿素
    'septic_tank': 0.0,        # 化糞池 (需要特殊計算)

    # 範疇二：外購電力
    'electricity': 0.509,      # 電力 (2023年台電係數)

    # 範疇三：其他間接排放
    'employee_commute': 0.0,   # 員工通勤 (需依交通工具細分)
    'generator_test': 2.6068,  # 發電機測試 (同柴油)
}


def get_emission_factor(page_key: str, year: int = None) -> float:
    """
    取得排放係數

    Args:
        page_key: 能源類型鍵值 (例如: diesel, gasoline)
        year: 年份 (未來可依年份調整係數)

    Returns:
        排放係數 (kgCO2e per unit)

    Raises:
        KeyError: 當找不到對應的排放係數時
    """
    if page_key not in EMISSION_FACTORS:
        logger.warning(f"Unknown page_key: {page_key}, using default factor 1.0")
        return 1.0

    factor = EMISSION_FACTORS[page_key]
    logger.debug(f"Emission factor for {page_key} (year: {year}): {factor}")

    return factor


def calculate_monthly_emission(monthly_data: Dict[str, float], factor: float) -> Dict[str, float]:
    """
    計算每月碳排放量

    Args:
        monthly_data: 月份數據 {month: value}
        factor: 排放係數

    Returns:
        每月碳排放量 {month: emission}
    """
    monthly_emission = {}

    for month_str, value in monthly_data.items():
        emission = round(value * factor, 2)
        monthly_emission[month_str] = emission
        logger.debug(f"Month {month_str}: {value} × {factor} = {emission} kgCO2e")

    return monthly_emission


def calculate_total_carbon(
    page_key: str,
    monthly_data: Dict[str, float],
    year: int
) -> Dict:
    """
    計算總碳排放量

    Args:
        page_key: 能源類型鍵值
        monthly_data: 月份數據 {month: value}
        year: 計算年份

    Returns:
        包含計算結果的字典：
        {
            'total_emission': float,
            'monthly_emission': Dict[str, float],
            'emission_factor': float,
            'formula': str
        }
    """
    # 1. 取得排放係數
    factor = get_emission_factor(page_key, year)

    # 2. 計算每月排放
    monthly_emission = calculate_monthly_emission(monthly_data, factor)

    # 3. 計算總排放
    total_emission = round(sum(monthly_emission.values()), 2)

    # 4. 產生公式說明
    formula = f"{page_key} × {factor}"

    logger.info(
        f"Carbon calculation: {page_key} (year: {year}) "
        f"= {total_emission} kgCO2e (factor: {factor})"
    )

    return {
        'total_emission': total_emission,
        'monthly_emission': monthly_emission,
        'emission_factor': factor,
        'formula': formula
    }
