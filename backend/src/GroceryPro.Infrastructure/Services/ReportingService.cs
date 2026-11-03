using GroceryPro.Application.DTOs;
using GroceryPro.Application.Interfaces;
using GroceryPro.Domain.Enums;
using GroceryPro.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GroceryPro.Infrastructure.Services;

public class ReportingService : IReportingService
{
    private readonly GroceryProDbContext _context;

    public ReportingService(GroceryProDbContext context)
    {
        _context = context;
    }

    public async Task<DashboardStatsDto> GetDashboardStatsAsync(Guid locationId)
    {
        var todayUtcStart = DateTime.UtcNow.Date;
        var todayUtcEnd = todayUtcStart.AddDays(1);

        // Today's completed sales
        var todaySales = await _context.Sales
            .Where(s => s.LocationId == locationId
                     && s.CreatedAtUtc >= todayUtcStart
                     && s.CreatedAtUtc < todayUtcEnd
                     && s.Status == SaleStatus.Completed)
            .Include(s => s.Items)
            .ToListAsync();

        decimal todayRevenue = todaySales.Sum(s => s.GrandTotal);
        int todayBills = todaySales.Count;
        decimal todayProductsSold = todaySales.SelectMany(s => s.Items).Sum(i => i.Quantity);
        decimal todayGrossProfit = todaySales.SelectMany(s => s.Items).Sum(i => i.Profit);

        // Total inventory valuation
        var stockBalances = await _context.StockBalances
            .Where(sb => sb.LocationId == locationId)
            .ToListAsync();

        decimal totalStockValue = stockBalances.Sum(sb => sb.QuantityOnHand * sb.AverageCostPrice);

        // Low stock alerts count
        int lowStockCount = await _context.StockBalances
            .Include(sb => sb.Product)
            .Where(sb => sb.LocationId == locationId && sb.QuantityOnHand <= sb.Product.ReorderLevel)
            .CountAsync();

        // 7-day sales trend
        var trendPoints = new List<ChartDataPointDto>();
        for (int i = 6; i >= 0; i--)
        {
            var dayStart = todayUtcStart.AddDays(-i);
            var dayEnd = dayStart.AddDays(1);

            var daySales = await _context.Sales
                .Where(s => s.LocationId == locationId
                         && s.CreatedAtUtc >= dayStart
                         && s.CreatedAtUtc < dayEnd
                         && s.Status == SaleStatus.Completed)
                .Include(s => s.Items)
                .ToListAsync();

            trendPoints.Add(new ChartDataPointDto
            {
                Label = dayStart.ToString("ddd dd"),
                SalesAmount = daySales.Sum(s => s.GrandTotal),
                ProfitAmount = daySales.SelectMany(s => s.Items).Sum(item => item.Profit),
                BillCount = daySales.Count
            });
        }

        // Category sales share
        var categorySalesRaw = await _context.SaleItems
            .Include(si => si.Sale)
            .Include(si => si.Product)
                .ThenInclude(p => p.Category)
            .Where(si => si.Sale.LocationId == locationId
                      && si.Sale.CreatedAtUtc >= todayUtcStart.AddDays(-30)
                      && si.Sale.Status == SaleStatus.Completed)
            .GroupBy(si => si.Product.Category.NameEn)
            .Select(g => new
            {
                Category = g.Key,
                Total = g.Sum(x => x.LineTotal)
            })
            .ToListAsync();

        decimal totalCatSales = categorySalesRaw.Sum(c => c.Total);
        var categoryShares = categorySalesRaw.Select(c => new CategorySalesShareDto
        {
            CategoryName = c.Category ?? "Other",
            TotalSales = c.Total,
            Percentage = totalCatSales > 0 ? Math.Round((c.Total / totalCatSales) * 100m, 1) : 0m
        }).ToList();

        // Top 5 selling products
        var topProducts = await _context.SaleItems
            .Include(si => si.Sale)
            .Include(si => si.Product)
            .Where(si => si.Sale.LocationId == locationId && si.Sale.Status == SaleStatus.Completed)
            .GroupBy(si => new { si.ProductId, si.Product.Sku, si.Product.NameEn, si.Product.NameSi })
            .Select(g => new TopSellingProductDto
            {
                Sku = g.Key.Sku,
                NameEn = g.Key.NameEn,
                NameSi = g.Key.NameSi,
                QuantitySold = g.Sum(x => x.Quantity),
                TotalRevenue = g.Sum(x => x.LineTotal)
            })
            .OrderByDescending(tp => tp.TotalRevenue)
            .Take(5)
            .ToListAsync();

        return new DashboardStatsDto
        {
            TodayRevenue = todayRevenue,
            TodayBills = todayBills,
            TodayProductsSold = todayProductsSold,
            TotalStockValue = totalStockValue,
            TodayGrossProfit = todayGrossProfit,
            LowStockAlertsCount = lowStockCount,
            RecentSalesTrend = trendPoints,
            CategorySalesShare = categoryShares,
            TopSellingProducts = topProducts
        };
    }

    public async Task<List<ProductSalesReportDto>> GetProductWiseSalesAsync(Guid locationId, DateTime fromDateUtc, DateTime toDateUtc)
    {
        return await _context.SaleItems
            .Include(si => si.Sale)
            .Include(si => si.Product)
                .ThenInclude(p => p.Category)
            .Where(si => si.Sale.LocationId == locationId
                      && si.Sale.CreatedAtUtc >= fromDateUtc
                      && si.Sale.CreatedAtUtc <= toDateUtc
                      && si.Sale.Status == SaleStatus.Completed)
            .GroupBy(si => new { si.ProductId, si.Product.Sku, si.Product.NameEn, si.Product.NameSi, CategoryName = si.Product.Category.NameEn })
            .Select(g => new ProductSalesReportDto
            {
                Sku = g.Key.Sku,
                NameEn = g.Key.NameEn,
                NameSi = g.Key.NameSi,
                CategoryName = g.Key.CategoryName,
                QuantitySold = g.Sum(x => x.Quantity),
                TotalRevenue = g.Sum(x => x.LineTotal),
                TotalCost = g.Sum(x => x.Quantity * x.UnitCost),
                GrossProfit = g.Sum(x => x.Profit)
            })
            .OrderByDescending(r => r.TotalRevenue)
            .ToListAsync();
    }

    public async Task<List<CashierPerformanceDto>> GetCashierPerformanceAsync(Guid locationId, DateTime fromDateUtc, DateTime toDateUtc)
    {
        var sales = await _context.Sales
            .Include(s => s.Cashier)
            .Include(s => s.Payments)
            .Where(s => s.LocationId == locationId
                     && s.CreatedAtUtc >= fromDateUtc
                     && s.CreatedAtUtc <= toDateUtc
                     && s.Status == SaleStatus.Completed)
            .ToListAsync();

        return sales
            .GroupBy(s => new { s.CashierId, s.Cashier.FullName })
            .Select(g => new CashierPerformanceDto
            {
                CashierId = g.Key.CashierId,
                CashierName = g.Key.FullName,
                TotalBills = g.Count(),
                TotalSalesAmount = g.Sum(s => s.GrandTotal),
                CashCollected = g.SelectMany(s => s.Payments).Where(p => p.PaymentMethod == PaymentMethod.Cash).Sum(p => p.Amount),
                CardCollected = g.SelectMany(s => s.Payments).Where(p => p.PaymentMethod == PaymentMethod.Card).Sum(p => p.Amount),
                OtherCollected = g.SelectMany(s => s.Payments).Where(p => p.PaymentMethod != PaymentMethod.Cash && p.PaymentMethod != PaymentMethod.Card).Sum(p => p.Amount)
            })
            .OrderByDescending(c => c.TotalSalesAmount)
            .ToList();
    }

    public async Task<byte[]> ExportProductSalesCsvAsync(Guid locationId, DateTime fromDateUtc, DateTime toDateUtc)
    {
        var data = await GetProductWiseSalesAsync(locationId, fromDateUtc, toDateUtc);
        var sb = new StringBuilder();
        sb.AppendLine("SKU,ProductNameEn,ProductNameSi,Category,QuantitySold,TotalRevenue,TotalCost,GrossProfit,MarginPercentage");

        foreach (var r in data)
        {
            string nameEn = EscapeCsv(r.NameEn);
            string nameSi = EscapeCsv(r.NameSi);
            string cat = EscapeCsv(r.CategoryName);
            sb.AppendLine($"{r.Sku},{nameEn},{nameSi},{cat},{r.QuantitySold},{r.TotalRevenue:F2},{r.TotalCost:F2},{r.GrossProfit:F2},{r.MarginPercentage:F1}%");
        }

        return Encoding.UTF8.GetBytes(sb.ToString());
    }

    public async Task<byte[]> ExportInventoryCsvAsync(Guid locationId)
    {
        var data = await _context.StockBalances
            .Include(sb => sb.Product)
                .ThenInclude(p => p.Category)
            .Include(sb => sb.Product)
                .ThenInclude(p => p.Unit)
            .Where(sb => sb.LocationId == locationId)
            .Select(sb => new
            {
                sb.Product.Sku,
                sb.Product.NameEn,
                sb.Product.NameSi,
                Category = sb.Product.Category.NameEn,
                Unit = sb.Product.Unit.Code,
                sb.QuantityOnHand,
                sb.AverageCostPrice,
                TotalValuation = sb.QuantityOnHand * sb.AverageCostPrice,
                sb.Product.ReorderLevel,
                sb.BatchNumber,
                sb.ExpiryDate
            })
            .ToListAsync();

        var sbCsv = new StringBuilder();
        sbCsv.AppendLine("SKU,ProductNameEn,ProductNameSi,Category,Unit,QuantityOnHand,AverageCostPrice,TotalValuation,ReorderLevel,BatchNumber,ExpiryDate");

        foreach (var r in data)
        {
            string nameEn = EscapeCsv(r.NameEn);
            string nameSi = EscapeCsv(r.NameSi);
            string cat = EscapeCsv(r.Category);
            string expiry = r.ExpiryDate.HasValue ? r.ExpiryDate.Value.ToString("yyyy-MM-dd") : "";
            sbCsv.AppendLine($"{r.Sku},{nameEn},{nameSi},{cat},{r.Unit},{r.QuantityOnHand},{r.AverageCostPrice:F2},{r.TotalValuation:F2},{r.ReorderLevel},{r.BatchNumber},{expiry}");
        }

        return Encoding.UTF8.GetBytes(sbCsv.ToString());
    }

    private static string EscapeCsv(string? value)
    {
        if (string.IsNullOrEmpty(value)) return "";
        if (value.Contains(",") || value.Contains("\"") || value.Contains("\n") || value.Contains("\r"))
        {
            return $"\"{value.Replace("\"", "\"\"")}\"";
        }
        return value;
    }
}
