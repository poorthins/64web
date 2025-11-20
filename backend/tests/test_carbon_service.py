"""
碳排放計算服務單元測試
"""
import pytest
from src.services.carbon_service import (
    get_emission_factor,
    calculate_monthly_emission,
    calculate_total_carbon
)


class TestGetEmissionFactor:
    """測試排放係數取得"""

    def test_diesel_factor(self):
        """測試柴油排放係數"""
        factor = get_emission_factor('diesel')
        assert factor == 2.6068

    def test_gasoline_factor(self):
        """測試汽油排放係數"""
        factor = get_emission_factor('gasoline')
        assert factor == 2.2683

    def test_electricity_factor(self):
        """測試電力排放係數"""
        factor = get_emission_factor('electricity')
        assert factor == 0.509

    def test_unknown_factor_returns_default(self):
        """測試未知能源類型返回預設值"""
        factor = get_emission_factor('unknown_energy_type')
        assert factor == 1.0

    def test_year_parameter_accepted(self):
        """測試年份參數被接受（未來功能）"""
        factor = get_emission_factor('diesel', year=2024)
        assert factor == 2.6068  # 目前不依年份變化


class TestCalculateMonthlyEmission:
    """測試月份碳排放計算"""

    def test_single_month(self):
        """測試單月計算"""
        monthly_data = {"1": 100.0}
        factor = 2.6068
        result = calculate_monthly_emission(monthly_data, factor)

        assert "1" in result
        assert result["1"] == 260.68

    def test_multiple_months(self):
        """測試多月計算"""
        monthly_data = {
            "1": 100.0,
            "2": 200.0,
            "3": 150.5
        }
        factor = 2.6068
        result = calculate_monthly_emission(monthly_data, factor)

        assert result["1"] == 260.68
        assert result["2"] == 521.36
        assert result["3"] == 392.32

    def test_zero_value(self):
        """測試零值"""
        monthly_data = {"1": 0.0}
        factor = 2.6068
        result = calculate_monthly_emission(monthly_data, factor)

        assert result["1"] == 0.0

    def test_decimal_values(self):
        """測試小數值"""
        monthly_data = {"1": 123.45}
        factor = 2.6068
        result = calculate_monthly_emission(monthly_data, factor)

        assert result["1"] == 321.81  # round(123.45 * 2.6068, 2)

    def test_rounding_to_2_decimals(self):
        """測試四捨五入到小數點2位"""
        monthly_data = {"1": 100.1111}
        factor = 2.6068
        result = calculate_monthly_emission(monthly_data, factor)

        # 100.1111 * 2.6068 = 261.03447448, round() → 261.03 (may vary due to float precision)
        assert result["1"] == round(100.1111 * 2.6068, 2)


class TestCalculateTotalCarbon:
    """測試總碳排放計算"""

    def test_diesel_normal_calculation(self):
        """測試柴油正常計算"""
        result = calculate_total_carbon(
            page_key='diesel',
            monthly_data={"1": 100.0, "2": 200.0},
            year=2024
        )

        assert result['total_emission'] == 782.04  # 260.68 + 521.36
        assert result['emission_factor'] == 2.6068
        assert result['formula'] == 'diesel × 2.6068'
        assert "1" in result['monthly_emission']
        assert "2" in result['monthly_emission']
        assert result['monthly_emission']["1"] == 260.68
        assert result['monthly_emission']["2"] == 521.36

    def test_gasoline_calculation(self):
        """測試汽油計算"""
        result = calculate_total_carbon(
            page_key='gasoline',
            monthly_data={"1": 50.0},
            year=2024
        )

        # 50 * 2.2683 = 113.415, round() → 113.41 or 113.42 depending on implementation
        assert result['total_emission'] == round(50.0 * 2.2683, 2)
        assert result['emission_factor'] == 2.2683

    def test_electricity_calculation(self):
        """測試電力計算"""
        result = calculate_total_carbon(
            page_key='electricity',
            monthly_data={"1": 1000.0, "2": 1200.0},
            year=2024
        )

        # 1000 * 0.509 = 509.0
        # 1200 * 0.509 = 610.8
        # Total = 1119.8
        assert result['total_emission'] == 1119.8
        assert result['emission_factor'] == 0.509

    def test_empty_monthly_data(self):
        """測試空月份數據"""
        result = calculate_total_carbon(
            page_key='diesel',
            monthly_data={},
            year=2024
        )

        assert result['total_emission'] == 0.0
        assert result['monthly_emission'] == {}

    def test_result_structure(self):
        """測試返回結果結構完整性"""
        result = calculate_total_carbon(
            page_key='diesel',
            monthly_data={"1": 100.0},
            year=2024
        )

        # 確認所有必要欄位存在
        assert 'total_emission' in result
        assert 'monthly_emission' in result
        assert 'emission_factor' in result
        assert 'formula' in result

        # 確認型別正確
        assert isinstance(result['total_emission'], (int, float))
        assert isinstance(result['monthly_emission'], dict)
        assert isinstance(result['emission_factor'], (int, float))
        assert isinstance(result['formula'], str)

    def test_large_values(self):
        """測試大數值計算"""
        result = calculate_total_carbon(
            page_key='diesel',
            monthly_data={
                str(i): 10000.0 for i in range(1, 13)
            },  # 12個月，每月10000
            year=2024
        )

        # 12 * 10000 * 2.6068 = 312816.0
        assert result['total_emission'] == 312816.0
