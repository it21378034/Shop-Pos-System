using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace GroceryPro.Application.DTOs;

public class DashboardStatsDto
{
    public decimal TodayRevenue { get; set; }
    public int TodayBills { get; set; }
    public decimal TodayProductsSold { get; set; }
    public decimal TotalStockValue { get; set; }
    public decimal TodayGrossProfit { get; set; }
    public int LowStockAlertsCount { get; set; }
    public List<ChartDataPointDto> RecentSalesTrend { get; set; } = new();
    public List<CategorySalesShareDto> CategorySalesShare { get; set; } = new();
    public List<TopSellingProductDto> TopSellingProducts { get; set; } = new();
}

public class ChartDataPointDto
{
    public string Label { get; set; } = string.Empty; // e.g. "Mon 26", "Tue 27"
    public decimal SalesAmount { get; set; }
    public decimal ProfitAmount { get; set; }
    public int BillCount { get; set; }
}

public class CategorySalesShareDto
{
    public string CategoryName { get; set; } = string.Empty;
    public decimal TotalSales { get; set; }
    public decimal Percentage { get; set; }
}

public class TopSellingProductDto
{
    public string Sku { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;
    public string NameSi { get; set; } = string.Empty;
    public decimal QuantitySold { get; set; }
    public decimal TotalRevenue { get; set; }
}

public class ProductSalesReportDto
{
    public string Sku { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;
    public string NameSi { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public decimal QuantitySold { get; set; }
    public decimal TotalRevenue { get; set; }
    public decimal TotalCost { get; set; }
    public decimal GrossProfit { get; set; }
    public decimal MarginPercentage => TotalRevenue > 0 ? (GrossProfit / TotalRevenue) * 100m : 0m;
}

public class CashierPerformanceDto
{
    public Guid CashierId { get; set; }
    public string CashierName { get; set; } = string.Empty;
    public int TotalBills { get; set; }
    public decimal TotalSalesAmount { get; set; }
    public decimal CashCollected { get; set; }
    public decimal CardCollected { get; set; }
    public decimal OtherCollected { get; set; }
}
